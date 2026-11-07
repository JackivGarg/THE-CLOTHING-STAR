import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import {stableContentHash} from './collector-utils.mjs';
const script=path.resolve('scripts/recover-bonkers-checkpoint.mjs');
async function fixture(){
 const cwd=await fs.mkdtemp(path.join(os.tmpdir(),'bonkers-recover-test-')), root=path.join(cwd,'data/catalogue'), dir=path.join(root,'bonkers-detail-test');await fs.mkdir(path.join(dir,'validated'),{recursive:true});
 const url='https://www.bonkerscorner.com/products/example', source=Buffer.from(JSON.stringify({id:123})), hash=crypto.createHash('sha256').update(source).digest('hex'), robots=Buffer.from('User-agent: *\nAllow: /\n'), robotsHash=crypto.createHash('sha256').update(robots).digest('hex'), observed='2026-01-01T00:00:00Z';
 let row={external_product_id:'123',source_url:url,observed_at:observed,variants:[{}],images:[],validation_errors:[]};row.content_hash=stableContentHash(row);
 let raw={brand:'bonkers-corner',requests:3,max_requests:10000,pages:[{source_url:url,detail_url:url+'.js',status:200,observed_at:observed,sha256:hash,snapshot:'raw-002.json.gz',external_product_id:'123'}],errors:[],robots_sha256:robotsHash};let v={requests:3,products:1,variants:1,images:0,batch_files:['batch-001.json'],price_unit:'minor_integer',raw_manifest:'../manifest.json'};
 await Promise.all([fs.writeFile(path.join(dir,'robots.txt'),robots),fs.writeFile(path.join(dir,'raw-002.json.gz'),zlib.gzipSync(source)),fs.writeFile(path.join(dir,'raw-003.json.gz'),'orphan'),fs.writeFile(path.join(dir,'manifest.json'),JSON.stringify(raw)),fs.writeFile(path.join(dir,'validated/manifest.json'),JSON.stringify(v)),fs.writeFile(path.join(dir,'validated/batch-001.json'),JSON.stringify([row])),fs.writeFile(path.join(dir,'validated/batch-002.json'),'orphan')]);return {cwd,root,dir};
}
function run(f){return spawnSync(process.execPath,[script,f.dir],{cwd:f.cwd,encoding:'utf8'});}
test('recovers committed checkpoint only, preserves orphan and marks unknown request',async()=>{const f=await fixture();let r=run(f);assert.equal(r.status,0,r.stderr);let raw=JSON.parse(await fs.readFile(path.join(f.dir,'manifest.json'))),v=JSON.parse(await fs.readFile(path.join(f.dir,'validated/manifest.json')));assert.equal(raw.stop_reason,'collector_interrupted');assert.equal(raw.finished_at,v.finished_at);assert.deepEqual(raw.recovery.orphans,{snapshots:['raw-003.json.gz'],batches:['batch-002.json']});assert.match(raw.recovery.request_outcome,/unknown/);assert.equal(await fs.readFile(path.join(f.dir,'raw-003.json.gz'),'utf8'),'orphan');assert.equal(run(f).status,1);});
test('never removes a live collector lock',async()=>{const f=await fixture(),l=path.join(f.root,'bonkers-detail-domain.lock');await fs.writeFile(l,JSON.stringify({pid:process.pid}));let r=run(f);assert.notEqual(r.status,0);assert.match(r.stderr,/process may be alive/);assert.equal(JSON.parse(await fs.readFile(l)).pid,process.pid);});
test('refuses corrupt snapshot without changing manifests',async()=>{const f=await fixture(),p=path.join(f.dir,'manifest.json'),before=await fs.readFile(p,'utf8');await fs.writeFile(path.join(f.dir,'raw-002.json.gz'),zlib.gzipSync('corrupt'));let r=run(f);assert.notEqual(r.status,0);assert.equal(await fs.readFile(p,'utf8'),before);});
