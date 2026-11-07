import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

// Split one prepared SQL batch without modifying source bytes, touching the DB,
// or converting source JSON through JS number precision. Output manifests are explicit.
const [input, maxArg='40000'] = process.argv.slice(2);
const max=Number(maxArg);
if(!input || process.argv.length>4 || !Number.isSafeInteger(max) || max<1024 || max>40000) throw Error('Usage: node scripts/split-feed-sql-batch.mjs <batch.sql> [max statement bytes <= 40000]');
const source=fs.readFileSync(input,'utf8');
const marker="jsonb_array_elements('";
const at=source.indexOf(marker);
if(at<0 || source.indexOf(marker,at+marker.length)>=0) throw Error('Expected exactly one supported jsonb_array_elements SQL literal');
const start=at+marker.length; let encoded='', end=-1;
for(let i=start;i<source.length;i++) {
 const c=source[i];if(c!=="'"){encoded+=c;continue;}
 if(source[i+1]==="'"){encoded+="'";i++;continue;}
 end=i;break;
}
if(end<0 || !source.slice(end).startsWith("'::jsonb)")) throw Error('Malformed SQL string literal');
const prefix=source.slice(0,start),suffix=source.slice(end); const original=encoded;
// Split at top-level JSON array commas while preserving exact lexical contents.
if(!original.startsWith('[')||!original.endsWith(']'))throw Error('Expected compact JSON array');
let parts=[], startItem=1, depth=0, quoted=false, escaped=false;
for(let i=1;i<original.length-1;i++){
 const c=original[i];
 if(quoted){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c==='"')quoted=false;continue;}
 if(c==='"'){quoted=true;continue;}
 if(c==='{'||c==='[')depth++;else if(c==='}'||c===']')depth--;
 if(depth<0)throw Error('Invalid JSON nesting');
 if(c===','&&depth===0){parts.push(original.slice(startItem,i));startItem=i+1;}
}
if(quoted||depth!==0)throw Error('Invalid JSON syntax');
if(original.length>2)parts.push(original.slice(startItem,-1));
if(!parts.length || parts.some(p=>!p.startsWith('{')||!p.endsWith('}')))throw Error('Expected nonempty compact array of objects');
// Parse only to reject malformed JSON; never serialize parsed values back to SQL.
const parsed=JSON.parse(original);
const ids=new Set();
for(const p of parsed) {
 if(!p || typeof p.external_product_id!=='string' || !p.external_product_id || ids.has(p.external_product_id)) throw Error('Missing or duplicate product identity: split would alter conflict semantics');
 ids.add(p.external_product_id);
}
if('['+parts.join(',')+']'!==original)throw Error('JSON splitting did not preserve source');
const esc=s=>s.replaceAll("'","''");
const sql=xs=>prefix+esc('['+xs.join(',')+']')+suffix;
let pieces=[],current=[];
for(let index=0;index<parts.length;index++){
 const item=parts[index];if(Buffer.byteLength(sql([item]),'utf8')>max)throw Error(`Product at zero-based index ${index} requires ${Buffer.byteLength(sql([item]),'utf8')} bytes, exceeds ${max}; no output created`);
 if(current.length && Buffer.byteLength(sql([...current,item]),'utf8')>max){pieces.push(current);current=[];}
 current.push(item);
}
if(current.length)pieces.push(current);
const sha=v=>crypto.createHash('sha256').update(v).digest('hex');
const output=path.resolve(path.dirname(input),'split-batches',`${path.basename(input,'.sql')}-${crypto.randomUUID()}`);fs.mkdirSync(output,{recursive:true});
const files=pieces.map((piece,i)=>{const filename=`part-${String(i+1).padStart(4,'0')}.sql`,body=sql(piece);fs.writeFileSync(path.join(output,filename),body,{flag:'wx'});return {filename,products:piece.length,bytes:Buffer.byteLength(body),sha256:sha(body),item_sha256:piece.map(sha)};});
const manifest={source:path.resolve(input),source_sha256:sha(source),source_json_sha256:sha(original),source_products:parts.length,max_statement_bytes:max,files};
fs.writeFileSync(path.join(output,'manifest.json'),JSON.stringify(manifest,null,2),{flag:'wx'});
console.log(JSON.stringify({output,source_products:parts.length,parts:files.length,source_sha256:manifest.source_sha256}));
