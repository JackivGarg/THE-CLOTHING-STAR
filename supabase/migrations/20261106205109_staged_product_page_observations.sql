-- Append-only rendered-page evidence for private catalogue review.
-- This supplements staged feed rows and does not promote or overwrite product data.
create table public.staged_product_page_observations (
  id bigint generated always as identity primary key,
  source_config_id uuid not null references public.source_configs(id),
  import_run_id uuid not null references public.import_runs(id),
  external_product_id text,
  product_title text not null,
  source_url text not null,
  observation jsonb not null check (jsonb_typeof(observation) = 'object'),
  observed_at timestamptz not null default now(),
  review_status text not null default 'pending'
    check (review_status in ('pending', 'accepted', 'rejected', 'conflict'))
);

create index staged_page_observations_source_idx
  on public.staged_product_page_observations (source_config_id, observed_at desc);
create index staged_page_observations_run_idx
  on public.staged_product_page_observations (import_run_id);
create index staged_page_observations_product_idx
  on public.staged_product_page_observations (source_config_id, external_product_id);

alter table public.staged_product_page_observations enable row level security;
revoke all on public.staged_product_page_observations from anon, authenticated;
create policy deny_public_access
  on public.staged_product_page_observations
  for all to anon, authenticated
  using (false) with check (false);

comment on table public.staged_product_page_observations is
  'Private supplementary browser observations tied to a source run; does not overwrite feed rows or qualify as published product data.';
comment on column public.staged_product_page_observations.observation is
  'Compact facts and short evidence excerpts from a rendered product page; status remains pending until reviewed.';
