export type Variant = { id: string; size: string | null; colour: string | null; price_minor: number; available: boolean | null };
export type Product = { id: string; brand: string; title: string; category: string; fit: string | null; themes: string[]; theme_evidence: string | null; variants: Variant[]; observed_at: string | null; image_url: string | null; source_url: string | null; synthetic: boolean };
export type Filters = { brand?: string; category?: string; colour?: string; size?: string; theme?: string; fit?: string; budget?: number; priceMode?: 'item' | 'delivered' };
export function parseQuery(input: string): Filters {
 const q = input.toLowerCase(); const f: Filters = { priceMode: 'delivered' };
 if (/\bhoodie(s)?\b/.test(q)) f.category='hoodie'; else if (/\bsweaters?\b/.test(q)) f.category='sweater'; else if (/\bsweatshirts?\b/.test(q)) f.category='sweatshirt'; else if (/\b(t-?shirts?|tees?)\b/.test(q)) f.category='tee'; else if (/\b(pants?|trousers?)\b/.test(q)) f.category='trousers'; else if (/\bjeans?\b/.test(q)) f.category='jeans'; else if (/\bshorts?\b/.test(q)) f.category='shorts'; else if (/\bjackets?\b/.test(q)) f.category='jacket';
 const c=q.match(/\b(black|white|blue|red|green|brown|pink|beige|grey|gray)\b/); if(c) f.colour=c[1]==='gray'?'grey':c[1];
 const s=q.match(/\bsize\s*(2xl|xxl|xl|xs|s|m|l)\b/i); if(s) f.size=s[1].toUpperCase().replace('XXL','2XL');
 const m=q.match(/(?:under|below|within|budget(?: of)?|₹|rs\.?|inr)\s*₹?\s*([\d,]+(?:\.\d+)?)(k)?\b/i); if(m) f.budget=Math.round(Number(m[1].replaceAll(',',''))*(m[2]?1000:1)*100);
 if (/\boversized\b/.test(q)) f.fit='oversized';
 if (/\b(racing|motorsport|grand prix|formula\s*1)\b/.test(q)) f.theme='racing'; else if (/\banime\b/.test(q)) f.theme='anime'; else if (/\bfloral\b/.test(q)) f.theme='floral';
 return f;
}
// Refuse terms we cannot enforce, rather than silently dropping requirements.
export function unsupportedQuery(input: string): string[] {
 let rest=input.toLowerCase();
 const patterns=[/\b(?:hoodies?|sweaters?|sweatshirts?|t-?shirts?|tees?|pants?|trousers?|jeans?|shorts?|jackets?)\b/g,/\b(?:black|white|blue|red|green|brown|pink|beige|grey|gray|oversized|racing|motorsport|grand prix|formula\s*1|anime|floral)\b/g,/\bsize\s*(?:2xl|xxl|xl|xs|s|m|l)\b/g,/(?:under|below|within|budget(?: of)?|₹|rs\.?|inr)\s*₹?\s*[\d,]+(?:\.\d+)?k?\b/g,/\b(?:i|want|need|find|show|me|a|an|the|with|in|for|and|please|some|looking|am|looking for)\b/g];
 for(const p of patterns) rest=rest.replace(p,' ');
 return rest.replace(/[^\p{L}\p{N}]+/gu,' ').trim().split(/\s+/).filter(Boolean);
}
export function search(products: Product[], f: Filters) {
 const matched=products.flatMap(p=>{ if((f.brand && p.brand.toLowerCase()!==f.brand.toLowerCase())||(f.category && p.category!==f.category)||(f.fit && p.fit!==f.fit)||(f.theme && !p.themes.includes(f.theme))) return [];
 const variants=p.variants.filter(v=>v.available===true&&(!f.size||v.size?.toUpperCase().replace('XXL','2XL')===f.size.toUpperCase().replace('XXL','2XL'))&&(!f.colour||v.colour?.toLowerCase()===f.colour.toLowerCase())&&(!f.budget||v.price_minor<=f.budget));
 return variants.length?[{...p,selected_variant:variants.sort((a,b)=>a.price_minor-b.price_minor)[0]}]:[];
 }).sort((a,b)=>a.selected_variant.price_minor-b.selected_variant.price_minor||a.id.localeCompare(b.id)).slice(0,5);
 return {confirmed:f.budget&&f.priceMode!=='item'?[]:matched,unknownDelivery:f.budget&&f.priceMode!=='item'?matched:[]};
}
