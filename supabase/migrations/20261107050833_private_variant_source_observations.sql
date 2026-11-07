-- Append-only merchant observations. Normalized values and manual corrections
-- are deliberately not touched by this table or its backfill.
create table public.variant_source_observations (
  id bigint generated always as identity primary key,
  variant_id uuid not null references public.variants(id),
  staged_record_id bigint not null references public.staged_catalogue_records(id),
  import_run_id uuid not null references public.import_runs(id),
  source_config_id uuid not null references public.source_configs(id),
  source_variant_id text not null check (length(btrim(source_variant_id)) > 0),
  checked_at timestamptz not null,
  price_minor integer check (price_minor >= 0),
  compare_at_minor integer check (compare_at_minor >= 0),
  currency text check (currency is null or currency = 'INR'),
  available boolean,
  preorder boolean,
  review_status text not null default 'pending'
    check (review_status in ('pending', 'accepted', 'rejected', 'conflict')),
  check (price_minor is null or currency is not distinct from 'INR'),
  unique (import_run_id, variant_id)
);

create index variant_source_observations_latest_idx
  on public.variant_source_observations (variant_id, checked_at desc);
create index variant_source_observations_stage_idx
  on public.variant_source_observations (staged_record_id);

alter table public.variant_source_observations enable row level security;
revoke all on public.variant_source_observations from public, anon, authenticated;
revoke all on sequence public.variant_source_observations_id_seq from public, anon, authenticated;
grant select, insert on public.variant_source_observations to service_role;
grant usage, select on sequence public.variant_source_observations_id_seq to service_role;

comment on table public.variant_source_observations is
  'Private source observations; pending review, independent of normalized variant values and any manual corrections.';
comment on column public.variant_source_observations.checked_at is
  'Observation time from the staged source record, not import time or source product updated_at.';
