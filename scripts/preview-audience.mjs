const aliases = new Map([
  ['men', 'men'], ['mens', 'men'], ["men's", 'men'],
  ['women', 'women'], ['womens', 'women'], ["women's", 'women'],
  ['unisex', 'unisex'],
]);

const normalize = value => value.toLowerCase().replace(/’/g, "'").trim();

export function previewAudience(product) {
  const evidence = [];
  for (const tag of Array.isArray(product.source_tags) ? product.source_tags : []) {
    if (typeof tag !== 'string') continue;
    const audience = aliases.get(normalize(tag));
    if (audience) evidence.push({audience, field:'tag', value:tag});
  }
  const title = typeof product.title === 'string' ? product.title : '';
  const explicit = title.match(/^\s*(unisex|men['’]s|women['’]s)\b/i)
    ?? title.match(/\bfor\s+(men|women)\s*$/i);
  if (explicit) evidence.push({audience:aliases.get(normalize(explicit[1])), field:'title', value:explicit[0].trim()});

  const labels = new Set(evidence.map(item => item.audience));
  if (labels.has('unisex')) {
    // An explicit shared label can coexist with separate storefront tags.
    return {audience:'unisex', audience_evidence:evidence.find(item => item.audience === 'unisex')};
  }
  if (labels.size === 1) return {audience:evidence[0].audience, audience_evidence:evidence[0]};
  return {audience:null, audience_evidence:null};
}
