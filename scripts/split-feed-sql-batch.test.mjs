import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import crypto from 'node:crypto';
const script=path.resolve('scripts/split-feed-sql-batch.mjs'),marker="jsonb_array_elements('";
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
function fixture(items){let dir=fs.mkdtempSync(path.join(os.tmpdir(),'feed-split-')),file=path.join(dir,'batch.sql'),json=JSON.stringify(items),sql=`with input as (select value p from ${marker}${json.replaceAll("'","''")}'::jsonb)) select * from input;`;fs.writeFileSync(file,sql);return {dir,file,json};}
function invoke(f,max='1200'){return spawnSync(process.execPath,[script,f.file,max],{encoding:'utf8'});}
function extract(s){const a=s.indexOf(marker)+marker.length;let x='';for(let i=a;i<s.length;i++){if(s[i]==="'"){if(s[i+1]==="'"){x+="'";i++;}else return x;}else x+=s[i];}throw Error('unterminated');}
test('splits exact source JSON and maintains ordered products and hashes',()=>{const items=Array.from({length:12},(_,i)=>({external_product_id:String(9007199254740000n+BigInt(i)),title:`Men's जैकेट ${i}`,text:'a'.repeat(170)})),f=fixture(items),r=invoke(f);assert.equal(r.status,0,r.stderr);let result=JSON.parse(r.stdout),m=JSON.parse(fs.readFileSync(path.join(result.output,'manifest.json'))),pieces=m.files.map(x=>{let b=fs.readFileSync(path.join(result.output,x.filename));assert.equal(hash(b),x.sha256);assert.ok(b.length<=1200);return extract(b.toString());});assert.equal('['+pieces.map(x=>x.slice(1,-1)).join(',')+']',f.json);assert.equal(m.source_products,items.length);assert.equal(m.files.reduce((n,x)=>n+x.products,0),items.length);assert.equal(m.source_json_sha256,hash(f.json));assert.ok(m.files.length>1);});
test('rejects oversized single product without output',()=>{const f=fixture([{external_product_id:'1',title:'x'.repeat(1400)}]),r=invoke(f);assert.notEqual(r.status,0);assert.match(r.stderr,/exceeds 1200/);assert.equal(fs.existsSync(path.join(f.dir,'split-batches')),false);});
test('rejects duplicate identity across pieces',()=>{const f=fixture([{external_product_id:'1'},{external_product_id:'1'}]),r=invoke(f);assert.notEqual(r.status,0);assert.match(r.stderr,/duplicate product identity/);});
