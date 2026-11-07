-- 33 exact Genrage source titles, from verified 2026-11-07 feed refresh.
-- Insert only pending evidence; do not alter products, variants or source types.
begin isolation level repeatable read;
select pg_advisory_xact_lock(hashtextextended('the-clothing-star:genrage-accessory-category-evidence-1', 0));
create temporary table expected_genrage_accessories (source_id text primary key, title text not null, category text not null) on commit drop;
insert into expected_genrage_accessories values
  ('9431100752110', 'Thorn Charm Pendant', 'pendant'),
  ('9535630672110', 'Spear Charm Pendant', 'pendant'),
  ('9535638307054', 'Ache Charm Pendant', 'pendant'),
  ('9535627264238', 'Throb Charm Pendant', 'pendant'),
  ('9528784847086', 'Anchor Pendant Chain', 'pendant'),
  ('9490060017902', 'GRIND LEATHER DUFFLE BAG', 'bag'),
  ('9490054054126', 'Jade Charm Pendant', 'pendant'),
  ('9490053726446', 'Roseth Charm Pendant', 'pendant'),
  ('9212524167406', 'Grave Charm Pendant', 'pendant'),
  ('9212529606894', 'Scar Charm Pendant', 'pendant'),
  ('9431097442542', 'Aura Charm Pendant', 'pendant'),
  ('9431098753262', 'Blade Charm Pendant', 'pendant'),
  ('9274103136494', 'Ascend Charm Pendant', 'pendant'),
  ('9212410101998', 'Sword Charm Pendant', 'pendant'),
  ('9288559296750', 'Viper Charm Pendant', 'pendant'),
  ('9288556839150', 'Croix Charm Pendant', 'pendant'),
  ('9212525215982', 'Sigil Charm Pendant', 'pendant'),
  ('9212535996654', 'Creed Charm Pendant', 'pendant'),
  ('9274107134190', 'Wound Charm Pendant', 'pendant'),
  ('9274117259502', 'Cosma Charm Pendant', 'pendant'),
  ('9274112966894', 'Starlit Charm Pendant', 'pendant'),
  ('9274112049390', 'Ignis Charm Pendant', 'pendant'),
  ('9212448375022', 'Vexor Charm Pendant', 'pendant'),
  ('9212436513006', 'Berserk Charm Pendant', 'pendant'),
  ('9254338330862', 'Saint Charm Pendant', 'pendant'),
  ('9247591760110', 'Ash Charm Pendant', 'pendant'),
  ('9247593791726', 'Vile Charm Pendant', 'pendant'),
  ('9247569936622', 'Sin Charm Pendant', 'pendant'),
  ('9247578849518', 'Rift Charm Pendant', 'pendant'),
  ('9219723034862', 'LEATHER BAGPACK', 'bag'),
  ('9219637674222', 'GENRAGE Pendant Chain', 'pendant'),
  ('9140501676270', 'LEATHER DUFFLE BAG', 'bag'),
  ('8713946136814', 'GENRAGE GIFT CARD', 'gift_card');

create temporary table genrage_accessory_evidence on commit drop as
select e.source_id,e.title,e.category,p.id product_id,s.id staged_record_id,
  s.payload->>'source_url' source_url,s.observed_at
from expected_genrage_accessories e
join public.staged_catalogue_records s on s.external_product_id=e.source_id
  and s.import_run_id='1fe9a237-3afb-4b5f-bffb-cc212ab3545a'::uuid
join public.source_configs c on c.id=s.source_config_id
join public.brands b on b.id=c.brand_id and b.slug='genrage'
join public.import_runs r on r.id=s.import_run_id and r.source_config_id=c.id
join public.products p on p.brand_id=b.id and p.source_id=e.source_id
where r.complete and r.staged=230 and r.status='review_required'
  and s.validation_status in ('pending','accepted') and s.errors='[]'::jsonb
  and s.payload->>'title'=e.title and p.title=e.title
  and nullif(btrim(s.payload->>'original_product_type'),'') is null
  and nullif(btrim(p.original_product_type),'') is null
  and s.payload->>'source_url'=p.source_url;

do $$ begin
  if (select count(*) from genrage_accessory_evidence) <> 33
    or (select count(distinct source_id) from genrage_accessory_evidence) <> 33
    or (select count(*) from genrage_accessory_evidence where category='pendant') <> 29
    or (select count(*) from genrage_accessory_evidence where category='bag') <> 3
    or (select count(*) from genrage_accessory_evidence where category='gift_card') <> 1
  then raise exception 'Genrage accessory scope/source mismatch, refusing to insert'; end if;
  if exists (select 1 from genrage_accessory_evidence c join public.product_attribute_evidence e
    on e.product_id=c.product_id and e.attribute_key='category'
      and e.rule_version='genrage-accessory-title-1'
    where e.variant_id is not null or e.value_text is distinct from c.category
      or e.source_kind is distinct from 'title' or e.source_url is distinct from c.source_url
      or e.source_field is distinct from 'title' or e.excerpt is distinct from c.title
      or e.evidence_level is distinct from 'inferred' or e.observed_at is distinct from c.observed_at
  ) then raise exception 'Conflicting existing evidence; refusing to overwrite'; end if;
end $$;

insert into public.product_attribute_evidence
(product_id,attribute_key,value_text,source_kind,source_url,source_field,excerpt,evidence_level,review_status,rule_version,observed_at)
select c.product_id,'category',c.category,'title',c.source_url,'title',c.title,'inferred','pending','genrage-accessory-title-1',c.observed_at
from genrage_accessory_evidence c
where not exists (select 1 from public.product_attribute_evidence e
  where e.product_id=c.product_id and e.attribute_key='category' and e.rule_version='genrage-accessory-title-1');

select category,count(*) expected,
  count(*) filter(where e.id is not null) recorded
from genrage_accessory_evidence c left join public.product_attribute_evidence e
  on e.product_id=c.product_id and e.attribute_key='category' and e.rule_version='genrage-accessory-title-1'
group by category order by category;
commit;
