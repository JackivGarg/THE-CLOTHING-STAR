-- Run as a privileged operator. Save the single snapshot column as ignored local JSON.
-- The local preview uses merchant product and variant identity, not database UUIDs.
select jsonb_build_object(
  'exported_at', now(),
  'offers', coalesce((
    select jsonb_agg(jsonb_build_object(
      'product_id', b.slug || ':' || p.source_id, 'variant_id', v.source_id,
      'price_minor', r.price_minor, 'available', r.available, 'preorder', r.preorder,
      'checked_at', r.checked_at, 'fulfilment_status', r.fulfilment_status, 'offer_state', r.offer_state,
      'source_sku', v.source_sku
    ) order by b.slug, p.source_id, v.source_id)
    from public.catalogue_reviewed_variant_offers r
    join public.products p on p.id = r.product_id
    join public.brands b on b.id = p.brand_id
    join public.variants v on v.id = r.variant_id
  ), '[]'::jsonb),
  'section_products', coalesce((
    select jsonb_agg(jsonb_build_object('product_id', product_id, 'labels', labels) order by product_id)
    from (
      select b.slug || ':' || p.source_id as product_id,
             array_agg(distinct replace(c.title, '-', ' ') order by replace(c.title, '-', ' ')) as labels
      from public.product_collection_memberships m
      join public.products p on p.id = m.product_id and p.lifecycle = 'active'
      join public.brands b on b.id = p.brand_id and b.active
      join public.collections c on c.id = m.collection_id and c.brand_id = p.brand_id
      where m.verified
      group by b.slug, p.source_id
    ) verified
  ), '[]'::jsonb),
  'products', coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', b.slug || ':' || p.source_id, 'brand', b.name, 'brand_slug', b.slug,
      'title', p.title, 'description_text', p.description_text, 'category', p.category, 'fit', p.fit,
      'themes', p.themes, 'theme_evidence', p.theme_evidence, 'source_url', p.source_url,
      'observed_at', p.observed_at, 'synthetic', false, 'image_url', null,
      'variants', (
        select jsonb_agg(jsonb_build_object(
          'id', v.source_id, 'size', v.size, 'colour', v.colour, 'price_minor', v.price_minor,
          'available', v.available, 'source_options', v.source_options, 'source_sku', v.source_sku
        ) order by v.source_id)
        from public.variants v where v.product_id = p.id and v.lifecycle = 'active'
      )
    ) order by b.slug, p.source_id)
    from public.products p
    join public.brands b on b.id = p.brand_id and b.active
    where p.lifecycle = 'active'
      and exists (select 1 from public.catalogue_reviewed_variant_offers r where r.product_id = p.id)
  ), '[]'::jsonb)
) as snapshot;
