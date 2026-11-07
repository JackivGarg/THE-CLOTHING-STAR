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

test('maps mixed-case source options conservatively without changing original labels',()=>{
 const p=mapProduct({...source,options:[{name:'SIze'},{name:'cOLoUr'}],variants:[{...source.variants[0],option1:'XL',option2:'Black'}]},'2026-11-07T00:00:00Z');
 assert.equal(p.variants[0].size_raw,'XL');assert.equal(p.variants[0].colour_raw,'Black');assert.deepEqual(p.variants[0].source_options,{SIze:'XL',cOLoUr:'Black'});
});
test('conflicting aliases and default options remain unknown',()=>{
 const product=(names,values)=>mapProduct({...source,options:names.map(name=>({name})),variants:[{...source.variants[0],option1:values[0],option2:values[1]}]},'2026-11-07T00:00:00Z').variants[0];
 assert.equal(product(['Size','SIze'],['S','M']).size_raw,null);
 assert.equal(product(['Size','SIze'],['S',null]).size_raw,null);
 assert.equal(product(['Color','colour'],['Black','Red']).colour_raw,null);
 assert.equal(product(['Size'],['Default Title']).size_raw,null);
 assert.equal(product(['Size'],['Black']).size_raw,'Black'); // preserves the merchant-provided Size label verbatim
 assert.equal(product(['Title'],['M']).size_raw,null);
 assert.equal(product(['Color'],['Default Title']).colour_raw,null);
 assert.equal(product(['Top Size','Bottom Size'],['S','M']).size_raw,null);
 assert.deepEqual(product(['Top Size','Bottom Size'],['S','M']).source_options,{'Top Size':'S','Bottom Size':'M'});
 assert.throws(()=>product(['Size','Size'],['S','M']),/duplicate_option_name/);
});

test('preserves uncommon explicit source size labels',()=>{
 for(const label of ['UK 8','30-32','100','Regular Fit']) {
  const p=mapProduct({...source,options:[{name:'SIze'}],variants:[{...source.variants[0],option1:label}]},'2026-11-07T00:00:00Z');
  assert.equal(p.variants[0].size_raw,label);assert.equal(p.variants[0].source_options.SIze,label);
 }
});
