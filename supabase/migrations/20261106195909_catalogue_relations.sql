create table public.collections (
 id uuid primary key default gen_random_uuid(), brand_id uuid not null references public.brands(id), source_id text not null,
 title text not null, handle text, source_url text, observed_at timestamptz not null default now(), unique(brand_id,source_id)
);
create table public.product_collection_memberships (
 product_id uuid not null references public.products(id) on delete cascade,
 collection_id uuid not null references public.collections(id) on delete cascade,
 source_run_id uuid references public.import_runs(id), verified boolean not null default false,
 primary key(product_id,collection_id)
);
create table public.product_image_variants (
 image_id uuid not null references public.product_images(id) on delete cascade,
 variant_id uuid not null references public.variants(id) on delete cascade,
 primary key(image_id,variant_id)
);
create table public.store_policy_observations (
 id uuid primary key default gen_random_uuid(), brand_id uuid not null references public.brands(id),
 policy_kind text not null check(policy_kind in ('shipping','returns','refunds','promotion','other')),
 source_url text not null, summary text, conditions jsonb not null default '{}'::jsonb,
 conflict_state text not null default 'unknown' check(conflict_state in ('clear','conflict','unknown')),
 observed_at timestamptz not null default now(), review_status text not null default 'pending' check(review_status in ('pending','accepted','rejected'))
);
alter table public.collections enable row level security;
alter table public.product_collection_memberships enable row level security;
alter table public.product_image_variants enable row level security;
alter table public.store_policy_observations enable row level security;
revoke all on public.collections,public.product_collection_memberships,public.product_image_variants,public.store_policy_observations from anon,authenticated;
