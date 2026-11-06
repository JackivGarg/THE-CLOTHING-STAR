import type { Product } from './search';
export const demo: Product[] = [
 ['sample-1','Studio North','Gridline Racing Hoodie',129900,'hoodie','black','M','racing'],
 ['sample-2','Offbeat Supply','Grand Prix Oversized Hoodie',149900,'hoodie','black','M','racing'],
 ['sample-3','Afterhours Club','Motorsport Hoodie',139900,'hoodie','black','L','racing'],
 ['sample-4','Studio North','Night Shift Sweater',119900,'sweater','black','M',''],
 ['sample-5','Offbeat Supply','Floral Oversized Tee',89900,'t-shirt','white','M','floral']
].map(([id,brand,title,price,category,colour,size,theme])=>({id:String(id),brand:String(brand),title:String(title),category:String(category),fit:'oversized',themes:theme?[String(theme)]:[],theme_evidence:theme?`Demo title: ${title}`:null,variants:[{id:`${id}-variant`,size:String(size),colour:String(colour),price_minor:Number(price),available:true}],observed_at:null,image_url:null,source_url:null,synthetic:true}));
