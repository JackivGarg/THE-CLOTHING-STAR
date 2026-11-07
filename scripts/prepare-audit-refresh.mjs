import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import robotsParser from 'robots-parser';
import { mapProduct } from './jnorss-refresh.mjs';
import { stableContentHash } from './collector-utils.mjs';

// Convert locally saved, robots-checked audit pages into append-only SQL only.
// No network or database calls. Never modify the source capture.
const allowed={hauntrex:'https://hauntrex.com','burger-bae':'https://www.burgerbaeclothing.com'};
const ua='TheClothingStarCatalogueCollector';
const sha=v=>crypto.createHash('sha256').update(v).digest('hex');
const lit=v=>v==null?'null':`'${String(v).replaceAll("'","''")}'`;
const dir=process.argv[2];if(!dir)throw Error('Usage: node scripts/prepare-audit-refresh.mjs <capture-dir>');
const manifestBytes=await fs.readFile(path.join(dir,'manifest.json'));
const m=JSON.parse(manifestBytes),base=Object.hasOwn(allowed,m.brand)?allowed[m.brand]:null;
const validTime=t=>typeof t==='string' && Number.isFinite(Date.parse(t));
if(!base||m.base!==base||m.user_agent!==ua||!validTime(m.started_at)||!validTime(m.finished_at)||Date.parse(m.finished_at)<Date.parse(m.started_at)||!Array.isArray(m.pages)||!m.pages.length||!Number.isInteger(m.requests)||m.requests<m.pages.length+1)throw Error('invalid_capture_manifest');
const robotsBytes=await fs.readFile(path.join(dir,'robots.txt'));
if(sha(robotsBytes)!==m.robots_sha256)throw Error('robots_hash_mismatch');
const robots=robotsParser(base+'/robots.txt',robotsBytes.toString('utf8'));
const productIds=new Set(),variantIds=new Set(),rows=[];
for(const [index,pg] of m.pages.entries()){
 const url=`${base}/products.json?limit=250&page=${index+1}`,file=`page-${String(index+1).padStart(3,'0')}.json.gz`;
 if(pg.url!==url||pg.file!==file||pg.status!==200||robots.isAllowed(url,ua)!==true||!validTime(pg.fetched_at)||Date.parse(pg.fetched_at)<Date.parse(m.started_at)||Date.parse(pg.fetched_at)>Date.parse(m.finished_at))throw Error('invalid_page_provenance');
 const bytes=zlib.gunzipSync(await fs.readFile(path.join(dir,file)),{maxOutputLength:15000000});if(sha(bytes)!==pg.sha256)throw Error('page_hash_mismatch');const data=JSON.parse(bytes.toString('utf8'));
 if(!Array.isArray(data.products)||data.products.length!==pg.products||data.products.length>250)throw Error('invalid_page_shape');
 for(const p of data.products){
  // Shopify permits Unicode handles (Burger Bae has a trademark character).
  // Escape the handle as a single URL segment; never let it change the origin/path.
  if(typeof p.handle!=='string'||!p.handle||/[\/\\\u0000-\u001f\u007f]/.test(p.handle))throw Error('unsafe_handle');
  const row=mapProduct({...p,handle:'validated-placeholder'},pg.fetched_at);row.handle=p.handle;row.source_url=new URL('/products/'+encodeURIComponent(p.handle),base).href;row.content_hash=stableContentHash(row);
  if(productIds.has(row.external_product_id)||row.variants.some(v=>variantIds.has(v.external_variant_id)))throw Error('duplicate_identity');productIds.add(row.external_product_id);row.variants.forEach(v=>variantIds.add(v.external_variant_id));rows.push(row);}
}
if(m.complete!==true||m.pages.at(-1).products>=250||m.errors.length||rows.length!==m.comparison?.products||variantIds.size!==m.comparison?.variants)throw Error('incomplete_or_inconsistent_capture');
// Stable per immutable manifest, distinct from every earlier run.
const runHash=crypto.createHash('sha256').update('the-clothing-star:audit-feed-refresh:').update(manifestBytes).digest();runHash[6]=(runHash[6]&15)|0x50;runHash[8]=(runHash[8]&63)|0x80;const h=runHash.subarray(0,16).toString('hex'),runId=`${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
const run=lit(runId)+'::uuid', brand=lit(m.brand),out=path.join(dir,'import-sql');await fs.mkdir(out,{recursive:false});
const setup=`insert into public.import_runs(id,source_config_id,started_at,ended_at,status,scope_key,complete,requests,pages,discovered,staged,published,rejected,errors,snapshot_dir,collector_version) select ${run},c.id,${lit(m.started_at)}::timestamptz,${lit(m.finished_at)}::timestamptz,'review_required','shopify_public_feed',true,${m.requests},${m.pages.length},${rows.length},0,0,0,'[]'::jsonb,${lit(dir.replaceAll('\\','/'))},'audit-refresh-1' from public.source_configs c join public.brands b on b.id=c.brand_id where b.slug=${brand} and c.scope_key='catalogue' and c.adapter_kind='shopify_feed' and c.price_unit='major_decimal' on conflict(id) do nothing;`;
await fs.writeFile(path.join(out,'setup.sql'),setup,{flag:'wx'});const files=[];
for(let i=0;i<rows.length;i+=20){const file=`batch-${String(i/20+1).padStart(3,'0')}.sql`,payload=lit(JSON.stringify(rows.slice(i,i+20)));const query=`with input as (select value p from jsonb_array_elements(${payload}::jsonb)), target as (select r.id,r.source_config_id from public.import_runs r join public.source_configs c on c.id=r.source_config_id join public.brands b on b.id=c.brand_id where r.id=${run} and b.slug=${brand} and c.scope_key='catalogue' and c.adapter_kind='shopify_feed' and c.price_unit='major_decimal') insert into public.staged_catalogue_records(source_config_id,import_run_id,external_product_id,external_variant_id,payload,content_hash,observed_at) select t.source_config_id,t.id,p->>'external_product_id','__PRODUCT__',p,p->>'content_hash',(p->>'observed_at')::timestamptz from input cross join target t on conflict(import_run_id,external_product_id,external_variant_id) do nothing;`;await fs.writeFile(path.join(out,file),query,{flag:'wx'});files.push(file);}
await fs.writeFile(path.join(out,'finish.sql'),`update public.import_runs r set staged=(select count(*) from public.staged_catalogue_records s where s.import_run_id=r.id) where r.id=${run} returning id,staged;`,{flag:'wx'});
await fs.writeFile(path.join(out,'manifest.json'),JSON.stringify({run_id:runId,brand:m.brand,capture_sha256:sha(manifestBytes),price_unit:'major_decimal',products:rows.length,variants:variantIds.size,files},null,2),{flag:'wx'});
console.log(JSON.stringify({run_id:runId,brand:m.brand,products:rows.length,variants:variantIds.size,batches:files.length,out}));
