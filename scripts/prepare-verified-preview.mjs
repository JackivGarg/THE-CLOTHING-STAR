import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import {mapProduct} from './jnorss-refresh.mjs';

const [directory, expectedFingerprint] = process.argv.slice(2);
if (!directory || !/^[0-9a-f]{32}$/.test(expectedFingerprint ?? '')) {
  throw Error('Usage: node scripts/prepare-verified-preview.mjs <run-directory> <database-fingerprint>');
}
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const manifestBytes = await fs.readFile(path.join(directory, 'manifest.json'));
const manifest = JSON.parse(manifestBytes);
const imported = JSON.parse(await fs.readFile(path.join(directory, 'import/manifest.json')));
if (!manifest.complete || manifest.status !== 'review_required' || imported.run_id !== manifest.run_id ||
    imported.source_manifest_sha256 !== sha256(manifestBytes) || !Array.isArray(manifest.pages)) {
  throw Error('Unverified or inconsistent capture manifest');
}
const records = [];
for (const page of manifest.pages) {
  if (!/^page-\d{3}\.json\.gz$/.test(page.file)) throw Error('Unsafe page path');
  const raw = zlib.gunzipSync(await fs.readFile(path.join(directory, page.file)), {maxOutputLength:15000000});
  if (sha256(raw) !== page.sha256) throw Error('Source page hash mismatch');
  const data = JSON.parse(raw);
  if (!Array.isArray(data.products)) throw Error('Invalid source page');
  for (const product of data.products) records.push(mapProduct(product, page.observed_at, manifest.brand));
}
records.sort((a, b) => a.external_product_id.localeCompare(b.external_product_id, 'en'));
if (records.length !== imported.products || new Set(records.map(record => record.external_product_id)).size !== records.length ||
    records.reduce((sum, record) => sum + record.variants.length, 0) !== imported.variants) {
  throw Error('Product or variant counts do not match the import');
}
const pairs = records.map(record => record.external_product_id + ':' + record.content_hash).sort();
const fingerprint = crypto.createHash('md5').update(pairs.join(',')).digest('hex');
if (fingerprint !== expectedFingerprint) throw Error('Database content fingerprint mismatch');
const bytes = zlib.gzipSync(Buffer.from(JSON.stringify(records)));
await fs.writeFile(path.join(directory, 'verified-preview.json.gz'), bytes, {flag:'wx'});
await fs.writeFile(path.join(directory, 'verified-preview-manifest.json'), JSON.stringify({
  run_id:manifest.run_id, brand:manifest.brand, source_manifest_sha256:sha256(manifestBytes),
  records_sha256:sha256(bytes), database_fingerprint:fingerprint, products:records.length,
  verified_at:new Date().toISOString(),
}, null, 2), {flag:'wx'});
console.log(JSON.stringify({brand:manifest.brand, products:records.length, fingerprint}));
