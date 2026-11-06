-- Add ingestion provenance and source-detail fields without rewriting or deleting current rows.
alter table public.brands add column if not exists active boolean not null default true;
alter table public.products add column if not exists handle text;
alter table public.products add column if not exists description_text text;
alter table public.products add column if not exists source_updated_at timestamptz;
alter table public.products add column if not exists original_product_type text;
alter table public.products add column if not exists source_tags jsonb not null default '[]'::jsonb;
alter table public.products add column if not exists fulfilment_status text not null default 'unknown' check (fulfilment_status in ('ready','preorder','unknown'));
alter table public.products add column if not exists lifecycle text not null default 'active' check (lifecycle in ('active','not_seen','withdrawn'));
alter table public.products add column if not exists content_hash text;
alter table public.variants add column if not exists source_options jsonb not null default '{}'::jsonb;
alter table public.variants add column if not exists source_sku text;
alter table public.variants add column if not exists compare_at_minor integer check (compare_at_minor is null or compare_at_minor >= 0);
alter table public.variants add column if not exists preorder boolean;
alter table public.variants add column if not exists lifecycle text not null default 'active' check (lifecycle in ('active','not_seen','withdrawn'));
create table public.source_configs (
 id uuid primary key default gen_random_uuid(), brand_id uuid not null references public.brands(id),
 adapter_kind text not null check(adapter_kind in ('shopify_feed','rendered_page','manual','unsupported')),
 source_url text, robots_url text not null, robots_checked_at timestamptz, robots_sha256 text,
 feed_allowed boolean, pagination_allowed boolean, price_unit text check(price_unit in ('major_decimal','minor_integer','unknown')),
 scope_key text not null default 'catalogue', scope_status text not null default 'unreviewed' check(scope_status in ('unreviewed','ready','partial','blocked')),
 access_notes text, content_use_status text not null default 'unknown' check(content_use_status in ('unknown','approved','restricted')),
 created_at timestamptz not null default now(), unique(brand_id,scope_key)
);
create table public.import_runs (
 id uuid primary key default gen_random_uuid(), source_config_id uuid not null references public.source_configs(id),
 started_at timestamptz not null default now(), ended_at timestamptz,
 status text not null check(status in ('running','success','partial','failed','blocked','review_required')),
 scope_key text not null, complete boolean not null default false, cursor jsonb,
 requests integer not null default 0, pages integer not null default 0, discovered integer not null default 0,
 staged integer not null default 0, published integer not null default 0, rejected integer not null default 0,
 errors jsonb not null default '[]'::jsonb, collector_version text not null default '0.1.0', snapshot_dir text
);
create table public.product_images (
 id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products(id) on delete cascade,
 source_id text, source_url text not null, alt_text text, gallery_order integer not null default 0,
 content_use_status text not null default 'unknown' check(content_use_status in ('unknown','approved','restricted')),
 observed_at timestamptz not null default now(), unique(product_id,source_url)
);
create table public.product_attribute_evidence (
 id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products(id) on delete cascade,
 variant_id uuid references public.variants(id) on delete cascade, attribute_key text not null, value_text text,
 source_kind text not null, source_url text, source_field text, excerpt text,
 evidence_level text not null check(evidence_level in ('explicit','inferred','ambiguous')),
 review_status text not null default 'pending' check(review_status in ('pending','accepted','rejected','conflict')),
 rule_version text not null default '0.1.0', observed_at timestamptz not null default now()
);
create table public.import_run_errors (
 id bigint generated always as identity primary key, import_run_id uuid not null references public.import_runs(id) on delete cascade,
 severity text not null, source_ref text, message text not null, observed_at timestamptz not null default now()
);
alter table public.source_configs enable row level security;
alter table public.import_runs enable row level security;
alter table public.product_images enable row level security;
alter table public.product_attribute_evidence enable row level security;
alter table public.import_run_errors enable row level security;
revoke all on public.source_configs,public.import_runs,public.product_images,public.product_attribute_evidence,public.import_run_errors from anon,authenticated;
grant select on public.product_images to anon,authenticated;
create policy published_product_images_read on public.product_images for select to anon,authenticated using (exists (select 1 from public.products where products.id=product_images.product_id and products.published=true));
-- Evidence and import history remain private; ingestion writes use a server-side credential.
