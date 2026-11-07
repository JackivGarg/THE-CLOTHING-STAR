import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import {previewCategory as category} from './preview-category.mjs';
import {previewAudience} from './preview-audience.mjs';
import {extractAttributeEvidence} from './attribute-evidence.mjs';
const root='data/catalogue';
const registry=JSON.parse(await fs.readFile('brand-registry.json','utf8'));
const rows=new Map();
for(const brand of registry.brands){
 if(brand.collection_enabled===false)continue;
 try{const snap=JSON.parse(zlib.gunzipSync(await fs.readFile(path.join(root,brand.slug,'catalogue.snapshot.json.gz'))));
 for(const r of snap.products){const key=brand.slug+':'+r.source_product_id;let p=rows.get(key);if(!p){p={...r,external_product_id:r.source_product_id,brand:brand.name,brand_slug:brand.slug,variants:[]};rows.set(key,p);}p.variants.push({id:r.source_variant_id,size:r.size_raw,colour:r.colour_raw,price_minor:r.price_minor,available:r.available,source_options:r.source_options});}
 }catch(e){if(e.code!=='ENOENT')throw e;}
}
for(const dir of await fs.readdir(root,{withFileTypes:true})){
 if(!dir.isDirectory()||!/^(bonkers-bounded-|bonkers-detail-)/.test(dir.name))continue;
 const base=path.join(root,dir.name,'validated');let marker,bytes;
 try{marker=JSON.parse(await fs.readFile(path.join(base,'import-verified.json'),'utf8'));bytes=await fs.readFile(path.join(base,'manifest.json'));}catch(e){if(e.code==='ENOENT')continue;throw e;}
 if(marker.manifest_sha256!==crypto.createHash('sha256').update(bytes).digest('hex'))throw Error('Invalid verified manifest');
 const m=JSON.parse(bytes),ids=[];
 for(const file of m.batch_files){if(!/^batch-\d+\.json$/.test(file))throw Error('Unsafe batch');for(const r of JSON.parse(await fs.readFile(path.join(base,file),'utf8'))){ids.push(r.external_product_id);rows.set('bonkers-corner:'+r.external_product_id,{...r,brand:'Bonkers Corner',brand_slug:'bonkers-corner',variants:r.variants.map(v=>({id:v.external_variant_id,size:v.size_raw,colour:v.colour_raw,price_minor:v.price_minor,available:v.available,source_options:v.source_options}))});}}
 if(ids.length!==m.products||ids.slice().sort().join()!=marker.product_ids.slice().sort().join())throw Error('Verified IDs mismatch');
}
function httpsUrl(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}}
const products=[...rows.values()].map(r=>{const images=(r.images??[]).map(im=>({url:httpsUrl(im.src),alt:im.alt??null,source_id:im.id??null,variant_ids:im.variant_ids??[],position:im.position??null})).filter(im=>im.url);const evidence=extractAttributeEvidence(r,{brand:r.brand_slug});const themes=[...new Set(evidence.filter(e=>e.attribute_key==='theme').map(e=>e.value_text))];const printEvidence=evidence.filter(e=>e.attribute_key==='print_theme');return {id:r.brand_slug+':'+r.external_product_id,brand:r.brand,brand_slug:r.brand_slug,title:r.title,category:category(r),...previewAudience(r),fit:null,themes,print_themes:[...new Set(printEvidence.map(e=>e.value_text))],theme_evidence:printEvidence[0]?.excerpt??null,variants:r.variants,observed_at:r.observed_at,image_url:httpsUrl(r.source_featured_image_url)??images[0]?.url??null,images,source_url:r.source_url,synthetic:false};});
await fs.writeFile(path.join(root,'local-preview.json'),JSON.stringify({created_at:new Date().toISOString(),products}));
console.log(JSON.stringify({products:products.length,variants:products.reduce((n,p)=>n+p.variants.length,0)}));
