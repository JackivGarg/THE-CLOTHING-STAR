-- Keep existing rows and restrict public image reads to individually approved media.
drop policy if exists published_product_images_read on public.product_images;
create policy published_product_images_read on public.product_images
  for select to anon, authenticated
  using (content_use_status = 'approved' and exists
    (select 1 from public.products where products.id = product_images.product_id and products.published));

create or replace view public.public_catalogue with (security_invoker = true) as
select p.id::text as id, b.name as brand, p.title, p.category, p.fit, p.themes,
  p.theme_evidence, p.observed_at,
  (select im.source_url from public.product_images im where im.product_id = p.id
   and im.content_use_status = 'approved' order by im.gallery_order, im.id limit 1) as image_url,
  p.source_url, false as synthetic,
  coalesce(jsonb_agg(jsonb_build_object('id',v.id::text,'size',v.size,'colour',v.colour,
    'price_minor',v.price_minor,'available',v.available)) filter (where v.id is not null),'[]'::jsonb) as variants
from public.products p join public.brands b on b.id=p.brand_id
left join public.variants v on v.product_id=p.id
where p.published group by p.id,b.name;

revoke select on public.products from anon, authenticated;
grant select (id, brand_id, source_id, title, category, fit, themes, theme_evidence,
  source_url, observed_at, published, handle, description_text, source_updated_at,
  original_product_type, source_tags, fulfilment_status, lifecycle, content_hash)
  on public.products to anon, authenticated;

-- Search only records visible through the existing publication and RLS policies.
create or replace function public.search_catalogue(
  p_brand text default null,
  p_category text default null,
  p_audience text default null,
  p_size text default null,
  p_colour text default null,
  p_budget integer default null,
  p_fit text default null,
  p_theme text default null,
  p_print_theme text default null,
  p_title text default null,
  p_design text[] default array[]::text[],
  p_sort text default 'recommended',
  p_page integer default 1,
  p_favourites text[] default array[]::text[]
) returns jsonb
language sql stable security invoker
set search_path = ''
as $function$
  with matches as (
    select p.id, p.title, p.category, p.fit, p.themes, p.source_url, p.observed_at, p.description_text, b.name as brand_name, selected.variant, audience.men as audience_men, audience.women as audience_women, audience.unisex as audience_unisex,
      coalesce((select count(*) from unnest(coalesce(p_design, array[]::text[])) term
        where to_tsvector('simple', coalesce(p.title, '') || ' ' || coalesce(p.description_text, ''))
          @@ plainto_tsquery('simple', term)), 0) as exact_count
    from public.products p
    join public.brands b on b.id = p.brand_id
    cross join lateral (
      select
        coalesce(bool_or(lower(btrim(tag)) in ('men', 'mens', 'men''s')), false) as men,
        coalesce(bool_or(lower(btrim(tag)) in ('women', 'womens', 'women''s')), false) as women,
        coalesce(bool_or(lower(btrim(tag)) = 'unisex'), false) as unisex
      from jsonb_array_elements_text(
        case when jsonb_typeof(p.source_tags) = 'array' then p.source_tags else '[]'::jsonb end
      ) as source(tag)
    ) tags
    cross join lateral (
      select
        p.title ~* '^[[:space:]]*men[''’]s([[:space:]]|$)' or p.title ~* '[[:space:]]for[[:space:]]+men[[:space:]]*$' as men,
        p.title ~* '^[[:space:]]*women[''’]s([[:space:]]|$)' or p.title ~* '[[:space:]]for[[:space:]]+women[[:space:]]*$' as women,
        p.title ~* '^[[:space:]]*unisex([[:space:]]|$)' as unisex
    ) title_label
    cross join lateral (
      select
        tags.unisex or title_label.unisex as unisex,
        not ((title_label.men and tags.women) or (title_label.women and tags.men))
          and (tags.men or title_label.men) as men,
        not ((title_label.men and tags.women) or (title_label.women and tags.men))
          and (tags.women or title_label.women) as women
    ) audience
    cross join lateral (
      select v as variant
      from public.variants v
      where v.product_id = p.id and v.available is true and v.lifecycle = 'active'
        and (p_size is null or
          replace(replace(replace(upper(v.size), 'XXXL', '3XL'), 'XXL', '2XL'), 'XXS', '2XS') =
          replace(replace(replace(upper(p_size), 'XXXL', '3XL'), 'XXL', '2XL'), 'XXS', '2XS'))
        and (p_colour is null or replace(lower(v.colour), 'gray', 'grey') = replace(lower(p_colour), 'gray', 'grey'))
        and (p_budget is null or v.price_minor <= p_budget)
      order by v.price_minor, v.id
      limit 1
    ) selected
    where p.published and p.lifecycle = 'active'
      and coalesce(cardinality(p_design), 0) <= 30
      and coalesce(cardinality(p_favourites), 0) <= 40
      and coalesce(length(p_title), 0) <= 300
      and (p_budget is null or p_budget between 1 and 100000000)
      and not exists (select 1 from unnest(coalesce(p_design, array[]::text[])) term where length(term) > 80 or length(term) = 0)
      and (p_audience is null
        or (p_audience = 'unisex' and audience.unisex)
        or (p_audience = 'men' and (audience.unisex or audience.men))
        or (p_audience = 'women' and (audience.unisex or audience.women)))
      and p_print_theme is null
      and (p_brand is null or lower(b.name) = lower(p_brand))
      and (p_category is null or p.category = p_category)
      and (p_fit is null or p.fit = p_fit)
      and (p_theme is null or p_theme = any(p.themes))
      and (p_title is null or to_tsvector('simple', p.title) @@ plainto_tsquery('simple', p_title))
      and not exists (
        select 1 from unnest(coalesce(p_design, array[]::text[])) term
        where not (
          to_tsvector('simple', coalesce(p.title, '') || ' ' || coalesce(p.description_text, ''))
            @@ plainto_tsquery('simple', term)
          or (term in ('thunder', 'lightning') and
            to_tsvector('simple', coalesce(p.title, '') || ' ' || coalesce(p.description_text, ''))
              @@ to_tsquery('simple', 'thunder | lightning'))
        )
      )
  ),
  page as (
    select * from matches
    order by
      case when p_sort = 'recommended' then exact_count end desc,
      case when p_sort = 'recommended' and brand_name = any(coalesce(p_favourites, array[]::text[])) then 1 else 0 end desc,
      case when p_sort = 'price-desc' then (variant).price_minor end desc,
      case when p_sort <> 'price-desc' then (variant).price_minor end asc,
      id
    limit 5 offset (greatest(1, least(coalesce(p_page, 1), 2000)) - 1) * 5
  )
  select jsonb_build_object(
    'total', (select count(*) from matches),
    'page', greatest(1, least(coalesce(p_page, 1), 2000)),
    'lastSeen', coalesce((select jsonb_agg(jsonb_build_object(
      'id', id::text, 'brand', brand_name, 'title', title, 'category', category,
      'fit', fit, 'source_url', source_url, 'image_url',
        (select im.source_url from public.product_images im
         where im.product_id = page.id and im.content_use_status = 'approved'
         order by im.gallery_order, im.id limit 1),
      'observed_at', observed_at, 'synthetic', false,
      'audience', case when audience_unisex then 'unisex'
        when audience_men and not audience_women then 'men'
        when audience_women and not audience_men then 'women' else null end,
      'audiences', case when not audience_unisex and audience_men and audience_women
        then jsonb_build_array('men', 'women') else null end,
      'selected_variant', jsonb_build_object('id', (variant).id::text, 'size', (variant).size,
        'colour', (variant).colour, 'price_minor', (variant).price_minor,
        'available', (variant).available, 'source_options', (variant).source_options),
      'match_reason', case when cardinality(coalesce(p_design, array[]::text[])) = 0 then null
        when exact_count = cardinality(p_design) then 'Design terms found in product details'
        else 'Related design found in product details' end
    ) order by
      case when p_sort = 'recommended' then exact_count end desc,
      case when p_sort = 'recommended' and brand_name = any(coalesce(p_favourites, array[]::text[])) then 1 else 0 end desc,
      case when p_sort = 'price-desc' then (variant).price_minor end desc,
      case when p_sort <> 'price-desc' then (variant).price_minor end asc,
      id) from page), '[]'::jsonb),
    'confirmed', '[]'::jsonb,
    'unknownDelivery', '[]'::jsonb,
    'hasMore', (select count(*) from matches) > greatest(1, least(coalesce(p_page, 1), 2000)) * 5
  );
$function$;

revoke all on function public.search_catalogue(text,text,text,text,text,integer,text,text,text,text,text[],text,integer,text[]) from public;
grant execute on function public.search_catalogue(text,text,text,text,text,integer,text,text,text,text,text[],text,integer,text[]) to anon, authenticated;
