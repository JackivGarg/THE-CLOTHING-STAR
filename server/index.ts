import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { Redis } from '@upstash/redis';
import { demo } from './demo';
import { parseQuery, search, unsupportedQuery, type Filters, type Product } from './search';
const app=express(); app.use(express.json({limit:'8kb'}));
const previewPath='data/catalogue/local-preview.json';
const preview=process.env.NODE_ENV!=='production' && process.env.CATALOGUE_LOCAL_PREVIEW!=='false' && fs.existsSync(previewPath)?JSON.parse(fs.readFileSync(previewPath,'utf8')) as {created_at:string;products:Product[]}:null;
const mode=preview?'local-preview':process.env.SUPABASE_URL&&process.env.SUPABASE_PUBLISHABLE_KEY?'catalogue':'demo';
if(preview)app.use((req,res,next)=>{const origin=req.get('origin');if(origin){try{if(!['localhost','127.0.0.1','[::1]'].includes(new URL(origin).hostname)){res.status(403).json({error:'Private preview is available from this computer only.'});return;}}catch{res.status(403).end();return;}}next();});
const supabaseKey=process.env.SUPABASE_PUBLISHABLE_KEY;
const supabase=process.env.SUPABASE_URL&&supabaseKey?createClient(process.env.SUPABASE_URL,supabaseKey,{auth:{persistSession:false}}):null;
const redis=process.env.UPSTASH_REDIS_REST_URL&&process.env.UPSTASH_REDIS_REST_TOKEN?new Redis({url:process.env.UPSTASH_REDIS_REST_URL,token:process.env.UPSTASH_REDIS_REST_TOKEN}):null;
app.get('/api/v1/status',(_req,res)=>res.json({mode,cache:redis?'configured':'disabled',product_count:preview?.products.length??null,source:preview?'Verified local collection snapshots; private review preview.':'Published Supabase catalogue',snapshot_created_at:preview?.created_at??null}));
app.get('/api/v1/brands',async(_req,res)=>{
 try {
  if(preview){const groups=new Map<string,{slug:string;name:string;product_count:number}>();for(const p of preview.products){const slug=(p as Product & {brand_slug:string}).brand_slug;const b=groups.get(slug)??{slug,name:p.brand,product_count:0};b.product_count++;groups.set(slug,b);}res.json({mode,brands:[...groups.values()].sort((a,b)=>a.name.localeCompare(b.name))});return;}
  if(!supabase){const names=[...new Set(demo.map(p=>p.brand))];res.json({mode:'demo',brands:names.map(name=>({name,slug:name.toLowerCase().replace(/[^a-z0-9]+/g,'-')}))});return;}
  const {data,error}=await supabase.from('brands').select('slug,name').order('name');if(error)throw error;
  res.json({mode:'catalogue',brands:data??[]});
 }catch{res.status(503).json({error:'Brands are temporarily unavailable.'});}
});
app.post('/api/v1/search',async(req,res)=>{
 const query=req.body?.query; if(typeof query!=='string'||query.length>300){res.status(400).json({error:'Enter a query of up to 300 characters.'});return;}
 if (/\b(?:no|not|without|exclude|except)\b/i.test(query)) { res.status(422).json({error:'Exclusions are not supported yet. Please remove them from the search.'}); return; }
 const unsupported=unsupportedQuery(query); if(unsupported.length){res.status(422).json({error:`We cannot reliably filter for: ${[...new Set(unsupported)].join(', ')}. Try a category, colour, size or budget.`});return;}
 const filters:Filters={...parseQuery(query)}; const requested=req.body?.filters||{};
 for(const key of ['category','colour','size','theme','fit'] as const) if(typeof requested[key]==='string'&&requested[key].length<=40) filters[key]=requested[key]||undefined;
 if(typeof requested.brand==='string'&&requested.brand.length<=80){
  if(preview){filters.brand=preview.products.find(p=>(p as Product & {brand_slug:string}).brand_slug===requested.brand)?.brand??requested.brand;}
  else if(supabase){const {data,error}=await supabase.from('brands').select('name').eq('slug',requested.brand).maybeSingle();if(error){res.status(503).json({error:'Brands are temporarily unavailable.'});return;} if(!data){res.json({mode:'catalogue',filters,confirmed:[],unknownDelivery:[],coverage:'No published products for this brand.'});return;} filters.brand=data.name;}
  else filters.brand=demo.find(p=>p.brand.toLowerCase().replace(/[^a-z0-9]+/g,'-')===requested.brand)?.brand??requested.brand;
 }
 if(requested.priceMode==='item'||requested.priceMode==='delivered') filters.priceMode=requested.priceMode;
 if(requested.budget===null) filters.budget=undefined; else if(Number.isSafeInteger(requested.budget)&&requested.budget>0&&requested.budget<=100000000) filters.budget=requested.budget;
 try { let products:Product[]=preview?.products??demo;
  if(supabase&&!preview){let cached:Product[]|null=null; try{cached=redis?await redis.get<Product[]>('catalogue:public:v2'):null;}catch{}
   if(cached) products=cached; else {products=[]; for(let offset=0;offset<10000;offset+=1000){const {data,error}=await supabase.from('public_catalogue').select('*').order('id').range(offset,offset+999); if(error) throw error; products.push(...((data??[]) as Product[])); if((data??[]).length<1000)break;} try{if(redis) await redis.set('catalogue:public:v2',products,{ex:120});}catch{}}
  }
  res.json({mode,filters,...search(products,filters),coverage:preview?'Private preview of collected source snapshots. Category labels are provisional; prices and stock reflect the displayed observation time.':supabase?'Reviewed published catalogue only; prototype searches up to 10,000 records.':'Fictional examples only. No live products.'});
 }catch{res.status(503).json({error:'Catalogue is temporarily unavailable. Please try again.'});}
});
app.listen(Number(process.env.PORT||3001),'127.0.0.1',()=>console.log('Local API listening on 127.0.0.1'));
