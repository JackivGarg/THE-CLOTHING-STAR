import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import robotsParser from 'robots-parser';
import { decimalToMinor, plainTextFromHtml, stableContentHash, pageDigest } from './collector-utils.mjs';

// Explicit allowlist only. Run directories are never reused; no database access.
const sources=Object.freeze({jnorss:'https://www.jnorss.in',genrage:'https://genrage.com',wtflex:'https://wtflex.in',sagacity:'https://thesagacity.in'});
const ua='TheClothingStarCatalogueCollector';
function source(brand){if(!Object.hasOwn(sources,brand))throw Error('unsupported_brand');return sources[brand];}
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const sql=v=>v==null?'null':`'${String(v).replaceAll("'","''")}'`;
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const id=n=>{if(!Number.isSafeInteger(n)||n<1) throw Error('unsafe_or_missing_source_id');return String(n);};

export function mapProduct(p,observedAt,brand='jnorss'){
  const base=source(brand);
  const pid=id(p.id); if(!p.handle || !/^[a-z0-9-]+$/.test(p.handle) || !p.title || !Array.isArray(p.variants) || !p.variants.length) throw Error('invalid_product');
  const tags=Array.isArray(p.tags)?p.tags:(typeof p.tags==='string'?p.tags.split(',').map(x=>x.trim()).filter(Boolean):[]);
  const description=plainTextFromHtml(p.body_html||'')||null;
  const images=(p.images||[]).map((im,i)=>({id:im.id==null?null:id(im.id),src:im.src||null,alt:im.alt||null,position:im.position??i+1,variant_ids:(im.variant_ids||[]).map(id)}));
  const variants=p.variants.map(v=>{const opts={};for(let i=0;i<(p.options||[]).length;i++){const o=p.options[i], n=typeof o==='string'?o:o?.name;if(n)opts[n]=v[`option${i+1}`]??null;}
    const price=decimalToMinor(v.price,'major_decimal');if(price===null || (v.compare_at_price!=null && decimalToMinor(v.compare_at_price,'major_decimal')===null))throw Error('invalid_price');
    return {external_variant_id:id(v.id),source_options:opts,source_sku:v.sku||null,size_raw:opts.Size??opts.Sizes??opts.SIZE??opts.size??opts['Top Size']??null,colour_raw:opts.Color??opts.Colour??opts.color??opts.colour??null,source_price:v.price,price_minor:price,compare_at_minor:decimalToMinor(v.compare_at_price,'major_decimal'),currency:'INR',available:typeof v.available==='boolean'?v.available:null,preorder:null,source_variant_image_id:v.image_id==null?null:id(v.image_id)};
  }).sort((a,b)=>a.external_variant_id.localeCompare(b.external_variant_id));
  if(new Set(variants.map(v=>v.external_variant_id)).size!==variants.length)throw Error('duplicate_variant');
  const row={external_product_id:pid,handle:p.handle,title:p.title,description_text:description,original_product_type:p.product_type||null,source_tags:tags,source_url:`${base}/products/${p.handle}`,source_updated_at:p.updated_at||null,fulfilment_status:/pre.?order|coming soon|prelaunch/i.test(`${p.title} ${description||''} ${tags.join(' ')}`)?'preorder':'unknown',images,observed_at:observedAt,variants};
  row.content_hash=stableContentHash(row);row.validation_errors=[];return row;
}

async function body(response,max=15000000){const reader=response.body.getReader();let parts=[],n=0;while(true){const {done,value}=await reader.read();if(done)break;n+=value.length;if(n>max){await reader.cancel();throw Error('response_too_large');}parts.push(value);}return Buffer.concat(parts.map(Buffer.from));}
async function capture(brand='jnorss'){
  const base=source(brand),root=`data/catalogue/${brand}-refresh`;
  const runId=crypto.randomUUID(),started=new Date().toISOString(), dir=path.join(root,`${started.replace(/[:.]/g,'-')}-${runId}`);await fs.mkdir(dir,{recursive:true});
  const m={run_id:runId,brand,started_at:started,user_agent:ua,robots_url:base+'/robots.txt',scope:'public Shopify products.json feed',price_unit:'major_decimal',requests:0,pages:[],complete:false,status:'partial',errors:[]};
  let last=0;async function get(url){await wait(Math.max(0,1200-(Date.now()-last)));last=Date.now();m.requests++;const r=await fetch(url,{headers:{'user-agent':ua,accept:'application/json,text/plain,*/*'},redirect:'manual',signal:AbortSignal.timeout(20000)});if(!r.ok || r.headers.has('retry-after'))throw Error(`http_${r.status}${r.headers.has('retry-after')?'_retry_after':''}`);return r;}
  try{const rb=await body(await get(m.robots_url),1000000);m.robots_sha256=hash(rb);await fs.writeFile(path.join(dir,'robots.txt'),rb,{flag:'wx'});const robots=robotsParser(m.robots_url,rb.toString('utf8')), seen=new Set();
    for(let p=1;p<=100;p++){const url=`${base}/products.json?limit=250&page=${p}`;if(robots.isAllowed(url,ua)!==true)throw Error('robots_disallowed');const response=await get(url), bytes=await body(response), payload=JSON.parse(bytes.toString('utf8'));if(!Array.isArray(payload.products))throw Error('invalid_feed_shape');const digest=pageDigest(payload.products);if(seen.has(digest))throw Error('repeated_page');seen.add(digest);const file=`page-${String(p).padStart(3,'0')}.json.gz`,observed_at=new Date().toISOString();await fs.writeFile(path.join(dir,file),zlib.gzipSync(bytes),{flag:'wx'});m.pages.push({url,file,sha256:hash(bytes),observed_at,status:response.status});if(payload.products.length<250){m.complete=true;break;}}
    if(!m.complete)m.errors.push('page_cap_reached');m.status='review_required';
  }catch(e){m.errors.push(String(e.message||e));}
  m.finished_at=new Date().toISOString();await fs.writeFile(path.join(dir,'manifest.json'),JSON.stringify(m,null,2),{flag:'wx'});console.log(JSON.stringify({dir,requests:m.requests,pages:m.pages.length,complete:m.complete,status:m.status,errors:m.errors}));
}
async function prepare(dir){
  const m=JSON.parse(await fs.readFile(path.join(dir,'manifest.json'),'utf8'));const base=source(m.brand);if(m.robots_url!==base+'/robots.txt'||m.user_agent!==ua||m.price_unit!=='major_decimal'||!m.run_id||!m.pages.length||!m.finished_at)throw Error('invalid_manifest');
  const rb=await fs.readFile(path.join(dir,'robots.txt'));if(hash(rb)!==m.robots_sha256)throw Error('robots_hash_mismatch');const robots=robotsParser(m.robots_url,rb.toString('utf8'));let rows=[],pids=new Set(),vids=new Set();
  for(const pg of m.pages){if(!/^page-\d{3}\.json\.gz$/.test(pg.file)||!pg.url.startsWith(base+'/products.json?')||robots.isAllowed(pg.url,ua)!==true)throw Error('unsafe_page');const raw=zlib.gunzipSync(await fs.readFile(path.join(dir,pg.file)));if(hash(raw)!==pg.sha256)throw Error('page_hash_mismatch');for(const p of JSON.parse(raw).products){const row=mapProduct(p,pg.observed_at,m.brand);if(pids.has(row.external_product_id)||row.variants.some(v=>vids.has(v.external_variant_id)))throw Error('duplicate_identity');pids.add(row.external_product_id);row.variants.forEach(v=>vids.add(v.external_variant_id));rows.push(row);}}
  const output=path.join(dir,'import');await fs.mkdir(output,{recursive:false});const run=sql(m.run_id)+'::uuid';const setup=`insert into public.import_runs(id,source_config_id,started_at,ended_at,status,scope_key,complete,requests,pages,discovered,staged,published,rejected,errors,snapshot_dir,collector_version) select ${run},c.id,${sql(m.started_at)}::timestamptz,${sql(m.finished_at)}::timestamptz,'review_required','shopify_public_feed',${m.complete},${m.requests},${m.pages.length},${rows.length},0,0,0,${sql(JSON.stringify(m.errors))}::jsonb,${sql(dir.replaceAll('\\','/'))},'shopify-allowlist-refresh-1' from public.source_configs c join public.brands b on b.id=c.brand_id where b.slug=${sql(m.brand)} and c.scope_key='catalogue' on conflict(id) do nothing;`;
  await fs.writeFile(path.join(output,'setup.sql'),setup,{flag:'wx'});let files=[];for(let i=0;i<rows.length;i+=20){const f=`batch-${String(i/20+1).padStart(3,'0')}.sql`,chunk=rows.slice(i,i+20);const q=`with input as (select value p from jsonb_array_elements(${sql(JSON.stringify(chunk))}::jsonb)), target as (select r.id,r.source_config_id from public.import_runs r join public.source_configs c on c.id=r.source_config_id join public.brands b on b.id=c.brand_id where r.id=${run} and b.slug=${sql(m.brand)} and c.scope_key='catalogue') insert into public.staged_catalogue_records(source_config_id,import_run_id,external_product_id,external_variant_id,payload,content_hash,observed_at) select t.source_config_id,t.id,p->>'external_product_id','__PRODUCT__',p,p->>'content_hash',(p->>'observed_at')::timestamptz from input cross join target t on conflict(import_run_id,external_product_id,external_variant_id) do nothing;`;await fs.writeFile(path.join(output,f),q,{flag:'wx'});files.push(f);}
  await fs.writeFile(path.join(output,'finish.sql'),`update public.import_runs r set staged=(select count(*) from public.staged_catalogue_records s where s.import_run_id=r.id) where r.id=${run} returning id,staged;`,{flag:'wx'});await fs.writeFile(path.join(output,'manifest.json'),JSON.stringify({run_id:m.run_id,source_manifest_sha256:hash(await fs.readFile(path.join(dir,'manifest.json'))),products:rows.length,variants:vids.size,files},null,2),{flag:'wx'});console.log(JSON.stringify({run_id:m.run_id,products:rows.length,variants:vids.size,batches:files.length,output}));
}
if(process.argv[1] && path.resolve(process.argv[1])===path.resolve(new URL(import.meta.url).pathname.replace(/^\/(?:([A-Za-z]:))/, '$1'))){const [cmd,arg]=process.argv.slice(2);if(cmd==='capture')await capture(arg||'jnorss');else if(cmd==='prepare'&&arg)await prepare(arg);else throw Error('Usage: node scripts/jnorss-refresh.mjs capture [jnorss|genrage|wtflex|sagacity] | prepare <run-dir>');}
