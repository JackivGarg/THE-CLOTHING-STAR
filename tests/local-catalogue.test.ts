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
 assert.equal(result.confirmed.length,0);
 assert.ok(result.lastSeen.length>0);
 for(const p of result.lastSeen){assert.equal(p.brand,'JNORSS');assert.ok(p.selected_variant.price_minor<=150000);assert.equal(p.selected_variant.available,true);}
});

test('verified refresh exposes the new JNORSS tee as an unconfirmed offer', {skip:!fs.existsSync('data/catalogue/jnorss-refresh/2026-11-18T05-57-27-794Z-b19ff5df-32d8-41f2-a8b3-baeee2c1bfc0/verified-preview-manifest.json')}, () => {
 const {products}=JSON.parse(fs.readFileSync(filename,'utf8')) as {products:(Product & {brand_slug:string})[]};
 const product=products.find(p=>p.brand_slug==='jnorss' && p.title==='Blue Horizon Layered Tee');
 assert.ok(product, 'The verified JNORSS refresh should include the new tee');
 assert.ok(product.variants.length > 0);
 assert.ok(product.variants.every(v=>v.available === true || v.available === false || v.available === null));
 assert.equal(search([product], {category:'tee',priceMode:'item'}).confirmed.length, 0);
});

test('description-supported oversized fit is searchable in the refreshed preview', {skip:!fs.existsSync('data/catalogue/powerlook-refresh/2026-11-18T06-04-46-008Z-ec8dcafa-38b9-4589-91fe-a10620c73fff/verified-preview-manifest.json')}, () => {
 const {products}=JSON.parse(fs.readFileSync(filename,'utf8')) as {products:Product[]};
 const product=products.find(p=>p.title==='Black Bleached Graphic T-Shirt 100% Cotton');
 assert.ok(product);
 const result=search([product], {fit:'oversized',category:'tee',priceMode:'item'});
 assert.equal(result.total,1);
 assert.equal(result.lastSeen[0].id,product.id);
});
