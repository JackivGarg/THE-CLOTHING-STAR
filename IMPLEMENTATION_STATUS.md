# Implementation status

## Website update — 7 November 2026

The current catalogue totals and source limits are in COLLECTION_STATUS.md; the older snapshot below is historical. The frontend uses the supplied video as a design reference only. Weekly brand tracking is a future feature and has no fabricated charts or price changes.

Build the local data file with `node scripts/build-local-catalogue.mjs`, then start the API and frontend together with `npm start` and open http://127.0.0.1:5173. The local preview serves 8,222 products / 59,844 variants from saved source observations on this machine; it does not publish Supabase records. Source observations are not guarantees of current merchant price or stock. The user authorized source product photos for the website; 8,216 products have HTTPS image references. No photos were uploaded to an image hosting service.

## Historical implementation snapshot

Last verified: 2026-11-07 IST. The local app is an early text-search prototype; its public demo is not yet backed by the collected records.

## Completed

- Separate Supabase project `cvziesdqhxhahiqladlg` created for this build; migrations applied through `staged_product_page_observations`.
- Ten brand records and ten source configurations exist in Supabase.
- Public-feed collection and compressed local snapshots are implemented for permitted Shopify product feeds. Current staging contains 4,781 product records, 39,810 variants, and 32,379 distinct source image URLs across nine brands. Bonkers has only a 30-product partial sample; Snitch bulk collection is blocked because its endpoint returns HTML.
- The 4,781 source records remain in private `staged_catalogue_records`. A balanced 270-product QA sample was created separately; it did not reduce or delete the full staging data.
- Sitemap discovery added 3,468 Bonkers and 9,995 Snitch URL/title/image candidates to private `staged_product_discoveries`; 27 Bonkers URLs overlap existing staged products. These candidates lack verified price, stock, and variants and are not published products.
- Ten rendered-page observations, one per brand, were appended to the separate private `staged_product_page_observations` table. All are pending review. Snitch's manual example has no fabricated external product ID.
- RLS is enabled with explicit deny policies on private tables. Public `products` remains empty; published product count is zero.
- Product images remain source URL references. No image files were downloaded or uploaded to ImageKit.
- Upstash Redis is not provisioned yet; the server must fall back to Supabase when cache settings are absent.

## Not ready for public recommendations

Source terms and product-media reuse permission have not been reviewed, and every import is still marked `review_required` or `blocked`. Raw source values are useful for text matching, but material, fit, GSM, print technique, stock freshness, delivery, and returns are not complete for every product. The browser observations are a one-product-per-brand QA sample, not complete policy coverage. The local frontend still needs real catalogue querying, filtering, product comparisons, image search, affiliate links, and a full acceptance review.

Keep collected data private until source use is approved and records are reviewed. Never publish a row just because the feed returned HTTP 200.

## Local setup and secrets

ImageKit credentials are held only in ignored `.env`; no ImageKit upload has been made. The private key was exposed in an earlier tool output and should be rotated before use. Keep private keys out of frontend code, screenshots, Git, and browser observations. The public API uses the publishable key and RLS; do not add a service-role key to the client.

See [COLLECTION_STATUS.md](COLLECTION_STATUS.md) and [COLLECTION_OPERATIONS.md](COLLECTION_OPERATIONS.md) for collection scope, counts, and repeatable commands.
