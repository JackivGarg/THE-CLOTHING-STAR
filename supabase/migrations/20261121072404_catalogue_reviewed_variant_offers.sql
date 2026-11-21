-- Internal projection for search, compare and brand-page consumers.
-- Review status selects the observation. Freshness and fulfilment are separate.
create view public.catalogue_reviewed_variant_offers
with (security_invoker = true) as
select v.id as variant_id, v.product_id, accepted.id as observation_id,
       accepted.price_minor, accepted.compare_at_minor, accepted.currency,
       accepted.available, accepted.preorder, accepted.checked_at,
       p.fulfilment_status, v.size, v.colour,
       case
         when accepted.checked_at < now() - interval '72 hours' then 'last_seen'
         when latest.id <> accepted.id then 'review_pending'
         when accepted.available is false then 'unavailable'
         when accepted.preorder is true then 'preorder'
         when accepted.available is true and accepted.price_minor > 0
           and accepted.preorder is false and p.fulfilment_status = 'ready' then 'ready'
         else 'unknown'
       end as offer_state
from public.variants v
join public.products p on p.id = v.product_id
join public.brands b on b.id = p.brand_id and b.active
join lateral (
  select o.* from public.variant_source_observations o
  where o.variant_id = v.id and o.source_variant_id = v.source_id
    and o.review_status = 'accepted' and o.checked_at <= now()
  order by o.checked_at desc, o.id desc
  limit 1
) accepted on true
join lateral (
  select o.id from public.variant_source_observations o
  where o.variant_id = v.id and o.source_variant_id = v.source_id
    and o.review_status <> 'rejected' and o.checked_at <= now()
  order by o.checked_at desc, o.id desc
  limit 1
) latest on true
where p.lifecycle = 'active' and v.lifecycle = 'active';

revoke all on public.catalogue_reviewed_variant_offers from public, anon, authenticated;
grant select on public.catalogue_reviewed_variant_offers to service_role;

comment on view public.catalogue_reviewed_variant_offers is
  'Private accepted catalogue offers. Unknown and last-seen states cannot qualify for a ready-offer result.';
