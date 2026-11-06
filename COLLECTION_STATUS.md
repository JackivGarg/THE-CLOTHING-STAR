# Collection status

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
