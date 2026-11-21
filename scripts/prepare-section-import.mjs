// Generate one atomic import for a reviewed, ordered chain of collection-grid snapshots.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const files = process.argv.slice(2);
if (!files.length) throw new Error('Supply one collection page manifest per argument in navigation order.');
const pages = files.map(file => JSON.parse(readFileSync(file, 'utf8')));
const [first] = pages;
const collection = new URL(first.source_url);
const registry = JSON.parse(readFileSync(new URL('../brand-registry.json', import.meta.url)));
const brand = registry.brands.find(entry => entry.slug === first.brand && entry.collection_enabled !== false);
if (!brand || collection.origin !== new URL(brand.base_url).origin ||
    !/^\/collections\/[a-z0-9-]+$/.test(collection.pathname) || collection.search) {
  throw new Error('Expected the canonical first page of a registered merchant collection.');
}
const seen = new Set();
for (const [index, page] of pages.entries()) {
  const url = new URL(page.source_url);
  if (page.brand !== first.brand || url.origin !== collection.origin || url.pathname !== collection.pathname ||
      seen.has(url.href) || (index > 0 && pages[index - 1].advertised_next !== url.href) ||
      !Number.isFinite(Date.parse(page.observed_at)) || !/^[0-9a-f]{64}$/.test(page.snapshot_sha256) ||
      !Array.isArray(page.handles) || !page.handles.length ||
      page.handles.some(handle => typeof handle !== 'string' || !/^[a-z0-9][a-z0-9-]*$/i.test(handle))) {
    throw new Error(`Invalid or unexpected page at input ${index + 1}`);
  }
  seen.add(url.href);
}
const next = pages.at(-1).advertised_next;
const scope = `section:${collection.pathname.slice('/collections/'.length)}`;
const digest = createHash('sha256').update(JSON.stringify(pages)).digest('hex');
const run = [digest.slice(0, 8), digest.slice(8, 12), digest.slice(12, 16),
  digest.slice(16, 20), digest.slice(20, 32)].join('-');
const sqlText = value => "'" + String(value).replaceAll("'", "''") + "'";
const checked = pages.map(p => Date.parse(p.observed_at));
const begin = new Date(Math.min(...checked)).toISOString();
const end = new Date(Math.max(...checked)).toISOString();

process.stdout.write(`with manifests as (
  select ${sqlText(JSON.stringify(pages))}::jsonb as pages
), store as (
  select id from public.brands where slug = ${sqlText(brand.slug)} and active
), handles as (
  select distinct h.handle from manifests cross join lateral jsonb_array_elements(pages) page
  cross join lateral jsonb_array_elements_text(page->'handles') h(handle)
), matches as (
  select h.handle, array_agg(p.id) filter (where p.id is not null) as product_ids
  from store cross join handles h left join public.products p on p.brand_id = store.id
    and (p.handle = h.handle or regexp_replace(split_part(p.source_url, '?', 1), '/+$', '') =
      ${sqlText(collection.origin + '/products/')} || h.handle)
  group by h.handle
), summary as (
  select count(*) as observed, count(*) filter (where cardinality(product_ids) = 1) as resolved,
    coalesce(jsonb_agg(handle order by handle) filter (where cardinality(product_ids) is distinct from 1), '[]') as pending
  from matches
), source as (
  insert into public.source_configs
    (brand_id, adapter_kind, source_url, robots_url, scope_key, scope_status)
  select id, 'manual', ${sqlText(collection.href)}, ${sqlText(brand.robots_url)}, ${sqlText(scope)}, 'partial'
  from store
  on conflict (brand_id, scope_key) do update set scope_key = excluded.scope_key
  returning id, brand_id
), run as (
  insert into public.import_runs
    (id, source_config_id, started_at, ended_at, status, scope_key, complete, cursor,
     requests, pages, discovered, rejected, collector_version)
  select '${run}', source.id, '${begin}', '${end}',
    case when ${Boolean(next)} or observed <> resolved then 'partial' else 'success' end,
    ${sqlText(scope)}, not ${Boolean(next)} and observed = resolved,
    jsonb_build_object('page_evidence', manifests.pages, 'advertised_next', ${next ? sqlText(next) : 'null::text'},
      'unresolved_handles', pending),
    ${pages.length}, ${pages.length}, observed, 0, 'collection-grid/1'
  from source cross join summary cross join manifests
  on conflict (id) do nothing
  returning id
), section as (
  insert into public.collections (brand_id, source_id, title, handle, source_url, observed_at)
  select source.brand_id, ${sqlText(collection.href)}, ${sqlText(collection.pathname.split('/').at(-1))},
    ${sqlText(collection.pathname.split('/').at(-1))}, ${sqlText(collection.href)}, '${end}'
  from source cross join run
  on conflict (brand_id, source_id) do update set observed_at =
    greatest(collections.observed_at, excluded.observed_at)
  returning id
), memberships as (
  insert into public.product_collection_memberships (product_id, collection_id, source_run_id, verified)
  select matches.product_ids[1], section.id, run.id, true
  from matches cross join section cross join run
  where cardinality(product_ids) = 1
  on conflict (product_id, collection_id) do nothing
  returning product_id
)
select observed, resolved, pending, ${Boolean(next)} as has_next,
  (select count(*) from run) as new_runs, (select count(*) from memberships) as added_memberships
from summary;
`);
