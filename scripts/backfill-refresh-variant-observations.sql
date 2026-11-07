-- Execute only after the companion migration and all three exact imports finish.
-- Atomic, private, insert-only, and idempotent; never mutates normalized values.
begin isolation level repeatable read;
select pg_advisory_xact_lock(hashtextextended('the-clothing-star:variant-observation-backfill', 0));

create temporary table expected_refresh_runs (
  run_id uuid primary key, brand_slug text not null, expected_products integer not null,
  collector_version text not null
) on commit drop;
insert into expected_refresh_runs values
  ('3c12a703-e6c0-4372-aa1f-a5c77f7bc753', 'jnorss', 161, 'jnorss-refresh-1'),
  ('1fe9a237-3afb-4b5f-bffb-cc212ab3545a', 'genrage', 230, 'shopify-allowlist-refresh-1'),
  ('8d467758-2e30-46f2-affd-05e8cdeba7b9', 'wtflex', 408, 'shopify-allowlist-refresh-1');

-- Refuse partially imported runs, duplicates, mismatched scope or source configs.
do $$
begin
  if exists (
    select 1 from expected_refresh_runs e
    left join public.import_runs r on r.id=e.run_id
    left join public.source_configs c on c.id=r.source_config_id
    left join public.brands b on b.id=c.brand_id
    left join lateral (
      select count(*) n, count(distinct s.external_product_id) products,
        count(*) filter (where s.source_config_id is distinct from r.source_config_id
          or s.validation_status not in ('pending','accepted')
          or s.errors is distinct from '[]'::jsonb
          or jsonb_typeof(s.payload->'variants') is distinct from 'array'
          or case when jsonb_typeof(s.payload->'variants') = 'array'
            then jsonb_array_length(s.payload->'variants') = 0 else false end) invalid
      from public.staged_catalogue_records s where s.import_run_id=e.run_id
    ) staged on true
    where r.id is null or b.slug is distinct from e.brand_slug
      or r.collector_version is distinct from e.collector_version
      or r.scope_key is distinct from 'shopify_public_feed'
      or r.status is distinct from 'review_required' or r.complete is distinct from true
      or r.staged is distinct from e.expected_products
      or staged.n is distinct from e.expected_products::bigint
      or staged.products is distinct from e.expected_products::bigint or staged.invalid <> 0
  ) then raise exception 'Refresh run is missing, incomplete, mismatched, duplicated, or has invalid staged records'; end if;
end $$;

create temporary table observation_candidates on commit drop as
select s.id staged_record_id,s.import_run_id,s.source_config_id,s.observed_at checked_at,
  s.external_product_id, c.brand_id, v item,
  nullif(btrim(v->>'external_variant_id'),'') source_variant_id,
  p.id product_id, nv.id variant_id
from expected_refresh_runs e
join public.staged_catalogue_records s on s.import_run_id=e.run_id
join public.source_configs c on c.id=s.source_config_id
cross join lateral jsonb_array_elements(s.payload->'variants') v
left join public.products p on p.brand_id=c.brand_id and p.source_id=s.external_product_id
left join public.variants nv on nv.product_id=p.id and nv.source_id=v->>'external_variant_id';

-- Unknowns remain null. Unexpected data fails the entire transaction for review.
do $$
begin
  if exists (select 1 from observation_candidates where variant_id is null or source_variant_id is null
    or jsonb_typeof(item) is distinct from 'object'
    or (item->'available' is not null and jsonb_typeof(item->'available') not in ('boolean','null'))
    or (item->'preorder' is not null and jsonb_typeof(item->'preorder') not in ('boolean','null'))
    or (item->'currency' is not null and jsonb_typeof(item->'currency') not in ('string','null'))
    or (item->>'currency' is not null and item->>'currency' <> 'INR')
    or (item->>'price_minor' is not null and (jsonb_typeof(item->'price_minor') <> 'number'
      or item->>'price_minor' !~ '^\d{1,10}$' or (item->>'price_minor')::numeric > 2147483647
      or item->>'currency' is distinct from 'INR'))
    or (item->>'compare_at_minor' is not null and (jsonb_typeof(item->'compare_at_minor') <> 'number'
      or item->>'compare_at_minor' !~ '^\d{1,10}$' or (item->>'compare_at_minor')::numeric > 2147483647))
  ) then raise exception 'An observation has invalid or unmapped variant, price, currency, stock or preorder'; end if;
  if exists (select 1 from observation_candidates group by import_run_id,variant_id having count(*) > 1)
    then raise exception 'Duplicate variant identity within a refresh run'; end if;
end $$;

-- Refuse same-key changed content instead of silently treating it as a replay.
do $$
begin
  if exists (select 1 from observation_candidates c join public.variant_source_observations o
    on o.import_run_id=c.import_run_id and o.variant_id=c.variant_id
    where o.staged_record_id is distinct from c.staged_record_id
      or o.source_config_id is distinct from c.source_config_id
      or o.source_variant_id is distinct from c.source_variant_id
      or o.checked_at is distinct from c.checked_at
      or o.price_minor is distinct from (c.item->>'price_minor')::integer
      or o.compare_at_minor is distinct from (c.item->>'compare_at_minor')::integer
      or o.currency is distinct from c.item->>'currency'
      or o.available is distinct from (c.item->>'available')::boolean
      or o.preorder is distinct from (c.item->>'preorder')::boolean
  ) then raise exception 'Existing observation conflicts with this run; investigate rather than overwrite'; end if;
end $$;

insert into public.variant_source_observations
  (variant_id,staged_record_id,import_run_id,source_config_id,source_variant_id,checked_at,
   price_minor,compare_at_minor,currency,available,preorder)
select variant_id,staged_record_id,import_run_id,source_config_id,source_variant_id,checked_at,
  (item->>'price_minor')::integer,(item->>'compare_at_minor')::integer,item->>'currency',
  (item->>'available')::boolean,(item->>'preorder')::boolean
from observation_candidates
on conflict (import_run_id,variant_id) do nothing;

select e.brand_slug,count(*) expected_variant_observations,
  count(o.id) persisted_variant_observations,
  count(*) filter(where o.review_status='pending') pending_review
from expected_refresh_runs e join observation_candidates c on c.import_run_id=e.run_id
left join public.variant_source_observations o on o.import_run_id=c.import_run_id and o.variant_id=c.variant_id
group by e.brand_slug order by e.brand_slug;
commit;
