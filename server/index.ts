import 'dotenv/config';
import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { Redis } from '@upstash/redis';
import { demo } from './demo';
import { parseQuery, search, type Filters, type Product } from './search';
const app=express(); app.use(express.json({limit:'8kb'}));
const supabaseKey=process.env.SUPABASE_PUBLISHABLE_KEY;
const supabase=process.env.SUPABASE_URL&&supabaseKey?createClient(process.env.SUPABASE_URL,supabaseKey,{auth:{persistSession:false}}):null;
const redis=process.env.UPSTASH_REDIS_REST_URL&&process.env.UPSTASH_REDIS_REST_TOKEN?new Redis({url:process.env.UPSTASH_REDIS_REST_URL,token:process.env.UPSTASH_REDIS_REST_TOKEN}):null;
app.get('/api/v1/status',(_req,res)=>res.json({mode:supabase?'catalogue':'demo',cache:redis?'configured':'disabled'}));
app.post('/api/v1/search',async(req,res)=>{
 const query=req.body?.query; if(typeof query!=='string'||query.length>300){res.status(400).json({error:'Enter a query of up to 300 characters.'});return;}
 if (/\b(?:no|not|without|exclude|except)\b/i.test(query)) { res.status(422).json({error:'Exclusions are not supported yet. Please remove them from the search.'}); return; }
 const filters:Filters={...parseQuery(query)}; const requested=req.body?.filters||{};
 for(const key of ['category','colour','size','theme','fit'] as const) if(typeof requested[key]==='string'&&requested[key].length<=40) filters[key]=requested[key]||undefined;
 if(requested.priceMode==='item'||requested.priceMode==='delivered') filters.priceMode=requested.priceMode;
 if(requested.budget===null) filters.budget=undefined; else if(Number.isSafeInteger(requested.budget)&&requested.budget>0&&requested.budget<=100000000) filters.budget=requested.budget;
 try { let products:Product[]=demo;
  if(supabase){let cached:Product[]|null=null; try{cached=redis?await redis.get<Product[]>('catalogue:public:v1'):null;}catch{}
   if(cached) products=cached; else {const {data,error}=await supabase.from('public_catalogue').select('*').limit(1000); if(error) throw error; products=(data??[]) as Product[]; try{if(redis) await redis.set('catalogue:public:v1',products,{ex:120});}catch{}}
  }
  res.json({mode:supabase?'catalogue':'demo',filters,...search(products,filters),coverage:supabase?'Published catalogue only; prototype limited to 1,000 records.':'Fictional examples only. No live products.'});
 }catch{res.status(503).json({error:'Catalogue is temporarily unavailable. Please try again.'});}
});
app.listen(Number(process.env.PORT||3001),'127.0.0.1',()=>console.log('Local API listening on 127.0.0.1'));
