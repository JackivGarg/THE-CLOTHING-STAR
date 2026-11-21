# Data collection and affiliate rollout for 20 Gen Z brands

Checked 21 November 2026 IST. This plan is the data workstream for [backend publication](BACKEND_PUBLICATION_PLAN.md). The scope is 20 unique brands. Nine already have catalogue rows, ten are new to this database and Snitch returns for a fresh source review. Keep India, INR and the merchant checkout as the initial scope. Select the streetwear range within broad fashion stores and show the scope to shoppers.

## Current state and work order

Supabase has 8,327 styles and 60,561 variants. There are 654 verified section links across 646 styles and 34 reviewed variant offers across six styles. There are zero published styles. The prior release audit also found zero approved catalogue images, zero source configurations marked approved for content use and zero reviewed variants that qualified as ready to ship. A verified section link proves the product was in the observed grid. A reviewed offer has a separate check date and can still have unknown fulfilment.

| Existing brand | Styles | Styles linked to verified sections | Reviewed variants | Next collection job |
| --- | ---: | ---: | ---: | --- |
| Bonkers Corner | 3,471 | 18 | 6 | Resolve the two unmatched men's hoodie handles using retained evidence or a permitted source. Use the saved sitemap for product identity coverage. Get a permitted export for the remaining department pages; record the blocked scope until then. |
| Burger Bae | 1,142 | 330 | 0 | Replay the latest section checkpoint. Extend to other streetwear garment ranges and check mixed and independently sized sets. Review offers for a representative oversize and budget sample. |
| Everdion | 482 | 19 | 0 | Separate hoodies from jackets by product evidence inside mixed outerwear sections. Extend to co-ords and other advertised departments. |
| Genrage | 230 | 0 | 0 | Replay saved product and accessory evidence. Resume permitted sections after connectivity recovers. Verify jeans, hoodies, jackets, colour and launch status. |
| Hauntrex | 257 | 12 | 0 | Check hoodies and sweatshirts separately. Replay existing description/variant evidence and check audience claims when the merchant gives them. |
| JNORSS | 168 | 50 | 20 | Reconcile the resolved hoodie product IDs against a fresh section manifest. Extend past hoodies and tees. Review saved offer differences and verify any department label independently. |
| Powerlook | 2,105 | 166 | 8 | Resume the existing bottoms cursor and reconcile unmatched handles. Separate jeans, cargos and trousers. Extend to oversized shirts and tees. |
| Sagacity | 62 | 41 | 0 | Resume the all-products walk and reconcile hoodies, jackets and accessories in mixed grids. The small catalogue makes a full review practical when access is available. |
| WTFlex | 410 | 29 | 0 | Verify the remaining denim, outerwear and tee sections. Capture waist sizing, garment wash and independent top/bottom size choices for sets. |

Counts are a snapshot of stored evidence. The current merchant denominator must come from a dated scope walk or merchant export. Zero reviewed offers calls for offer validation even when a store has thousands of imported sizes.

## New and returning brand intake

Use the official India storefronts below as starting points for source validation. The suggested scope identifies good first departments to check. Expand to all streetwear sections agreed for each brand once the adapter is proven. Programme status is independent of catalogue access. Treat every unspecified commercial route as unverified.

| Cohort | Brand and official storefront | First scoped validation | Source or commercial decision |
| --- | --- | --- | --- |
| 1 | [Fugazee](https://www.fugazee.com/) | Oversized tees, cargos and denim. | Start with section membership and garment type. Seek an authorised feed and product-level affiliate route. |
| 1 | [Overlays](https://overlaysnow.com/collections/oversized-t-shirts) | Oversized tees, outerwear and joggers. | Test graphic versus solid tees, sizes and any stock exceptions. Ask for campaign terms and feed. |
| 1 | [Veirdo](https://veirdo.in/collections/oversized-t-shirts) | Men's graphic/oversized tees and streetwear topwear. | Extract product-specific fit and garment evidence. Confirm offer scope and a publisher route. |
| 1 | [Bluorng](https://bluorng.com/collections/hoodies) | Hoodies, oversized tees and other streetwear drops. | Check archived drops, launch date, preorder/made-to-order and variant availability. |
| 1 | [Valkyre](https://valkyreclothing.in/collections/jackets) | Painted jackets and statement tops. | Confirm whether customisation and lead times are item- or variant-level. Store painting and graphic themes only with source evidence. |
| 1 | [Urban Monkey](https://www.urbanmonkey.com/) | Caps, apparel and bags. | Distinguish adjustable, one-size and fitted products. The historical UpPromote programme is discontinued. Seek a replacement directly. |
| 2 | [Freakins](https://freakins.com/collections/all-products) | Baggy and wide-leg denim across advertised departments. | Parse waist/inseam, numeric sizing, stretch and colour/wash with source evidence. |
| 2 | [Off Duty](https://offduty.in/collections/all-denims-women) | Women's and men's denim, with cargos checked separately. | Reconcile waist size, wash, fit and rise. Compare with Freakins on the same evidence rules. |
| 2 | [The Indian Garage Co.](https://tigc.in/) | Oversized tops, cargos and denim. | Use the relevant brand and streetwear sections. Verify seller and brand identity on each item. |
| 3 | [The Souled Store](https://www.thesouledstore.com/men-topwear) | Indian-priced graphic/oversized tees and hoodies. | Check the India storefront and INR identity before ingesting. The Cuelinks listing is paused and lists deep links as forbidden. FlexOffers lists a separate campaign as active. Confirm India, web or app approval and product deep-link rules in the account. |
| 3 | [Snitch](https://www.snitch.com/) | Start with men's oversized tees and hoodies. | Preserve its historical discovery candidates. Validate current merchant identities and variants on an authorised route before any bulk import. Cuelinks is paused. The Creator Squad advertises paid creator tasks, so publisher purchase attribution needs separate confirmation. |

Cohort 1 follows the preferred aesthetic. Cohort 2 adds depth for denim searches. Cohort 3 handles the sources that need additional route and market checks. Open the affiliate review for all 20 in parallel. Move a brand forward when a working catalogue feed and trackable affiliate route are available. [Urban Monkey programme status](https://af.uppromote.com/urbanmonkey/register) · [Bonkers Cuelinks status](https://www.cuelinks.com/campaigns/bonkers-corner-affiliate-program) · [The Souled Store Cuelinks status](https://www.cuelinks.com/campaigns/the-souled-store-affiliate-program) · [The Souled Store FlexOffers listing](https://www.flexoffers.com/affiliate-programs/souled-store-in-affiliate-program/) · [Snitch Cuelinks status](https://www.cuelinks.com/campaigns/snitch-affiliate-program) · [Snitch Creator Squad](https://www.snitch.com/join-creator-squad)

## Reusable data job

1. **Map each source.** Give every brand one stable ID and a record of domains, market, currency, department/garment scope, allowed routes, terms, rate limits, and permitted uses of metadata, descriptions and images. Prefer a merchant-provided export or an affiliate feed whose terms cover this use. Assess any public collection and detail route independently. Shopify's API terms restrict systematic harvesting and commerce indexes, so a visible Shopify endpoint is insufficient evidence of permission for an ongoing catalogue. [Shopify API terms](https://www.shopify.com/legal/api-terms)
2. **Prove the adapter.** Take a bounded, stratified sample for each new source shape. Include sold-out and partially sold-out products, numeric and letter sizes, multi-colour items and sets wherever present. Check merchant detail against the exact product/variant identity, option labels, INR amounts, item URL, availability and timestamps. Classify price units by source. Approve the demonstrated parser scope before scaling.
3. **Walk sections and record the denominator.** Match product IDs and aliases across feeds, sitemaps and permitted section pages. Store the exact route, checked time, payload digest, page or cursor, last success and failed items. For each brand × section record advertised totals where supplied, observed unique IDs, resolved memberships and pending IDs. When the total is unknown, report the observed scope and end condition. A 429 or access restriction pauses that route and preserves its place. Request an authorised alternative when needed. Store every pre-existing product and observation.
4. **Import and verify.** Reuse the existing staging → evidence → reviewed catalogue pipeline. Postgres owns product IDs, exact variants, membership, accepted offers and history. Replaying an unchanged manifest must make zero duplicates. Keep failed stages resumable. Review differences before promoting an offer. Distinguish price, stock, preorder, fulfilment and check dates. Use the latest accepted observation for the same variant. A failed crawl leaves prior stock information dated.
5. **Refresh in priority order.** Schedule permitted refreshes for public offers based on staleness and traffic. Recheck popular products first within shared per-store limits. Under the existing plan, flag checks older than 24 hours and remove offers from the strict stock shortlist after 72 hours. Keep dated browsing available. Preserve current work cursors for other categories and use slower sweeps where sensible. Keep images as authorised references for the first text release. Record refresh cost and database growth before expanding cadence to all 20. [Existing collection workflow](COLLECTION_OPERATIONS.md)

### Filters customers can rely on

| Scope | Capture | Behaviour |
| --- | --- | --- |
| Store and product | Brand, title, link, merchant department evidence, garment type, verified section membership. | A product can appear in several sections. Cross-listing and an explicit unisex label are separate facts. |
| Colour, size and price | Exact variant ID, full original options, colour or wash, size system, waist/inseam, co-ord components, price and currency. | A request for women’s black jeans in waist 28 under ₹2,000 checks fit, size, colour and price on compatible evidence for that offer. A different colourway or cheaper size cannot qualify it. |
| Style and quality attributes | Explicit fit, material/composition, GSM, print technique, graphic subject, measurements and evidence provenance. | Strict filters apply only when the applicable product or variant has reviewed evidence. A racing shirt title can help text search when its meaning is uncertain. A strict racing-print filter requires product-specific print evidence. |
| Offer and policy | Reviewed price and stock checks, preorder and fulfilment, applicable shipping and return rules. | Show last-seen dates and unknowns. Display item price separately whenever delivery is unknown. Merchant policy alone is insufficient for category- or sale-specific return eligibility. |

### How we mark a brand's data work done

- The requested category scope is agreed and every category has a dated status. Use completed observed scope, partial, blocked, awaiting review or not offered with evidence. Count a blocked scope as unresolved.
- Reconcile every ID observed in completed scopes. Report the remaining IDs, missing fields, reviewed offer counts and dates per category. Preserve variation and history. Use named subscopes when only part of a brand can be verified.
- Every published result has a valid merchant link and exact variant facts for the filters it claims to satisfy. Test representative hard filters and correct empty results through the API. Enable filters where there is enough applicable data and show their coverage.
- Confirm that permission, refresh cadence and measured capacity support the release size. A full 20-brand claim requires usable coverage across all 20. An earlier pilot can expose its actual scope with a dated coverage report.

## Affiliate-only business model

Keep discovery, comparison and save/share on this platform. The merchant handles checkout, fulfilment and returns. Earn from confirmed affiliate conversions. Ordinary merchant links can preserve useful discovery for other brands, with zero projected commission. Commission rates stay outside organic ranking.

Run one commercial evidence record per merchant programme and region. Record the programme or contract, approved domain/app, permitted traffic channels, working product deep links, allowed use of redirects or coupons, attribution window/model, new vs repeat buyer rules, commission basis, returns/reversals, payout and reporting. Ask for approved catalogue fields and assets in the same request. Track statuses from lead to approved, tested and payable, and record suspended routes. A public listing and a personal creator code require publisher-channel verification before use on a marketplace.

Use approved programme links, an approved redirect format if the terms allow it, and a concise commission disclosure by the merchant button. Test each supported path on desktop web and mobile web. Test merchant-app handoff independently if offered. A click must resolve to the intended India product and appear in the network report. Verify conversion attribution and payout using the programme's approved test process or the first real eligible order. Track click → tracked → approved → paid and reversals. A later direct purchase earns commission only when the programme attributes that eligible order to the earlier referral. [Affiliate and trust rules](SECURITY_AND_AFFILIATE.md) · [ASCI disclosure guidance](https://www.ascionline.in/social/dos-dont/)

The **commercial launch gate** is one working purchase-attribution path on a useful apparel assortment, with further partners in progress. The next expansion gate is observed approved commission per outbound click and enough monetisable coverage to justify refresh work. Calculate it from approved net commission divided by eligible outbound clicks. Assume zero for paused, unverified or unsupported destinations.

## First work package

1. Re-run the nine-brand coverage and offers report. Resume JNORSS hoodies/tees and WTFlex denim from their saved scope, and follow through on the Bonkers men's hoodie gaps with the permitted source evidence.
2. Build intake packets for Fugazee, Overlays, Veirdo, Bluorng, Valkyre and Urban Monkey. Prove two representative adapters first, one graphic/oversized topwear source and one source with harder size or stock semantics. Concurrently investigate The Souled Store's FlexOffers listing and direct merchant partnerships. Brand outreach and account applications start when authorised.
3. Add Freakins, Off Duty and TIGC using the same process, then The Souled Store and Snitch under an approved collection scope. A qualified partner can move into an earlier cohort.
4. Use two proof searches before moving from collection to a release candidate. A black oversized graphic hoodie in M under ₹1,500 exercises garment, colour, stock and variant budget. Women's black wide-leg jeans in waist 28 under ₹2,000 exercises department, fit, numeric size and colour. Show the exact merchant variant, observed price and check time in each result. Check outbound attribution separately.
