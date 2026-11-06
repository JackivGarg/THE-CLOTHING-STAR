import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import { promisify } from 'node:util';
import { stableContentHash } from './collector-utils.mjs';

const gunzip = promisify(zlib.gunzip);
const root = 'data/catalogue';
const out = path.join(root, 'staging-batches-v3');
await fs.mkdir(out, { recursive: true });
const brands = JSON.parse(await fs.readFile(path.join(root, 'collection-report.json'), 'utf8')).brands;
for (const b of brands) {
  if (!b.products) continue;
  const snapshot = JSON.parse((await gunzip(await fs.readFile(path.join(root, b.slug, 'catalogue.snapshot.json.gz')))).toString());
  const groups = new Map();
  for (const r of snapshot.products) {
    if (!groups.has(r.source_product_id)) groups.set(r.source_product_id, {
      external_product_id: r.source_product_id, handle: r.handle, title: r.title,
      description_text: r.description_text, original_product_type: r.original_product_type,
      source_tags: r.source_tags, source_url: r.source_url, source_updated_at: r.source_updated_at,
      fulfilment_status: r.fulfilment_status, images: r.images, observed_at: r.observed_at, variants: []
    });
    groups.get(r.source_product_id).variants.push({
      external_variant_id: r.source_variant_id, source_options: r.source_options, source_sku: r.source_sku,
      size_raw: r.size_raw, colour_raw: r.colour_raw, source_price: r.source_price, price_minor: r.price_minor,
      compare_at_minor: r.compare_at_minor, currency: r.currency, available: r.available, preorder: r.preorder,
      source_variant_image_id: r.source_variant_image_id
    });
  }
  const records = [...groups.values()];
  for (const rec of records) {
    rec.variants.sort((a, b) => a.external_variant_id.localeCompare(b.external_variant_id));
    rec.content_hash = stableContentHash(rec);
    rec.validation_errors = [];
    if (!rec.title) rec.validation_errors.push('missing_title');
    if (!rec.variants.length) rec.validation_errors.push('missing_variants');
    if (rec.variants.some(v => v.price_minor == null)) rec.validation_errors.push('unparsed_price');
  }
  const dir = path.join(out, b.slug);
  await fs.mkdir(dir, { recursive: true });
  const files = [];
  for (let i = 0; i < records.length; i += 20) {
    const name = `batch-${String(Math.floor(i / 20) + 1).padStart(3, '0')}.json`;
    await fs.writeFile(path.join(dir, name), JSON.stringify(records.slice(i, i + 20)));
    files.push(name);
  }
  await fs.writeFile(path.join(dir, 'manifest.json'), JSON.stringify({
    brand: b.slug, snapshot_started_at: snapshot.started_at, products: records.length, files
  }, null, 2));
  console.log(`${b.slug}: ${records.length}; files=${files.length}`);
}
