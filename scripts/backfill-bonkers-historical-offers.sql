-- Replay captured Bonkers offers with their original timestamps and run IDs.
begin;
select pg_advisory_xact_lock(hashtextextended('the-clothing-star:variant-observation-backfill', 0));

create temporary table bonkers_offer_candidates on commit drop as
select v.id variant_id, s.id staged_record_id, s.import_run_id, s.source_config_id,
  v.source_id source_variant_id, s.observed_at checked_at,
  (item->>'price_minor')::integer price_minor,
  (item->>'compare_at_minor')::integer compare_at_minor,
  item->>'currency' currency,
  (item->>'available')::boolean available,
  (item->>'preorder')::boolean preorder
from public.staged_catalogue_records s
join public.import_runs r on r.id = s.import_run_id and r.source_config_id = s.source_config_id
join public.source_configs c on c.id = s.source_config_id
join public.brands b on b.id = c.brand_id
join public.products p on p.brand_id = b.id and p.source_id = s.external_product_id
cross join lateral jsonb_array_elements(
  case when jsonb_typeof(s.payload->'variants') = 'array'
    then s.payload->'variants' else '[]'::jsonb end
) item
join public.variants v on v.product_id = p.id and v.source_id = item->>'external_variant_id'
where b.slug = 'bonkers-corner'
  and s.observed_at >= timestamptz '2026-11-06 00:00:00+00'
  and s.observed_at < timestamptz '2026-11-08 00:00:00+00'
  and (
    (r.scope_key = 'bonkers_product_detail_js' and r.collector_version = 'bonkers-detail-1' and r.status = 'partial')
    or (r.scope_key = 'shopify_public_feed' and r.collector_version = '0.1.0' and r.status = 'review_required')
  )
  and s.validation_status in ('pending', 'accepted') and s.errors = '[]'::jsonb
  and jsonb_typeof(item->'price_minor') = 'number'
  and jsonb_typeof(item->'available') = 'boolean'
  and item->>'currency' = 'INR';

do $$
begin
  if (select count(*) from bonkers_offer_candidates) <> 20214
     or (select count(distinct variant_id) from bonkers_offer_candidates) <> 20214
     or exists (select 1 from bonkers_offer_candidates where price_minor <= 0) then
    raise exception 'Bonkers historical offer scope differs from the verified capture';
  end if;
  if exists (
    select 1
    from bonkers_offer_candidates c
    join public.variant_source_observations o on o.import_run_id = c.import_run_id and o.variant_id = c.variant_id
    where (o.staged_record_id, o.source_config_id, o.source_variant_id, o.checked_at,
           o.price_minor, o.compare_at_minor, o.currency, o.available, o.preorder)
      is distinct from
          (c.staged_record_id, c.source_config_id, c.source_variant_id, c.checked_at,
           c.price_minor, c.compare_at_minor, c.currency, c.available, c.preorder)
  ) then
    raise exception 'A saved Bonkers observation conflicts with the original capture';
  end if;
end $$;

with inserted as (
  insert into public.variant_source_observations
    (variant_id, staged_record_id, import_run_id, source_config_id, source_variant_id,
     checked_at, price_minor, compare_at_minor, currency, available, preorder)
  select variant_id, staged_record_id, import_run_id, source_config_id, source_variant_id,
    checked_at, price_minor, compare_at_minor, currency, available, preorder
  from bonkers_offer_candidates
  on conflict (import_run_id, variant_id) do nothing
  returning id
)
select count(*) as inserted_observations from inserted;
commit;
