-- The reviewed Bonkers records below identify a cap in their product title.
-- Existing classifications and conflicting merchant product types are preserved.
begin;
select pg_advisory_xact_lock(hashtextextended('the-clothing-star:category-review', 0));
create temporary table explicit_cap_candidates on commit drop as
select p.id,p.source_url,p.title,p.observed_at
from public.products p join public.brands b on b.id=p.brand_id
where b.slug='bonkers-corner' and p.category='unknown'
  and p.title ~* '\mcap[.!]?[[:space:]]*$'
  and p.title !~* '\m(bottle|bottles|replacement|accessory|keychain)\M'
  and (p.original_product_type is null or p.original_product_type=''
       or p.original_product_type ~* '\mcap\M');
insert into public.product_attribute_evidence
 (product_id,attribute_key,value_text,source_kind,source_url,source_field,excerpt,
  evidence_level,review_status,rule_version,observed_at)
select id,'category','cap','merchant_product',source_url,'title',title,
       'explicit','accepted','bonkers-explicit-cap-title-20261118',coalesce(observed_at,now())
from explicit_cap_candidates c
where not exists (
 select 1 from public.product_attribute_evidence e
 where e.product_id=c.id and e.attribute_key='category' and e.value_text='cap'
   and e.rule_version='bonkers-explicit-cap-title-20261118'
);
update public.products p set category='cap'
from explicit_cap_candidates c where p.id=c.id and p.category='unknown';
select count(*) as classified from explicit_cap_candidates;
commit;
