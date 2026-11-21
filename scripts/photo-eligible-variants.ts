import { readFileSync } from 'node:fs';
import { eligibleVariants, type Filters, type Product } from '../server/search';

const [snapshotPath, filtersPath] = process.argv.slice(2);
if (!snapshotPath || !filtersPath) {
  throw new Error('Usage: tsx scripts/photo-eligible-variants.ts <private-catalogue.json> <filters.json>');
}
const {products} = JSON.parse(readFileSync(snapshotPath, 'utf8')) as {products:Product[]};
const filters = JSON.parse(readFileSync(filtersPath, 'utf8')) as Filters;
if (filters.title || filters.design?.length) {
  throw new Error('The photo pilot accepts structured filters. Use text search for design and name queries.');
}
if (filters.budget !== undefined && filters.priceMode !== 'item') {
  throw new Error('Select item price for a budget in this pilot. Delivery costs are pending review.');
}
const matches = products.flatMap(product => eligibleVariants(product, filters).map(variant => ({
  productId:product.id,
  variantId:variant.id,
  priceMinor:variant.price_minor,
})));
process.stdout.write(JSON.stringify(matches));
