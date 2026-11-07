import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hasMultipleChoices,parseQuery,search,unsupportedQuery } from '../server/search';
import { demo } from '../server/demo';
test('parses a concrete request and money correctly',()=>{assert.deepEqual(parseQuery('black hoodies with racing prints under 1.5k size M'),{priceMode:'delivered',category:'hoodie',colour:'black',theme:'racing',budget:150000,size:'M'});});
test('unknown delivery cannot satisfy a delivered budget',()=>{const result=search(demo,parseQuery('black racing hoodie under 1500 size M'));assert.equal(result.confirmed.length,0);assert.equal(result.unknownDelivery.length,2);});
test('size and colour must match the same available variant',()=>{const result=search(demo,{category:'hoodie',colour:'black',size:'L',priceMode:'item'});assert.deepEqual(result.confirmed.map(p=>p.id),['sample-3']);});
test('unavailable stock does not pass',()=>{const p=structuredClone(demo[0]);p.variants[0].available=null;assert.equal(search([p],{size:'M'}).confirmed.length,0);});
test('maps common garment names to actual catalogue categories',()=>{for(const [query,category] of [['black jeans','jeans'],['shorts','shorts'],['jackets','jacket'],['pants','trousers'],['t-shirt','tee']])assert.equal(parseQuery(query).category,category);});
test('reports unsupported requirements rather than returning generic matches',()=>{assert.deepEqual(unsupportedQuery('black hoodies with racing prints under 1500'),['prints']);assert.deepEqual(unsupportedQuery('blue jeans size M under 1500'),[]);assert.deepEqual(unsupportedQuery('black leather jacket'),['leather']);});
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
