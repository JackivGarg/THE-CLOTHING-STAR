import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import { extractAttributeEvidence } from './attribute-evidence.mjs';

const root = 'data/catalogue';
const selected = new Map();
const registry = JSON.parse(await fs.readFile('brand-registry.json', 'utf8'));
function add(brand, row) {
  const id = row.external_product_id ?? row.source_product_id;
  if (!id || brand === 'snitch') return;
  const key = brand + ':' + id;
  const existing = selected.get(key);
  if (!existing || Date.parse(row.observed_at) > Date.parse(existing.row.observed_at)) selected.set(key, {brand,row});
}
for (const brand of registry.brands) {
  const filename = path.join(root,brand.slug,'catalogue.snapshot.json.gz');
  try {
    const snapshot = JSON.parse(zlib.gunzipSync(await fs.readFile(filename)));
    for (const row of snapshot.products) add(brand.slug,row);
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
}
for (const entry of await fs.readdir(root,{withFileTypes:true})) {
  if (!entry.isDirectory() || !/^(bonkers-bounded-|bonkers-detail-)/.test(entry.name)) continue;
  const dir = path.join(root,entry.name,'validated');
  let manifest;
  try {
    await fs.access(path.join(dir,'import-verified.json'));
    manifest = JSON.parse(await fs.readFile(path.join(dir,'manifest.json'),'utf8'));
  } catch (error) { if(error.code==='ENOENT')continue; throw error; }
  for (const file of manifest.batch_files) {
    if (!/^batch-\d+\.json$/.test(file)) throw Error('Unsafe manifest batch');
    for (const row of JSON.parse(await fs.readFile(path.join(dir,file),'utf8'))) add('bonkers-corner',row);
  }
}
const evidence = [...selected.values()].flatMap(({brand,row}) => extractAttributeEvidence(row,{brand}));
const out = path.join(root,'attribute-import');
await fs.mkdir(out,{recursive:true});
const quote = value => value == null ? 'null' : "'" + String(value).replaceAll("'","''") + "'";
const files = [];
for (let index=0; index<evidence.length; index+=250) {
  const values = evidence.slice(index,index+250).map(row => '(' + [
    row.store_slug,row.external_product_id,row.attribute_key,row.value_text,row.source_kind,row.source_url,
    row.source_field,row.excerpt,row.evidence_level,row.rule_version,row.observed_at
  ].map(quote).join(',') + ')').join(',\n');
  const sql = `begin;
select pg_advisory_xact_lock(hashtextextended('the-clothing-star:attribute-import',0));
insert into public.product_attribute_evidence(product_id,attribute_key,value_text,source_kind,source_url,source_field,excerpt,evidence_level,review_status,rule_version,observed_at)
select p.id,v.attribute_key,v.value_text,v.source_kind,v.source_url,v.source_field,v.excerpt,v.evidence_level,'pending',v.rule_version,v.observed_at::timestamptz
from (values ${values}) v(brand_slug,external_id,attribute_key,value_text,source_kind,source_url,source_field,excerpt,evidence_level,rule_version,observed_at)
join public.brands b on b.slug=v.brand_slug join public.products p on p.brand_id=b.id and p.source_id=v.external_id
where not exists(select 1 from public.product_attribute_evidence e where e.product_id=p.id and e.attribute_key=v.attribute_key and e.value_text is not distinct from v.value_text and e.source_field is not distinct from v.source_field and e.source_url is not distinct from v.source_url and e.rule_version=v.rule_version);
commit;`;
  const file = `batch-${String(files.length+1).padStart(4,'0')}.sql`;
  await fs.writeFile(path.join(out,file),sql);
  files.push(file);
}
await fs.writeFile(path.join(out,'manifest.json'),JSON.stringify({products:selected.size,evidence:evidence.length,files},null,2));
console.log(JSON.stringify({products:selected.size,evidence:evidence.length,batches:files.length}));
