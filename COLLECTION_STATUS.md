# Collection status

## Later verified progress — 7 November 2026, 06:09 UTC

This is an interim snapshot, not a live counter. Supabase has 8,222 distinct detailed products in the private normalized catalogue, including 3,471 Bonkers products, and 59,844 variants. There are no published products. Separate staging runs refreshed the observed feeds for JNORSS, Genrage, WTFlex, Sagacity, Everdion, Hauntrex and Powerlook; they do not add that many distinct products. Their 27,050 timestamped variant observations are in the private `variant_source_observations` table, pending review; normalized prices and stock have not been refreshed by those staging imports. Burger Bae has a partial new refresh (220 rows), paused at the user's direction. Brand images remain source URL references; reuse rights remain under review.

All 3,468 URLs in the saved Bonkers product sitemap now match detailed staged products; the 3,471 total also retains three feed-only products. A 40-request network interruption was fully recovered and the imported batches were verified by merchant ID and content hash. This establishes coverage of the saved sitemap, not unindexed products or the current catalogue at every later time. The user has dropped Snitch from active collection; its earlier discovery records remain preserved.

The text evidence is pending review. Older `text-evidence-1` evidence contains known false positives and must not power search; `text-evidence-2` and `text-evidence-3` remain pending too. Version 3 separates explicit racing-print evidence from broad racing themes. Run `scripts/catalogue-quality.sql` against the authorized project for a current distinct-product report.

## Historical baseline — earlier on 7 November 2026

The following section records the earlier snapshot and is not the current database status.

Last verified: 2026-11-07 IST. The private Supabase catalogue holds 4,781 staged product records across the ten registered brands. Each staged product payload keeps its source variants and image references nested with the product. No staged rows were deleted or trimmed during balancing or page verification.

| Brand | Products staged | Variants | Image references | Feed result |
|---|---:|---:|---:|---|
| Bonkers Corner | 30 | 180 | 146 | One permitted batch only; query pagination is disallowed, so partial |
| Burger Bae | 1,114 | 12,580 | 7,933 | Feed reached a short page; feed scope only |
| Everdion | 481 | 4,900 | 4,563 | Feed reached a short page; feed scope only |
| Genrage | 230 | 1,066 | 1,475 | Feed reached a short page; feed scope only |
| Hauntrex | 257 | 1,648 | 1,173 | Feed reached a short page; feed scope only |
| JNORSS | 161 | 902 | 1,100 | Feed reached a short page; feed scope only |
| Powerlook | 2,038 | 15,750 | 12,095 | Feed reached a short page; feed scope only |
| Sagacity | 62 | 312 | 701 | Feed reached a short page; feed scope only |
| Snitch | 0 | 0 | 0 | Bulk endpoint returned HTML; no bulk records staged |
| WTFlex | 408 | 2,472 | 3,193 | Feed reached a short page; feed scope only |
| **Total** | **4,781** | **39,810** | **32,379** | |

Eight feeds reached a short final page. That only means the public feed pagination ended; it does not prove the feed contains every item the store sells. Every import remains `review_required` because source terms and media reuse permission are unresolved. Bonkers remains partial; Snitch remains blocked for bulk collection.

## Data available

The product feeds provide merchant IDs, titles, readable descriptions, original product types and tags, source options, sizes and colors when supplied, exact INR prices and compare-at prices, availability, source update times, and image URLs/alt text/variant links. Image URLs are references only: images were not downloaded or uploaded to ImageKit.

The public `products` table still has zero rows and zero published products. All 4,781 feed records remain private in `staged_catalogue_records`. Ten additional rendered-page observations (one per brand) are in `staged_product_page_observations`, all `pending`; the Snitch observation is browser-only and has no invented product ID. Neither table is exposed to public clients.

## Known source-field gaps

Missing values are kept unknown. They are not filled by guessing from neighboring products.

| Brand | Missing source values |
|---|---|
| Bonkers Corner | Product type and variant color absent for all 180 variants |
| Burger Bae | 88 descriptions, 293 product types, 183 sizes, 448 colors, 46 image sets |
| Everdion | 26 sizes and 468 colors |
| Genrage | 37 product types, 37 sizes, 1,066 colors |
| Hauntrex | 420 descriptions, all 1,648 product types, 480 colors |
| JNORSS | 66 product types, 890 colors |
| Powerlook | 104 descriptions, 17 sizes, 257 colors |
| Sagacity | 1 description, 11 product types, 6 sizes, 311 colors |
| WTFlex | 6 descriptions, 18 sizes |
| Snitch | No bulk feed records |

The balanced review sample is 30 products per feed-backed brand (270 total). It is a separate QA sample; it did not change the full staging tables or their brand counts.

## Readiness

The data is useful for text matching on names, descriptions, tags, and original categories, plus price, size, color, stock, and image-reference filtering where the source supplied those fields. Fit, material, GSM, print method, policy, delivery, and licensing details are not complete across all products. The ten browser observations are evidence samples, not full-store policy verification. Do not publish recommendations until records and source use are reviewed.

## Additional sitemap discoveries

On 2026-11-07, the advertised and robots-allowed product sitemaps were collected and imported into the private `staged_product_discoveries` table. Bonkers has 3,468 distinct product URLs, of which 27 match existing staged product URLs. Snitch has 9,995 distinct product URLs; its bulk product feed remains unavailable. These are candidate listings with title, source URL, image URL and source update time. They have no verified price, variants, availability or full product details and must not be counted as fully staged products. All candidates are pending review. Raw compressed sitemap snapshots are in ignored `data/catalogue/sitemap-discovery/`. No existing staging rows were deleted.

## Bonkers detail collection checkpoint

The historical table above describes the original feed run. A separate detail run was verified in Supabase with 87 additional products and 558 variants. At that verification, Bonkers had 117 distinct detailed products and 738 variants. The full staging table held 4,868 records. Bonkers covered 114 of its 3,468 sitemap URLs, with three detailed feed products absent from that sitemap snapshot.

A second collection produced 99 validated products, 617 variants and 720 gallery entries across a varied request ordering. It used 100 requests including robots and recorded zero collection errors. Its import was interrupted, and its final DB count requires reconciliation. Its stable run ID is `14c700dc-3e16-5028-8f69-ba6bb4d0d534`. Its saved manifest is `data/catalogue/bonkers-detail-2026-11-07T04-18-05-970Z-cf11e12e/validated/manifest.json`. Replay its idempotent setup/chunks/finish SQL and verify the exact IDs before creating an import-verified marker or starting further collection.

The collector preserves merchant tags for audience evidence. In the first 87 detail products, 59 carried the exact Women tag, 30 carried Men and two carried both. Product-type fields were blank. Category/audience hints used for request ordering require separate source evidence before becoming shopper filters.

On the latest continuation, the plugin manager reported Supabase installed and enabled, while its SQL tools were unavailable. Current counts after the interrupted second import remain unverified. The collector now blocks new requests until that completed local batch is reconciled, and retains persistent access/rate-limit restrictions across runs.

### Recovery verified on 7 November 2026

The Supabase connection was restored and the second import was replayed idempotently. All 99 product IDs match the validated manifest, with 617 variants. Its import verification marker is saved locally. Bonkers now has 216 distinct detailed products and 1,355 variants across its feed and detail runs. These cover 213 of 3,468 saved sitemap URLs, leaving 3,255 sitemap candidates awaiting detail collection. The global staged product count is 4,967 and the published count is zero. The preceding interrupted-import paragraph describes the historical connection state.
