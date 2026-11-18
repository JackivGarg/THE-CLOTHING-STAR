import {test} from 'node:test';
import assert from 'node:assert/strict';
import {summarizeWeeklyPrices, type WeeklySnapshot} from '../server/weekly-prices';

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
