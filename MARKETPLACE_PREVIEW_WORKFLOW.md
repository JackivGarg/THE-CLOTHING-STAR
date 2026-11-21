# Marketplace preview and release checks

This branch adds private pilots and checks for Steps 3–6 of the [backend plan](BACKEND_COMPLETION_PLAN.md). Use the reviewed data branch for verified sections, accepted offers and shared Supabase changes.

## Text search and validation

Start the local API with `npm run server`. It uses `data/catalogue/local-preview.json` in development when available. The `CATALOGUE_PREVIEW_PATH` environment variable can point to a separate saved snapshot. Then run `npx tsx scripts/check-marketplace-preview.ts http://127.0.0.1:3001`. The command checks all nine brand routes through search filters, 20 categories, ten shopper queries and pagination. It checks retrieval and constraints. The plan's shopper relevance ratings and hosted parity checks are still required for release.

Search builds its index from names, descriptions and optional `search_tags`, `collection_labels` and `accepted_search_terms`. To support material, a product may carry `composition: {materials:["cotton"]}` when the evidence applies to all its variants. Variant composition overrides product composition. Only verified complete composition can set `complete:true` and support exclusions. The current reviewed export has no accepted composition. An exact SKU requires a variant's recorded `source_sku`.

### Reviewed catalogue and offer integration

Run [the read-only export](scripts/export-marketplace-reviews.sql) as a privileged Supabase operator and save the single `snapshot` value as `data/marketplace-reviews.json`. Restart the local API. Set `CATALOGUE_REVIEW_PATH` to use a different local file. The snapshot overlays offers by exact merchant product and variant identity and adds reviewed styles missing from the older private snapshot. Collection membership adds a search label. Category and audience still use product-level evidence. The API status reports how many variants and products it matched and when the review export was taken.

Hosted search can use the same search engine with the active published catalogue when `SUPABASE_SECRET_KEY` or the legacy `SUPABASE_SERVICE_ROLE_KEY` is configured on the backend. The server loads an indexed snapshot for 30 seconds. The database projection requires the server role, restricts output to products approved for publication, and uses approved public images. With only the publishable key configured, the server continues to use the earlier public search RPC.

On 21 November 2026 the private preview applied 34 reviewed variants and section labels on 318 products. The JNORSS Metallica Electric Thrash Omen hoodie in L returned ₹1,499 with its reviewed check time and unknown fulfilment. The newly reviewed unavailable Thorn Vein XL no longer matched. The Bonkers Signature Heavyweight hoodie in M matched the ₹1,799 price rather than the older ₹1,599 value. Search cards and comparison use the same selected variant and offer check label. The hosted view contained zero published rows at verification.

## Private photo pilot

Use Python with Pillow, NumPy and ONNX Runtime, plus the pinned model from the [benchmark](BACKEND_COMPLETION_PLAN.md#4-add-photo-search-without-a-paid-inference-service). Store inputs and derived files under the ignored `data/` directory. The manifest has an `assets` array. An approved entry uses this shape.

```json
{
  "assetId": "front-black",
  "file": "black-front.jpg",
  "productId": "valid-product-id",
  "variantIds": ["valid-black-m-variant-id"],
  "embeddingUse": "approved",
  "approvalRef": "your documented permission or source record",
  "sha256": "sha256 of the approved photo bytes"
}
```

Run the following from the repository, substituting local paths. Structured filters use the same fields as the search API, with prices in paise. Set `priceMode` to `item` when using a budget. A manually cropped photo is a good input for the query.

```powershell
npx tsx scripts/photo-eligible-variants.ts data/catalogue/local-preview.json data/filters.json |
  Set-Content -Encoding utf8 data/eligible.json
python scripts/photo-search-pilot.py --model data/vision_model_quantized.onnx index data/assets.json data/gallery.npz
python scripts/photo-search-pilot.py --model data/vision_model_quantized.onnx query data/assets.json data/gallery.npz data/reference.jpg data/eligible.json
```

The CLI matches exact product/variant associations and returns recorded item prices. A permission change invalidates the manifest revision and requires a rebuild. Use a consistent view budget per style. Benchmark on permitted real garment photos before exposing a public upload.

## Weekly history

Prepare immutable files with `npx tsx scripts/prepare-weekly-snapshot.ts data/reviewed-scope.json data/week.json`. The input includes a Monday `weekStart`, a stable `scopeKey` such as `brand/hoodie/membership-policy-v1`, `methodVersion`, the review decision `accepted`, `inScope` variant identities with `active` flags, and `observations` in the weekly variant shape plus `reviewStatus`. The complete reviewed inventory defines the denominator. Variants with missed checks remain in scope with unknown prices. The command uses only accepted observations in the Monday–Wednesday observation window and refuses to overwrite a saved week.

Use the existing `npm run report:weekly -- data/previous.json data/current.json category` command once there are two reviewed files. The scheduler, live offer inputs, and public results depend on the accepted data and operations work. Synthetic comparisons verify the pipeline without making claims about real merchant trends.
