import { readFileSync } from 'node:fs';
import { resolve, dirname, basename } from 'node:path';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import robotsParser from 'robots-parser';
import { normalizeBonkersProduct } from './bonkers-normalize.mjs';
import { stableContentHash } from './collector-utils.mjs';

// Emits one verified chunk for the Supabase operator. It does not write to the DB.
const [manifestPath, existingPath] = process.argv.slice(2);
if (!manifestPath || !existingPath) throw new Error('Usage: node scripts/reconcile-bonkers-aliases.mjs <validated manifest> <existing Bonkers records JSON>');
const dir = dirname(resolve(manifestPath));
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const rawDir = resolve(dir, '..');
const raw = JSON.parse(readFileSync(resolve(rawDir, 'manifest.json'), 'utf8'));
const candidates = JSON.parse(gunzipSync(readFileSync('data/catalogue/sitemap-discovery/bonkers-corner/candidates.json.gz')));
const candidateUrls = new Set(candidates.map(row => row.source_url));
const hash = data => createHash('sha256').update(data).digest('hex');
if (raw.brand !== 'bonkers-corner' || !Number.isSafeInteger(raw.max_requests) || raw.max_requests > 10000 ||
    raw.requests > raw.max_requests || raw.requests !== manifest.requests ||
    manifest.price_unit !== 'minor_integer' || manifest.raw_manifest !== '../manifest.json' ||
    !raw.finished_at || !manifest.finished_at || manifest.products < 1) throw new Error('Invalid run manifest');
const robotsBytes = readFileSync(resolve(rawDir, 'robots.txt'));
if (hash(robotsBytes) !== raw.robots_sha256) throw new Error('Robots snapshot mismatch');
const robots = robotsParser('https://www.bonkerscorner.com/robots.txt', robotsBytes.toString('utf8'));
const pages = new Map(raw.pages.map(page => [page.source_url, page]));
const rows = manifest.batch_files.flatMap(file => {
  if (!/^batch-\d+\.json$/.test(file)) throw new Error('Invalid batch name');
  return JSON.parse(readFileSync(resolve(dir, file), 'utf8'));
});
const ids = new Set();
const urls = new Set();
for (const row of rows) {
  const page = pages.get(row.source_url);
  if (!candidateUrls.has(row.source_url) || !page || page.status !== 200 ||
      page.detail_url !== row.source_url + '.js' || !/^raw-\d+\.json\.gz$/.test(page.snapshot) ||
      !/^https:\/\/www\.bonkerscorner\.com\/products\/[\w-]+$/.test(row.source_url) ||
      robots.isAllowed(page.detail_url, 'TheClothingStarCatalogueCollector') !== true) throw new Error('Unverified source URL');
  const bytes = gunzipSync(readFileSync(resolve(rawDir, page.snapshot)));
  if (hash(bytes) !== page.sha256) throw new Error('Response hash mismatch');
  const source = JSON.parse(bytes);
  if (!Number.isSafeInteger(source.id) || !Array.isArray(source.variants) ||
      source.variants.some(variant => !Number.isSafeInteger(variant.id))) throw new Error('Unsafe merchant ID');
  if (stableContentHash(row) !== row.content_hash) throw new Error('Payload content hash mismatch');
  const reconstructed = normalizeBonkersProduct(
    {...source, product_type:source.type || source.product_type},
    {sourceUrl:page.source_url, priceUnit:'minor_integer', observedAt:page.observed_at}
  );
  for (const key of ['external_product_id','title','handle','description_text','original_product_type',
    'source_tags','source_url','source_updated_at','observed_at','fulfilment_status','variants','content_use_status']) {
    if (stableContentHash({value:row[key]}) !== stableContentHash({value:reconstructed[key]})) throw new Error('Source field mismatch: ' + key);
  }
  if (String(source.id) !== row.external_product_id ||
      urls.has(row.source_url) || row.validation_errors.length || !row.variants.length ||
      !/^[0-9a-f]{64}$/.test(row.content_hash)) throw new Error('Invalid or duplicate product');
  ids.add(row.external_product_id);
  urls.add(row.source_url);
  const sourceVariants = new Map(source.variants.map(v => [String(v.id), v]));
  if (sourceVariants.size !== row.variants.length || new Set(row.variants.map(v => v.external_variant_id)).size !== row.variants.length) throw new Error('Variant count mismatch');
  for (const variant of row.variants) {
    const original = sourceVariants.get(variant.external_variant_id);
    if (!original || variant.currency !== 'INR' || !Number.isSafeInteger(variant.price_minor) ||
        variant.price_minor !== original.price || variant.available !== original.available) throw new Error('Variant evidence mismatch');
  }
  const expectedGallery = source.images.map(image => new URL(typeof image === 'string' ? image : image.src, row.source_url).href);
  if (row.images.length !== expectedGallery.length || row.images.some((image, index) =>
    typeof image.src !== 'string' || !image.src.startsWith('https://') || image.src !== expectedGallery[index])) throw new Error('Gallery source mismatch');
  row.detail_provenance = {
    source_url: page.detail_url, observed_at: page.observed_at,
    response_sha256: page.sha256, snapshot: page.snapshot,
    robots_sha256: raw.robots_sha256, price_unit: manifest.price_unit
  };
}
if (rows.length !== manifest.products || rows.reduce((sum, row) => sum + row.variants.length, 0) !== manifest.variants) throw new Error('Manifest totals mismatch');
// Reconciliation is a read-only plan, never an authoritative database write.
// existingPath must be an exhaustive, recent export for Bonkers; stale/incomplete exports
// must be refreshed and all identity decisions rechecked transactionally before import.
const existing = JSON.parse(readFileSync(existingPath, 'utf8'));
if (!Array.isArray(existing)) throw new Error('Existing records must be a JSON array');
const byId = new Map(), byUrl = new Map();
for (const item of existing) {
  if (!item || typeof item.external_product_id !== 'string' || !/^\d+$/.test(item.external_product_id) ||
      typeof item.source_url !== 'string' || !/^https:\/\/www\.bonkerscorner\.com\/products\/[\w-]+$/.test(item.source_url) ||
      !/^\d+$/.test(String(item.staged_record_id ?? ''))) throw new Error('Invalid existing record identity');
  if (!byId.has(item.external_product_id)) byId.set(item.external_product_id, []);
  byId.get(item.external_product_id).push(item);
  if (!byUrl.has(item.source_url)) byUrl.set(item.source_url, new Set());
  byUrl.get(item.source_url).add(item.external_product_id);
}
const groups = new Map();
for (const row of rows) {
  if (!groups.has(row.external_product_id)) groups.set(row.external_product_id, []);
  groups.get(row.external_product_id).push(row);
}
const plan = [];
for (const [id, observations] of groups) {
  const previous = byId.get(id) || [];
  const conflicts = observations.flatMap(row => [...(byUrl.get(row.source_url) || [])]
    .filter(oldId => oldId !== id).map(oldId => ({source_url:row.source_url, existing_external_product_id:oldId})));
  const stagedIds = [...new Set(previous.map(item => String(item.staged_record_id)))];
  // Multiple pre-existing records for one ID require review; never select one arbitrarily.
  const action = conflicts.length || stagedIds.length > 1 ? 'review_identity_conflict' :
    previous.length ? 'link_existing' : 'insert_one_then_link';
  plan.push({ external_product_id:id, action, existing_staged_record_id:stagedIds.length===1 ? stagedIds[0] : null,
    conflicts, observations: observations.map(row => ({source_url:row.source_url,
      detail_provenance:row.detail_provenance, content_hash:row.content_hash, payload:row})) });
}
process.stdout.write(JSON.stringify({schema_version:1, mode:'read_only_plan',
  warning:'Recheck brand-scoped identities transactionally at import; this plan does not mutate the DB.',
  raw_started_at:raw.started_at, raw_finished_at:raw.finished_at, products:rows.length,
  unique_merchant_ids:groups.size, entries:plan}));
