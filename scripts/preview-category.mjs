// Provisional source-text categories for the private preview, never image inference.
export function previewCategory(row){
 const title=String(row.title??'').trim().toLowerCase();
 const merchantType=String(row.original_product_type??'').trim().toLowerCase();
 const brand=row.brand_slug??row.store_slug;
 if(brand==='everdion' && ['trackpants','cargos'].includes(merchantType)
    && !/\b(?:set|co[ -]?ord|bag|shorts|jacket|shirt)\b/.test(title)) return 'trousers';
 if(brand==='everdion' && merchantType==='cord set' && /\b(?:set|tracksuit)\b/.test(title)) return 'co_ord';
 if(brand==='wtflex' && ['caps','caps.'].includes(merchantType) && /\bcap[.!]?\s*$/.test(title)) return 'cap';
 if(brand==='powerlook' && merchantType==='bags' && /\bbag[.!]?\s*$/.test(title)) return 'bag';
 // Accessories may name the garment they accompany. Co-ords may name both pieces.
 if(/^drawstrings?\s+(?:for|of)\b/.test(title))return 'accessory';
 if(/\bgift\s*card\b/.test(title))return 'gift_card';
 if(/\bpendant\b/.test(title))return 'pendant';
 if(/\b(?:duffle|duffel|backpack|bagpack|tote)\b|\bbag\s*$/.test(title))return 'bag';
 if(/\bscarf\b/.test(title))return 'scarf';
 if(/\bsocks?\b/.test(title))return 'socks';
 if(/\b(?:cotton\s+)?caps?[.!]?\s*$/.test(title))return 'cap';
 if(/\bco[ -]?ords?\b|\bcord\s+set\b|\btracksuit\b/.test(title))return 'co_ord';
 if(/\b(?:vest|tank)(?:-\d+)?\s*$/.test(title))return 'vest';
 const text=String(row.original_product_type??'').toLowerCase()+' '+title;
 for(const [key,re]of [['hoodie',/\bhoodies?\b/],['sweatshirt',/\bsweatshirts?\b/],['sweater',/\bsweaters?\b/],['jeans',/\bjeans?\b/],['tee',/\b(?:tee|t-shirt|tshirt)\b/],['shirt',/\bshirts?\b/],['shorts',/\bshorts\b/],['trousers',/\b(?:pants|trousers|joggers|cargo)\b/],['jacket',/\bjackets?\b/],['dress',/\bdress\b/],['skirt',/\bskirts?\b/],['vest',/\b(?:vest|tank)\b/]])if(re.test(text))return key;
 return 'unknown';
}
