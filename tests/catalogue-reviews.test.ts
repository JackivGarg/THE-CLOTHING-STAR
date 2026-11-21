import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyReviewedCatalogue, type ReviewSnapshot } from '../server/catalogue-reviews';
import { demo } from '../server/demo';
import { search } from '../server/search';

test('reviewed offers join on product and variant, retain the check time and leave pending offers last seen', () => {
  const checked_at = new Date().toISOString();
  const variant = {...demo[0].variants[0], id:'merchant-variant', size:'L', price_minor:159900, available:false};
  const base = {...demo[0], id:'store:existing', synthetic:false, variants:[variant]};
  const added = {...base, id:'store:new'};
  const reviewed = {
    variant_id:variant.id, available:true, price_minor:149900, preorder:false, checked_at,
    fulfilment_status:'ready',
  };
  const snapshot: ReviewSnapshot = {
    exported_at:checked_at, products:[base, added],
    section_products:[{product_id:added.id, labels:['verified archive']}],
    offers:[
      {...reviewed, product_id:base.id, offer_state:'review_pending'},
      {...reviewed, product_id:added.id, offer_state:'ready', price_minor:null},
    ],
  };
  const {products, counts} = applyReviewedCatalogue([base], snapshot);
  assert.deepEqual(counts, {offers:2, added_products:1, section_products:1});
  assert.equal(base.variants[0].available, false);
  assert.equal(products[1].variants[0].price_minor, null);
  assert.deepEqual(products[1].collection_labels, ['verified archive']);
  const results = search(products, {size:'L', budget:150000, priceMode:'item'});
  assert.equal(results.confirmed.length, 0);
  assert.equal(results.lastSeen.length, 1);
  assert.equal(results.lastSeen[0].id, base.id);
  assert.equal(results.lastSeen[0].selected_variant.id, variant.id);
  assert.equal(results.lastSeen[0].selected_variant.price_minor, 149900);
  assert.equal(results.lastSeen[0].selected_variant.observed_at, checked_at);
});
