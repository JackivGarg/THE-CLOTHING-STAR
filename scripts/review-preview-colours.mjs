import fs from 'node:fs/promises';
import {extractProductColour, hasUncolouredSizeOnlyVariants} from './product-colour-evidence.mjs';

// Review candidates from the same saved records that the private preview uses.
// A candidate still needs source and option checks before it can be accepted.
const input = process.argv[2] ?? 'data/catalogue/local-preview.json';
const preview = JSON.parse(await fs.readFile(input, 'utf8'));
if (!Array.isArray(preview.products)) throw new Error('Expected a preview with products');

const report = {created_at: preview.created_at, brands: {}, candidates: []};
for (const product of preview.products) {
  const brand = product.brand_slug;
  if (!brand || !Array.isArray(product.variants)) throw new Error('Invalid product shape');
  const summary = report.brands[brand] ??= {
    products: 0, explicit_colour: 0, conflicts: 0, size_only_candidates: 0, candidate_variants: 0,
  };
  summary.products++;
  const evidence = extractProductColour({
    external_product_id: product.id,
    description_text: product.description_text,
    source_url: product.source_url,
    observed_at: product.observed_at,
  }, brand)[0];
  if (!evidence) continue;
  if (evidence.attribute_key === 'product_colour_conflict') {
    summary.conflicts++;
    continue;
  }
  summary.explicit_colour++;
  if (!hasUncolouredSizeOnlyVariants(product.variants)) continue;
  summary.size_only_candidates++;
  summary.candidate_variants += product.variants.length;
  report.candidates.push({
    product_id: product.id, brand, title: product.title, category: product.category,
    colour: evidence.value_text, excerpt: evidence.excerpt, source_url: evidence.source_url,
    observed_at: evidence.observed_at, variants: product.variants.length,
    rule_version: evidence.rule_version,
  });
}
process.stdout.write(JSON.stringify(report, null, 2) + '\n');
