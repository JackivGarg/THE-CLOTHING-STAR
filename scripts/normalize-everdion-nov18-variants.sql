-- Insert missing variants from the verified 18 November Everdion staging run.
-- Existing product and variant rows are preserved. Replays insert no duplicates.
begin;
select pg_advisory_xact_lock(hashtextextended('the-clothing-star:normalize-staging', 0));
do $$ begin
 if not exists (
  select 1 from public.import_runs r join public.source_configs c on c.id=r.source_config_id
  join public.brands b on b.id=c.brand_id
  where r.id='38f26510-4c61-4d4d-ba33-0f9d81a9dddf'::uuid and b.slug='everdion'
    and r.status='review_required' and r.complete and r.staged=480
 ) then raise exception 'Expected complete Everdion run not found'; end if;
end $$;
create temporary table inserted_refresh_variants(id uuid primary key, product_id uuid, source_id text) on commit drop;
with source_rows as (
 select p.id product_id, item
 from public.staged_catalogue_records s
 join public.source_configs c on c.id=s.source_config_id
 join public.products p on p.brand_id=c.brand_id and p.source_id=s.external_product_id
 cross join lateral jsonb_array_elements(s.payload->'variants') item
 where s.import_run_id='38f26510-4c61-4d4d-ba33-0f9d81a9dddf'::uuid
   and s.validation_status in ('pending','accepted') and s.errors='[]'::jsonb
), inserted as (
 insert into public.variants(product_id,source_id,size,colour,price_minor,currency,available,source_options,source_sku,compare_at_minor,preorder,lifecycle)
 select product_id,item->>'external_variant_id',nullif(item->>'size_raw',''),nullif(item->>'colour_raw',''),
        (item->>'price_minor')::integer,'INR',(item->>'available')::boolean,
        coalesce(item->'source_options','{}'::jsonb),nullif(item->>'source_sku',''),
        (item->>'compare_at_minor')::integer,(item->>'preorder')::boolean,'active'
 from source_rows
 where nullif(item->>'external_variant_id','') is not null and item->>'currency'='INR'
   and item->>'price_minor' ~ '^\d{1,10}$' and (item->>'price_minor')::numeric <= 2147483647
 on conflict(product_id,source_id) do nothing
 returning id,product_id,source_id
) insert into inserted_refresh_variants select id,product_id,source_id from inserted;
insert into public.product_image_variants(image_id,variant_id)
select distinct i.id,v.id
from inserted_refresh_variants v
join public.products p on p.id=v.product_id
join public.source_configs c on c.brand_id=p.brand_id
join public.staged_catalogue_records s on s.source_config_id=c.id and s.external_product_id=p.source_id
cross join lateral jsonb_array_elements(s.payload->'images') image
join public.product_images i on i.product_id=p.id and i.source_url=image->>'src'
cross join lateral jsonb_array_elements(s.payload->'variants') item
where s.import_run_id='38f26510-4c61-4d4d-ba33-0f9d81a9dddf'::uuid
  and item->>'external_variant_id'=v.source_id
  and ((nullif(image->>'id','') is not null and item->>'source_variant_image_id'=image->>'id')
    or (case when jsonb_typeof(image->'variant_ids')='array' then image->'variant_ids' else '[]'::jsonb end ? v.source_id))
on conflict(image_id,variant_id) do nothing;
select count(*) as newly_inserted_variants from inserted_refresh_variants;
commit;
