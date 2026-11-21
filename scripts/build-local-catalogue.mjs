import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import {previewCategory as category} from './preview-category.mjs';
import {previewAudience} from './preview-audience.mjs';
import {extractAttributeEvidence} from './attribute-evidence.mjs';
import {mergePreviewRefresh} from './merge-preview-refresh.mjs';
import {previewBonkersGarmentColour} from './product-colour-evidence.mjs';
const root='data/catalogue';
const registry=JSON.parse(await fs.readFile('brand-registry.json','utf8'));
const rows=new Map();
for(const brand of registry.brands){
 if(brand.collection_enabled===false)continue;
 try{const snap=JSON.parse(zlib.gunzipSync(await fs.readFile(path.join(root,brand.slug,'catalogue.snapshot.json.gz'))));
 for(const r of snap.products){const key=brand.slug+':'+r.source_product_id;let p=rows.get(key);if(!p){p={...r,external_product_id:r.source_product_id,brand:brand.name,brand_slug:brand.slug,variants:[]};rows.set(key,p);}p.variants.push({id:r.source_variant_id,size:r.size_raw,colour:r.colour_raw,price_minor:r.price_minor,available:r.available,source_options:r.source_options,observed_at:r.observed_at});}
 }catch(e){if(e.code!=='ENOENT')throw e;}
}
for(const dir of await fs.readdir(root,{withFileTypes:true})){
 if(!dir.isDirectory()||!/^(bonkers-bounded-|bonkers-detail-)/.test(dir.name))continue;
 const base=path.join(root,dir.name,'validated');let marker,bytes;
 try{marker=JSON.parse(await fs.readFile(path.join(base,'import-verified.json'),'utf8'));bytes=await fs.readFile(path.join(base,'manifest.json'));}catch(e){if(e.code==='ENOENT')continue;throw e;}
 if(marker.manifest_sha256!==crypto.createHash('sha256').update(bytes).digest('hex'))throw Error('Invalid verified manifest');
 const m=JSON.parse(bytes),ids=[];
 for(const file of m.batch_files){if(!/^batch-\d+\.json$/.test(file))throw Error('Unsafe batch');for(const r of JSON.parse(await fs.readFile(path.join(base,file),'utf8'))){ids.push(r.external_product_id);rows.set('bonkers-corner:'+r.external_product_id,{...r,brand:'Bonkers Corner',brand_slug:'bonkers-corner',variants:r.variants.map(v=>({id:v.external_variant_id,size:v.size_raw,colour:v.colour_raw,price_minor:v.price_minor,available:v.available,source_options:v.source_options,observed_at:r.observed_at}))});}}
 if(ids.length!==m.products||ids.slice().sort().join()!=marker.product_ids.slice().sort().join())throw Error('Verified IDs mismatch');
}
// Overlay only refreshes whose immutable payload was matched to imported database records.
for (const brand of registry.brands) {
 if (brand.collection_enabled === false) continue;
 const base = path.join(root, brand.slug + '-refresh');
 let directories;
 try { directories = await fs.readdir(base, {withFileTypes:true}); }
 catch (e) { if (e.code === 'ENOENT') continue; throw e; }
 for (const directory of directories.filter(entry => entry.isDirectory()).sort((a,b) => a.name.localeCompare(b.name))) {
  const run = path.join(base, directory.name);
  let markerBytes, captureBytes, recordBytes;
  try {
   markerBytes = await fs.readFile(path.join(run, 'verified-preview-manifest.json'));
   captureBytes = await fs.readFile(path.join(run, 'manifest.json'));
   recordBytes = await fs.readFile(path.join(run, 'verified-preview.json.gz'));
  } catch (e) { if (e.code === 'ENOENT') continue; throw e; }
  const marker = JSON.parse(markerBytes), capture = JSON.parse(captureBytes);
  const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
  if (marker.brand !== brand.slug || marker.run_id !== capture.run_id ||
      marker.source_manifest_sha256 !== digest(captureBytes) || marker.records_sha256 !== digest(recordBytes)) {
   throw Error('Verified refresh manifest mismatch: ' + run);
  }
  const records = JSON.parse(zlib.gunzipSync(recordBytes, {maxOutputLength:150000000}));
  const pairs = records.map(record => record.external_product_id + ':' + record.content_hash).sort();
  const fingerprint = crypto.createHash('md5').update(pairs.join(',')).digest('hex');
  if (records.length !== marker.products || fingerprint !== marker.database_fingerprint ||
      new Set(records.map(record => record.external_product_id)).size !== records.length) {
   throw Error('Verified refresh content mismatch: ' + run);
  }
  for (const record of records) {
   const key = brand.slug + ':' + record.external_product_id;
   rows.set(key, mergePreviewRefresh(rows.get(key), record, brand));
  }
 }
}
function httpsUrl(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}}
const products = [...rows.values()].map(record => {
 const images = (record.images ?? []).map(image => ({
  url:httpsUrl(image.src), alt:image.alt ?? null, source_id:image.id ?? null,
  variant_ids:image.variant_ids ?? [], position:image.position ?? null,
 })).filter(image => image.url);
 const evidence = extractAttributeEvidence(record, {brand:record.brand_slug});
 const themes = [...new Set(evidence.filter(item => item.attribute_key === 'theme').map(item => item.value_text))];
 const prints = evidence.filter(item => item.attribute_key === 'print_theme');
 const fits = [...new Set(evidence.filter(item => item.attribute_key === 'fit' && item.evidence_level === 'explicit').map(item => item.value_text))];
 const garment = category(record);
 return {
  id:record.brand_slug + ':' + record.external_product_id,
  brand:record.brand, brand_slug:record.brand_slug, title:record.title,
  description_text:record.description_text ?? null, category:garment, ...previewAudience(record),
  fit:null, fits, themes, print_themes:[...new Set(prints.map(item => item.value_text))],
  theme_evidence:prints[0]?.excerpt ?? null,
  garment_colour_evidence:previewBonkersGarmentColour(record, garment),
  variants:record.variants, observed_at:record.observed_at,
  image_url:httpsUrl(record.source_featured_image_url) ?? images[0]?.url ?? null,
  images, source_url:record.source_url, synthetic:false,
 };
});
await fs.writeFile(path.join(root,'local-preview.json'),JSON.stringify({created_at:new Date().toISOString(),products}));
console.log(JSON.stringify({products:products.length,variants:products.reduce((n,p)=>n+p.variants.length,0)}));
