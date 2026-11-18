-- Compare the most recent captured offer for each variant with the normalized
-- offer. A pending observation still requires source validation before use.
with latest_observations as (
  select distinct on (o.variant_id)
    o.variant_id, o.import_run_id, o.source_config_id, o.staged_record_id,
    o.checked_at, o.price_minor, o.compare_at_minor, o.currency,
    o.available, o.preorder, o.review_status
  from public.variant_source_observations o
  order by o.variant_id, o.checked_at desc, o.id desc
)
select
  b.slug as brand,
  p.source_id as merchant_product_id,
  p.title,
  p.source_url,
  v.source_id as merchant_variant_id,
  v.size,
  v.colour,
  v.source_options,
  v.price_minor as stored_price_minor,
  o.price_minor as observed_price_minor,
  v.compare_at_minor as stored_compare_at_minor,
  o.compare_at_minor as observed_compare_at_minor,
  v.currency as stored_currency,
  o.currency as observed_currency,
  v.available as stored_available,
  o.available as observed_available,
  v.preorder as stored_preorder,
  o.preorder as observed_preorder,
  o.checked_at,
  o.review_status,
  o.import_run_id,
  o.source_config_id,
  o.staged_record_id
from latest_observations o
join public.variants v on v.id = o.variant_id
join public.products p on p.id = v.product_id
join public.brands b on b.id = p.brand_id
where (v.price_minor, v.compare_at_minor, v.currency, v.available, v.preorder)
  is distinct from
  (o.price_minor, o.compare_at_minor, o.currency, o.available, o.preorder)
order by b.slug, p.source_id, v.source_id;
