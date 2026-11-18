# Nine-brand catalogue progress and next steps

Checked 18 November 2026, Asia/Kolkata. The live database was Supabase project `cvziesdqhxhahiqladlg`. The shopper checks used the running localhost API and its private preview. This is a planning checkpoint for the existing nine brands.

**Decision for the next build.** Use the catalogue we have. First make its existing products findable by department, garment and variant, and give search a reviewed source for price and stock. Collect additional pages where a dated comparison identifies a missing product, a missing merchant section or an offer that needs checking. Start with Bonkers Corner, JNORSS and WTFlex, then apply the same process across the nine brands.

## What is in the catalogue

| Check | Result on 18 November |
| --- | --- |
| Captured product records → distinct catalogue identities | 16,699 staged records resolve to 8,325 brand/product IDs and 60,549 brand/product/variant IDs. Every distinct ID in staging maps to a normalized row and every normalized ID maps back. Repeat captures preserve history. |
| Database → local preview | The complete sorted product and variant identity sets matched by SHA-256. The local preview includes all 8,325 products and 60,549 variants. |
| Seven feeds refreshed on 18 November | All 4,620 merchant product IDs and 38,998 variant IDs map to the correct database parents. The preview also matches all 38,998 recorded price and availability pairs. The runs reached the ends of their observed feeds and still require review. Four previously known products were retained outside those feeds. |
| Saved discovery URLs | All 3,468 saved Bonkers product URLs match normalized products by exact source URL. Three additional Bonkers products are retained. The other 9,995 discovery URLs belong to dropped Snitch. |
| Customer access | The private preview is running. Supabase has 0 published products and its public catalogue returns 0 rows. |
| Historical evidence | 345 staged page observations, 91,849 attribute evidence rows and 66,048 variant offer observations. Of the attribute rows, 262 are accepted category evidence. All offer observations are pending. |
| Sections, delivery and photos | 0 collections, 0 product-to-collection memberships, 0 store policy observations. There are 56,302 gallery references, all with unknown public-use status. Seven products have no gallery reference. |

**The current sitewide denominator is unknown.** The counts above establish exact coverage of the saved identities and seven captured feeds. The earlier 16 November investigation reported 114 unmatched sitemap URLs at that time. Those need a fresh identity comparison before using them as a work queue. Subtracting recently added products from 114 would mix dates and identity types. This planning pass did not crawl merchant sites.

## What each brand needs

“Category missing” counts products in the normalized database. “Audience missing” counts products for which the running preview cannot establish Men, Women or Unisex. “Colour missing” counts variants in the normalized database. These columns describe different fields and must not be added together.

| Brand | Products | Variants | Category missing | Audience missing | Colour missing | Next work |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Bonkers Corner | 3,471 | 20,214 | 608 | 21 | 20,214 | Validate saved garment colours against size-only listings, then map actual department sections. The latest detail refresh stopped at HTTP 429. |
| JNORSS | 166 | 932 | 0 | 166 | 920 | All 166 products matched the latest feed. Verify department and garment colour, then validate offer changes for each size. |
| WTFlex | 410 | 2,479 | 23 | 380 | 0 | 409 products appeared in the latest feed. Map men's and women's sections, especially denim. Preserve independent top and bottom sizes for sets. |
| Genrage | 230 | 1,066 | 58 | 230 | 1,066 | Replay saved product evidence. The latest refresh stopped at DNS timeouts. At the next permitted check, separate hoodies from jackets in mixed sections and preserve prelaunch status. |
| Everdion | 482 | 4,921 | 124 | 12 | 468 | 480 products appeared in the latest feed. Split mixed sections using product-specific types and resolve colour where supported. |
| Hauntrex | 257 | 1,648 | 7 | 206 | 480 | All 257 matched the latest feed. Prioritise department and garment evidence. 79 descriptions and 1,316 merchant SKUs are missing. Keep absent SKUs unknown. |
| Sagacity | 62 | 312 | 19 | 62 | 311 | All 62 matched the latest feed. Review the small catalogue product by product, including accessories listed alongside clothing. |
| Powerlook | 2,105 | 16,277 | 188 | 2,104 | 258 | All 2,105 matched the latest feed. Verify department from the merchant and reconcile its 1,352 changed availability flags. |
| Burger Bae | 1,142 | 12,700 | 188 | 412 | 488 | 1,141 products appeared in the latest feed. Maintain routine coverage and resolve cross-listed products. Lower priority for manual work. |
| **Total** | **8,325** | **60,549** | **1,215** | **3,593** | **24,205** | Across all brands, 120 products lack descriptions and 327 variants lack size. |

In preview, 981 products have unknown category and 4,512 have extracted fit evidence. In Supabase, 1,215 products have unknown category and zero have a populated normalized fit or theme. The same identities can give different filter results depending on which data the search reads. Snitch has zero normalized products, although its brand row still has `active = true`. Align the active-brand list with the nine-brand decision and preserve its discovery history.

## What a shopper can do today

Search, size and price filters, comparison of up to three products, device-local favourites, saved variants and merchant links exist. The default unfiltered search returns 5,861 of the 8,325 products. Its eligibility rule requires a variant with a usable price and a positive saved availability flag. The other 2,464 products remain in the database.

| Search sent to the local API | Result |
| --- | --- |
| `thunder` in ordinary search | 12 products. The first result was “Thunder It Girl Baby tee for Women.” An ordinary design word is now accepted. |
| `black thunder hoodie` | 0. One classified hoodie contains “thunder” or “lightning” in its title or description. The JNORSS Metallica hoodie mentions lightning, has no verified garment colour, and its latest feed marks all four sizes unavailable. Its older normalized row still marks L available. |
| Men's black hoodie, size M, up to ₹1,500 item price | 8 last-seen matches across all pages. Zero confirmed offers. |
| Women's jeans, size 28 | 9 last-seen matches across all pages. Zero confirmed offers. |
| JNORSS men's hoodies | 0. The preview has 33 JNORSS hoodies and no known audience for any of them. |

Across the three pilot brands, **0 of 266 classified hoodies** combine a known audience with even one variant having a size, garment colour, positive saved price and a positive saved stock flag. Across all nine brands, **104 of 538** pass that same loose check. A real customer's requirements for a particular colour, size, price or recent stock check narrow it further.

**Two improvements can use evidence already saved in the catalogue.**

1. **Recover garment colour carefully.** Bonkers has pending product-colour evidence on 3,185 products. Of those, 3,169 have a single recorded product colour and only a Size option on every variant, covering 18,639 variants. Review source excerpts for the garment itself and conflicts, test several categories, and retain product-level scope and provenance for any approved colour used in search. Artwork colour, multi-colour choices and ambiguous descriptions require separate handling.
2. **Give search one source for the latest reviewed offer.** Comparing the 38,998 recent observations with `public.variants` found 135 differences in item price and 1,819 in availability. There are 1,940 distinct affected variants because some differ in both. No current offer is accepted. Bonkers has zero rows in `variant_source_observations`, although staging contains a dated, priced INR stock flag for all 20,214 of its variants. Those records can seed historical observations with their original dates. The hosted search function currently returns an empty confirmed group even if eligible data were published.

## Implementation order after approval

| Order | Work | How we will know it worked |
| --- | --- | --- |
| **1. Reconcile the inventory and latest offers** | Keep the existing product and variant IDs. Create one coverage report per brand and source with date, scope, encountered IDs, duplicates or redirects, retained older items and unresolved IDs. Reconcile permitted full-price and sale navigation, product feeds and sitemaps. Replay saved observations before requesting individual pages. Review the seven refreshed feeds, resolve offer changes, and read the latest accepted price and stock for each exact variant. | Every encountered ID has a disposition. Replaying an unchanged run adds zero duplicate products, variants or observations. All 1,940 differences have a traceable outcome. A retry or failed source preserves the last accepted state. |
| **2. Make departments and garments usable** | Pilot Bonkers, JNORSS and WTFlex across hoodies, sweatshirts, tees and jeans. Record the actual section grid, original label, product ID, source URL, run and checked time. Link a product to every department where observed. Explicit Unisex is its own label. Use product-specific evidence to split mixed sections. Review the Bonkers colour candidates and preserve original size/colour and co-ord options. Repeat for all observed categories, including trousers, shirts, knits and accessories, across the other six brands. | Each brand has a dated section coverage report, with a visible reason for incomplete sections. Show the before/after number of products matching audience plus size, colour and budget on the same variant. Report unknowns separately. A known merchant omission can stay unknown. |
| **3. Make the whole catalogue useful to shoppers** | Provide a clear brand-level “All catalogued styles” view that can show last-seen and unavailable designs. Keep strict shopping results tied to a qualifying variant. Label exact and related design matches, show why a filter excludes an item, and let the shopper choose any relaxation. Use the same reviewed category, fit, audience and offer logic for preview, hosted search, facets and compare. Carry the exact variant to the merchant where supported. | On the same private test catalogue, preview and hosted search agree on eligible IDs, selected variants and prices. Use the agreed 30-query set with at least 10 held out. Require zero hard-filter or stock-promise violations. Eligible exact names rank first. Where three relevant choices exist, at least three of the first five are relevant for 80% of those queries. |
| **4. Start weekly tracking and release reviewed coverage** | Save a versioned weekly snapshot per permitted brand scope. Show listed markdowns, actual week-over-week selling-price changes and new arrivals separately. Keep the latest price and stock check for shopping on its own clock. Enable public rows and images only for approved uses. Review applicable shipping rules before offering a delivered-price promise. | For weekly headlines, compare two consecutive accepted weeks on the same products and variants, with at least 80% comparable coverage, 30 paired products per brand or 10 per category under the existing method. For a ready offer, require explicit fulfilment and price/stock checks within 72 hours. Show coverage and dates beside each claim. |

The first customer milestone is a Bonkers, JNORSS and WTFlex finder that can explain a matching garment, show the exact size and price, and distinguish last-seen from verified availability. The Bonkers colour replay and the JNORSS/WTFlex section checks can proceed in parallel. Other brands keep their existing data throughout. The archive and brand pages give value even when a shopper's exact size is unavailable.

The database reported 179 MB against our 250 MB pilot target. Use the existing Postgres tables and versioned source mappings. Measure weekly storage growth before enabling recurring collection across all nine. Keep the timestamps and run membership needed to reconstruct each accepted week, even when a price stays constant. The weekly calculation already exists. Scheduling, two accepted comparable weeks and live brand reports are still ahead. Photo similarity, more brands and affiliate tracking can use the same identities once the text and variant path works. The separate backup and restore exercise remains deferred.

## Evidence and checks

- Read-only SQL against the live product, variant, staging, discovery, evidence, observation, image, collection and policy tables and the deployed search function. Product and variant keys matched in both directions. SHA-256 checks independently compared ordered identities and the seven feeds' priced stock flags against the local preview.
- Replayed shopper requests through the running HTTP API. All 84 repository tests passed and TypeScript passed with no emit. Today's shopper examples are API results. Current stock on a merchant checkout and every live merchant URL were outside this planning check.
- The previous refresh report lists the seven run IDs and source limits. The search and weekly calculation files show the current eligibility and comparison rules. [Refresh evidence](DATA_REFRESH_2026-11-18.md) · [Search](server/search.ts) · [Weekly price calculation](server/weekly-prices.ts)
