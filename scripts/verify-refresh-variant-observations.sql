-- Read-only post-backfill verification. Run after the companion migration and
-- backfill; running backfill twice must leave every mismatch and missing count 0.
with staged as (
  select s.id,s.import_run_id,s.source_config_id,s.observed_at,s.external_product_id,
    c.brand_id,b.slug,v item
  from public.staged_catalogue_records s
  join public.source_configs c on c.id=s.source_config_id
  join public.brands b on b.id=c.brand_id
  cross join lateral jsonb_array_elements(s.payload->'variants') v
  where s.import_run_id in ('3c12a703-e6c0-4372-aa1f-a5c77f7bc753',
    '1fe9a237-3afb-4b5f-bffb-cc212ab3545a','8d467758-2e30-46f2-affd-05e8cdeba7b9')
), expected as (
  select s.*,v.id variant_id from staged s
  join public.products p on p.brand_id=s.brand_id and p.source_id=s.external_product_id
  join public.variants v on v.product_id=p.id and v.source_id=s.item->>'external_variant_id'
)
select e.slug,count(*) candidates,count(o.id) observations,
  count(*) filter(where o.id is null) missing,
  count(*) filter(where o.id is not null and (
    o.staged_record_id is distinct from e.id or o.source_config_id is distinct from e.source_config_id
    or o.source_variant_id is distinct from e.item->>'external_variant_id'
    or o.checked_at is distinct from e.observed_at
    or o.price_minor is distinct from (e.item->>'price_minor')::integer
    or o.compare_at_minor is distinct from (e.item->>'compare_at_minor')::integer
    or o.currency is distinct from e.item->>'currency'
    or o.available is distinct from (e.item->>'available')::boolean
    or o.preorder is distinct from (e.item->>'preorder')::boolean)) mismatched,
  count(*) filter(where o.review_status='pending') pending
from expected e left join public.variant_source_observations o
  on o.import_run_id=e.import_run_id and o.variant_id=e.variant_id
group by e.slug order by e.slug;

-- Expect true, false, false, false, false respectively. Service role is the
-- explicit private operator; neither frontend role receives table privileges.
select relrowsecurity as rls_enabled,
  has_table_privilege('anon','public.variant_source_observations','select') anon_select,
  has_table_privilege('authenticated','public.variant_source_observations','select') authenticated_select,
  has_table_privilege('anon','public.variant_source_observations','insert') anon_insert,
  has_table_privilege('authenticated','public.variant_source_observations','insert') authenticated_insert
from pg_class where oid='public.variant_source_observations'::regclass;
