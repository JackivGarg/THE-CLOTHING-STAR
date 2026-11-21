# Catalogue refresh · 18 November 2026

The existing Supabase project `cvziesdqhxhahiqladlg` was restored. The baseline was 8,222 private products and 59,844 variants. After the refresh it contained 8,325 products and 60,549 variants. No products had been published. The database reported 179 MB after the imports.

All following counts are for the observed public Shopify feed. A short final page establishes the end of that feed walk. The counts do not establish the entire merchant catalogue. Each run remains `review_required`.

| Brand | Run ID | Staged products | Nested variants and pending observations | Requests |
| --- | --- | ---: | ---: | ---: |
| JNORSS | `b19ff5df-32d8-41f2-a8b3-baeee2c1bfc0` | 166 | 932 | 2 |
| WTFlex | `9ec83077-8559-4073-a6d7-e663306109fd` | 409 | 2,473 | 3 |
| Sagacity | `652c3fba-7ba6-4fd6-a906-c1611ca956e6` | 62 | 312 | 2 |
| Everdion | `38f26510-4c61-4d4d-ba33-0f9d81a9dddf` | 480 | 4,731 | 3 |
| Hauntrex | `37f5bfdd-2a1d-44eb-83d6-3e74efc8eb0d` | 257 | 1,648 | 3 |
| Powerlook | `ec8dcafa-38b9-4589-91fe-a10620c73fff` | 2,105 | 16,277 | 10 |
| Burger Bae | `ac9631e6-3b1a-473b-9fde-4bf68abce465` | 1,141 | 12,625 | 6 |

The seven runs added 38,998 dated observations to `public.variant_source_observations`. Every observation is pending review. A pending source stock flag does not establish a ready-to-ship offer.

The insert-only normalization added 103 products and 689 variants associated with those newly created products. Sixteen additional Everdion variants were inserted for already-known products after checking source identities and mapping the complete run. Existing normalized variants and product records were retained. Existing items absent from a new feed were retained. In particular, WTFlex had two new product IDs and one previously known ID absent from the new feed. Burger Bae had 28 new IDs and one previously known ID absent.

Each run has an ignored local directory under `data/catalogue/<brand>-refresh/<timestamp>-<run-id>`. Its manifest records the robots hash, exact source pages and response hashes. The import subdirectory contains the exact SQL batch list. Staged product payloads and variants can be inspected in `public.staged_catalogue_records.payload`, and the corresponding variant observations in `public.variant_source_observations`. The companion SQL scripts in this repository are scoped to these exact run IDs and preserve existing rows.

JNORSS's captured hoodie and tee prices were checked against their storefront pages. These checks cover samples. Price, option mapping, source permissions, category and audience evidence still require broader review before publication.

Bonkers detail refresh was attempted twice after observing the stated 60-second cooldown. Each attempt stopped at the first product request with HTTP 429. No Bonkers data was refreshed. The saved local run manifests retain the response status and retry period. Genrage's robots request failed twice and a DNS lookup timed out, leaving that brand's refresh incomplete. Snitch remains outside the active scope.

The user deferred the separate database backup and restore test. Scheduling weekly collection, reviewing observations, classifying all products, approving media and publishing the catalogue remain unfinished. One real refresh does not establish a week-over-week price change.

## Classification progress

The private preview can be reviewed with `node scripts/review-preview-colours.mjs`. The command emits JSON with each candidate's original label, excerpt, merchant URL, observation time and variant count. On the 18 November preview it identifies 3,169 Bonkers products with an explicit product-colour label and size-only options, covering 18,639 variants. These are candidates for source review. The command does not change the database or grant them filter eligibility. Component colours, conflicting descriptions and size semantics still need review.

The read-only `scripts/report-offer-discrepancies.sql` compares each normalized variant with its latest recorded source observation and returns the original identity, offer fields, review status and run links for review. Executed against the existing project on 18 November, it returned 1,947 differing variants across seven brands. This includes seven Genrage variants from its older observation and therefore covers a wider period than the 1,940 differences in that day's seven refreshes. These observations remain pending.

Three previously unknown JNORSS products were classified from individually checked product text. Another 65 explicit co-ord sets and 89 explicitly named Bonkers caps were classified using narrow title rules. The merchant-type mapping then classified 41 Everdion trousers, 40 Everdion co-ord sets, 19 WTFlex caps and five Powerlook bags. Each update applies only to an unknown category and records accepted evidence with its rule version. Existing classifications remain in place.

The local preview uses the same reviewed Everdion, WTFlex and Powerlook type mappings. It additionally extracts explicit garment-fit evidence for private preview search. The hosted search reads normalized fit values and has not yet been connected to those preview fit projections.

## Follow-up on 21 November 2026

Bonkers staging supplied 20,214 historical offer observations. The backfill matched them to the exact normalized variants and saved them with the original 7 November India timestamps and run references. A second execution inserted zero rows. Supabase now has 86,262 private observations, with zero accepted offers and zero published products.

All 1,947 report discrepancies match their exact retained staging values, timestamps and identities. This verifies transfer integrity. Independent offer review and publication are pending.

The private preview uses the explicit Bonkers garment colour field for 2,473 single-garment styles and 14,957 size-only variants. The rule excludes sets, ambiguous descriptions and products with a colour option. A black Bonkers hoodie in M under ₹1,500 returns four last-seen matches. A separate brand catalogue view includes the unavailable styles and offers a direct path to the existing shopping filters. Comparison distinguishes variants of the same style.

Automated section requests to JNORSS and WTFlex returned HTTP 429. No new section memberships were imported. The live review of the JNORSS Hoodies section showed 35 listed items and does not establish an audience label. [Merchant hoodies section](https://www.jnorss.in/collections/hoodies)
