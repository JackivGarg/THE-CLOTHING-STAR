import {test} from 'node:test';
import assert from 'node:assert/strict';
import {prepareWeeklySnapshot, summarizeWeeklyPrices, type WeeklySnapshot} from '../server/weekly-prices';

function snapshot(weekStart: string, priceMinor: number, count = 30): WeeklySnapshot {
  return {
    weekStart, scopeHash:'brand-a', methodVersion:'1', accepted:true,
    variants:Array.from({length:count}, (_, i) => ({
      productId:'product-' + i, variantId:'variant-' + i, priceMinor,
      currency:'INR', active:true, preorder:false, checkedAt:weekStart + 'T09:00:00+05:30',
    })),
  };
}

test('weekly trend compares same variants and gives each product equal weight', () => {
  const previous = snapshot('2026-11-02', 150000);
  const current = snapshot('2026-11-09', 120000);
  previous.variants.push({...previous.variants[0], variantId:'extra', priceMinor:100000});
  current.variants.push({...current.variants[0], variantId:'extra', priceMinor:100000});
  const result = summarizeWeeklyPrices(previous, current, 'brand');
  assert.equal(result.comparable, true);
  assert.equal(result.medianChangePercent, -20);
  assert.equal(result.productCount, 30);
  assert.equal(result.pairedVariants, 31);
  assert.equal(result.down, 30);
});

test('a missing week or a different scope never becomes a weekly comparison', () => {
  const previous = snapshot('2026-11-02', 150000);
  assert.equal(summarizeWeeklyPrices(previous, snapshot('2026-11-16', 120000), 'brand').comparable, false);
  assert.equal(summarizeWeeklyPrices(previous, {...snapshot('2026-11-09', 120000), scopeHash:'other'}, 'brand').comparable, false);
});

test('new, missing and preorder variants reduce coverage without inventing observations', () => {
  const previous = snapshot('2026-11-02', 150000);
  const current = snapshot('2026-11-09', 120000);
  for (let i = 0; i < 7; i++) current.variants[i].preorder = true;
  const result = summarizeWeeklyPrices(previous, current, 'brand');
  assert.equal(result.comparable, false);
  assert.equal(result.pairedProducts, 23);
  assert.equal(result.medianChangePercent, null);
});

test('variant coverage uses the union and duplicate observations fail', () => {
  const previous = snapshot('2026-11-02', 150000, 10);
  const current = snapshot('2026-11-09', 120000, 10);
  current.variants.push({...current.variants[0], variantId:'new-size'});
  const result = summarizeWeeklyPrices(previous, current, 'category');
  assert.equal(result.pairedProducts, 9);
  assert.equal(result.comparable, false);
  current.variants.push({...current.variants[0]});
  assert.throws(() => summarizeWeeklyPrices(previous, current, 'category'), /Duplicate/);
});

test('checks outside the actual 48-hour observation window do not qualify', () => {
  const previous = snapshot('2026-11-02', 150000, 10);
  const current = snapshot('2026-11-09', 120000, 10);
  current.variants[0].checkedAt = '2026-11-11T09:00:00+05:30';
  assert.equal(summarizeWeeklyPrices(previous, current, 'category').pairedProducts, 9);
});

test('weekly preparation uses accepted in-window offers and retains missing denominator variants', () => {
  const original = snapshot('2026-11-02', 150000, 10);
  const inScope = original.variants.map(({productId, variantId, active}) => ({productId, variantId, active}));
  const manifest = {
    weekStart:original.weekStart, scopeKey:'fixture/hoodie', methodVersion:'1', accepted:true, inScope,
    observations:[
      ...original.variants.slice(0, 9).map(variant => ({...variant, reviewStatus:'accepted'})),
      {...original.variants[0], reviewStatus:'pending', priceMinor:1, checkedAt:'2026-11-02T15:00:00+05:30'},
      {...original.variants[1], reviewStatus:'accepted', priceMinor:1, checkedAt:'2026-11-04T08:00:00+05:30'},
    ],
  };
  const created = prepareWeeklySnapshot(manifest);
  assert.equal(created.variants.length, 10);
  assert.equal(created.variants[0].priceMinor, 150000);
  assert.equal(created.variants[1].priceMinor, 150000);
  assert.equal(created.variants[9].priceMinor, null);
  assert.equal(created.variants[9].active, true);
  assert.throws(() => prepareWeeklySnapshot({...manifest, weekStart:'2026-11-03'}), /Monday/);
  assert.deepEqual(prepareWeeklySnapshot({...manifest, observations:[...manifest.observations].reverse()}), created);
  assert.throws(() => prepareWeeklySnapshot({...manifest, observations:[
    ...manifest.observations, {...manifest.observations[0], priceMinor:500},
  ]}), /Conflicting/);
});
