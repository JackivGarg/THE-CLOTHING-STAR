# Marketplace preview and release checks

This branch adds private pilots and checks for Steps 3–6 of the [backend plan](BACKEND_COMPLETION_PLAN.md). Use the reviewed data branch for verified sections, accepted offers and shared Supabase changes.

## Text search and validation

Start the local API with `npm run server`. It uses `data/catalogue/local-preview.json` in development when available. The `CATALOGUE_PREVIEW_PATH` environment variable can point to a separate saved snapshot. Then run `npx tsx scripts/check-marketplace-preview.ts http://127.0.0.1:3001`. The command checks all nine brand routes through search filters, 20 categories, ten shopper queries and pagination. It checks retrieval and constraints. The plan's shopper relevance ratings and hosted parity checks are still required for release.

The private search builds its index from names, descriptions and optional `search_tags`, `collection_labels` and `accepted_search_terms`. The importer should fill the latter two from reviewed data. To support material, a product may carry `composition: {materials:["cotton"]}` when the evidence applies to all its variants. Variant composition overrides product composition. Only verified complete composition can set `complete:true` and support exclusions. An exact SKU requires a variant's recorded `source_sku`. The hosted RPC still serves the previous supported field set. It rejects requests that would need unavailable material, exact SKU or colour-alternative fields.

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
