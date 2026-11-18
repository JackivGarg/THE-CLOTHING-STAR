-- Three individually checked JNORSS products with explicit product-specific text.
-- Restrict updates to unknown categories so reviewed values are not replaced.
begin;
select pg_advisory_xact_lock(hashtextextended('the-clothing-star:category-review', 0));
create temporary table reviewed_categories (
  source_id text primary key, category text not null, expected_title text not null,
  source_field text not null, excerpt text not null
) on commit drop;
insert into reviewed_categories values
 ('10882890105025','hoodie','Peaky Blinders Shelby Noir Dominion','original_product_type','acid wash hoodie'),
 ('11036675244225','tee','Alpha Star Ringer Tees','original_product_type','Ringer Tee( blue&sky blue)'),
 ('11113980592321','trousers','Camo Utility Baggy Cargo','description_text','JNORSS Camo Utility Baggy Cargo Pants');
create temporary table category_updates on commit drop as
select p.id,p.source_id,p.source_url,p.observed_at,r.category,r.source_field,r.excerpt
from public.products p join public.brands b on b.id=p.brand_id
join reviewed_categories r on r.source_id=p.source_id and r.expected_title=p.title
where b.slug='jnorss' and p.category='unknown'
  and (case r.source_field when 'original_product_type' then p.original_product_type
       when 'description_text' then p.description_text end) ilike '%' || r.excerpt || '%';
insert into public.product_attribute_evidence
 (product_id,attribute_key,value_text,source_kind,source_url,source_field,excerpt,
  evidence_level,review_status,rule_version,observed_at)
select id,'category',category,'merchant_product',source_url,source_field,excerpt,
       'explicit','accepted','jnorss-reviewed-category-20261118',observed_at
from category_updates u
where not exists (
 select 1 from public.product_attribute_evidence e where e.product_id=u.id and e.attribute_key='category'
   and e.value_text=u.category and e.rule_version='jnorss-reviewed-category-20261118'
);
update public.products p set category=u.category
from category_updates u where p.id=u.id and p.category='unknown';
select count(*) as classified from category_updates;
commit;
