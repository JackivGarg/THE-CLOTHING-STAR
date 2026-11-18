export type Variant = { id: string; size: string | null; colour: string | null; price_minor: number; available: boolean | null; price_checked_at?: string | null; stock_checked_at?: string | null; preorder?: boolean | null; fulfilment_status?: string | null };
export type Audience = 'men' | 'women' | 'unisex';
export type Product = { id: string; brand: string; title: string; description_text?: string | null; category: string; fit: string | null; themes: string[]; print_themes?: string[]; theme_evidence: string | null; variants: Variant[]; observed_at: string | null; image_url: string | null; source_url: string | null; synthetic: boolean; audience?: Audience | null; audience_evidence?: {audience: Audience; field: 'tag' | 'title'; value: string} | null };
export type Filters = { brand?: string; audience?: Audience; category?: string; colour?: string; size?: string; theme?: string; printTheme?: string; fit?: string; budget?: number; priceMode?: 'item' | 'delivered'; title?: string; design?: string[] };
export type Sort = 'recommended' | 'price-asc' | 'price-desc';
export const PAGE_SIZE = 5;

const categoryTerms: [string, RegExp][] = [
  ['cap', /\bcaps?\b/i],
  ['hoodie', /\b(?:hoodies?|hooded sweatshirts?)\b/i],
  ['sweatshirt', /\bsweatshirts?\b/i],
  ['sweater', /\b(?:sweaters?|pullovers?)\b/i],
  ['tee', /\b(?:t[- ]?shirts?|tees?)\b/i],
  ['shirt', /\bshirts?\b/i],
  ['jeans', /\bjeans?\b/i],
  ['shorts', /\bshorts?\b/i],
  ['trousers', /\b(?:pants?|trousers?|joggers?|cargos?)\b/i],
  ['jacket', /\bjackets?\b/i],
  ['vest', /\b(?:vests?|tank tops?)\b/i],
  ['dress', /\bdress(?:es)?\b/i],
  ['skirt', /\bskirts?\b/i],
  ['co_ord', /\bco[- ]?ords?\b/i],
];
const colourTerms = /\b(black|white|blue|red|green|brown|pink|beige|grey|gray|navy|cream|olive|purple|yellow|orange|maroon|indigo|charcoal)\b/i;
const audienceTerm = /\b(unisex|women(?:['’]?s)?|men(?:['’]?s)?)\b/i;
const sizeTerm = /\b(?:size|waist)\s*[:=-]?\s*(\d?x{1,3}[sl]|[sml]|(?:uk\s*)?\d{1,3}(?:[-–]\d{1,3})?|one size|free size)\b/i;
const budgetTerm = /(?:\b(?:under|below|within|up to|max(?:imum)?|budget(?: of)?)\s*|₹\s*|\b(?:rs\.?|inr)\s*)\s*(?:(?:₹|rs\.?|inr)\s*)?([\d,]+(?:\.\d{1,2})?)\s*(k)?\b/i;
const designTerm = /\b(?:thunder|lightning|boxy)\b/i;
const fitTerm = /\b(?:over[- ]?sized)\b/i;
const themeTerms: [string, RegExp][] = [
  ['racing', /\b(?:racing|motorsport|grand prix|formula\s*1)\b/i],
  ['anime', /\banime\b/i],
  ['floral', /\bfloral\b/i],
];
const filler = /\b(?:i|want|need|find|show|me|a|an|the|with|in|for|and|please|some|looking|am|something)\b/gi;
const remove = (input: string, pattern: RegExp) => input.replace(new RegExp(pattern.source, 'gi'), ' ');
const sizeKey = (value: string) => value.trim().toUpperCase().replace(/^(XXL|XXXL|XXS)$/, key => key === 'XXL' ? '2XL' : key === 'XXXL' ? '3XL' : '2XS');
const colourKey = (value: string) => value.trim().toLowerCase().replace(/^gray$/, 'grey');
const titleWords = (value: string) => value.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
const audienceKey = (value: string) => value.toLowerCase().replace(/['’]?s$/, '') as Audience;

export function parseQuery(input: string): Filters {
  const filters: Filters = { priceMode: 'delivered' };
  const category = categoryTerms.find(([, pattern]) => pattern.test(input));
  const colour = input.match(colourTerms);
  const audience = input.match(audienceTerm);
  const size = input.match(sizeTerm);
  const budget = input.match(budgetTerm);
  const theme = themeTerms.find(([, pattern]) => pattern.test(input));
  if (category) filters.category = category[0];
  if (colour) filters.colour = colourKey(colour[1]);
  if (audience) filters.audience = audienceKey(audience[1]);
  if (size) filters.size = sizeKey(size[1]);
  if (budget) filters.budget = Math.round(Number(budget[1].replaceAll(',', '')) * (budget[2] ? 1000 : 1) * 100);
  if (fitTerm.test(input)) filters.fit = 'oversized';
  const design = input.toLowerCase().match(new RegExp(designTerm.source, 'gi'));
  if (design) filters.design = [...new Set(design)];
  if (theme) filters.theme = theme[0];
  if (theme?.[0] === 'racing' && /\b(?:prints?|graphics?|artworks?)\b/i.test(input)) filters.printTheme = 'racing';
  return filters;
}

// Keep unsupported requirements visible rather than silently broadening a search.
export function unsupportedQuery(input: string): string[] {
  let rest = input.toLowerCase();
  for (const pattern of [budgetTerm, sizeTerm, ...categoryTerms.map(([, term]) => term), audienceTerm, colourTerms, fitTerm, designTerm, ...themeTerms.map(([, term]) => term)]) {
    rest = remove(rest, pattern);
  }
  if (parseQuery(input).printTheme) rest = remove(rest, /\b(?:prints?|graphics?|artworks?)\b/i);
  return rest.replace(filler, ' ').replace(/[^\p{L}\p{N}]+/gu, ' ').trim().split(/\s+/).filter(Boolean);
}

export function hasMultipleChoices(input: string): boolean {
  const counts = [sizeTerm, colourTerms, budgetTerm].map(pattern => [...input.matchAll(new RegExp(pattern.source, 'gi'))].length);
  let categories = 0;
  let rest = remove(remove(input, sizeTerm), budgetTerm);
  for (const [, pattern] of categoryTerms) {
    if (pattern.test(rest)) {
      categories++;
      rest = remove(rest, pattern);
    }
  }
  const audiences = new Set([...input.matchAll(new RegExp(audienceTerm.source, 'gi'))].map(match => audienceKey(match[1])));
  return categories > 1 || audiences.size > 1 || counts.some(count => count > 1) || themeTerms.filter(([, pattern]) => pattern.test(input)).length > 1;
}

export function search(products: Product[], filters: Filters, page = 1, sort: Sort = 'recommended', favouriteBrands: string[] = []) {
  const tokens = titleWords(filters.title ?? '');
  const phrase = tokens.join(' ');
  const favourites = new Set(favouriteBrands.map(brand => brand.toLowerCase()));
  const isCurrent = (variant: Variant, synthetic: boolean) => {
    if (synthetic) return true;
    const now = Date.now();
    const times = [variant.price_checked_at, variant.stock_checked_at].map(value => value ? Date.parse(value) : NaN);
    return times.every(time => Number.isFinite(time) && time <= now && now - time <= 72 * 60 * 60 * 1000)
      && variant.preorder === false && variant.fulfilment_status === 'ready';
  };
  const matches = products.flatMap(product => {
    const audienceMatch = !!filters.audience && product.audience === filters.audience;
    if (filters.audience && !audienceMatch && !(filters.audience !== 'unisex' && product.audience === 'unisex')) return [];
    if ((filters.brand && product.brand.toLowerCase() !== filters.brand.toLowerCase()) ||
        (filters.category && product.category !== filters.category) ||
        (filters.fit && product.fit !== filters.fit) ||
        (filters.theme && !product.themes.includes(filters.theme)) ||
        (filters.printTheme && !product.print_themes?.includes(filters.printTheme))) return [];
    const sourceText = new Set(titleWords(product.title + ' ' + (product.description_text ?? '')));
    const exactDesign = filters.design?.filter(term => sourceText.has(term)).length ?? 0;
    if (filters.design?.some(term => {
      if (term === 'thunder' || term === 'lightning') return !sourceText.has('thunder') && !sourceText.has('lightning');
      return !sourceText.has(term);
    })) return [];
    const name = phrase ? titleWords(product.title) : [];
    if (tokens.length) {
      const words = new Set(name);
      if (!tokens.every(token => words.has(token))) return [];
    }
    const variant = product.variants.reduce<Variant | undefined>((best, candidate) => {
      if (candidate.available !== true || !Number.isSafeInteger(candidate.price_minor) || candidate.price_minor < 0 ||
          (filters.size && (!candidate.size || sizeKey(candidate.size) !== sizeKey(filters.size))) ||
          (filters.colour && (!candidate.colour || colourKey(candidate.colour) !== colourKey(filters.colour))) ||
          (filters.budget !== undefined && candidate.price_minor > filters.budget)) return best;
      if (!best) return candidate;
      const candidateCurrent = isCurrent(candidate, product.synthetic);
      const bestCurrent = isCurrent(best, product.synthetic);
      if (candidateCurrent !== bestCurrent) return candidateCurrent ? candidate : best;
      return candidate.price_minor < best.price_minor ? candidate : best;
    }, undefined);
    if (!variant) return [];
    const title = name.join(' ');
    const titleMatch = phrase && title === phrase ? 2 : phrase && ` ${title} `.includes(` ${phrase} `) ? 1 : 0;
    return [{
      product: {...product, selected_variant: variant,
        match_reason: filters.design?.length
          ? (exactDesign === filters.design.length ? 'Design terms found in product details' : 'Related design found in product details')
          : undefined},
      relevance: exactDesign * 10 + Number(audienceMatch) * 3 + titleMatch,
      favourite: Number(favourites.has(product.brand.toLowerCase())),
      details: Number(!!variant.size) + Number(!!variant.colour) + Number(!!product.image_url),
    }];
  });
  const direction = sort === 'price-desc' ? -1 : 1;
  matches.sort((a,b) => (sort === 'recommended' ? b.relevance - a.relevance || b.favourite - a.favourite || b.details - a.details : 0)
    || direction * (a.product.selected_variant.price_minor - b.product.selected_variant.price_minor)
    || a.product.id.localeCompare(b.product.id));
  if (sort === 'recommended' && !filters.brand) {
    const seen = new Set<string>();
    // Diversify the first page within the strongest remaining relevance tier.
    for (let i = 0; i < Math.min(PAGE_SIZE, matches.length); i++) {
      const candidate = matches.findIndex((item, j) => j >= i && item.relevance === matches[i].relevance && item.favourite === matches[i].favourite
        && !seen.has(item.product.brand.toLowerCase()));
      if (candidate > i) matches.splice(i, 0, matches.splice(candidate, 1)[0]);
      seen.add(matches[i].product.brand.toLowerCase());
    }
  }
  const visible = matches.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map(item => item.product);
  const needsDelivery = filters.budget !== undefined && filters.priceMode !== 'item';
  const current = visible.filter(product => isCurrent(product.selected_variant, product.synthetic));
  const lastSeen = visible.filter(product => !isCurrent(product.selected_variant, product.synthetic));
  return {
    confirmed: needsDelivery ? [] : current,
    unknownDelivery: needsDelivery ? current : [],
    lastSeen,
    total: matches.length,
    page,
    hasMore: page * PAGE_SIZE < matches.length,
  };
}
