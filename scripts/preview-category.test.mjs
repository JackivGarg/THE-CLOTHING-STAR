import {test} from 'node:test';import assert from 'node:assert/strict';import {previewCategory} from './preview-category.mjs';
test('accessory named for a hoodie does not pass the hoodie filter',()=>{assert.equal(previewCategory({title:'Drawstring for Hoodie',original_product_type:'Hoodie'}),'accessory');assert.equal(previewCategory({title:'Black Drawstring Pants'}),'trousers');});
test('co-ord retains whole-set identity instead of either component',()=>{assert.equal(previewCategory({title:'Cream Ribbed Co-ord Set',original_product_type:'Tops'}),'co_ord');assert.equal(previewCategory({title:'Hoodie & Pants Co-Ord Set',original_product_type:'hoodie'}),'co_ord');assert.equal(previewCategory({title:'Corduroy Pants'}),'trousers');});
test('cap category uses garment context rather than graphic title',()=>{assert.equal(previewCategory({title:'No Cap Story Tank'}),'vest');assert.equal(previewCategory({title:'Hotbox Cotton Cap.'}),'cap');assert.equal(previewCategory({title:'The Great Escape Heavyweight White T-shirt'}),'tee');});
test('decorative sweater wording does not replace the explicit vest type',()=>assert.equal(previewCategory({title:'Sweater Weather Vest',original_product_type:'Vest'}),'vest'));

test('preview categories have a shared browsing and search definition', async () => {
  const {readFile} = await import('node:fs/promises');
  const categories = JSON.parse(await readFile('catalogue-categories.json', 'utf8'));
  const keys = new Set(categories.map(category => category.slug));
  for (const [title, expected] of [
    ['Black Hoodie', 'hoodie'], ['Blue Jeans', 'jeans'], ['Cotton Cap', 'cap'],
    ['Gift Card', 'gift_card'], ['Silver Pendant', 'pendant'], ['Wool Scarf', 'scarf'],
  ]) {
    const actual = previewCategory({title});
    assert.equal(actual, expected);
    assert.ok(keys.has(actual));
  }
  assert.equal(keys.size, categories.length);
});
