-- Reclassify products whose own titles explicitly identify a co-ord set.
-- Rows with conflicting merchant types and existing classifications are preserved.
begin;
select pg_advisory_xact_lock(hashtextextended('the-clothing-star:category-review', 0));
create temporary table explicit_coord_candidates on commit drop as
select p.id,p.source_url,p.title,p.observed_at
from public.products p
where p.category='unknown'
  and p.title ~* '\mco[ -]?ord[ -]+set\M'
  and p.title !~* '\m(gift[ -]?card|drawstrings?|bag|pendant|top|bottom|only|separate)\M'
  and (p.original_product_type is null or p.original_product_type=''
       or p.original_product_type ~* '\mco[ -]?ord\M');
insert into public.product_attribute_evidence
 (product_id,attribute_key,value_text,source_kind,source_url,source_field,excerpt,
  evidence_level,review_status,rule_version,observed_at)
select id,'category','co_ord','merchant_product',source_url,'title',title,
       'explicit','accepted','explicit-coord-title-20261118',coalesce(observed_at,now())
from explicit_coord_candidates c
where not exists (
 select 1 from public.product_attribute_evidence e
 where e.product_id=c.id and e.attribute_key='category' and e.value_text='co_ord'
   and e.rule_version='explicit-coord-title-20261118'
);
update public.products p set category='co_ord'
from explicit_coord_candidates c where p.id=c.id and p.category='unknown';
select count(*) as classified from explicit_coord_candidates;
commit;
