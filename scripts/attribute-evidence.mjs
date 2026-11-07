import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { pathToFileURL } from 'node:url';
import { plainTextFromHtml, stableContentHash } from './collector-utils.mjs';

export const ATTRIBUTE_RULE_VERSION = 'text-evidence-3';

const categories = [
  ['hoodie', /\bhoodies?\b/i],
  ['sweatshirt', /\bsweatshirts?\b/i],
  ['sweater', /\b(?:sweaters?|pullovers?)\b/i],
  ['t-shirt', /\b(?:t[ -]?shirts?|tees?)\b/i],
  ['shirt', /(?<![\w-])shirts?\b/i],
  ['jacket', /\bjackets?\b/i],
  ['vest', /\b(?:vests?|tank tops?)\b/i],
  ['jeans', /\bjeans\b/i],
  ['joggers', /\bjoggers?\b/i],
  ['trousers', /\b(?:trousers?|pants)\b/i],
  ['shorts', /\bshorts\b/i],
  ['dress', /\bdress(?:es)?\b/i],
  ['skirt', /\bskirts?\b/i],
  ['co-ord', /\b(?:co[ -]?ords?|cord\s+sets?)\b/i]
];
const fits = [
  ['oversized', /\boversized\b/i],
  ['boxy', /\bboxy\b/i],
  ['relaxed', /\brelaxed(?:[ -]fit)?\b/i],
  ['regular', /\bregular[ -]fit\b/i],
  ['slim', /\bslim[ -]fit\b/i],
  ['baggy', /\bbaggy(?:[ -]fit)?\b/i]
];
const materialPattern = /\b(\d{1,3}(?:\.\d+)?)\s*%\s*(?:(?:organic|terry|combed|recycled|heavy|brushed)\s+)*(cotton|polyester|viscose|rayon|linen|wool|acrylic|nylon|elastane|spandex|modal)\b/gi;

function isNegated(text, index) {
  const before = text.slice(Math.max(0, index - 60), index);
  return /\b(?:(?:not|no|without|unlike|never)\s+(?:an?\s+)?|non[- ])$/i.test(before) ||
    /\b(?:not|no|without|never)\s+(?:(?:an?|oversized|boxy|relaxed|regular|slim|baggy)\s+){1,2}$/i.test(before) ||
    /\b(?:not|never)\s+(?:made|crafted|composed|constructed|designed)\s+(?:with|of|from|in)\s*$/i.test(before);
}

function isRangeEndpoint(text, index) {
  return /\d\s*(?:[-–—/]|to|and)\s*$/i.test(text.slice(Math.max(0, index - 18), index));
}

function isGenericOrStylingContext(text, index) {
  const before = text.slice(0, index);
  const start = Math.max(before.lastIndexOf('\n'), before.lastIndexOf('.'), before.lastIndexOf('!')) + 1;
  const rest = text.slice(index);
  const end = rest.search(/[\n.!]/);
  const sentence = text.slice(start, end < 0 ? text.length : index + end);
  return /\b(?:all (?:our )?products|our (?:entire )?collection|pair\b.{0,35}\bwith|style\b.{0,35}\bwith|wear\b.{0,35}\bwith|layer\b.{0,35}\b(?:over|under))\b/i.test(sentence);
}

function excerpt(text, index, length) {
  return text.slice(Math.max(0, index - 45), Math.min(text.length, index + length + 80)).trim();
}

/** Returns reviewable source evidence. It does not modify or accept product attributes. */
export function extractAttributeEvidence(input, options = {}) {
  const product = input?.payload ?? input;
  if (!product || typeof product !== 'object') throw new Error('Product payload required');
  const brand = options.brand ?? product.store_slug ?? null;
  if (brand === 'snitch') return [];
  const productId = product.external_product_id ?? product.source_product_id ??
    (typeof product.id === 'string' || Number.isSafeInteger(product.id) ? String(product.id) : null);
  const sourceUrl = options.sourceUrl ?? product.source_url ?? null;
  const observedAt = options.observedAt ?? product.observed_at ?? null;
  const evidence = [];
  const seen = new Set();
  const title = product.title ?? '';
  const titleHasTshirt = /\b(?:t[ -]?shirts?|tees?)\b/i.test(title);
  const titleCategories = categories.filter(([value, pattern]) =>
    value !== 'co-ord' && !(value === 'shirt' && titleHasTshirt) && pattern.test(title));
  const sourceType = product.original_product_type ?? product.product_type ?? product.type ?? '';
  const isBundle = /\b(?:co[ -]?ords?|cord\s+set)\b/i.test(sourceType) ||
    /\bco[ -]?ords?\b/i.test(product.title ?? '') ||
    (titleCategories.length > 1 && /(?:\+|&|\band\b)/i.test(title));

  function add(key, value, field, kind, text, match) {
    // A bundle's component garments and fit/material claims cannot satisfy a single-garment filter.
    const attributeKey = isBundle && ['category','fit','material_composition','gsm'].includes(key) && value !== 'co-ord'
      ? `component_${key}` : key;
    const row = {
      store_slug: brand, external_product_id: productId,
      attribute_key: attributeKey, value_text: value, source_kind: kind,
      source_url: sourceUrl, source_field: field,
      excerpt: excerpt(text, match.index, match[0].length),
      evidence_level: 'explicit', review_status: 'pending',
      observed_at: observedAt, rule_version: ATTRIBUTE_RULE_VERSION
    };
    const fingerprint = stableContentHash(row);
    if (seen.has(fingerprint)) return;
    seen.add(fingerprint);
    evidence.push({ ...row, evidence_fingerprint: fingerprint });
  }

  const typeField = product.original_product_type !== undefined ? 'original_product_type' : product.product_type !== undefined ? 'product_type' : 'type';
  const fields = [
    ['title', 'title', product.title],
    [typeField, 'product_type', product[typeField]]
  ].filter(([, , value]) => typeof value === 'string' && value.trim());

  for (const [field, kind, text] of fields) {
    const hasTshirt = /\b(?:t[ -]?shirts?|tees?)\b/i.test(text);
    for (const [value, pattern] of categories) {
      if (value === 'shirt' && hasTshirt) continue;
      const match = pattern.exec(text);
      const decorativeSweaterName = field === 'title' && value === 'sweater' && /^sweater\s+weather\b/i.test(text.slice(match?.index));
      if (match && !decorativeSweaterName && !isNegated(text, match.index)) add('category', value, field, kind, text, match);
    }
    for (const [value, pattern] of fits) {
      const match = pattern.exec(text);
      if (match && !isNegated(text, match.index)) add('fit', value, field, kind, text, match);
    }
  }

  const tagField = product.source_tags !== undefined ? 'source_tags' : 'tags';
  const tags = Array.isArray(product[tagField]) ? product[tagField] : [];
  tags.forEach((tag, index) => {
    if (typeof tag !== 'string') return;
    const trimmed = tag.trim();
    const audience = new Map([['men', 'men'], ['women', 'women'], ['unisex', 'unisex']]).get(trimmed.toLowerCase());
    if (audience) add('audience', audience, `${tagField}[${index}]`, 'tag', tag, {0: tag, index: 0});
  });

  const descriptionField = product.description_text !== undefined ? 'description_text' : product.body_html !== undefined ? 'body_html' : 'description';
  const description = typeof product[descriptionField] === 'string' ? plainTextFromHtml(product[descriptionField]) : '';
  const allText = [...fields, [descriptionField, 'description', description], ...tags.map((tag, index) => [`${tagField}[${index}]`, 'tag', tag])];
  for (const [field, kind, text] of allText) {
    if (typeof text !== 'string' || !text) continue;
    for (const match of text.matchAll(new RegExp(materialPattern))) {
      const percentage = Number(match[1]);
      const imitation = /^[- ](?:like|feel|look|effect|style)\b/i.test(text.slice(match.index + match[0].length));
      if (percentage > 0 && percentage <= 100 && !imitation && !isNegated(text, match.index) && !isRangeEndpoint(text, match.index) && !isGenericOrStylingContext(text, match.index)) {
        add('material_composition', `${percentage}% ${match[2].toLowerCase()}`, field, kind, text, match);
      }
    }
    for (const match of text.matchAll(/\b(\d{2,4})\s*GSM\b/gi)) {
      const gsm = Number(match[1]);
      if (gsm >= 50 && gsm <= 1500 && !isNegated(text, match.index) && !isRangeEndpoint(text, match.index) && !isGenericOrStylingContext(text, match.index)) add('gsm', String(gsm), field, kind, text, match);
    }
    const racing = /\bracing\b/i.exec(text);
    if (racing && !isNegated(text, racing.index) && !isGenericOrStylingContext(text, racing.index)) add('theme', 'racing', field, kind, text, racing);
    // A campaign/tag may suggest a theme without establishing what appears on
    // the garment. Record print evidence separately and only from product text.
    // A racing logo alone may be embroidered or a badge, so it is not a print.
    if (kind !== 'tag') {
      const print = /\bracing(?:[- ](?:inspired|themed|helmet|car|style)){0,2}[ -]+(?:graphics?|prints?|artworks?)\b/i.exec(text);
      if (print && !isNegated(text, print.index) && !/\b(?:not|no|without|never)\b/i.test(print[0]) && !isGenericOrStylingContext(text, print.index)) {
        add('print_theme', 'racing', field, kind, text, print);
      }
    }
  }
  // Only explicit garment-fit constructions in descriptions qualify; styling advice is excluded.
  for (const [value] of fits) {
    const fitConstruction = value === 'oversized'
      ? 'oversized(?:[ ,\\-]+(?:boxy|comfortable))?[ -]+fit'
      : `${value}[ -]fit`;
    const match = new RegExp(`\\b(?:fit\\s*[:=-]\\s*${value}|${fitConstruction})\\b`, 'i').exec(description);
    if (match && !isNegated(description, match.index) && !isGenericOrStylingContext(description, match.index)) add('fit', value, descriptionField, 'description', description, match);
  }
  return evidence;
}

/** Accepts saved flattened feeds, normalized Bonkers batches, or Supabase staged payload rows. */
export function extractSavedPayloadEvidence(document, options = {}) {
  const rows = Array.isArray(document) ? document : document?.products ?? [document];
  if (!Array.isArray(rows)) throw new Error('Expected product array');
  const evidence = rows.flatMap(row => extractAttributeEvidence(row, {
    ...options, brand: options.brand ?? document?.brand?.slug ?? row?.store_slug
  }));
  return [...new Map(evidence.map(row => [row.evidence_fingerprint, row])).values()];
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const paths = process.argv.slice(2);
  if (!paths.length) throw new Error('Supply saved product JSON or JSON.gz paths');
  const result = paths.flatMap(path => {
    const bytes = readFileSync(path);
    const document = JSON.parse((path.endsWith('.gz') ? gunzipSync(bytes) : bytes).toString('utf8'));
    return extractSavedPayloadEvidence(document);
  });
  const unique = [...new Map(result.map(row => [row.evidence_fingerprint, row])).values()];
  process.stdout.write(JSON.stringify({ rule_version: ATTRIBUTE_RULE_VERSION, evidence: unique }));
}
