-- Private, append-only candidate size evidence from source variant options.
-- Run against the authorized project after reviewing. Never updates variants or products.
-- A generic "Title" option with a size-shaped value is inferred, not explicit.
begin;
select pg_advisory_xact_lock(hashtextextended('the-clothing-star:size-option-evidence-1', 0));
with latest as (
  select distinct on (c.brand_id, s.external_product_id)
    c.brand_id, s.external_product_id, s.payload, s.observed_at
  from public.staged_catalogue_records s
  join public.source_configs c on c.id=s.source_config_id
  join public.brands b on b.id=c.brand_id
  where b.slug in ('powerlook','everdion','sagacity')
    and s.validation_status in ('pending','accepted')
    and coalesce(s.errors,'[]'::jsonb)='[]'::jsonb
    and jsonb_typeof(s.payload->'variants')='array'
  order by c.brand_id, s.external_product_id, s.observed_at desc, s.id desc
), options as (
  select p.id product_id, v.id variant_id, v.source_id variant_source_id,
    l.payload->>'source_url' source_url, l.observed_at, opt.key option_key, opt.value #>> '{}' option_value,
    count(*) over (partition by v.id) option_count
  from latest l
  join public.products p on p.brand_id=l.brand_id and p.source_id=l.external_product_id
  cross join lateral jsonb_array_elements(l.payload->'variants') variant
  join public.variants v on v.product_id=p.id and v.source_id=variant->>'external_variant_id' and v.size is null
  cross join lateral jsonb_each(case when jsonb_typeof(variant->'source_options')='object'
    then variant->'source_options' else '{}'::jsonb end) opt
  where lower(opt.key) in ('size','title') and jsonb_typeof(opt.value)='string'
    and nullif(l.payload->>'source_url','') is not null
), candidates as (
  select product_id,variant_id,source_url,observed_at,option_key,option_value,
    'payload.variants[external_variant_id=' || variant_source_id || '].source_options.' || option_key source_field
  from options
  where option_count=1
    and option_value ~* '^([2-9]?XS|[2-9]?XL|XXXL|XS|S|M|L|XL|XXL|[0-9]{2})$'
)
select b.slug, c.option_key, c.option_value, count(*) as candidate_variants,
  case when lower(c.option_key)='size' then 'explicit' else 'inferred' end as evidence_level,
  count(*) filter (where exists (
    select 1 from public.product_attribute_evidence e where e.variant_id=c.variant_id
      and e.attribute_key='size' and e.source_field=c.source_field and e.value_text=c.option_value
      and e.rule_version='size-source-option-1'
  )) as already_recorded
from candidates c
join public.products p on p.id=c.product_id
join public.brands b on b.id=p.brand_id
group by b.slug,c.option_key,c.option_value
order by b.slug,c.option_key,c.option_value;
rollback;
