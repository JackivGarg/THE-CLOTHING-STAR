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
set local role anon;
do $test$
declare result jsonb;
begin
  result := public.search_catalogue(p_category => 'hoodie', p_design => array['thunder']);
  if (result->>'total')::integer <> 1 then raise exception 'Related lookup or publication filter failed: %', result; end if;
  result := public.search_catalogue(p_category => 'hoodie', p_size => 'M', p_colour => 'black', p_budget => 150000);
  if (result->>'total')::integer <> 0 then raise exception 'Filters combined different variants: %', result; end if;
  result := public.search_catalogue(p_category => 'hoodie', p_size => 'M', p_colour => 'black', p_budget => 160000);
  if result#>>'{lastSeen,0,selected_variant,id}' <> '44444444-4444-4444-4444-444444444444'
    then raise exception 'Incorrect variant selected: %', result; end if;
  if result#>>'{lastSeen,0,image_url}' is not null then raise exception 'Unapproved image exposed: %', result; end if;
  if jsonb_array_length(result->'confirmed') <> 0 then raise exception 'Unverified stock was confirmed: %', result; end if;
  result := public.search_catalogue(p_category => 'hoodie', p_design => array['omen']);
  if (result->>'total')::integer <> 1 then raise exception 'Search missed item in large catalogue: %', result; end if;
  result := public.search_catalogue(p_audience => 'men');
  if (result->>'total')::integer <> 0 then raise exception 'Unknown audience was treated as verified: %', result; end if;
end
$test$;
rollback;
