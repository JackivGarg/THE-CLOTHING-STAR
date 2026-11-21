-- Compare the most recent captured offer for each variant with the normalized
-- offer. A pending observation still requires source validation before use.
with latest_observations as (
  select distinct on (o.variant_id)
    o.variant_id, o.import_run_id, o.source_config_id, o.staged_record_id, o.source_variant_id,
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
  case
    when s.id is null or captured.n <> 1 or captured.matches <> 1 then 'capture_mismatch'
    when o.review_status <> 'accepted' then 'source_review_' || o.review_status
    when o.checked_at > now() or o.checked_at < now() - interval '72 hours' then 'outside_shopping_window'
    else 'reviewed_source_observation'
  end as disposition,
  o.import_run_id,
  o.source_config_id,
  o.staged_record_id
from latest_observations o
join public.variants v on v.id = o.variant_id
join public.products p on p.id = v.product_id
join public.brands b on b.id = p.brand_id
left join public.staged_catalogue_records s on s.id = o.staged_record_id
  and s.import_run_id = o.import_run_id
  and s.source_config_id = o.source_config_id
  and s.external_product_id = p.source_id
  and s.observed_at = o.checked_at
left join lateral (
  select count(*) n, count(*) filter (
    where (item->>'price_minor', item->>'compare_at_minor', item->>'currency',
           item->>'available', item->>'preorder')
      is not distinct from (o.price_minor::text, o.compare_at_minor::text, o.currency,
                            o.available::text, o.preorder::text)
  ) matches
  from jsonb_array_elements(
    case when jsonb_typeof(s.payload->'variants') = 'array'
      then s.payload->'variants' else '[]'::jsonb end
  ) item
  where item->>'external_variant_id' = v.source_id and o.source_variant_id = v.source_id
) captured on true
where (v.price_minor, v.compare_at_minor, v.currency, v.available, v.preorder)
  is distinct from
  (o.price_minor, o.compare_at_minor, o.currency, o.available, o.preorder)
order by b.slug, p.source_id, v.source_id;
