-- Run as the authorized private operator against project cvziesdqhxhahiqladlg.
-- Atomic insert-only normalization. Existing normalized products are excluded
-- together with their variants/images so reviewed values cannot be overwritten.
-- Publication and attribute acceptance are separate review steps.
begin;
select pg_advisory_xact_lock(hashtextextended('the-clothing-star:normalize-staging', 0));

create temporary table normalization_selected on commit drop as
with latest as (
  select distinct on (c.brand_id, s.external_product_id)
    s.id staged_id,
    s.source_config_id,
    s.import_run_id,
    c.brand_id,
    s.external_product_id,
    s.payload,
    s.content_hash,
    s.observed_at
  from public.staged_catalogue_records s
  join public.source_configs c on c.id = s.source_config_id
  where s.validation_status in ('pending', 'accepted')
    and jsonb_typeof(s.payload) = 'object'
    and jsonb_typeof(s.payload->'variants') = 'array'
    and nullif(btrim(s.external_product_id), '') is not null
    and nullif(btrim(s.payload->>'title'), '') is not null
    and coalesce(s.errors, '[]'::jsonb) = '[]'::jsonb
  order by c.brand_id, s.external_product_id, s.observed_at desc, s.id desc
)
select latest.*,
  case
    when lower(payload->>'title') ~ '\m(set|co-ord|co-ords|coord)\M' then 'unknown'
    when lower(payload->>'title') ~ '\m(vest|tank)\M' then 'vest'
    when lower(payload->>'title') ~ '\mhoodie\M' then 'hoodie'
    when lower(payload->>'title') ~ '\msweatshirt\M' then 'sweatshirt'
    when lower(payload->>'title') ~ '\m(sweater|pullover|cardigan)\M' then 'sweater'
    when lower(payload->>'title') ~ '\m(t-shirt|tshirt|tee)\M' then 'tee'
    when lower(payload->>'title') ~ '\mshirt\M' then 'shirt'
    when lower(payload->>'title') ~ '\m(jacket|coat)\M' then 'jacket'
    when lower(payload->>'title') ~ '\mjeans\M' then 'jeans'
    when lower(payload->>'title') ~ '\mshorts\M' then 'shorts'
    when lower(payload->>'title') ~ '\m(joggers|sweatpants|pants|trousers)\M' then 'trousers'
    when lower(payload->>'title') ~ '\m(dress|dresses)\M' then 'dress'
    when lower(payload->>'title') ~ '\m(skirt|skirts)\M' then 'skirt'
    when lower(payload->>'original_product_type') in ('hoodie', 'hoodies') then 'hoodie'
    when lower(payload->>'original_product_type') in ('sweatshirt', 'sweatshirts') then 'sweatshirt'
    when lower(payload->>'original_product_type') in ('sweater', 'sweaters', 'pullover', 'cardigan') then 'sweater'
    when lower(payload->>'original_product_type') in ('t-shirt', 'tshirt', 'tee', 't-shirts') then 'tee'
    when lower(payload->>'original_product_type') in ('shirt', 'shirts') then 'shirt'
    else 'unknown'
  end category
from latest;

create temporary table normalization_created (
  product_id uuid primary key,
  brand_id uuid not null,
  external_product_id text not null
) on commit drop;

with inserted as (
  insert into public.products (
    brand_id, source_id, title, category, source_url, image_url, observed_at,
    published, handle, description_text, source_updated_at, original_product_type, source_tags,
    fulfilment_status, lifecycle, content_hash
  )
  select
    n.brand_id,
    n.external_product_id,
    n.payload->>'title',
    n.category,
    n.payload->>'source_url',
    case when n.payload->'images'->0->>'src' like 'https://%'
      then n.payload->'images'->0->>'src' end,
    n.observed_at,
    false,
    n.payload->>'handle',
    nullif(n.payload->>'description_text', ''),
    case when pg_input_is_valid(n.payload->>'source_updated_at', 'timestamp with time zone')
      then (n.payload->>'source_updated_at')::timestamptz end,
    nullif(n.payload->>'original_product_type', ''),
    case when jsonb_typeof(n.payload->'source_tags') = 'array'
      then n.payload->'source_tags' else '[]'::jsonb end,
    case when n.payload->>'fulfilment_status' in ('ready', 'preorder')
      then n.payload->>'fulfilment_status' else 'unknown' end,
    'active',
    n.content_hash
  from normalization_selected n
  on conflict (brand_id, source_id) do nothing
  returning id, brand_id, source_id
)
insert into normalization_created (product_id, brand_id, external_product_id)
select id, brand_id, source_id from inserted;

-- All subsequent inserts are limited to products created in this transaction.
create temporary table normalization_new on commit drop as
select created.product_id, selected.*
from normalization_created created
join normalization_selected selected
  on selected.brand_id = created.brand_id
 and selected.external_product_id = created.external_product_id;

insert into public.variants (
  product_id, source_id, size, colour, price_minor, currency, available,
  source_options, source_sku, compare_at_minor, preorder, lifecycle
)
select distinct on (n.product_id, v->>'external_variant_id')
  n.product_id,
  v->>'external_variant_id',
  nullif(v->>'size_raw', ''),
  nullif(v->>'colour_raw', ''),
  (v->>'price_minor')::integer,
  'INR',
  case when jsonb_typeof(v->'available') = 'boolean' then (v->>'available')::boolean end,
  case when jsonb_typeof(v->'source_options') = 'object' then v->'source_options' else '{}'::jsonb end,
  nullif(v->>'source_sku', ''),
  case when v->>'compare_at_minor' ~ '^\d{1,10}$' then
    case when (v->>'compare_at_minor')::numeric <= 2147483647
      then (v->>'compare_at_minor')::integer end
  end,
  case when jsonb_typeof(v->'preorder') = 'boolean' then (v->>'preorder')::boolean end,
  'active'
from normalization_new n
cross join lateral jsonb_array_elements(n.payload->'variants') v
where nullif(btrim(v->>'external_variant_id'), '') is not null
  and v->>'currency' = 'INR'
  and case when v->>'price_minor' ~ '^\d{1,10}$'
    then (v->>'price_minor')::numeric <= 2147483647 else false end
order by n.product_id, v->>'external_variant_id'
on conflict (product_id, source_id) do nothing;

insert into public.product_images (
  product_id, source_id, source_url, alt_text, gallery_order,
  content_use_status, observed_at
)
select distinct on (n.product_id, image->>'src')
  n.product_id,
  nullif(image->>'id', ''),
  image->>'src',
  nullif(image->>'alt', ''),
  least(ordinality, 2147483647)::integer,
  'unknown',
  n.observed_at
from normalization_new n
cross join lateral jsonb_array_elements(
  case when jsonb_typeof(n.payload->'images') = 'array' then n.payload->'images' else '[]'::jsonb end
) with ordinality gallery(image, ordinality)
where image->>'src' like 'https://%'
order by n.product_id, image->>'src', ordinality
on conflict (product_id, source_url) do nothing;

insert into public.product_image_variants (image_id, variant_id)
select distinct image_row.id, variant_row.id
from normalization_new n
cross join lateral jsonb_array_elements(
  case when jsonb_typeof(n.payload->'images') = 'array' then n.payload->'images' else '[]'::jsonb end
) image
join public.product_images image_row
  on image_row.product_id = n.product_id and image_row.source_url = image->>'src'
cross join lateral jsonb_array_elements(n.payload->'variants') variant_source
join public.variants variant_row
  on variant_row.product_id = n.product_id
 and variant_row.source_id = variant_source->>'external_variant_id'
where (
  nullif(image->>'id', '') is not null
  and variant_source->>'source_variant_image_id' = image->>'id'
) or (
  case when jsonb_typeof(image->'variant_ids') = 'array' then image->'variant_ids' else '[]'::jsonb end
  ? (variant_source->>'external_variant_id')
)
on conflict (image_id, variant_id) do nothing;

insert into public.product_attribute_evidence (
  product_id, attribute_key, value_text, source_kind, source_url,
  source_field, evidence_level, review_status, rule_version, observed_at
)
select
  n.product_id,
  'ingestion_provenance',
  jsonb_build_object(
    'staged_record_id', n.staged_id,
    'source_config_id', n.source_config_id,
    'import_run_id', n.import_run_id,
    'source_updated_at', n.payload->>'source_updated_at',
    'detail_provenance', n.payload->'detail_provenance'
  )::text,
  'staged_catalogue',
  n.payload->>'source_url',
  'staged_catalogue_records.payload',
  'explicit',
  'pending',
  'normalization-1',
  n.observed_at
from normalization_new n;

insert into public.product_attribute_evidence (
  product_id, attribute_key, value_text, source_kind, source_url,
  source_field, excerpt, evidence_level, review_status, rule_version, observed_at
)
select
  n.product_id,
  'category',
  n.category,
  'staged_catalogue',
  n.payload->>'source_url',
  'payload.title; payload.original_product_type',
  jsonb_build_object(
    'title', n.payload->>'title',
    'original_product_type', n.payload->>'original_product_type'
  )::text,
  'inferred',
  'pending',
  'normalization-1-category',
  n.observed_at
from normalization_new n
where n.category <> 'unknown';

select
  (select count(*) from normalization_selected) eligible_staged_products,
  (select count(*) from normalization_created) products_inserted,
  (select count(*) from normalization_created c join public.variants v on v.product_id = c.product_id) variants_inserted,
  (select count(*) from normalization_created c join public.product_images i on i.product_id = c.product_id) images_inserted,
  (select coalesce(sum(jsonb_array_length(payload->'variants')), 0) from normalization_new)
    - (select count(*) from normalization_created c join public.variants v on v.product_id = c.product_id) variant_entries_skipped_or_deduplicated,
  (select count(*) from normalization_selected where category = 'unknown') products_with_unknown_category;
commit;
