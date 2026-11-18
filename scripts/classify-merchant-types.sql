-- Apply narrow merchant-specific type mappings when the title is consistent.
-- Existing classifications, ambiguous types and conflicting titles stay untouched.
begin;
select pg_advisory_xact_lock(hashtextextended('the-clothing-star:category-review', 0));
create temporary table mapped_categories on commit drop as
select p.id,p.source_url,p.title,p.original_product_type,p.observed_at,
 case
  when b.slug='everdion' and lower(trim(p.original_product_type)) in ('trackpants','cargos')
       and p.title !~* '\m(set|co[ -]?ord|bag|shorts|jacket|shirt)\M' then 'trousers'
  when b.slug='everdion' and lower(trim(p.original_product_type))='cord set'
       and p.title ~* '\m(set|tracksuit)\M' then 'co_ord'
  when b.slug='wtflex' and lower(trim(p.original_product_type)) in ('caps','caps.')
       and p.title ~* '\mcap[.!]?[[:space:]]*$' then 'cap'
  when b.slug='powerlook' and lower(trim(p.original_product_type))='bags'
       and p.title ~* '\mbag[.!]?[[:space:]]*$' then 'bag'
 end category
from public.products p join public.brands b on b.id=p.brand_id
where p.category='unknown' and b.slug in ('everdion','wtflex','powerlook');
delete from mapped_categories where category is null;
insert into public.product_attribute_evidence
 (product_id,attribute_key,value_text,source_kind,source_url,source_field,excerpt,
  evidence_level,review_status,rule_version,observed_at)
select id,'category',category,'merchant_product',source_url,'original_product_type',
       original_product_type || ' | ' || title,'explicit','accepted','merchant-type-map-20261118',coalesce(observed_at,now())
from mapped_categories c
where not exists (
 select 1 from public.product_attribute_evidence e where e.product_id=c.id and e.attribute_key='category'
   and e.value_text=c.category and e.rule_version='merchant-type-map-20261118'
);
update public.products p set category=c.category
from mapped_categories c where p.id=c.id and p.category='unknown';
select category,count(*) as classified from mapped_categories group by category order by category;
commit;
