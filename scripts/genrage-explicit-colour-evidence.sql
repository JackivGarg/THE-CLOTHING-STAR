-- 72 exact product-specific Genrage Unique Colour labels from the verified feed.
-- Product-level evidence only. No variant color, product, or source data changes.
begin isolation level repeatable read;
select pg_advisory_xact_lock(hashtextextended('the-clothing-star:genrage-explicit-colour-1', 0));
create temporary table expected_genrage_colours (source_id text primary key, title text not null, label text not null, excerpt text not null) on commit drop;
insert into expected_genrage_colours values
  ('9089952219374', 'Empress Black Boxy Sleeveless Hoodie', 'Jet Black', 'Jet Black Unique Colour'),
  ('9220439605486', 'War Grey Boxy Sleeveless Hoodie', 'Melange Grey', 'Melange Grey Unique Colour'),
  ('9212622766318', 'Duality Melange Unisex Zipper Hoodie', 'Melange Grey', 'Melange Grey Unique Colour'),
  ('9212622536942', 'Biface Melange Unisex Zipper Hoodie', 'Melange Grey', 'Melange Grey Unique Colour'),
  ('9138250383598', 'Lean Black Boxy Oversized Hoodie', 'Jet Black', 'Jet Black Unique Colour'),
  ('9138249728238', 'Pierce Black Boxy Oversized Hoodie', 'Jet Black', 'Jet Black Unique Colour'),
  ('9089950744814', 'Gaze Black Boxy Sleeveless Hoodie', 'Jet Black', 'Jet Black Unique Colour'),
  ('9067460133102', 'Perish Black Zipper Hoodie', 'Jet Black', 'Jet Black Unique Colour'),
  ('9067459576046', 'Exorcist Black Unisex Zipper Hoodie', 'Jet Black', 'Jet Black Unique Colour'),
  ('9067459346670', 'Reaven Black Zipper Hoodie', 'Jet Black', 'Jet Black Unique Colour'),
  ('9067191271662', 'Occula Grey Boxy Oversized Hoodie', 'Melange Grey', 'Melange Grey Unique Colour'),
  ('9067184718062', 'Ritual Black Boxy Oversized Hoodie', 'Jet Black', 'Jet Black Unique Colour'),
  ('9067182948590', 'Dread Black Boxy Oversized Hoodie', 'Jet Black', 'Jet Black Unique Colour'),
  ('9581723877614', 'Zaraki Corduroy Full Sleeves', 'Jet Black', 'Jet Black Unique Colour'),
  ('9581802356974', 'Lunaris Black Boxy Jacket', 'Jet Black', 'Jet Black Unique Colour'),
  ('9581797310702', 'Aeris Black Tshirt', 'Black', 'Black Unique Colour'),
  ('9581788627182', 'Ornate Navy Zipper Hoodie', 'Navy', 'Navy Unique Colour'),
  ('9581788266734', 'Thesis Black Zipper Hoodie', 'Jet Black', 'Jet Black Unique Colour'),
  ('9581733019886', 'Aether Dark Grey Full Sleeves', 'Dark Grey', 'Dark Grey Unique Colour'),
  ('9581732856046', 'Vexil Black Full Sleeves', 'Jet Black', 'Jet Black Unique Colour'),
  ('9581728628974', 'Mutant Beige Boxy Hoodie', 'Beige', 'Beige Unique Colour'),
  ('9581724467438', 'Sigma Corduroy Full Sleeves', 'Jet Black', 'Jet Black Unique Colour'),
  ('9581724270830', 'Hexen Corduroy Full Sleeves', 'Jet Black', 'Jet Black Unique Colour'),
  ('9220365811950', 'Grave Black Full Sleeves', 'Jet Black', 'Jet Black Unique Colour'),
  ('9257013870830', 'Ivory Dark Brown Tshirt', 'Dark Brown', 'Dark Brown Unique Colour'),
  ('9513958932718', 'Ruin White Tshirt', 'White', 'White Unique Colour'),
  ('9513550414062', 'Brown Cipher Vest', 'Brown', 'Brown Unique Colour'),
  ('9504683983086', 'Profane Black Full Sleeves', 'Jet Black', 'Jet Black Unique Colour'),
  ('9504679297262', 'Rival Black Sleeveless Hoodie', 'Jet Black', 'Jet Black Unique Colour'),
  ('9504676479214', 'Widow Black Sleeveless Hoodie', 'Jet Black', 'Jet Black Unique Colour'),
  ('9504667271406', 'Devour Black Boxy Jacket', 'Jet Black', 'Jet Black Unique Colour'),
  ('9504664715502', 'Enigma Black Boxy Jacket', 'Jet Black', 'Jet Black Unique Colour'),
  ('9298547769582', 'Xenon White Full Sleeves', 'White', 'White Unique Colour'),
  ('9437477732590', 'Inferis Corduroy Full Sleeves', 'Jet Black', 'Jet Black Unique Colour'),
  ('9485980958958', 'Agni White Full Sleeves', 'White', 'White Unique Colour'),
  ('9225947021550', 'Rust White Tshirt', 'White', 'White Unique Colour'),
  ('9316177150190', 'Skullix Black Boxy Jacket', 'Jet Black', 'Jet Black Unique Colour'),
  ('9123814637806', 'Rhino Black Full Sleeves', 'Jet Black', 'Jet Black Unique Colour'),
  ('9377907671278', 'Kraken Corduroy Full Sleeves', 'Jet Black', 'Jet Black Unique Colour'),
  ('9323095359726', 'Skullsplit White Full Sleeves', 'White', 'White Unique Colour'),
  ('9327129395438', 'Curse Black Full Sleeves', 'Jet Black', 'Jet Black Unique Colour'),
  ('9454775861486', 'Monarch Dark Grey Boxy Jacket', 'Dark Grey', 'Dark Grey Unique Colour'),
  ('9454773174510', 'Lilith Grey Boxy Jacket', 'Melange Grey', 'Melange Grey Unique Colour'),
  ('9452635422958', 'Quill Black Tshirt', 'Black', 'Black Unique Colour'),
  ('9452629623022', 'Prowl Black Tshirt', 'Black', 'Black Unique Colour'),
  ('9452521619694', 'Vow White Tshirt', 'White', 'White Unique Colour'),
  ('9452521521390', 'Atlas Grey Tshirt', 'Dark Grey', 'Dark Grey Unique Colour'),
  ('9266790727918', 'Dusk Corduroy Full Sleeves', 'Jet Black', 'Jet Black Unique Colour'),
  ('9266790138094', 'Vamp Corduroy Full Sleeves', 'Jet Black', 'Jet Black Unique Colour'),
  ('9432647303406', 'Trench White Boxy Jacket', 'White', 'White Unique Colour'),
  ('9256955117806', 'Sheath Black Full Sleeves', 'Jet Black', 'Jet Black Unique Colour'),
  ('9411049914606', 'Recon Corduroy Full Sleeves', 'Jet Black', 'Jet Black Unique Colour'),
  ('9377920450798', 'Coven Corduroy Full Sleeves', 'Jet Black', 'Jet Black Unique Colour'),
  ('9344214466798', 'Relic Black Tshirt (Glow in the dark)', 'Black', 'Black Unique Colour'),
  ('9190737674478', 'Stallion Corduroy Full Sleeves', 'Jet Black', 'Jet Black Unique Colour'),
  ('9298500321518', 'Cure Brown Vest', 'Brown', 'Brown Unique Colour'),
  ('9298481840366', 'Medusa White Vest', 'White', 'White Unique Colour'),
  ('9190738493678', 'Baphometh Corduroy Full Sleeves', 'Jet Black', 'Jet Black Unique Colour'),
  ('8100820680942', 'Sinutation Grey Tshirt', 'Dark Grey', 'Dark Grey Unique Colour'),
  ('9204970160366', 'Berserk Black Tshirt', 'Black', 'Black Unique Colour'),
  ('9220372463854', 'Rakt Black Tshirt', 'Black', 'Black Unique Colour'),
  ('9257397059822', 'Venom Black Boxy Jacket', 'Jet Black', 'Jet Black Unique Colour'),
  ('9257379004654', 'Vengeance Black Boxy Jacket', 'Jet Black', 'Jet Black Unique Colour'),
  ('9256947777774', 'Feast Black Full Sleeves', 'Jet Black', 'Jet Black Unique Colour'),
  ('9118845960430', 'Cipher Dark Grey Vest', 'Charcoal Grey', 'Charcoal Grey Unique Colour'),
  ('9220349722862', 'Faith Black Full Sleeves', 'Jet Black', 'Jet Black Unique Colour'),
  ('9158456606958', 'Crimson Black Tshirt', 'Black', 'Black Unique Colour'),
  ('9207189504238', 'Trooper Black Tshirt', 'Black', 'Black Unique Colour'),
  ('9207188422894', 'Xena Black Tshirt', 'Black', 'Black Unique Colour'),
  ('9207167451374', 'Mahoraga Black Tshirt', 'Black', 'Black Unique Colour'),
  ('9118859428078', 'Oath Black Tshirt', 'Black', 'Black Unique Colour'),
  ('9138260541678', 'Kayla White Vest', 'White', 'White Unique Colour');

create temporary table genrage_colour_evidence on commit drop as
select e.source_id,e.title,e.label,e.excerpt,p.id product_id,s.id staged_record_id,
  s.payload->>'source_url' source_url,s.observed_at
from expected_genrage_colours e
join public.staged_catalogue_records s on s.external_product_id=e.source_id
  and s.import_run_id='1fe9a237-3afb-4b5f-bffb-cc212ab3545a'::uuid
join public.source_configs c on c.id=s.source_config_id
join public.brands b on b.id=c.brand_id and b.slug='genrage'
join public.import_runs r on r.id=s.import_run_id and r.source_config_id=c.id
join public.products p on p.brand_id=b.id and p.source_id=e.source_id
where r.complete and r.staged=230 and r.status='review_required'
  and s.validation_status in ('pending','accepted') and s.errors='[]'::jsonb
  and s.payload->>'title'=e.title and p.title=e.title
  and s.payload->>'source_url'=p.source_url
  and exists (select 1 from regexp_split_to_table(s.payload->>'description_text', E'\\n') line
    where btrim(line)=e.excerpt);

do $$ begin
  if (select count(*) from genrage_colour_evidence) <> 72
    or (select count(distinct source_id) from genrage_colour_evidence) <> 72
  then raise exception 'Genrage colour scope/source mismatch, refusing to insert'; end if;
  if exists (select 1 from genrage_colour_evidence c join public.product_attribute_evidence e
    on e.product_id=c.product_id and e.attribute_key='colour' and e.rule_version='genrage-explicit-unique-colour-1'
    where e.variant_id is not null or e.value_text is distinct from c.label
      or e.source_kind is distinct from 'description' or e.source_url is distinct from c.source_url
      or e.source_field is distinct from 'description_text' or e.excerpt is distinct from c.excerpt
      or e.evidence_level is distinct from 'explicit' or e.observed_at is distinct from c.observed_at
  ) then raise exception 'Conflicting existing evidence; refusing to overwrite'; end if;
end $$;

insert into public.product_attribute_evidence
(product_id,attribute_key,value_text,source_kind,source_url,source_field,excerpt,evidence_level,review_status,rule_version,observed_at)
select c.product_id,'colour',c.label,'description',c.source_url,'description_text',c.excerpt,'explicit','pending','genrage-explicit-unique-colour-1',c.observed_at
from genrage_colour_evidence c
where not exists (select 1 from public.product_attribute_evidence e
  where e.product_id=c.product_id and e.attribute_key='colour' and e.rule_version='genrage-explicit-unique-colour-1');

select label,count(*) expected,count(*) filter(where e.id is not null) recorded
from genrage_colour_evidence c left join public.product_attribute_evidence e
  on e.product_id=c.product_id and e.attribute_key='colour' and e.rule_version='genrage-explicit-unique-colour-1'
group by label order by label;
commit;
