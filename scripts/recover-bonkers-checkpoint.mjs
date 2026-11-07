import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import { stableContentHash } from './collector-utils.mjs';

// Finalize an interrupted local checkpoint for normal importer validation; no DB or network access.
const [input] = process.argv.slice(2);
if (!input || process.argv.length !== 3) throw Error('Usage: node scripts/recover-bonkers-checkpoint.mjs <run directory>');
const root = path.resolve('data/catalogue');
const dir = path.resolve(input);
if (path.dirname(dir) !== root || !/^bonkers-detail-[\w-]+$/.test(path.basename(dir))) throw Error('Run must be a Bonkers detail directory under data/catalogue');
const lockPath=path.join(root,'bonkers-detail-domain.lock');
let lock;
try { lock=await fs.open(lockPath,'wx'); }
catch(e) {
 if(e.code!=='EEXIST') throw e;
 // Do not unlink or rename an existing lock: PID reuse and concurrent replacement make
 // automated stale-lock removal unsafe. A human can inspect a stale lock first.
 let info='unreadable';
 try {const l=JSON.parse(await fs.readFile(lockPath,'utf8'));if(Number.isSafeInteger(l.pid)&&l.pid>0){try{process.kill(l.pid,0);info='process may be alive';}catch(err){info=err.code==='ESRCH'?'process not found (may be stale)':'process state unknown';}}}catch{}
 throw Error(`Domain lock exists: ${info}; no recovery performed`);
}
let ownsLock=true;
try {
 await lock.writeFile(JSON.stringify({pid:process.pid,created_at:new Date().toISOString(),purpose:'local-checkpoint-recovery'}));await lock.close();lock=null;
 const rawPath=path.join(dir,'manifest.json'), validPath=path.join(dir,'validated/manifest.json');
 const [rawText,validText]=await Promise.all([fs.readFile(rawPath,'utf8'),fs.readFile(validPath,'utf8')]);
 const raw=JSON.parse(rawText), valid=JSON.parse(validText);
 if(raw.finished_at||valid.finished_at) throw Error('Already finished or partially finalized: inspect manifests before retry');
 if(raw.brand!=='bonkers-corner'||!Number.isSafeInteger(raw.requests)||raw.requests<1||raw.requests!==valid.requests||raw.requests>raw.max_requests||
    !Array.isArray(raw.pages)||!Array.isArray(raw.errors)||!Array.isArray(valid.batch_files)||raw.pages.length!==valid.products||valid.batch_files.length!==valid.products||
    valid.price_unit!=='minor_integer'||valid.raw_manifest!=='../manifest.json') throw Error('Inconsistent checkpoint; manual review required');
 const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
 if(sha(await fs.readFile(path.join(dir,'robots.txt')))!==raw.robots_sha256) throw Error('Robots snapshot mismatch');
 const urls=new Set(),ids=new Set(), listedSnapshots=new Set();let variantCount=0,imageCount=0;
 for(let i=0;i<raw.pages.length;i++) {
  const p=raw.pages[i], f=valid.batch_files[i];
  if(!/^raw-\d+\.json\.gz$/.test(p.snapshot)||!/^batch-\d+\.json$/.test(f)||p.status!==200||p.detail_url!==p.source_url+'.js'||
     !/^https:\/\/www\.bonkerscorner\.com\/products\/[\w-]+$/.test(p.source_url)||urls.has(p.source_url)||listedSnapshots.has(p.snapshot))throw Error('Invalid or duplicate checkpoint page');
  const body=zlib.gunzipSync(await fs.readFile(path.join(dir,p.snapshot)));if(sha(body)!==p.sha256)throw Error('Snapshot hash mismatch');
  const source=JSON.parse(body), batch=JSON.parse(await fs.readFile(path.join(dir,'validated',f),'utf8'));
  if(!Array.isArray(batch)||batch.length!==1)throw Error('Invalid checkpoint batch');const row=batch[0];
  if(!Number.isSafeInteger(source.id)||String(source.id)!==row.external_product_id||p.external_product_id!==row.external_product_id||
     row.source_url!==p.source_url||row.observed_at!==p.observed_at||row.content_hash!==stableContentHash(row)||!Array.isArray(row.variants)||!Array.isArray(row.images)||
     row.validation_errors?.length||ids.has(row.external_product_id))throw Error('Checkpoint row mismatch or duplicate merchant ID');
  urls.add(p.source_url);ids.add(row.external_product_id);listedSnapshots.add(p.snapshot);variantCount+=row.variants.length;imageCount+=row.images.length;
 }
 if(variantCount!==valid.variants||imageCount!==valid.images)throw Error('Checkpoint totals mismatch');
 const rawFiles=await fs.readdir(dir), validFiles=await fs.readdir(path.join(dir,'validated'));
 const orphans={snapshots:rawFiles.filter(f=>/^raw-\d+\.json\.gz$/.test(f)&&!listedSnapshots.has(f)),batches:validFiles.filter(f=>/^batch-\d+\.json$/.test(f)&&!valid.batch_files.includes(f))};
 const finished=new Date().toISOString();
 const recovery={recovered_at:finished,reason:'collector_interrupted',request_outcome:'some reserved requests may have unknown outcome; no success inferred',orphans};
 raw.finished_at=finished;raw.stop_reason='collector_interrupted';raw.complete=false;raw.recovery=recovery;
 valid.finished_at=finished;valid.status='partial';valid.recovery=recovery;
 // Backups are exclusive and retained. Two atomic renames cannot be a multi-file
 // transaction: interruption between them is detected and requires manual review.
 await fs.writeFile(path.join(dir,'manifest.before-recovery.json'),rawText,{flag:'wx'});
 await fs.writeFile(path.join(dir,'validated/manifest.before-recovery.json'),validText,{flag:'wx'});
 async function atomic(file,data){const tmp=file+'.'+crypto.randomUUID()+'.tmp';await fs.writeFile(tmp,JSON.stringify(data,null,2),{flag:'wx'});await fs.rename(tmp,file);}
 await atomic(rawPath,raw);await atomic(validPath,valid);
 console.log(JSON.stringify({run:dir,products:valid.products,variants:valid.variants,requests:raw.requests,recovery}));
} finally {
 if(lock)await lock.close();
 if(ownsLock)await fs.unlink(lockPath);
}
