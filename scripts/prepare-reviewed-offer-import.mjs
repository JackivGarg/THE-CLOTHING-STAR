// Generate an atomic import of a manually verified Shopify product AJAX check.
// Values are already in the storefront's verified INR minor units.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const [slug, file] = process.argv.slice(2);
const sample = JSON.parse(readFileSync(file, 'utf8'));
const brand = JSON.parse(readFileSync(new URL('../brand-registry.json', import.meta.url))).brands
  .find(entry => entry.slug === slug && entry.collection_enabled !== false);
const url = new URL(sample.url);
const exactId = value => typeof value === 'string' && /^[1-9][0-9]*$/.test(value);
const minor = value => Number.isInteger(value) && value >= 0 && value <= 2147483647;
if (!brand || url.origin !== new URL(brand.base_url).origin || url.search ||
    !/^\/products\/[a-z0-9-]+\.js$/.test(url.pathname) ||
    !exactId(sample.product_id) || !Number.isFinite(Date.parse(sample.checked_at)) ||
    !/^[0-9a-f]{64}$/.test(sample.sha256) || !Array.isArray(sample.variants) || !sample.variants.length ||
    sample.variants.some(v => !exactId(v.id) || !minor(v.price) ||
      (v.compare_at_price !== null && !minor(v.compare_at_price)) || typeof v.available !== 'boolean' ||
      !Array.isArray(v.options) || v.options.length !== 1 || typeof v.options[0] !== 'string') ||
    new Set(sample.variants.map(v => v.id)).size !== sample.variants.length) {
  throw new Error('Expected a reviewed INR snapshot with unique exact IDs and one source size option.');
}
const sqlText = value => "'" + String(value).replaceAll("'", "''") + "'";
const scope = 'reviewed-product-ajax';
const hash = createHash('sha256').update(JSON.stringify([slug,sample])).digest('hex');
const run = [hash.slice(0,8),hash.slice(8,12),hash.slice(12,16),hash.slice(16,20),hash.slice(20,32)].join('-');
const productUrl = url.href.slice(0, -3);
const payload = {
  external_product_id: sample.product_id, source_url: productUrl,
  observation_kind: 'verified_product_ajax_offer_only',
  observed_at: sample.checked_at, response_sha256: sample.sha256, offer_source_url: url.href,
  offer_review: 'Exact merchant product and variant IDs, canonical URL, one size option, INR paise and explicit AJAX stock. Preorder and fulfilment unknown.',
  variants: sample.variants.map(v => ({
    external_variant_id: v.id, source_options: { Size: v.options[0] }, size_raw: v.options[0],
    price_minor: v.price, compare_at_minor: v.compare_at_price, currency: 'INR', available: v.available, preorder: null,
  })),
};
process.stdout.write(`with payload as (
  select ${sqlText(JSON.stringify(payload))}::jsonb as body
), product as (
  select p.id, p.brand_id from public.products p join public.brands b on b.id = p.brand_id
  where b.active and b.slug = ${sqlText(slug)} and p.source_id = ${sqlText(sample.product_id)}
    and split_part(p.source_url, '?', 1) = ${sqlText(productUrl)}
), resolved as (
  select v.id, entry from product p join public.variants v on v.product_id = p.id
  cross join payload cross join lateral jsonb_array_elements(payload.body->'variants') entry
  where v.source_id = entry->>'external_variant_id' and v.source_options = entry->'source_options'
    and v.currency = 'INR'
), source as (
  insert into public.source_configs (brand_id, adapter_kind, source_url, robots_url, scope_key, scope_status, price_unit)
  select brand_id, 'manual', ${sqlText(url.origin)}, ${sqlText(brand.robots_url)}, '${scope}', 'partial', 'minor_integer'
  from product where (select count(*) from resolved) = ${sample.variants.length}
    and ${sqlText(sample.checked_at)}::timestamptz <= now()
  on conflict (brand_id, scope_key) do update set scope_key = excluded.scope_key returning id
), run as (
  insert into public.import_runs (id, source_config_id, started_at, ended_at, status, scope_key,
    complete, cursor, requests, pages, discovered, collector_version)
  select '${run}', id, ${sqlText(sample.checked_at)}, ${sqlText(sample.checked_at)}, 'success', '${scope}', true,
    jsonb_build_object('source_url', ${sqlText(url.href)}, 'response_sha256', '${sample.sha256}'), 1, 1, 1, 'offer-ajax-review/1'
  from source on conflict (id) do nothing returning id, source_config_id
), staged as (
  insert into public.staged_catalogue_records
    (source_config_id, import_run_id, external_product_id, external_variant_id, payload, content_hash, observed_at)
  select run.source_config_id, run.id, ${sqlText(sample.product_id)}, '__OFFER_ONLY__', body, '${hash}', ${sqlText(sample.checked_at)}
  from run cross join payload returning id, import_run_id, source_config_id, observed_at
), offers as (
  insert into public.variant_source_observations (variant_id, staged_record_id, import_run_id, source_config_id,
    source_variant_id, checked_at, price_minor, compare_at_minor, currency, available, preorder, review_status)
  select resolved.id, staged.id, staged.import_run_id, staged.source_config_id, entry->>'external_variant_id',
    staged.observed_at, (entry->>'price_minor')::int, (entry->>'compare_at_minor')::int,
    'INR', (entry->>'available')::boolean, null, 'accepted'
  from staged cross join resolved on conflict (import_run_id, variant_id) do nothing returning id
)
select ${sample.variants.length} as expected, (select count(*) from resolved) as resolved,
  (select count(*) from offers) as accepted_observations;
`);
