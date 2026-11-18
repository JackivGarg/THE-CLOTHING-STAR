import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hasMultipleChoices,parseQuery,search,unsupportedQuery } from '../server/search';
import { demo } from '../server/demo';
test('parses a concrete request and money correctly',()=>{assert.deepEqual(parseQuery('black hoodies with racing prints under 1.5k size M'),{priceMode:'delivered',category:'hoodie',colour:'black',theme:'racing',printTheme:'racing',budget:150000,size:'M'});});
test('unknown delivery cannot satisfy a delivered budget',()=>{const result=search(demo,parseQuery('black racing hoodie under 1500 size M'));assert.equal(result.confirmed.length,0);assert.equal(result.unknownDelivery.length,2);});
test('size and colour must match the same available variant',()=>{const result=search(demo,{category:'hoodie',colour:'black',size:'L',priceMode:'item'});assert.deepEqual(result.confirmed.map(p=>p.id),['sample-3']);});
test('unavailable stock does not pass',()=>{const p=structuredClone(demo[0]);p.variants[0].available=null;assert.equal(search([p],{size:'M'}).confirmed.length,0);});
test('maps common garment names to actual catalogue categories',()=>{for(const [query,category] of [['black jeans','jeans'],['shorts','shorts'],['jackets','jacket'],['pants','trousers'],['t-shirt','tee']])assert.equal(parseQuery(query).category,category);});
test('reports unsupported requirements rather than returning generic matches',()=>{assert.deepEqual(unsupportedQuery('black hoodies with racing prints under 1500'),[]);assert.deepEqual(unsupportedQuery('blue jeans size M under 1500'),[]);assert.deepEqual(unsupportedQuery('black leather jacket'),['leather']);});

test('a racing print request requires separate print evidence',()=>{
 const themed={...demo[0],themes:['racing'],print_themes:[]};
 const printed={...themed,id:'printed',print_themes:['racing']};
 const result=search([themed,printed],{theme:'racing',printTheme:'racing',priceMode:'item'});
 assert.deepEqual(result.confirmed.map(product=>product.id),['printed']);
});
test('brand and size aliases filter on the same available variant',()=>{const p=structuredClone(demo[0]);p.variants[0].size='XXL';assert.equal(search([p],{brand:'Studio North',size:'2XL'}).confirmed.length,1);assert.equal(search([p],{brand:'Another Brand',size:'2XL'}).confirmed.length,0);});

test('accepts a waist measurement and an INR ceiling while detecting competing choices', () => {
  const query = 'Navy jeans waist 32 up to ₹1,500';
  assert.deepEqual(parseQuery(query), {priceMode:'delivered', category:'jeans', colour:'navy', size:'32', budget:150000});
  assert.deepEqual(unsupportedQuery(query), []);
  assert.equal(hasMultipleChoices(query), false);
  assert.equal(hasMultipleChoices('black white hoodie'), true);
  assert.equal(hasMultipleChoices('jeans and a jacket'), true);
  assert.equal(hasMultipleChoices('hooded sweatshirt'), false);
});

test('product name results paginate in a stable order and remain delivery alternatives', () => {
  const products = Array.from({length:7}, (_, i) => ({
    ...demo[0], id:`item-${i}`, title:i === 6 ? 'Unrelated hoodie' : 'Acid-Wash Hoodie',
    variants:[{...demo[0].variants[0], available:true, price_minor:100000 + i * 100}],
  }));
  const filters = {title:'acid wash', budget:150000, priceMode:'delivered' as const};
  const first = search(products, filters, 1, 'price-desc');
  const second = search(products, filters, 2, 'price-desc');
  assert.equal(first.total, 6);
  assert.equal(first.confirmed.length, 0);
  assert.deepEqual(first.unknownDelivery.map(product => product.id), ['item-5','item-4','item-3','item-2','item-1']);
  assert.equal(first.hasMore, true);
  assert.deepEqual(second.unknownDelivery.map(product => product.id), ['item-0']);
  assert.equal(second.hasMore, false);
});

test('audience eligibility and recommended ordering preserve filters and diversify the first page', () => {
  const make = (id: string, brand: string, audience: 'women' | 'men' | 'unisex' | null, price_minor: number) => ({
    ...demo[0], id, brand, audience,
    variants:[{...demo[0].variants[0], available:true, size:'M', price_minor}],
  });
  const products = [
    make('a','A','women',60000), make('a2','A','women',61000),
    make('b','B','women',90000), make('c','C','women',100000),
    make('d','D','women',110000), make('e','E','women',120000),
    make('shared','F','unisex',45000), make('unknown','G',null,40000), make('men','H','men',35000),
  ];
  const filters = {...parseQuery('women’s hoodie size M'), priceMode:'item' as const};
  assert.deepEqual(unsupportedQuery('women’s hoodie size M'), []);
  const first = search(products, filters);
  const next = search(products, filters, 2);
  assert.equal(first.total,7);
  assert.deepEqual(first.confirmed.map(item=>item.id), ['a','b','c','d','e']);
  assert.deepEqual(next.confirmed.map(item=>item.id), ['a2','shared']);
  assert.equal(search(products, filters, 1, 'price-asc').confirmed[0].id, 'shared');
  assert.deepEqual(search(products,{audience:'unisex'}).confirmed.map(item=>item.id), ['shared']);
});

test('design terms use saved product text without relaxing variant filters', () => {
  const product = {...demo[0], id:'lightning', title:'Boxy Hoodie',
    description_text:'A red lightning graphic on this boxy garment.',
    variants:[{...demo[0].variants[0], available:true, colour:'black', size:'M', price_minor:120000}]};
  const filters = {...parseQuery('black thunder boxy hoodie size M under 1500'), priceMode:'item' as const};
  assert.deepEqual(unsupportedQuery('black thunder boxy hoodie size M under 1500'), []);
  assert.deepEqual(search([product], filters).confirmed.map(item => item.id), ['lightning']);
  assert.equal(search([product], {...filters, colour:'red'}).total, 0);
  assert.equal(search([{...product, description_text:null}], filters).total, 0);
  assert.deepEqual(unsupportedQuery('black leather thunder hoodie'), ['leather']);
});

test('caps can be searched using their catalogue category', () => {
  assert.equal(parseQuery('caps').category, 'cap');
  assert.deepEqual(unsupportedQuery('caps'), []);
});

test('exact design terms rank ahead of related design terms without changing price sorting', () => {
  const base = {...demo[0], variants:[{...demo[0].variants[0], available:true, price_minor:100000}]};
  const related = {...base, id:'related', title:'Lightning hoodie'};
  const exact = {...base, id:'exact', title:'Thunder hoodie', variants:[{...base.variants[0], price_minor:110000}]};
  const filters = {...parseQuery('thunder hoodie'), priceMode:'item' as const};
  assert.deepEqual(search([related, exact], filters).confirmed.map(p => p.id), ['exact','related']);
  assert.deepEqual(search([related, exact], filters, 1, 'price-asc').confirmed.map(p => p.id), ['related','exact']);
});

test('favourite brands break relevance ties without changing cheapest order', () => {
  const base = {...demo[0], variants:[{...demo[0].variants[0], available:true, price_minor:100000}]};
  const cheap = {...base, id:'cheap', brand:'A', title:'Thunder hoodie'};
  const favourite = {...base, id:'favourite', brand:'B', title:'Thunder hoodie', variants:[{...base.variants[0], price_minor:110000}]};
  const related = {...base, id:'related', brand:'B', title:'Lightning hoodie'};
  const filters = {...parseQuery('thunder hoodie'), priceMode:'item' as const};
  assert.deepEqual(search([cheap, favourite, related], filters, 1, 'recommended', ['B']).confirmed.map(p => p.id), ['favourite','cheap','related']);
  assert.deepEqual(search([cheap, favourite, related], filters, 1, 'price-asc', ['B']).confirmed.map(p => p.id), ['cheap','related','favourite']);
});

test('old or incomplete observations appear only as last-seen items', () => {
  const p = {...demo[0], synthetic:false, variants:[{...demo[0].variants[0], available:true}]};
  const result = search([p], {category:'hoodie', priceMode:'item'});
  assert.equal(result.confirmed.length, 0);
  assert.equal(result.lastSeen.length, 1);
  const now = new Date().toISOString();
  const fresh = {...p, variants:[{...p.variants[0], price_checked_at:now, stock_checked_at:now, preorder:false, fulfilment_status:'ready'}]};
  assert.equal(search([fresh], {category:'hoodie', priceMode:'item'}).confirmed.length, 1);
  const preorder = {...fresh, variants:[{...fresh.variants[0], preorder:true}]};
  assert.equal(search([preorder], {category:'hoodie', priceMode:'item'}).lastSeen.length, 1);
});

test('a fresh eligible variant takes precedence over a cheaper stale variant', () => {
  const now = new Date().toISOString();
  const stale = {...demo[0].variants[0], id:'stale', available:true, price_minor:50000};
  const fresh = {...stale, id:'fresh', price_minor:80000, price_checked_at:now, stock_checked_at:now, preorder:false, fulfilment_status:'ready'};
  const product = {...demo[0], synthetic:false, variants:[stale,fresh]};
  assert.equal(search([product], {priceMode:'item'}).confirmed[0].selected_variant.id, 'fresh');
});

test('ordinary design words match stored product copy while material constraints remain explicit', () => {
  const product = {...demo[0], id:'skull', title:'Omen Hoodie', description_text:'A skull design in the artwork'};
  const filters = {...parseQuery('skull hoodie'), priceMode:'item' as const};
  assert.deepEqual(unsupportedQuery('skull hoodie'), []);
  assert.equal(search([product], filters).confirmed[0].id, 'skull');
  assert.equal(search([product], {...parseQuery('dragon hoodie'), priceMode:'item'}).total, 0);
  assert.deepEqual(unsupportedQuery('cotton skull hoodie'), ['cotton']);
});

test('explicit men and women labels both match without inventing unisex', () => {
  const item = {...demo[0], audience:null, audiences:['men','women'] as ('men'|'women')[]};
  assert.equal(search([item], {audience:'men'}).total, 1);
  assert.equal(search([item], {audience:'women'}).total, 1);
  assert.equal(search([item], {audience:'unisex'}).total, 0);
});

test('a title design match leads an equally exact description match', () => {
  const base = {...demo[0], variants:[{...demo[0].variants[0], available:true, price_minor:100000}]};
  const description = {...base, id:'description', title:'Omen Hoodie', description_text:'Horizon graphic'};
  const title = {...base, id:'title', title:'Horizon Hoodie', description_text:null};
  const filters = {...parseQuery('horizon hoodie'), priceMode:'item' as const};
  assert.deepEqual(search([description,title], filters).confirmed.map(item=>item.id), ['title','description']);
});

test('explicitly extracted garment fits can satisfy a fit filter', () => {
  const product = {...demo[0], fit:null, fits:['oversized','boxy']};
  assert.equal(search([product], {fit:'oversized'}).total, 1);
  assert.equal(search([{...product, fits:[]}], {fit:'oversized'}).total, 0);
});
