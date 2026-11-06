import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeBonkersProduct } from './bonkers-normalize.mjs';

const fixture = { id: '15471053406572', title: 'Sample hoodie', handle: 'sample-hoodie', body_html: '<p>Cotton</p>', options: [{name:'Size'}, {name:'Color'}], tags:['Hoodie'], images:[{id:'64332402131308',src:'https://cdn.example/image.jpg?v=1',variant_ids:['68087383064940'],width:1000}], variants:[{id:'68087383064940',sku:'ABC',option1:'M',option2:'Black',price:'1199.00',compare_at_price:'1399.00',available:true,image_id:'64332402131308'},{id:'68087383064941',option1:'L',option2:'White',price:'1299.00',available:false}] };
const ctx = {sourceUrl:'https://www.bonkerscorner.com/products/sample-hoodie',priceUnit:'major_decimal',observedAt:'2026-11-06T00:00:00Z'};
test('preserves variant option, price, stock and image linkage independently', () => {
  const p=normalizeBonkersProduct(fixture,ctx);
  assert.equal(p.external_product_id,'15471053406572'); assert.equal(p.variants[0].price_minor,119900); assert.equal(p.variants[0].compare_at_minor,139900);
  assert.deepEqual(p.variants.map(v=>[v.size_raw,v.colour_raw,v.available]),[['M','Black',true],['L','White',false]]);
  assert.deepEqual(p.images[0].variant_ids,['68087383064940']); assert.equal(p.images[0].src,'https://cdn.example/image.jpg?v=1');
});
test('unknown stock remains null and the source price unit is explicit', () => {
  const p=normalizeBonkersProduct({...fixture,variants:[{id:'123',price:119900}]},{...ctx,priceUnit:'minor_integer'});
  assert.equal(p.variants[0].price_minor,119900); assert.equal(p.variants[0].available,null);
  assert.throws(()=>normalizeBonkersProduct(fixture,{...ctx,priceUnit:'unknown'}));
});
test('rejects unsafe numeric IDs and off-domain URLs', () => {
  assert.throws(()=>normalizeBonkersProduct({...fixture,id:9007199254740992},ctx));
  assert.throws(()=>normalizeBonkersProduct(fixture,{...ctx,sourceUrl:'https://evil.example/products/sample-hoodie'}));
});
test('flags malformed prices without fabricating values', () => {
  const p=normalizeBonkersProduct({...fixture,variants:[{id:'123',price:'1,199'}]},ctx);
  assert.equal(p.variants[0].price_minor,null); assert.deepEqual(p.validation_errors,['unparsed_price']);
});
