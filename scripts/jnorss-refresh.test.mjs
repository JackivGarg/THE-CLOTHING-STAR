import test from 'node:test';
import assert from 'node:assert/strict';
import { mapProduct } from './jnorss-refresh.mjs';

const source={id:123,handle:'brick-red-tee',title:'Brick Red Tee',body_html:'<p>100% Cotton &amp; 240 GSM</p>',product_type:'',tags:'Trending, Tee',options:[{name:'Size'},{name:'Color'}],images:[{id:345,src:'https://cdn.example/a.jpg?v=2',variant_ids:[456]}],variants:[{id:456,option1:'M',option2:'Red',price:'1199.00',compare_at_price:'1399.00',available:false,sku:'A1',image_id:345}]};
test('maps source variant and preserves price, stock, options and image links',()=>{
 const p=mapProduct(source,'2026-11-07T00:00:00.000Z');assert.equal(p.external_product_id,'123');assert.equal(p.variants[0].price_minor,119900);assert.equal(p.variants[0].compare_at_minor,139900);assert.equal(p.variants[0].available,false);assert.equal(p.variants[0].colour_raw,'Red');assert.deepEqual(p.images[0].variant_ids,['456']);assert.match(p.description_text,/100% Cotton & 240 GSM/);assert.equal(p.images[0].src,'https://cdn.example/a.jpg?v=2');
});
test('hash ignores observation time; invalid source IDs and money are rejected',()=>{
 assert.equal(mapProduct(source,'2026-11-07T00:00:00Z').content_hash,mapProduct(source,'2026-11-07T01:00:00Z').content_hash);
 assert.throws(()=>mapProduct({...source,id:Number.MAX_SAFE_INTEGER+1},'2026-11-07T00:00:00Z'),/unsafe_or_missing_source_id/);
 assert.throws(()=>mapProduct({...source,variants:[{...source.variants[0],price:'free'}]},'2026-11-07T00:00:00Z'),/invalid_price/);
});
test('product URLs use the selected allowlisted merchant origin',()=>{
 assert.equal(mapProduct(source,'2026-11-07T00:00:00Z','genrage').source_url,'https://genrage.com/products/brick-red-tee');
 assert.equal(mapProduct(source,'2026-11-07T00:00:00Z','wtflex').source_url,'https://wtflex.in/products/brick-red-tee');
 assert.throws(()=>mapProduct(source,'2026-11-07T00:00:00Z','unknown'),/unsupported_brand/);
});
