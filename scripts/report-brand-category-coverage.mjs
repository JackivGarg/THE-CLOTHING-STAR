// Print a read-only SQL report for the existing Supabase project.
import { readFileSync } from 'node:fs';

const readJson = file => JSON.parse(readFileSync(new URL(file, import.meta.url), 'utf8'));
const brands = readJson('../brand-registry.json').brands
  .map(brand => brand.slug)
  .filter(slug => slug !== 'snitch'); // The user withdrew this brand from the pilot.
const categories = readJson('../catalogue-categories.json').map(category => category.slug);

function values(slugs) {
  if (!slugs.length || slugs.some(slug => typeof slug !== 'string' || !/^[a-z0-9_-]+$/.test(slug))) {
    throw new Error('Expected a nonempty list of registry slugs');
  }
  return [...new Set(slugs)].map(slug => `('${slug}')`).join(', ');
}

process.stdout.write(`with requested_brands(slug) as (values ${values(brands)}),
configured_categories(category) as (values ${values([...categories, 'unknown'])}),
styles as (
  select p.id, b.slug, coalesce(nullif(trim(p.category), ''), 'unknown') as category,
    p.published, nullif(trim(p.description_text), '') is null as missing_description
  from requested_brands r
  join public.brands b using (slug)
  join public.products p on p.brand_id = b.id
),
categories as (
  select category from configured_categories
  union
  select category from styles
),
accepted_variants as (
  select distinct variant_id from public.variant_source_observations where review_status = 'accepted'
),
variant_counts as (
  select v.product_id, count(*) as variants,
    count(*) filter (where coalesce(nullif(lower(trim(v.colour)), ''), 'unknown') = 'unknown') as missing_colour,
    count(*) filter (where coalesce(nullif(lower(trim(v.size)), ''), 'unknown') = 'unknown') as missing_size,
    count(a.variant_id) as variants_ever_accepted
  from public.variants v
  join styles s on s.id = v.product_id
  left join accepted_variants a on a.variant_id = v.id
  group by v.product_id
),
media as (
  select i.product_id, bool_or(i.content_use_status = 'approved') as approved
  from public.product_images i join styles s on s.id = i.product_id
  group by i.product_id
),
section_styles as (
  select distinct m.product_id from public.product_collection_memberships m
  join public.collections c on c.id = m.collection_id
  join public.products p on p.id = m.product_id and p.brand_id = c.brand_id
  where m.verified
)
select r.slug as brand, c.category, b.id is not null as brand_registered,
  count(s.id) as products, count(s.id) filter (where s.published) as published_products,
  count(s.id) filter (where s.missing_description) as missing_description,
  coalesce(sum(v.variants), 0)::bigint as variants,
  coalesce(sum(v.missing_colour), 0)::bigint as missing_colour,
  coalesce(sum(v.missing_size), 0)::bigint as missing_size,
  coalesce(sum(v.variants_ever_accepted), 0)::bigint as variants_ever_accepted,
  count(m.product_id) as products_with_gallery,
  count(s.id) filter (where m.approved) as products_with_approved_image,
  count(sec.product_id) as products_with_verified_section
from requested_brands r
cross join categories c
left join public.brands b on b.slug = r.slug
left join styles s on s.slug = r.slug and s.category = c.category
left join variant_counts v on v.product_id = s.id
left join media m on m.product_id = s.id
left join section_styles sec on sec.product_id = s.id
group by r.slug, c.category, b.id
order by r.slug, c.category;
`);
