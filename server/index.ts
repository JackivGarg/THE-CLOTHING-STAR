import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { demo } from './demo';
import { hasMultipleChoices, PAGE_SIZE, parseQuery, search, unsupportedQuery, type Filters, type Product } from './search';
const app=express(); app.use(express.json({limit:'8kb'}));
const previewPath='data/catalogue/local-preview.json';
const preview=process.env.NODE_ENV!=='production' && process.env.CATALOGUE_LOCAL_PREVIEW!=='false' && fs.existsSync(previewPath)?JSON.parse(fs.readFileSync(previewPath,'utf8')) as {created_at:string;products:Product[]}:null;
const mode=preview?'local-preview':process.env.SUPABASE_URL&&process.env.SUPABASE_PUBLISHABLE_KEY?'catalogue':'demo';
if(preview)app.use((req,res,next)=>{const origin=req.get('origin');if(origin){try{if(!['localhost','127.0.0.1','[::1]'].includes(new URL(origin).hostname)){res.status(403).json({error:'Private preview is available from this computer only.'});return;}}catch{res.status(403).end();return;}}next();});
const supabaseKey=process.env.SUPABASE_PUBLISHABLE_KEY;
const supabase=process.env.SUPABASE_URL&&supabaseKey?createClient(process.env.SUPABASE_URL,supabaseKey,{auth:{persistSession:false}}):null;
app.get('/api/v1/status',(_req,res)=>res.json({mode,cache:'disabled',product_count:preview?.products.length??null,source:preview?'Verified local collection snapshots; private review preview.':'Published Supabase catalogue',snapshot_created_at:preview?.created_at??null}));
app.get('/api/v1/brands',async(_req,res)=>{
 try {
  if(preview){const groups=new Map<string,{slug:string;name:string;product_count:number}>();for(const p of preview.products){const slug=(p as Product & {brand_slug:string}).brand_slug;const b=groups.get(slug)??{slug,name:p.brand,product_count:0};b.product_count++;groups.set(slug,b);}res.json({mode,brands:[...groups.values()].sort((a,b)=>a.name.localeCompare(b.name))});return;}
  if(!supabase){const names=[...new Set(demo.map(p=>p.brand))];res.json({mode:'demo',brands:names.map(name=>({name,slug:name.toLowerCase().replace(/[^a-z0-9]+/g,'-')}))});return;}
  const {data,error}=await supabase.from('brands').select('slug,name').order('name');if(error)throw error;
  res.json({mode:'catalogue',brands:data??[]});
 }catch{res.status(503).json({error:'Brands are temporarily unavailable.'});}
});
app.get('/api/v1/brands/:slug/catalogue', async (req, res) => {
 const page = Number(req.query.page ?? 1);
 if (!Number.isSafeInteger(page) || page < 1 || page > 2000) {
   res.status(400).json({error:'Choose a valid catalogue page.'});
   return;
 }
 const offset = (page - 1) * PAGE_SIZE;
 try {
   let rows: Product[];
   let total: number;
   if (supabase && !preview) {
     const {data: brand, error: brandError} = await supabase.from('brands').select('name')
       .eq('slug', req.params.slug).eq('active', true).maybeSingle();
     if (brandError) throw brandError;
     if (!brand) {
       res.status(404).json({error:'This brand has no published catalogue.'});
       return;
     }
     const {data, count, error} = await supabase.from('public_catalogue')
       .select('id,brand,title,category,source_url,image_url,observed_at,variants,synthetic', {count:'exact'})
       .eq('brand', brand.name).order('id').range(offset, offset + PAGE_SIZE - 1);
     if (error) throw error;
     rows = data as Product[];
     total = count ?? 0;
   } else {
     const catalogue = (preview?.products ?? demo).filter(product =>
       (product.brand_slug ?? product.brand.toLowerCase().replace(/[^a-z0-9]+/g, '-')) === req.params.slug);
     total = catalogue.length;
     rows = catalogue.sort((a, b) => a.id.localeCompare(b.id)).slice(offset, offset + PAGE_SIZE);
   }
   const styles = rows.map(({id, brand, title, category, source_url, image_url, observed_at, variants}) => ({
     id, brand, title, category, source_url, image_url, observed_at,
     last_stock: variants.some(variant => variant.available === true) ? 'some_available'
       : variants.length > 0 && variants.every(variant => variant.available === false) ? 'unavailable' : 'unknown',
   }));
   res.json({styles, total, page, hasMore: offset + styles.length < total && styles.length > 0});
 } catch {
   res.status(503).json({error:'This brand’s catalogue is temporarily unavailable.'});
 }
});
app.post('/api/v1/search',async(req,res)=>{
 const query = req.body?.query;
 if (typeof query !== 'string' || query.length > 300) {
   res.status(400).json({error:'Enter a query of up to 300 characters.'}); return;
 }
 const titleSearch = req.body?.queryMode === 'title';
 if (!titleSearch) {
   if (/\b(?:no|not|without|exclude|except|or)\b/i.test(query) || hasMultipleChoices(query)) {
     res.status(422).json({error:'Search for one combination at a time. Choose one category, colour, size and budget.'}); return;
   }
   const unsupported = unsupportedQuery(query);
   if (unsupported.length) {
     res.status(422).json({error:`I couldn’t verify these requirements: ${[...new Set(unsupported)].join(', ')}. Edit the request or use Product name if these words are part of the item’s name.`}); return;
   }
 }
 const filters: Filters = titleSearch ? {title: query.trim() || undefined, priceMode:'delivered'} : parseQuery(query);
 const requested = req.body?.filters || {};
 const page = Number.isSafeInteger(req.body?.page) && req.body.page >= 1 && req.body.page <= 2000 ? req.body.page : 1;
 const favouriteBrands = Array.isArray(req.body?.favouriteBrands) ? req.body.favouriteBrands.filter((value: unknown): value is string => typeof value === 'string' && value.length <= 80).slice(0, 40) : [];
 const sort = req.body?.sort === 'price-desc' || req.body?.sort === 'price-asc' ? req.body.sort : 'recommended';
 if (requested.audience === 'men' || requested.audience === 'women' || requested.audience === 'unisex') {
   filters.audience = requested.audience;
 }
 for(const key of ['category','colour','size','theme','fit'] as const) if(typeof requested[key]==='string'&&requested[key].length<=40) filters[key]=requested[key]||undefined;
 if(typeof requested.brand==='string'&&requested.brand.length<=80){
  if(preview){filters.brand=preview.products.find(p=>(p as Product & {brand_slug:string}).brand_slug===requested.brand)?.brand??requested.brand;}
  else if(supabase){const {data,error}=await supabase.from('brands').select('name').eq('slug',requested.brand).maybeSingle();if(error){res.status(503).json({error:'Brands are temporarily unavailable.'});return;} if(!data){res.json({mode:'catalogue',filters,...search([],filters,page,sort),coverage:'No published products for this brand.'});return;} filters.brand=data.name;}
  else filters.brand=demo.find(p=>p.brand.toLowerCase().replace(/[^a-z0-9]+/g,'-')===requested.brand)?.brand??requested.brand;
 }
 if(requested.priceMode==='item'||requested.priceMode==='delivered') filters.priceMode=requested.priceMode;
 if(requested.budget===null) filters.budget=undefined; else if(Number.isSafeInteger(requested.budget)&&requested.budget>0&&requested.budget<=100000000) filters.budget=requested.budget;
 if (filters.budget !== undefined && (!Number.isSafeInteger(filters.budget) || filters.budget <= 0 || filters.budget > 100000000)) {
   res.status(422).json({error:'Choose a budget between ₹1 and ₹10,00,000.'}); return;
 }
 try { let products:Product[]=preview?.products??demo;
  if(supabase&&!preview){
   const {data,error} = await supabase.rpc('search_catalogue', {
    p_brand:filters.brand ?? null, p_category:filters.category ?? null,
    p_audience:filters.audience ?? null, p_size:filters.size ?? null,
    p_colour:filters.colour ?? null, p_budget:filters.budget ?? null,
    p_fit:filters.fit ?? null, p_theme:filters.theme ?? null,
    p_print_theme:filters.printTheme ?? null, p_title:filters.title ?? null,
    p_design:filters.design ?? [], p_sort:sort, p_page:page, p_favourites:favouriteBrands,
   });
   if(error) throw error;
   res.json({mode, filters, ...data, coverage:'Published catalogue. Check the brand for current details.'});
   return;
  }
  res.json({mode,filters,...search(products,filters,page,sort,favouriteBrands),coverage:preview?'Prices and stock are from the dated catalogue snapshots. Check the brand for current details.':supabase?'Published catalogue. Check the brand for current details.':'Fictional examples only. No live products.'});
 }catch{res.status(503).json({error:'Catalogue is temporarily unavailable. Please try again.'});}
});
app.listen(Number(process.env.PORT||3001),'127.0.0.1',()=>console.log('Local API listening on 127.0.0.1'));
