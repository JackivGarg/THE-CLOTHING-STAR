-- Read-only quality report. Count every brand scope, including feed and detail runs.
with latest as (
  select distinct on (c.brand_id, s.external_product_id)
    c.brand_id, s.external_product_id, s.payload, s.observed_at
  from public.staged_catalogue_records s
  join public.source_configs c on c.id=s.source_config_id
  order by c.brand_id,s.external_product_id,s.observed_at desc,s.id desc
), products as (
  select brand_id,count(*) detailed_products,
    count(*) filter(where nullif(payload->>'description_text','') is null) missing_description,
    count(*) filter(where nullif(payload->>'original_product_type','') is null) missing_source_type,
    count(*) filter(where jsonb_array_length(coalesce(payload->'images','[]'))=0) missing_gallery,
    max(observed_at) latest_product_observation
  from latest group by brand_id
), variants as (
  select brand_id,count(*) variants,
    count(*) filter(where nullif(v->>'source_sku','') is null) missing_merchant_sku,
    count(*) filter(where nullif(v->>'size_raw','') is null) missing_size_label,
    count(*) filter(where nullif(v->>'colour_raw','') is null) missing_colour_label,
    count(*) filter(where v->>'price_minor' is null) missing_price,
    count(*) filter(where v->>'available' is null) unknown_stock
  from latest cross join lateral jsonb_array_elements(payload->'variants') v group by brand_id
), discoveries as (
  select c.brand_id,count(*) discovery_urls,
    count(*) filter(where exists(select 1 from latest s where s.brand_id=c.brand_id and s.payload->>'source_url'=d.source_url)) covered_discovery_urls
  from public.staged_product_discoveries d join public.source_configs c on c.id=d.source_config_id group by c.brand_id
), normalized as (
  select brand_id,count(*) normalized_products,
    count(*) filter(where category='unknown') unknown_category,
    count(*) filter(where published) published_products
  from public.products group by brand_id
)
select b.slug,p.detailed_products,v.variants,d.discovery_urls,d.covered_discovery_urls,
  d.discovery_urls-d.covered_discovery_urls pending_discovery_urls,
  p.missing_description,p.missing_source_type,p.missing_gallery,
  v.missing_merchant_sku,v.missing_size_label,v.missing_colour_label,v.missing_price,v.unknown_stock,
  n.normalized_products,n.unknown_category,n.published_products,p.latest_product_observation
from public.brands b left join products p on p.brand_id=b.id
left join variants v on v.brand_id=b.id left join discoveries d on d.brand_id=b.id
left join normalized n on n.brand_id=b.id order by b.slug;
