# Catalogue collection and publication

## Adapter strategy

Start from brand-registry.json. Read current robots rules, source terms and access notes before each new integration. Use an honest collector identity. Use a maintained parser supporting agent groups, wildcard paths and precedence; a regex searching for any "Disallow: /" was the source of an earlier incorrect Bonkers conclusion.

Preferred order: approved partner feed/API -> permitted public structured product feed -> permitted public product-page structured data -> bounded rendered-page/browser inspection -> manual record with source evidence. Do not treat a failed public endpoint as permission to search for private tokens or defeat restrictions.

For browser work the user explicitly requested Codex's in-app browser. Follow its skill, inspect the current page, use currently advertised read-only catalogue actions when they cover the operation, and ground clicks/URLs in observed UI. Tool IDs can change between snapshots. Do not add products to carts or proceed through checkout. Saving visible data is not a transaction.

## Historical source results and limits

- Six original stores returned end-of-feed data through /products.json during the earlier audit: JNORSS, WTFlex, Hauntrex, Sagacity, Genrage, Everdion.
- Bonkers returned structured sample data. Its general robots rules restrict page query URLs for non-Google bots. A later bounded browser catalogue action returned two different 30-product batches. The second action did not visibly advance the URL; this does not establish unattended full-catalogue permission or completeness. Review the supported access route before bulk ingestion.
- Snitch's simple /products.json request returned HTML. Its browser-rendered site exposed a real product's images, price, colour, sizes, description and return text. This is a rendered adapter candidate, not a completed bulk importer.
- Burger Bae and Powerlook returned one-product feed samples on 2026-11-07. No complete-feed or variant-accuracy audit was done for them.

## Collector pipeline

1. Create an import_run with explicit source, scope and adapter version. Acquire the Postgres lease/fencing token for store + scope.
2. Check current access/robots configuration. Scope can be whole permitted feed, selected collections or manually listed products. Record which one.
3. Request pages sequentially per store with conservative pacing (proposed 1 request/second/domain), small cross-store concurrency (2–3) and a finite cap (proposed 100 requests/store/run). Respect stricter source rules. A cap reached means PARTIAL, not complete.
4. Record compressed raw public responses locally with request URL, response status, fetched time and content hash. Exclude session headers/cookies/secrets. Enforce response size/time bounds.
5. Parse product/variant/image records. Resolve relative URLs only against the approved origin. Store platform IDs without numeric precision loss.
6. Normalise units, sizes, colours, categories, descriptions, statuses and evidence. Keep source labels. Exclude gift cards, service/refund SKUs and non-merchandise from apparel results.
7. Stage deltas. Validate same product/store relationships, duplicates, missing IDs, currency, impossible prices and variation mappings.
8. Review anomalies. A proposed >30% unexpected count drop or widespread zero-price/currency changes blocks automatic disappearance/removal handling and requires investigation. An anomaly is not permission to rewrite the source.
9. Publish accepted deltas and a new catalogue revision atomically. Emit outbox invalidation. Mark truthful run coverage and checked times.
10. Release lease; retain cursor/error for a partial run. Retry only bounded transient failures, with backoff and jitter; honour Retry-After for 429.

If the source returns identical pages repeatedly, stop and mark pagination unreliable. Detect duplicates by store + external ID. Do not equate "HTTP 200" with success: inspect JSON shape and error/loader pages. Reach end by an empty/short valid page or a documented cursor end, not a timed-out request.

## Normalisation rules

- Price source units are adapter metadata. Shopify feed decimal rupees and browser catalogue integer paise must use distinct converters.
- Source option names include Size, Sizes, SIze, SIZE, Color, color, Top Size and Bottom Size. Normalise names but preserve originals. A co-ord with top and bottom sizes cannot be reduced to a single M without losing information.
- Colour is variant/product evidence, not a global description substring. Inherit product colour only when the product genuinely has one colour and the source supports it.
- Fit terms remain distinct. "Boxy" is not a measurement and is not a guaranteed oversized fit on every person.
- Parse material percentage text conservatively. "100% Terry Cotton" may be missed by a simple percentage regex; improve parsing with fixtures, not fabricated defaults.
- Store source updated_at separately from observation time. Neither is a guarantee the merchant checked stock.
- Flatten product descriptions to readable text and remove all active content. Nonempty HTML can still have no readable description.
- Maintain prelaunch status even when source available=true. Do not show preorders as ready stock.
- Collection names only contribute when membership is actually established. Global menus are not memberships.

## Updates and absence

Proposed pilot cadence: manually initiated full permitted refresh once/day while developing; optional approved local schedule later. Prioritise frequently viewed products for detail checks if supported. Policy reviews weekly and when a change is detected; promotions need their actual start/end dates and eligibility. These are targets, not an active schedule.

On partial imports, update seen valid records only. On two successful comparable complete runs in which a record is absent, mark not_seen/withdrawn with evidence; do not hard-delete it. A collection-only run cannot withdraw a product from another collection. Preserve old checked times on records not observed.

## Freshness policy proposed for the pilot

- Price/stock <=24 hours: "Checked [time]"; still not live guaranteed.
- 24–72 hours: stale indicator and best-effort recheck on compare if a safe approved source exists.
- >72 hours or failed validation: exclude from strict availability results; optional unverified group may include it.
- Policies older than 7 days: show date/review status; strict return filters require a non-conflicting reviewed applicable rule. Adjust actual TTLs using merchant change frequency and pilot evidence.

Public read-only search never initiates unrestricted crawling. A user can request a bounded recheck only for an existing product ID, with debounce/rate limits and failure labels. All automated refreshes use the same source rules as normal imports.

## What is not extracted reliably

Exact inventory quantities, delivery guarantees, checkout-only discounts, pincode fees, garment measurements absent from source, actual softness/durability, authenticity/licensing and independent review quality. Represent these as unknown or separately sourced. Do not promise returns/stock from old cached policy text.
