import categoryRegistry from '../catalogue-categories.json';
import { fibreNames } from './shopper-query';

type Composition = { materials: string[]; complete?: boolean };
export type OfferState = 'ready' | 'last_seen' | 'review_pending' | 'unavailable' | 'preorder' | 'unknown';
export type Variant = { id: string; size: string | null; colour: string | null; price_minor: number | null; available: boolean | null; observed_at?: string | null; price_checked_at?: string | null; stock_checked_at?: string | null; preorder?: boolean | null; fulfilment_status?: string | null; offer_state?: OfferState | null; source_sku?: string | null; composition?: Composition };
type PricedVariant = Variant & {price_minor: number};
export type Audience = 'men' | 'women' | 'unisex';
export type Product = { id: string; brand: string; brand_slug?: string; title: string; description_text?: string | null; category: string; fit: string | null; fits?: string[]; themes: string[]; print_themes?: string[]; theme_evidence: string | null; variants: Variant[]; observed_at: string | null; image_url: string | null; source_url: string | null; synthetic: boolean; audience?: Audience | null; audiences?: Audience[]; audience_evidence?: {audience: Audience; field: 'tag' | 'title'; value: string} | null; garment_colour_evidence?: {value_text: string; excerpt: string}; composition?: Composition; collection_labels?: string[]; search_tags?: string[]; accepted_search_terms?: string[] };
export type Filters = { brand?: string; audience?: Audience; category?: string; colour?: string; colours?: string[]; size?: string; theme?: string; printTheme?: string; fit?: string; budget?: number; budgetExclusive?: boolean; priceMode?: 'item' | 'delivered'; title?: string; design?: string[]; materials?: string[]; excludedMaterials?: string[]; sku?: string };
export type Sort = 'recommended' | 'price-asc' | 'price-desc';
export const PAGE_SIZE = 5;

const categoryTerms: [string, RegExp][] = categoryRegistry.map(category =>
  [category.slug, new RegExp(category.query_pattern, 'i')]
);
const colourTerms = /\b(black|white|blue|red|green|brown|pink|beige|grey|gray|navy|cream|olive|purple|yellow|orange|maroon|indigo|charcoal)\b/i;
const audienceTerm = /\b(unisex|women(?:['’]?s)?|men(?:['’]?s)?)\b/i;
const sizeTerm = /\b(?:size|waist)\s*[:=-]?\s*(\d?x{1,3}[sl]|[sml]|(?:uk\s*)?\d{1,3}(?:[-–]\d{1,3})?|one size|free size)\b/i;
const budgetTerm = /(?:\b(?:under|below|less than|within|up to|max(?:imum)?|budget(?: of)?)\s*|₹\s*|\b(?:rs\.?|inr)\s*)\s*(?:(?:₹|rs\.?|inr)\s*)?([\d,]+(?:\.\d{1,2})?)\s*(k)?\b/i;
const designTerm = /\b(?:thunder|lightning|boxy)\b/i;
const strictTerms = new Set([...fibreNames, 'leather','silk','gsm','return','returns','refundable','waterproof','water-resistant','authentic','preorder','pre-order','sustainable','organic','recycled']);
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
  if (budget) {
    filters.budget = Math.round(Number(budget[1].replaceAll(',', '')) * (budget[2] ? 1000 : 1) * 100);
    if (/^(under|below|less than)\b/i.test(budget[0])) filters.budgetExclusive = true;
  }
  if (fitTerm.test(input)) filters.fit = 'oversized';
  const design: string[] = input.toLowerCase().match(new RegExp(designTerm.source, 'gi')) ?? [];
  design.push(...unparsedWords(input));
  if (design.length) filters.design = [...new Set(design)];
  if (theme) filters.theme = theme[0];
  if (theme?.[0] === 'racing' && /\b(?:prints?|graphics?|artworks?)\b/i.test(input)) filters.printTheme = 'racing';
  return filters;
}

// Keep unsupported requirements visible rather than silently broadening a search.
function unparsedWords(input: string): string[] {
  let rest = input.toLowerCase();
  for (const pattern of [budgetTerm, sizeTerm, ...categoryTerms.map(([, term]) => term), audienceTerm, colourTerms, fitTerm, designTerm, ...themeTerms.map(([, term]) => term)]) {
    rest = remove(rest, pattern);
  }
  if (themeTerms[0][1].test(input) && /\b(?:prints?|graphics?|artworks?)\b/i.test(input)) rest = remove(rest, /\b(?:prints?|graphics?|artworks?)\b/i);
  return rest.replace(filler, ' ').replace(/[^\p{L}\p{N}]+/gu, ' ').trim().split(/\s+/).filter(Boolean);
}

export function unsupportedQuery(input: string): string[] {
  return unparsedWords(input).filter(word => strictTerms.has(word) || /^\d/.test(word));
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

const relatedDesign = new Map([['thunder', 'lightning'], ['lightning', 'thunder']]);
const fieldReasons = ['', 'Product description', 'Merchant tags', 'Verified section', 'Reviewed product detail', 'Product name'];
const graphicWords = /\b(?:graphic|print|design|artwork|motif|illustration|embroider(?:y|ed))s?\b/i;
const relatedWords = /\b(?:thunder|lightning)\b/gi;

function matchesProduct(product: Product, filters: Filters) {
  const labels = product.audiences ?? (product.audience ? [product.audience] : []);
  if (filters.audience && !labels.includes(filters.audience) &&
      !(filters.audience !== 'unisex' && labels.includes('unisex'))) return false;
  return (!filters.brand || product.brand.toLowerCase() === filters.brand.toLowerCase() || product.brand_slug === filters.brand) &&
    (!filters.category || product.category === filters.category) &&
    (!filters.fit || product.fit === filters.fit || product.fits?.includes(filters.fit)) &&
    (!filters.theme || product.themes.includes(filters.theme)) &&
    (!filters.printTheme || product.print_themes?.includes(filters.printTheme));
}

export function eligibleVariants(product: Product, filters: Filters): PricedVariant[] {
  if (!matchesProduct(product, filters)) return [];
  const colours = filters.colours ?? (filters.colour ? [filters.colour] : []);
  const colourKeys = new Set(colours.map(colourKey));
  return product.variants.filter((variant): variant is PricedVariant => {
    const colour = variant.colour ?? product.garment_colour_evidence?.value_text;
    const composition = variant.composition ?? product.composition;
    return variant.available === true && variant.price_minor !== null && Number.isSafeInteger(variant.price_minor) && variant.price_minor >= 0 &&
      (!filters.size || (!!variant.size && sizeKey(variant.size) === sizeKey(filters.size))) &&
      (!colourKeys.size || (!!colour && colourKeys.has(colourKey(colour)))) &&
      (filters.budget === undefined || variant.price_minor <= filters.budget - Number(!!filters.budgetExclusive)) &&
      (!filters.sku || variant.source_sku?.toLowerCase() === filters.sku.toLowerCase()) &&
      (!filters.materials?.length || filters.materials.every(material => composition?.materials.includes(material))) &&
      (!filters.excludedMaterials?.length || (composition?.complete === true &&
        filters.excludedMaterials.every(material => !composition.materials.includes(material))));
  });
}

export function buildSearchIndex(products: Product[]) {
  const entries = products.map(product => {
    const fields = [
      product.description_text ?? '', product.search_tags?.join(' ') ?? '',
      product.collection_labels?.join(' ') ?? '', product.accepted_search_terms?.join(' ') ?? '', product.title,
    ];
    const terms = new Map<string, number>();
    fields.forEach((field, i) => {
      for (const term of titleWords(field)) terms.set(term, i + 1);
    });
    const name = titleWords(product.title);
    const designEvidence = new Set([...name, ...(product.accepted_search_terms ?? []).flatMap(titleWords)]);
    for (const sentence of fields[0].split(/[.!?\n]/)) {
      if (!graphicWords.test(sentence) || /\b(?:shipping|delivery|dispatch|checkout)\b/i.test(sentence)) continue;
      for (const match of sentence.matchAll(relatedWords)) designEvidence.add(match[0].toLowerCase());
    }
    return {product, terms, name, designEvidence};
  });
  const postings = new Map<string, number[]>();
  entries.forEach(({terms}, index) => {
    for (const word of terms.keys()) {
      const hits = postings.get(word);
      if (hits) hits.push(index);
      else postings.set(word, [index]);
    }
  });
  return {entries, postings};
}

export function search(products: Product[], filters: Filters, page = 1, sort: Sort = 'recommended', favouriteBrands: string[] = [], index = buildSearchIndex(products)) {
  const tokens = titleWords(filters.title ?? '');
  const phrase = tokens.join(' ');
  const favourites = new Set(favouriteBrands.map(brand => brand.toLowerCase()));
  const now = Date.now();
  const isCurrent = (variant: Variant, synthetic: boolean) => {
    if (synthetic) return true;
    if (variant.offer_state && variant.offer_state !== 'ready') return false;
    const times = [variant.price_checked_at, variant.stock_checked_at].map(value => value ? Date.parse(value) : NaN);
    return times.every(time => Number.isFinite(time) && time <= now && now - time <= 72 * 60 * 60 * 1000)
      && variant.preorder === false && variant.fulfilment_status === 'ready';
  };
  const facets = { brand: new Map<string, number>(), category: new Map<string, number>(), size: new Map<string, number>(), colour: new Map<string, number>() };
  const design = filters.design ?? [];
  const possible = [...design, ...tokens].map((word, position) => {
    const related = position < design.length ? relatedDesign.get(word) : undefined;
    return new Set([...(index.postings.get(word) ?? []), ...(related ? index.postings.get(related) ?? [] : [])]);
  }).sort((a, b) => a.size - b.size);
  const [rarest, ...otherTerms] = possible;
  const candidates = rarest
    ? [...rarest].filter(id => otherTerms.every(hits => hits.has(id))).map(id => index.entries[id])
    : index.entries;
  const matches = candidates.flatMap(({product, terms, name, designEvidence}) => {
    const labels = product.audiences ?? (product.audience ? [product.audience] : []);
    const audienceMatch = !!filters.audience && labels.includes(filters.audience);
    const direct = design.map(term => terms.get(term) ?? 0);
    if (design.some((term, position) => !direct[position] && !designEvidence.has(relatedDesign.get(term) ?? ''))) return [];
    const related = direct.some(weight => weight === 0);
    if (tokens.length) {
      const words = new Set(name);
      if (!tokens.every(token => words.has(token))) return [];
    }
    const garmentColour = product.garment_colour_evidence?.value_text;
    const eligible = eligibleVariants(product, filters);
    if (!eligible.length) return [];
    const facetValues = {
      brand:[product.brand_slug ?? product.brand], category:[product.category],
      size:eligible.flatMap(v => v.size ? [sizeKey(v.size)] : []),
      colour:eligible.flatMap(v => (v.colour ?? garmentColour) ? [colourKey((v.colour ?? garmentColour)!)] : []),
    };
    for (const key of Object.keys(facets) as (keyof typeof facets)[]) {
      for (const value of new Set(facetValues[key])) facets[key].set(value, (facets[key].get(value) ?? 0) + 1);
    }
    const variant = eligible.reduce((best, candidate) => {
      const freshness = Number(isCurrent(candidate, product.synthetic)) - Number(isCurrent(best, product.synthetic));
      if (freshness) return freshness > 0 ? candidate : best;
      return candidate.price_minor < best.price_minor ||
        (candidate.price_minor === best.price_minor && candidate.id.localeCompare(best.id) < 0) ? candidate : best;
    });
    const title = name.join(' ');
    const titleMatch = phrase && title === phrase ? 2 : phrase && ` ${title} `.includes(` ${phrase} `) ? 1 : 0;
    return [{
      product: {...product, selected_variant: variant.colour == null && garmentColour ? {...variant, colour:garmentColour} : variant,
        match_reason: filters.sku ? 'Exact merchant SKU' : related ? 'Related design found in product details' :
          direct.length ? fieldReasons[Math.min(...direct)] : titleMatch ? 'Product name' : undefined},
      related: Number(related),
      current: Number(isCurrent(variant, product.synthetic)),
      relevance: direct.reduce((sum, weight) => sum + weight * 10, 0) + Number(audienceMatch) * 3 + titleMatch,
      favourite: Number(favourites.has(product.brand.toLowerCase()) || (!!product.brand_slug && favourites.has(product.brand_slug))),
      details: Number(!!variant.size) + Number(!!variant.colour) + Number(!!product.image_url),
    }];
  });
  const direction = sort === 'price-desc' ? -1 : 1;
  matches.sort((a,b) => (sort === 'recommended' ? b.current - a.current || a.related - b.related || b.relevance - a.relevance || b.favourite - a.favourite || b.details - a.details : 0)
    || direction * (a.product.selected_variant.price_minor - b.product.selected_variant.price_minor)
    || a.product.id.localeCompare(b.product.id));
  if (sort === 'recommended' && !filters.brand) {
    const seen = new Set<string>();
    // Diversify the first page within the strongest remaining relevance tier.
    for (let i = 0; i < Math.min(PAGE_SIZE, matches.length); i++) {
      const candidate = matches.findIndex((item, j) => j >= i && item.current === matches[i].current && item.related === matches[i].related &&
        item.relevance === matches[i].relevance && item.favourite === matches[i].favourite
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
    facets: {brand:Object.fromEntries(facets.brand), category:Object.fromEntries(facets.category),
      size:Object.fromEntries(facets.size), colour:Object.fromEntries(facets.colour)},
  };
}
