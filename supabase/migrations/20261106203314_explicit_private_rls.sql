-- Make the private boundary explicit, in addition to revoking table privileges.
create policy deny_public_access on public.collections for all to anon,authenticated using (false) with check (false);
create policy deny_public_access on public.import_run_errors for all to anon,authenticated using (false) with check (false);
create policy deny_public_access on public.import_runs for all to anon,authenticated using (false) with check (false);
create policy deny_public_access on public.product_attribute_evidence for all to anon,authenticated using (false) with check (false);
create policy deny_public_access on public.product_collection_memberships for all to anon,authenticated using (false) with check (false);
create policy deny_public_access on public.product_image_variants for all to anon,authenticated using (false) with check (false);
create policy deny_public_access on public.source_configs for all to anon,authenticated using (false) with check (false);
create policy deny_public_access on public.staged_catalogue_records for all to anon,authenticated using (false) with check (false);
create policy deny_public_access on public.store_policy_observations for all to anon,authenticated using (false) with check (false);
