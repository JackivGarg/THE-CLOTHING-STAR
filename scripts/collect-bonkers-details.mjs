import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import robotsParser from 'robots-parser';
import { normalizeBonkersProduct } from './bonkers-normalize.mjs';
import { stableContentHash } from './collector-utils.mjs';

// Explicitly initiated per-run CLI; no database credential or writes.
// Usage: node scripts/collect-bonkers-details.mjs [--exclude <json-array-of-urls>] [--limit <1..10000>]
const args = process.argv.slice(2); let exclusionPath = null, cap = 100;
for (let i=0; i<args.length; i++) {
  if (args[i] === '--exclude' && args[i+1]) exclusionPath = args[++i];
  else if (args[i] === '--limit' && args[i+1]) cap = Number(args[++i]);
  else throw Error('Usage: collect-bonkers-details.mjs [--exclude <JSON URL array>] [--limit 1..10000]');
}
if (!Number.isInteger(cap) || cap<1 || cap>10000) throw Error('Request limit must be an integer from 1 to 10000');
const root = path.resolve('data/catalogue');
const base = 'https://www.bonkerscorner.com';
const lockPath=path.join(root,'bonkers-detail-domain.lock');
const lock=await fs.open(lockPath,'wx');
await lock.writeFile(JSON.stringify({pid:process.pid,created_at:new Date().toISOString(),domain:base})); await lock.close();
let retainLock=false;
try {
const ua = 'TheClothingStarCatalogueCollector';
const candidatePath = path.join(root,'sitemap-discovery/bonkers-corner/candidates.json.gz');
const entries = JSON.parse(zlib.gunzipSync(await fs.readFile(candidatePath)).toString('utf8'));
if (!Array.isArray(entries)) throw Error('Invalid discovery candidates');
const validUrl = value => {
  try { const u=new URL(value); return u.origin===base && /^\/products\/[a-z0-9][a-z0-9-]*$/.test(u.pathname) && !u.search && !u.hash ? u.href : null; } catch { return null; }
};
const skip = new Set();
if (exclusionPath) {
  const exclusions=JSON.parse(await fs.readFile(exclusionPath,'utf8'));
  if (!Array.isArray(exclusions) || exclusions.some(x=>typeof x!=='string'||!validUrl(x))) throw Error('Exclusion file must be a JSON array of valid Bonkers product URLs');
  exclusions.forEach(x=>skip.add(validUrl(x)));
}
// Existing feed snapshot has already been staged; failures/partial prior runs remain eligible.
const original=JSON.parse(zlib.gunzipSync(await fs.readFile(path.join(root,'bonkers-corner/catalogue.snapshot.json.gz'))).toString('utf8'));
for (const row of original.products || []) if(validUrl(row.source_url)) skip.add(validUrl(row.source_url));
// Count only source URLs in completed validated manifests; never treat a failed response as success.
for (const d of await fs.readdir(root,{withFileTypes:true})) {
  if (!d.isDirectory() || !/^(bonkers-bounded-|bonkers-detail-)/.test(d.name)) continue;
  const vdir=path.join(root,d.name,'validated'); let m, marker, manifestBytes;
  try { manifestBytes=await fs.readFile(path.join(vdir,'manifest.json')); m=JSON.parse(manifestBytes); }
  catch (e) { if (e.code==='ENOENT') continue; throw e; }
  try { marker=JSON.parse(await fs.readFile(path.join(vdir,'import-verified.json'),'utf8')); }
  catch (e) { if (e.code==='ENOENT' && m.finished_at && m.products>0) throw Error(`Unverified completed run ${d.name}; resume and verify DB import before collection`); if(e.code==='ENOENT') continue; throw e; }
  if (!marker.verified_at || marker.manifest_sha256!==crypto.createHash('sha256').update(manifestBytes).digest('hex') || !Array.isArray(marker.product_ids)) throw Error(`Invalid import verification marker: ${d.name}`);
  if (m.price_unit!=='minor_integer' || !Array.isArray(m.batch_files) || !Number.isInteger(m.products)) throw Error(`Invalid prior manifest: ${d.name}`);
  let count=0; const priorIds=[]; const priorUrls=[];
  for(const file of m.batch_files) {
    if (!/^batch-\d+\.json$/.test(file)) throw Error(`Unsafe prior batch path: ${d.name}`);
    const rows=JSON.parse(await fs.readFile(path.join(vdir,file),'utf8')); if(!Array.isArray(rows))throw Error('Invalid prior batch');
    for(const row of rows) { if(!validUrl(row.source_url) || !row.external_product_id || row.validation_errors?.length)throw Error('Invalid prior record'); priorUrls.push(validUrl(row.source_url)); priorIds.push(row.external_product_id); count++; }
  }
  if(count!==m.products || !m.finished_at || new Set(priorIds).size!==count || marker.product_ids.length!==count || [...marker.product_ids].sort().join('\n')!==[...priorIds].sort().join('\n')) throw Error(`Prior imported manifest mismatch: ${d.name}`);
  priorUrls.forEach(url=>skip.add(url));
}
// Title hints determine scheduling only; no category/gender inference is written to product data.
function bucket(title) {
 const t=String(title||'').toLowerCase();
 const cat=/hoodie|sweatshirt|sweater|knit|pullover/.test(t)?'01_winter':/jeans|pants|trouser|jogger|shorts|cargo/.test(t)?'02_bottoms':/t-shirt|tshirt|tee/.test(t)?'03_tees':/shirt/.test(t)?'04_shirts':/jacket|coat|vest/.test(t)?'05_outer':'06_other';
 const gender=/\bwomen\b|\bwomens\b|\bwomen's\b|\bgirl\b/.test(t)?'women':/\bmen\b|\bmens\b|\bmen's\b|\bboy\b/.test(t)?'men':'unspecified';
 return `${cat}_${gender}`;
}
const unique=new Set(), groups=new Map();
for(const entry of entries){const u=validUrl(entry.source_url);if(!u || skip.has(u)||unique.has(u))continue;unique.add(u);const key=bucket(entry.title);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(u);}
const keys=[...groups.keys()].sort(), scheduled=[];
while(true){let added=false;for(const key of keys){const u=groups.get(key).shift();if(u){scheduled.push(u);added=true;}}if(!added)break;}
async function ensureDiskSpace(){const st=await fs.statfs(root);const available=Number(st.bavail)*Number(st.bsize);if(!Number.isFinite(available)||available<256*1024*1024)throw Object.assign(Error('disk_space_below_256_mib'),{code:'LOW_DISK_SPACE'});}
const cooldownPath=path.join(root,'bonkers-detail-domain-cooldown.json');
try { const cooldown=JSON.parse(await fs.readFile(cooldownPath,'utf8')); if(cooldown.manual_review_required) throw Error('Domain access restricted; operator review required before collection'); if(!Number.isFinite(Date.parse(cooldown.until))) throw Error('Invalid domain cooldown; operator review required'); if(Date.parse(cooldown.until)>Date.now()) throw Error(`Domain cooldown active until ${cooldown.until}`); } catch(e) {if(e.code!=='ENOENT')throw e;}
const runDir=path.join(root,`bonkers-detail-${new Date().toISOString().replace(/[:.]/g,'-')}-${crypto.randomUUID().slice(0,8)}`);
await fs.mkdir(runDir,{recursive:false});await fs.mkdir(path.join(runDir,'validated'));
const raw={brand:'bonkers-corner',started_at:new Date().toISOString(),user_agent:ua,scope:'sitemap detail candidates',max_requests:cap,requests:0,pages:[],errors:[],complete:false,robots_sha256:null,stop_reason:null};
const validated={started_at:raw.started_at,status:'partial',price_unit:'minor_integer',requests:0,products:0,variants:0,images:0,batch_files:[],raw_manifest:'../manifest.json',validation_errors:[],request_errors:[]};
const sha = data=>crypto.createHash('sha256').update(data).digest('hex');
async function atomic(file,bytes){const tmp=`${file}.${crypto.randomUUID()}.tmp`;await fs.writeFile(tmp,bytes,{flag:'wx'});await fs.rename(tmp,file);}
async function checkpoint(){validated.requests=raw.requests;validated.request_errors=raw.errors;await atomic(path.join(runDir,'manifest.json'),JSON.stringify(raw,null,2));await atomic(path.join(runDir,'validated/manifest.json'),JSON.stringify(validated,null,2));}
async function recordRestriction(response){
 const status=response.status, retry=response.headers.get('retry-after');
 if(![401,403,429].includes(status)&&!(retry&&!response.ok)) return;
 let until=null, manual=[401,403].includes(status);
 if(retry && /^\d+$/.test(retry.trim())) {const seconds=Number(retry.trim()); if(Number.isSafeInteger(seconds)&&seconds<=31536000)until=new Date(Date.now()+seconds*1000).toISOString();}
 else if(retry && Number.isFinite(Date.parse(retry))) until=new Date(Math.max(Date.now(),Date.parse(retry))).toISOString();
 if(!until)manual=true;
 await atomic(cooldownPath,JSON.stringify({status,retry_after:retry,until,manual_review_required:manual,observed_at:new Date().toISOString()}));
}
let lastSent=0; async function request(url){
 if(raw.requests>=cap)throw Error('request_cap');
 await ensureDiskSpace();
 const delay=Math.max(0,1100-(Date.now()-lastSent));if(delay)await new Promise(r=>setTimeout(r,delay));
 // Reserve and persist before issuing request; failures and redirects consume budget.
 raw.requests++;await checkpoint();lastSent=Date.now();
 const response=await fetch(url,{headers:{'user-agent':ua,accept:'application/json,text/plain,*/*'},redirect:'manual',signal:AbortSignal.timeout(20000)});
 try { await recordRestriction(response); } catch(e) { retainLock=true; throw Object.assign(Error('restriction_state_persist_failed'),{code:'RESTRICTION_PERSIST_FAILED',cause:e}); } return response;
}
async function boundedBody(response,maxBytes){const reader=response.body?.getReader();if(!reader)return Buffer.alloc(0);const chunks=[];let size=0;while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>maxBytes){await reader.cancel();throw Error('response_too_large');}chunks.push(Buffer.from(value));}return Buffer.concat(chunks);}
let robots;
try {
 const rr=await request(`${base}/robots.txt`);if(!rr.ok)throw Error(`robots_http_${rr.status}`);
 const rb=await boundedBody(rr,1000000);raw.robots_sha256=sha(rb);await atomic(path.join(runDir,'robots.txt'),rb);robots=robotsParser(`${base}/robots.txt`,rb.toString('utf8'));await checkpoint();
 for(const sourceUrl of scheduled){
  if(raw.requests>=cap){raw.stop_reason='request_cap';break;}
  const detailUrl=sourceUrl+'.js';if(robots.isAllowed(detailUrl,ua)!==true){raw.errors.push({sourceUrl,error:'robots_disallowed'});await checkpoint();continue;}
  try {
   const response=await request(detailUrl), observedAt=new Date().toISOString();
   const retryAfter = response.headers.get('retry-after');
   if ([401, 403, 429].includes(response.status) || (!response.ok && retryAfter)) {
    raw.errors.push({sourceUrl,status:response.status,error:`http_${response.status}_stop`,retry_after:retryAfter});
    raw.stop_reason='access_or_rate_limit';
    await checkpoint();
    break;
   }
   if(!response.ok){raw.errors.push({sourceUrl,error:`http_${response.status}`,retry_after:response.headers.get('retry-after')});await checkpoint();continue;}
   const body=await boundedBody(response,5000000), hash=sha(body), filename=`raw-${String(raw.requests).padStart(3,'0')}.json.gz`;
   const p=JSON.parse(body.toString('utf8'));
   if(!Number.isSafeInteger(p.id)||!Array.isArray(p.variants)||p.variants.some(v=>!Number.isSafeInteger(v.id)))throw Error('unsafe_or_missing_id');
   const product=normalizeBonkersProduct({...p,product_type:p.type||p.product_type},{sourceUrl,priceUnit:'minor_integer',observedAt});
   for(const image of product.images)if(image.src){
    image.src=new URL(image.src,sourceUrl).href;
    const media=(p.media||[]).find(m=>m.media_type==='image'&&m.src&&new URL(m.src,sourceUrl).href===image.src);
    if(media){image.source_media_id=Number.isSafeInteger(media.id)?String(media.id):null;image.alt=media.alt??image.alt;image.width=media.width??image.width;image.height=media.height??image.height;}
    const featured=p.variants.map(v=>v.featured_image).find(f=>f?.src&&new URL(f.src,sourceUrl).href===image.src);
    if(featured){image.id=Number.isSafeInteger(featured.id)?String(featured.id):image.id;image.variant_ids=(featured.variant_ids||[]).filter(Number.isSafeInteger).map(String);image.alt=featured.alt??image.alt;image.width=featured.width??image.width;image.height=featured.height??image.height;}
   }
   product.source_featured_image_url=p.featured_image?new URL(p.featured_image,sourceUrl).href:null;
   if(product.validation_errors.length||!product.variants.length)throw Error('normalization_validation');
   product.content_hash=stableContentHash(product);
   const batch=`batch-${String(validated.products+1).padStart(3,'0')}.json`;
   await atomic(path.join(runDir,filename),zlib.gzipSync(body));
   await atomic(path.join(runDir,'validated',batch),JSON.stringify([product]));
   raw.pages.push({source_url:sourceUrl,detail_url:detailUrl,status:response.status,observed_at:observedAt,sha256:hash,snapshot:filename,external_product_id:product.external_product_id});
   validated.batch_files.push(batch);validated.products++;validated.variants+=product.variants.length;validated.images+=product.images.length;
   await checkpoint();console.log(JSON.stringify({sourceUrl,products:validated.products,requests:raw.requests}));
  } catch(e){
   const reason=String(e.code||e.message||e);raw.errors.push({sourceUrl,error:reason});
   if(e.code==='ENOSPC'||e.code==='LOW_DISK_SPACE'||e.code==='RESTRICTION_PERSIST_FAILED'||reason.includes('ENOSPC')){raw.stop_reason='disk_full';break;}
   await checkpoint();
  }
 }
 if(!raw.stop_reason)raw.stop_reason='candidate_list_exhausted';
} catch(e) {raw.stop_reason=String(e.code||e.message||e);}
raw.finished_at=new Date().toISOString();validated.finished_at=raw.finished_at;
try{await checkpoint();}catch(e){console.error(`Final checkpoint failed: ${e.code||e.message}`);process.exitCode=1;}
console.log(JSON.stringify({runDir,requests:raw.requests,products:validated.products,variants:validated.variants,images:validated.images,errors:raw.errors.length,stop_reason:raw.stop_reason}));

} finally { if(!retainLock) await fs.unlink(lockPath); else console.error('Domain lock retained: restriction state could not be persisted; operator review required.'); }
