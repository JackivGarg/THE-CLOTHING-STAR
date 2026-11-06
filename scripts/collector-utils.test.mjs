import test from 'node:test';
import assert from 'node:assert/strict';
import { decimalToMinor, plainTextFromHtml, pageDigest, parseProductPage, isShortPage, stableContentHash } from './collector-utils.mjs';

test('decimal rupee strings convert exactly to paise without floating point', () => {
  assert.equal(decimalToMinor('1199.00', 'major_decimal'), 119900);
  assert.equal(decimalToMinor('19.9', 'major_decimal'), 1990);
  assert.equal(decimalToMinor('0.01', 'major_decimal'), 1);
  assert.equal(decimalToMinor('19.999', 'major_decimal'), null);
  assert.equal(decimalToMinor('119900', 'unknown'), null);
});

test('HTML cleaning removes active text and keeps readable description', () => {
  assert.equal(plainTextFromHtml('<p>100% Cotton</p><script>not a product fact</script><b>240 GSM</b>'), '100% Cotton\n240 GSM');
});

test('page digest detects a repeated ID sequence and keeps IDs as strings', () => {
  assert.equal(pageDigest([{ id: 123 }, { id: '456' }]), pageDigest([{ id: '123' }, { id: 456 }]));
  assert.notEqual(pageDigest([{ id: '456' }, { id: '123' }]), pageDigest([{ id: '123' }, { id: '456' }]));
});

test('HTML error bodies and unexpected feed shapes are rejected', () => {
  assert.deepEqual(parseProductPage({ html: '<html>challenge</html>' }), { ok: false, products: [] });
  assert.deepEqual(parseProductPage({ products: [{ id: '1' }] }), { ok: true, products: [{ id: '1' }] });
});

test('a short final page is distinguished from a full page cap', () => {
  assert.equal(isShortPage(29, 250), true);
  assert.equal(isShortPage(250, 250), false);
});

test('content hashes are stable for identical payloads', () => {
  assert.equal(stableContentHash({ id: '1', price_minor: 150000 }), stableContentHash({ id: '1', price_minor: 150000 }));
  assert.notEqual(stableContentHash({ id: '1', price_minor: 150000 }), stableContentHash({ id: '1', price_minor: 150001 }));
});
