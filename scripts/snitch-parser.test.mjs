import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSnitchRenderedText } from './snitch-parser.mjs';

test('captures adjacent original price and leaves missing color unknown', () => {
  const result = parseSnitchRenderedText('https://www.snitch.com/men-t-shirts/example/123/buy', 'Oversized Tee\n₹1104\n₹1299\n15% off\nSIZE GUIDE\n3XL\n4XL\nFREE delivery');
  assert.equal(result.product.current_price_minor, 110400);
  assert.equal(result.product.compare_at_minor, 129900);
  assert.equal(result.product.selected_color, null);
  assert.deepEqual(result.product.displayed_sizes, ['3XL', '4XL']);
});

test('captures visible price and choices without inventing stock or IDs', () => {
  const result = parseSnitchRenderedText('https://www.snitch.com/men-hoodies/example/123/buy', 'Example Hoodie\n₹2,099\nSelected Color\n·\nMaroon\nSIZE GUIDE\nS\nM\nL\nXL\nFREE delivery\nDESCRIPTION & FIT\nFit - Oversized Fit\nSKU: ABC-01\nREVIEWS', '2026-11-07T00:00:00Z');
  assert.equal(result.ok, true);
  assert.equal(result.product.current_price_minor, 209900);
  assert.deepEqual(result.product.displayed_sizes, ['S','M','L','XL']);
  assert.equal(result.product.merchant_sku, 'ABC-01');
  assert.equal(result.product.availability, null);
  assert.equal(result.product.external_product_id, null);
  assert.equal(result.product.variants, null);
});

test('rejects unrelated origin and loader/error pages', () => {
  assert.equal(parseSnitchRenderedText('https://example.com/x/buy', 'Example\n₹999').ok, false);
  assert.equal(parseSnitchRenderedText('https://www.snitch.com/x/buy', 'Loading...').ok, false);
});
