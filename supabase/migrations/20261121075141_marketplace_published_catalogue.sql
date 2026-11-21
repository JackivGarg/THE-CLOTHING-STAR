-- Keep the application's reviewed search projection server-only.
-- Only an active, published product can enter the hosted catalogue.
create view public.marketplace_published_catalogue
with (security_invoker = true) as
select p.id, b.name as brand, b.slug as brand_slug,
       p.title, p.description_text, p.category, p.fit, p.themes, p.theme_evidence,
       p.source_url, p.observed_at, false as synthetic,
       (select im.source_url from public.product_images im
        where im.product_id = p.id and im.content_use_status = 'approved'
        order by im.gallery_order, im.id limit 1) as image_url,
       coalesce(sections.labels, array[]::text[]) as collection_labels,
       array(
         select distinct case
           when lower(btrim(label)) in ('men', 'mens', 'men''s') then 'men'
           when lower(btrim(label)) in ('women', 'womens', 'women''s') then 'women'
           when lower(btrim(label)) = 'unisex' then 'unisex' end
         from jsonb_array_elements_text(
           case when jsonb_typeof(p.source_tags) = 'array' then p.source_tags else '[]'::jsonb end
         ) as merchant(label)
         where lower(btrim(label)) in ('men', 'mens', 'men''s', 'women', 'womens', 'women''s', 'unisex')
       ) as audiences,
       coalesce(offers.variants, '[]'::jsonb) as variants
from public.products p
join public.brands b on b.id = p.brand_id and b.active
left join lateral (
  select array_agg(distinct replace(c.title, '-', ' ') order by replace(c.title, '-', ' ')) as labels
  from public.product_collection_memberships m
  join public.collections c on c.id = m.collection_id and c.brand_id = p.brand_id
  where m.product_id = p.id and m.verified
) sections on true
left join lateral (
  select jsonb_agg(jsonb_build_object(
    'id', v.id, 'size', v.size, 'colour', v.colour,
    'source_options', v.source_options, 'source_sku', v.source_sku,
    'price_minor', case when r.variant_id is not null then r.price_minor else v.price_minor end,
    'available', case when r.variant_id is not null then r.available else v.available end,
    'preorder', r.preorder, 'fulfilment_status', p.fulfilment_status,
    'observed_at', r.checked_at, 'price_checked_at', r.checked_at,
    'stock_checked_at', r.checked_at, 'offer_state', r.offer_state
  ) order by v.id) as variants
  from public.variants v
  left join public.catalogue_reviewed_variant_offers r on r.variant_id = v.id
  where v.product_id = p.id and v.lifecycle = 'active'
) offers on true
where p.published and p.lifecycle = 'active';

revoke all on public.marketplace_published_catalogue from public, anon, authenticated;
grant select on public.marketplace_published_catalogue to service_role;
comment on view public.marketplace_published_catalogue is
  'Server-only catalogue for active, published products, with verified collection labels and exact reviewed variant offers.';
