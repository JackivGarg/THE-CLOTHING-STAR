import assert from 'node:assert/strict';
import categories from '../catalogue-categories.json';
import registry from '../brand-registry.json';

const origin = process.argv[2] ?? 'http://127.0.0.1:3001';
const status = await fetch(new URL('/api/v1/status', origin)).then(response => response.json());
assert.equal(status.mode, 'local-preview', 'Use the private catalogue API');
assert.ok(status.product_count > 0);

async function lookup(query: string, filters: Record<string, string> = {}, page = 1) {
  const response = await fetch(new URL('/api/v1/search', origin), {
    method:'POST', headers:{'Content-Type':'application/json'},
    body:JSON.stringify({query, filters:{priceMode:'item',...filters}, page}),
    signal:AbortSignal.timeout(5000),
  });
  assert.equal(response.status, 200, query);
  const result = await response.json();
  assert.equal(result.mode, 'local-preview');
  const rows = [...result.confirmed, ...result.unknownDelivery, ...result.lastSeen];
  assert.ok(rows.length <= 5 && result.total >= rows.length);
  assert.equal(new Set(rows.map(product => product.id)).size, rows.length);
  return {result, rows};
}

const coverage = {brands:{} as Record<string, number>, categories:{} as Record<string, number>};
for (const brand of registry.brands.filter(item => item.slug !== 'snitch')) {
  const {result, rows} = await lookup('', {brand:brand.slug});
  assert.ok(result.total > 0, brand.slug);
  assert.ok(rows.every(product => product.brand_slug === brand.slug), brand.slug);
  coverage.brands[brand.slug] = result.total;
}

for (const {slug} of categories) {
  const {result, rows} = await lookup('', {category:slug});
  assert.ok(rows.every(product => product.category === slug), slug);
  assert.equal(result.facets.category[slug] ?? 0, result.total);
  coverage.categories[slug] = result.total;
}

const cases = [
  {query:'hoodi', verify:({result}: Awaited<ReturnType<typeof lookup>>) => {
    assert.equal(result.filters.category, 'hoodie');
    assert.equal(result.corrections.at(0)?.to, 'hoodie');
    assert.ok(result.total > 0);
  }},
  {query:'thunder', verify:({result}: Awaited<ReturnType<typeof lookup>>) => assert.ok(result.total > 0)},
  {query:'black thunder hoodie', verify:({rows}: Awaited<ReturnType<typeof lookup>>) =>
    assert.ok(rows.every(p => p.category === 'hoodie' && p.selected_variant.colour?.toLowerCase() === 'black'))},
  {query:'cotton hoodie', verify:({result}: Awaited<ReturnType<typeof lookup>>) =>
    assert.deepEqual(result.filters.materials, ['cotton'])},
  {query:'hoodie without polyester', verify:({result}: Awaited<ReturnType<typeof lookup>>) =>
    assert.deepEqual(result.filters.excludedMaterials, ['polyester'])},
  {query:'black or gray hoodie', verify:({result, rows}: Awaited<ReturnType<typeof lookup>>) => {
    assert.deepEqual(result.filters.colours, ['black','grey']);
    assert.ok(rows.every(p => ['black','gray','grey'].includes(p.selected_variant.colour?.toLowerCase())));
  }},
  {query:'black hoodie size M under 1500', filters:{brand:'bonkers-corner'}, verify:({rows}: Awaited<ReturnType<typeof lookup>>) => {
    assert.ok(rows.length > 0);
    assert.ok(rows.every(p => p.selected_variant.size.toUpperCase() === 'M' &&
      p.selected_variant.colour.toLowerCase() === 'black' && p.selected_variant.price_minor < 150000));
  }},
  {query:'women’s jeans waist 28', filters:{brand:'wtflex'}, verify:({rows}: Awaited<ReturnType<typeof lookup>>) => {
    assert.ok(rows.length > 0);
    assert.ok(rows.every(p => p.category === 'jeans' && p.selected_variant.size === '28'));
  }},
  {query:'motorsport graphic hoodies', verify:({result}: Awaited<ReturnType<typeof lookup>>) =>
    assert.equal(result.filters.printTheme, 'racing')},
  {query:'hoodie', verify:({result, rows}: Awaited<ReturnType<typeof lookup>>) => {
    assert.equal(result.total, Object.values(result.facets.brand).reduce((sum: number, count) => sum + Number(count), 0));
    assert.ok(rows.every(p => p.selected_variant.available === true));
  }},
];
const customerChecks: Record<string, number> = {};
for (const {query, filters, verify} of cases) {
  const results = await lookup(query, filters);
  verify(results);
  customerChecks[query] = results.result.total;
}
const first = await lookup('hoodie');
const second = await lookup('hoodie', {}, 2);
assert.ok(first.rows.every(item => !second.rows.some(other => item.id === other.id)));

console.log(JSON.stringify({catalogueSize:status.product_count, ...coverage, customerChecks}, null, 2));
