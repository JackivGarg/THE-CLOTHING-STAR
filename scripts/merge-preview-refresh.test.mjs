import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mergePreviewRefresh} from './merge-preview-refresh.mjs';

test('a refresh updates observed variants and retains missing older variants with their original time', () => {
  const previous = {observed_at:'2026-11-07T00:00:00Z', variants:[
    {id:'a', price_minor:150000, observed_at:'2026-11-07T00:00:00Z'},
    {id:'b', price_minor:140000, observed_at:'2026-11-07T00:00:00Z'},
  ]};
  const record = {observed_at:'2026-11-18T00:00:00Z', variants:[
    {external_variant_id:'a', price_minor:120000, size_raw:'M', colour_raw:'black', available:true, source_options:{Size:'M'}},
  ]};
  const result = mergePreviewRefresh(previous, record, {name:'Brand', slug:'brand'});
  assert.equal(result.variants.length, 2);
  assert.equal(result.variants[0].price_minor, 120000);
  assert.equal(result.variants[0].observed_at, record.observed_at);
  assert.equal(result.variants[1].observed_at, previous.observed_at);
  assert.equal(mergePreviewRefresh({...previous, observed_at:'2026-11-19T00:00:00Z'}, record, {name:'Brand',slug:'brand'}).variants[0].price_minor, 150000);
});
