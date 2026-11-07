// Only product-wide labelled colour fields qualify. This creates reviewable
// evidence; it does not assign a variant's colour or satisfy a hard filter.
export const PRODUCT_COLOUR_RULE_VERSION='explicit-product-colour-1';
const base='black|white|blue|grey|gray|red|pink|brown|green|beige|olive|yellow|navy|cream|purple|orange|indigo|khaki|maroon|lavender|aqua|teal|tan|charcoal|lilac|periwinkle|burgundy|peach|mauve|turquoise';
const label=new RegExp(`^(?:(?:off|faded|light|dark|deep|royal|bottle|pastel|stone|sage|pale|ash|soft|sand|ocean|sky|baby|chocolate|tan|magnet|dusty|vintage|washed|melange|heather|cool|warm|mint|forest|sea|powder|rust|brick|crimson|electric|ice|steel|denim|slate)\\s+){0,3}(?:${base})(?:\\s+(?:melange|wash|faded))?$`,'i');
const baseWords=new RegExp(`\\b(?:${base})\\b`,'gi');
const component=/\b(?:frame|lens|print|graphic|logo|text|sleeve|sleeves|strap|lining|border|trim|stitch|zipper|button|pant|bottom|top)\s*$/i;
const pattern=/(?:^|[\s;•-])colou?r\s*:\s*([^\n]*?)(?=\s+(?:Country|Wash|Care|Sizing|Size|Style|Composition|GSM|Material|Fabric|Print|Fit|Sleeve|Neck|Product|Disclaimer|Delivery|Dimensions?|Compartments?)\s*(?:of\s+production)?\s*:|\s+-\s*\w+\s*:|[\n.;]|$)/gi;
export function extractProductColour(input,brand){
 const text=input.description_text;if(typeof text!=='string'||!text.trim())return [];
 const labels=[],ambiguous=[];
 for(const m of text.matchAll(pattern)){
  const begin=m.index+(m[0].search(/colou?r/i));if(component.test(text.slice(Math.max(0,begin-35),begin)))continue;
  const value=m[1].trim().replace(/\s+/g,' ');const bases=value.match(baseWords)||[];
  const excerpt=text.slice(begin,Math.min(text.length,begin+m[0].length+45)).trim();
  if(!label.test(value)||bases.length!==1){if(value.length<=80&&(bases.length>0||/^multi(?:colour|color)?$/i.test(value)))ambiguous.push({value,excerpt});continue;}
  labels.push({value,excerpt});
 }
 const distinct=[...new Map(labels.map(x=>[x.value.toLowerCase(),x])).values()];if(!distinct.length)return [];
 const conflict=distinct.length>1||ambiguous.length>0, first=distinct[0],all=[...distinct,...ambiguous];
 return [{store_slug:brand,external_product_id:input.external_product_id??input.source_product_id,attribute_key:conflict?'product_colour_conflict':'product_colour',value_text:conflict?all.map(x=>x.value).join(' | '):first.value,source_kind:'description',source_url:input.source_url,source_field:'description_text',excerpt:conflict?all.map(x=>x.excerpt).join(' | '):first.excerpt,evidence_level:conflict?'ambiguous':'explicit',review_status:'pending',observed_at:input.observed_at,rule_version:PRODUCT_COLOUR_RULE_VERSION}];
}
