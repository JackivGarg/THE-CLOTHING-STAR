-- Run against a disposable database with the baseline and search migrations.
begin;
insert into public.brands(id, slug, name, base_url)
values ('11111111-1111-1111-1111-111111111111', 'fixture-brand', 'Fixture Brand', 'https://example.com');
insert into public.products(id, brand_id, source_id, title, category, description_text, published)
values
 ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111',
  '100', 'Omen Hoodie', 'hoodie', 'Oversized boxy hoodie with a lightning design', true),
 ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111',
  '101', 'Secret Hoodie', 'hoodie', 'lightning design', false);
update public.products set source_tags = '["Men","Women"]'::jsonb
where id = '22222222-2222-2222-2222-222222222222';
update public.products set image_url = 'https://example.com/hoodie.jpg'
where id = '22222222-2222-2222-2222-222222222222';
insert into public.product_images(product_id, source_url, content_use_status)
values ('22222222-2222-2222-2222-222222222222', 'https://example.com/hoodie.jpg', 'unknown');
insert into public.variants(id, product_id, source_id, size, colour, price_minor, available)
values
 ('44444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222', 'v1', 'M', 'black', 160000, true),
 ('55555555-5555-5555-5555-555555555555', '22222222-2222-2222-2222-222222222222', 'v2', 'M', 'white', 100000, true),
 ('66666666-6666-6666-6666-666666666666', '22222222-2222-2222-2222-222222222222', 'v3', 'L', 'black', 100000, true),
 ('77777777-7777-7777-7777-777777777777', '33333333-3333-3333-3333-333333333333', 'v4', 'M', 'black', 100000, true);
insert into public.products(id, brand_id, source_id, title, category, description_text, published)
select gen_random_uuid(), '11111111-1111-1111-1111-111111111111',
       'bulk-' || n, 'Generic Hoodie ' || n, 'hoodie', 'plain', true
from generate_series(1, 10005) n;
insert into public.variants(id, product_id, source_id, size, colour, price_minor, available)
select gen_random_uuid(), id, 'bulk-variant', 'XS', 'green', 100000, true
from public.products where source_id like 'bulk-%';
insert into public.products(id, brand_id, source_id, title, category, source_tags, published)
values ('88888888-8888-8888-8888-888888888888', '11111111-1111-1111-1111-111111111111', 'ambiguous', 'Men''s Paradox Hoodie', 'hoodie', '["Women"]'::jsonb, true),
       ('99999999-9999-9999-9999-999999999999', '11111111-1111-1111-1111-111111111111', 'explicit-unisex', 'Unisex Shared Hoodie', 'hoodie', '[]'::jsonb, true);
insert into public.variants(id, product_id, source_id, size, colour, price_minor, available)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '88888888-8888-8888-8888-888888888888', 'ambiguous-v', 'M', 'black', 100000, true),
       ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '99999999-9999-9999-9999-999999999999', 'shared-v', 'M', 'black', 100000, true);
insert into public.products(id, brand_id, source_id, title, category, published)
values ('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', 'approved-image', 'Approved Image Hoodie', 'hoodie', true);
insert into public.product_images(product_id, source_url, content_use_status)
values ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'https://example.com/approved.jpg', 'approved');
insert into public.variants(id, product_id, source_id, size, colour, price_minor, available)
values ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'approved-v', 'XS', 'green', 100000, true);
set local role anon;
do $test$
declare result jsonb;
begin
  if has_column_privilege('anon', 'public.products', 'image_url', 'select') then
    raise exception 'Direct product image field remains publicly readable';
  end if;
  if (select count(*) from public.product_images where content_use_status <> 'approved') <> 0 then
    raise exception 'Unapproved image was directly readable';
  end if;
  if (select image_url from public.public_catalogue where title='Omen Hoodie') is not null then
    raise exception 'Unapproved image exposed through legacy view';
  end if;
  if (select image_url from public.public_catalogue where title='Approved Image Hoodie') <> 'https://example.com/approved.jpg' then
    raise exception 'Approved image was not exposed through legacy view';
  end if;
  result := public.search_catalogue(p_design => array['approved']);
  if result#>>'{lastSeen,0,image_url}' <> 'https://example.com/approved.jpg' then
    raise exception 'Approved image was not exposed through search';
  end if;
  result := public.search_catalogue(p_category => 'hoodie', p_design => array['thunder']);
  if (result->>'total')::integer <> 1 then raise exception 'Related lookup or publication filter failed: %', result; end if;
  result := public.search_catalogue(p_category => 'hoodie', p_design => array['omen'], p_size => 'M', p_colour => 'black', p_budget => 150000);
  if (result->>'total')::integer <> 0 then raise exception 'Filters combined different variants: %', result; end if;
  result := public.search_catalogue(p_category => 'hoodie', p_design => array['omen'], p_size => 'M', p_colour => 'black', p_budget => 160000);
  if result#>>'{lastSeen,0,selected_variant,id}' <> '44444444-4444-4444-4444-444444444444'
    then raise exception 'Incorrect variant selected: %', result; end if;
  if result#>>'{lastSeen,0,image_url}' is not null then raise exception 'Unapproved image exposed: %', result; end if;
  if jsonb_array_length(result->'confirmed') <> 0 then raise exception 'Unverified stock was confirmed: %', result; end if;
  result := public.search_catalogue(p_category => 'hoodie', p_design => array['omen']);
  if (result->>'total')::integer <> 1 then raise exception 'Search missed item in large catalogue: %', result; end if;
  result := public.search_catalogue(p_category => 'hoodie', p_design => array['omen'], p_audience => 'men');
  if (result->>'total')::integer <> 1 then raise exception 'Men tag was not honoured: %', result; end if;
  result := public.search_catalogue(p_category => 'hoodie', p_design => array['omen'], p_audience => 'women');
  if (result->>'total')::integer <> 1 then raise exception 'Women tag was not honoured: %', result; end if;
  result := public.search_catalogue(p_category => 'hoodie', p_design => array['omen'], p_audience => 'unisex');
  if (result->>'total')::integer <> 0 then raise exception 'Cross-listing became unisex: %', result; end if;
  result := public.search_catalogue(p_design => array['paradox'], p_audience => 'men');
  if (result->>'total')::integer <> 0 then raise exception 'Conflicting labels should remain unresolved: %', result; end if;
  result := public.search_catalogue(p_design => array['shared'], p_audience => 'men');
  if (result->>'total')::integer <> 1 then raise exception 'Unisex should match men: %', result; end if;
  result := public.search_catalogue(p_design => array['generic'], p_audience => 'men');
  if (result->>'total')::integer <> 0 then raise exception 'Unknown audience was treated as verified: %', result; end if;
end
$test$;
rollback;
