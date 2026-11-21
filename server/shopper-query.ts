import type { Filters } from './search';

const garmentTypos = new Map([
  ['hoodi', 'hoodie'], ['hodie', 'hoodie'], ['hoddie', 'hoodie'],
  ['swetshirt', 'sweatshirt'], ['sweatshrt', 'sweatshirt'], ['sweatr', 'sweater'],
  ['tshrt', 't-shirt'], ['jeasn', 'jeans'], ['jaket', 'jacket'], ['trousrs', 'trousers'],
]);
export const fibreNames = new Set('cotton polyester viscose rayon linen wool acrylic nylon elastane spandex modal'.split(' '));
const fibres = '(' + [...fibreNames].join('|') + ')';
const colourNames = '(black|white|blue|red|green|brown|pink|beige|grey|gray|navy|cream|olive|purple|yellow|orange|maroon|indigo|charcoal)';
const colourOr = new RegExp('\\b' + colourNames + '\\s+or\\s+' + colourNames + '\\b', 'gi');
const exclusion = new RegExp('\\b(?:no|without|exclude)\\s+' + fibres + '\\b(?![\\s-]+(?:like|look|feel|free|style|effect)\\b)', 'gi');

export type QueryCorrection = { from: string; to: string };

export function interpretQuery(input: string) {
  const corrections: QueryCorrection[] = [];
  const quantity = /\b(?:size|waist|under|below|less than|up to|max(?:imum)?|budget(?: of)?|within)\s*[:=-]?\s*(?:₹\s*)?[\w,.]+|\b[\w-]*\d[\w-]*\b/gi;
  const applyCorrections = (span: string) => span.replace(/\b[a-z]+\b/gi, (word: string) => {
    const replacement = garmentTypos.get(word.toLowerCase());
    if (!replacement) return word;
    corrections.push({from:word, to:replacement});
    return replacement;
  });
  let remaining = '';
  let start = 0;
  for (const match of input.matchAll(quantity)) {
    remaining += applyCorrections(input.slice(start, match.index)) + match[0];
    start = match.index + match[0].length;
  }
  remaining += applyCorrections(input.slice(start));

  const options: Pick<Filters, 'materials' | 'excludedMaterials' | 'colours'> = {};
  remaining = remaining.replace(exclusion, (_word, material: string) => {
    (options.excludedMaterials ??= []).push(material.toLowerCase());
    return ' ';
  });
  // Leave unsupported negations, qualifiers and disjunctions for API validation.
  const materialTerm = new RegExp('\\b' + fibres + '\\b', 'gi');
  remaining = remaining.replace(materialTerm, (material: string, _group: string, offset: number, full: string) => {
    if (/(?:\b(?:no|not|without|exclude|except|or|organic|recycled)\s+|\d\s*%\s*)$/i.test(full.slice(0, offset)) ||
        /^[\s-]+(?:like|look|feel|free|style|effect)\b/i.test(full.slice(offset + material.length))) return material;
    (options.materials ??= []).push(material.toLowerCase());
    return ' ';
  });
  remaining = remaining.replace(colourOr, (match, first: string, second: string) => {
    if (options.colours) return match;
    options.colours = [...new Set([first, second].map(word => word.toLowerCase().replace(/^gray$/, 'grey')))];
    return first;
  });
  return {remaining, options, corrections};
}
