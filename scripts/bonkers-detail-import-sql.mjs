import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { prepareBonkersDetailImport } from './prepare-bonkers-detail-import.mjs';

export function buildBonkersImportSql(data, operation) {
if (!/^(?:setup|finish|\d+)$/.test(operation ?? '')) throw new Error('Invalid SQL operation');
const sql = value => "'" + String(value).replaceAll("'", "''") + "'";
const run = sql(data.runId) + '::uuid';
const scope = "'bonkers_product_detail_js'";
if (operation === 'setup') {
  return `
insert into public.source_configs(brand_id,adapter_kind,source_url,robots_url,robots_checked_at,robots_sha256,feed_allowed,pagination_allowed,price_unit,scope_key,scope_status,access_notes)
select id,'rendered_page','https://www.bonkerscorner.com/collections/all','https://www.bonkerscorner.com/robots.txt',${sql(data.startedAt)}::timestamptz,${sql(data.robotsHash)},true,false,'minor_integer',${scope},'partial','Robots-checked product detail responses from sitemap URLs.'
from public.brands where slug='bonkers-corner' on conflict(brand_id,scope_key) do nothing;
insert into public.import_runs(id,source_config_id,started_at,ended_at,status,scope_key,complete,requests,pages,discovered,rejected,errors,snapshot_dir,collector_version)
select ${run},c.id,${sql(data.startedAt)}::timestamptz,${sql(data.endedAt)}::timestamptz,'partial',${scope},false,${data.requests},${data.products},${data.products+data.errors.length},${data.errors.length},${sql(JSON.stringify(data.errors))}::jsonb,${sql(data.snapshotDir)},'bonkers-detail-1'
from public.source_configs c join public.brands b on b.id=c.brand_id where b.slug='bonkers-corner' and c.scope_key=${scope}
on conflict(id) do nothing;`;
} else if (operation === 'finish') {
  return `update public.import_runs r set staged=(select count(*) from public.staged_catalogue_records s where s.import_run_id=r.id) where r.id=${run} and r.scope_key=${scope} returning id,staged,requests,rejected;`;
} else {
  if (!data.rows.length) throw new Error('Chunk index out of range');
  return `
begin;
select pg_advisory_xact_lock(hashtextextended('the-clothing-star:bonkers-detail-import', 0));
with input as (select value p from jsonb_array_elements(${sql(JSON.stringify(data.rows))}::jsonb)),
target as (select r.id,c.id source_id,c.brand_id from public.import_runs r join public.source_configs c on c.id=r.source_config_id where r.id=${run} and c.scope_key=${scope})
insert into public.staged_catalogue_records(source_config_id,import_run_id,external_product_id,external_variant_id,payload,content_hash,observed_at)
select t.source_id,t.id,p->>'external_product_id','__PRODUCT__',p,p->>'content_hash',(p->>'observed_at')::timestamptz
from input cross join target t
where exists (select 1 from public.staged_product_discoveries d join public.source_configs c on c.id=d.source_config_id where c.brand_id=t.brand_id and d.source_url=p->>'source_url')
and not exists (select 1 from public.staged_catalogue_records s join public.source_configs c on c.id=s.source_config_id where c.brand_id=t.brand_id and (s.external_product_id=p->>'external_product_id' or s.payload->>'source_url'=p->>'source_url'))
on conflict (import_run_id,external_product_id,external_variant_id) do nothing;
commit;`;
}

}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [manifest, operation] = process.argv.slice(2);
  if (!manifest || !/^(?:setup|finish|\d+)$/.test(operation ?? '')) throw new Error('Usage: node scripts/bonkers-detail-import-sql.mjs <validated manifest> <setup|chunk index|finish>');
  const data = prepareBonkersDetailImport(manifest, /^\d+$/.test(operation) ? operation : '0');
  console.log(buildBonkersImportSql(data, operation));
}
