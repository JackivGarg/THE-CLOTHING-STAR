-- Collector records stay private until field mappings and source scope are reviewed.
create table public.staged_catalogue_records (
 id bigint generated always as identity primary key,
 source_config_id uuid not null references public.source_configs(id),
 import_run_id uuid not null references public.import_runs(id) on delete cascade,
 external_product_id text not null, external_variant_id text,
 payload jsonb not null, content_hash text not null,
 validation_status text not null default 'pending' check(validation_status in ('pending','accepted','rejected','conflict')),
 errors jsonb not null default '[]'::jsonb, observed_at timestamptz not null default now(),
 unique(import_run_id,external_product_id,external_variant_id)
);
create index staged_records_review_idx on public.staged_catalogue_records(source_config_id,validation_status,observed_at desc);
alter table public.staged_catalogue_records enable row level security;
revoke all on public.staged_catalogue_records from anon,authenticated;
