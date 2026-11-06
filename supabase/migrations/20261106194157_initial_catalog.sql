-- Initial, deliberately minimal catalogue foundation. All source observations need review before publication.
create table public.brands (id uuid primary key default gen_random_uuid(), slug text not null unique, name text not null, base_url text not null);
create table public.products (id uuid primary key default gen_random_uuid(), brand_id uuid not null references public.brands(id), source_id text not null, title text not null, category text not null, fit text, themes text[] not null default '{}', theme_evidence text, source_url text, image_url text, observed_at timestamptz, published boolean not null default false, unique(brand_id,source_id));
create table public.variants (id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products(id) on delete cascade, source_id text not null, size text, colour text, price_minor integer not null check(price_minor>=0), currency text not null default 'INR' check(currency='INR'), available boolean, unique(product_id,source_id));
create index variants_product_idx on public.variants(product_id);
alter table public.brands enable row level security;
alter table public.products enable row level security;
alter table public.variants enable row level security;
revoke all on public.brands, public.products, public.variants from anon, authenticated;
create view public.public_catalogue with (security_invoker = true) as
select p.id::text, b.name as brand, p.title, p.category, p.fit, p.themes, p.theme_evidence, p.observed_at, p.image_url, p.source_url, false as synthetic,
coalesce(jsonb_agg(jsonb_build_object('id',v.id::text,'size',v.size,'colour',v.colour,'price_minor',v.price_minor,'available',v.available)) filter (where v.id is not null),'[]'::jsonb) as variants
from public.products p join public.brands b on b.id=p.brand_id left join public.variants v on v.product_id=p.id where p.published group by p.id,b.name;
revoke all on public.public_catalogue from anon, authenticated;
-- Only reviewed, published catalogue records are readable with a publishable key.
grant select on public.brands, public.products, public.variants, public.public_catalogue to anon, authenticated;
create policy published_products_read on public.products for select to anon, authenticated using (published = true);
create policy published_brand_read on public.brands for select to anon, authenticated using (exists (select 1 from public.products where products.brand_id = brands.id and products.published = true));
create policy published_variants_read on public.variants for select to anon, authenticated using (exists (select 1 from public.products where products.id = variants.product_id and products.published = true));
