import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseQuery,search } from '../server/search';
import { demo } from '../server/demo';
test('parses a concrete request and money correctly',()=>{assert.deepEqual(parseQuery('black hoodies with racing prints under 1.5k size M'),{priceMode:'delivered',category:'hoodie',colour:'black',theme:'racing',budget:150000,size:'M'});});
test('unknown delivery cannot satisfy a delivered budget',()=>{const result=search(demo,parseQuery('black racing hoodie under 1500 size M'));assert.equal(result.confirmed.length,0);assert.equal(result.unknownDelivery.length,2);});
test('size and colour must match the same available variant',()=>{const result=search(demo,{category:'hoodie',colour:'black',size:'L',priceMode:'item'});assert.deepEqual(result.confirmed.map(p=>p.id),['sample-3']);});
test('unavailable stock does not pass',()=>{const p=structuredClone(demo[0]);p.variants[0].available=null;assert.equal(search([p],{size:'M'}).confirmed.length,0);});
