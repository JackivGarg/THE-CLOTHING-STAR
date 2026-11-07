import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {search,type Product} from '../server/search';
const filename='data/catalogue/local-preview.json';
test('collected preview preserves identities, minor prices and source image URLs',{skip:!fs.existsSync(filename)},()=>{
 const {products}=JSON.parse(fs.readFileSync(filename,'utf8')) as {products:Product[]};
 assert.equal(new Set(products.map(p=>p.id)).size,products.length);
 assert.ok(products.length>8000);
 assert.ok(products.filter(p=>p.image_url).length>8000);
 for(const p of products){assert.equal(p.synthetic,false);if(p.image_url)assert.equal(new URL(p.image_url).protocol,'https:');assert.ok(p.source_url?.startsWith('https://'));for(const v of p.variants)assert.ok(Number.isSafeInteger(v.price_minor)&&v.price_minor>=0);}
 const result=search(products,{brand:'JNORSS',category:'hoodie',budget:150000,priceMode:'item'});
 assert.ok(result.confirmed.length>0);
 for(const p of result.confirmed){assert.equal(p.brand,'JNORSS');assert.ok(p.selected_variant.price_minor<=150000);assert.equal(p.selected_variant.available,true);}
});
