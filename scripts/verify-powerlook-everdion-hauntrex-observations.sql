-- Read-only post-backfill verification. Run after the companion migration and
-- backfill; running backfill twice must leave every mismatch and missing count 0.
with staged as (
  select s.id,s.import_run_id,s.source_config_id,s.observed_at,s.external_product_id,
    c.brand_id,b.slug,v item
  from public.staged_catalogue_records s
  join public.source_configs c on c.id=s.source_config_id
  join public.brands b on b.id=c.brand_id
  cross join lateral jsonb_array_elements(s.payload->'variants') v
  where s.import_run_id in ('e5e02bc7-f6af-4f7c-a0a4-729ad2ff1b47','1e218968-542b-4fb7-982d-1df59fd64302',
    'aaab9c70-8f31-5bd2-8dc2-8ec448af1233')
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
