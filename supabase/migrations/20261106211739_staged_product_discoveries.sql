create table public.staged_product_discoveries (id bigint generated always as identity primary key, source_config_id uuid not null references public.source_configs(id), source_url text not null, title text, image_url text, source_updated_at timestamptz, observed_at timestamptz not null default now(), review_status text not null default 'pending' check (review_status in ('pending','accepted','rejected','conflict')), unique(source_config_id,source_url));
create index staged_product_discoveries_source_idx on public.staged_product_discoveries(source_config_id,observed_at desc);
alter table public.staged_product_discoveries enable row level security;
revoke all on public.staged_product_discoveries from anon,authenticated;
create policy deny_public_access on public.staged_product_discoveries for all to anon,authenticated using (false) with check (false);
