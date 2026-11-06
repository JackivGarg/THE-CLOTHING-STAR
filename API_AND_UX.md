# Public API contract and shopper states

This is a design contract, not an implemented endpoint list. Version the API under /api/v1. Use product/variant IDs, not user-supplied destination URLs.

## Search request

POST /search accepts bounded query text (maximum 300 characters), optional confirmed filter object and shopper context. Filters: category, garment colour, size label, fit, theme, exclusions, budget_minor, currency, price_mode (delivered/item), strict material/GSM requirements, return requirements, ready_only, include_unverified and sort. Context: country=IN, pincode if the shopper chooses to supply it, payment method (unknown/prepaid/COD), customer status (unknown/new/existing).

Return interpreted chips with origin (parsed/user-selected), unresolved terms, applied hard filters, catalogue_revision, search_rules_version, supported coverage, up to five initial results and an opaque next cursor for optional more. Default uncertain facts do not become hard positives.

Each result contains product/store IDs, selected variant, actual colour/size, image reference, title, item price, quote components, quote_status, source timestamps, match evidence summary, main compromise, return summary/conflict flag and merchant/affiliate destination kind. Do not expose internal affiliate rates or admin evidence rows.

No unconditional "best quality" result: show material/GSM and independent evidence when available. No ungrounded similarity percentages. Do not interpret every number in a query as budget (e.g. Porsche 911 is a product theme/model number).

## Quote states

| State | Meaning | Example display |
|---|---|---|
| confirmed_for_context | All required rules known for the supplied one-item context | INR 1,449 delivered, prepaid, first order |
| item_only | Only item subtotal known | INR 1,499 + delivery unknown |
| conditional | A discount/fee depends on an unresolved condition | INR 1,349 if first-order offer applies; delivery unknown |
| conflicting | Sources disagree | Price/policy needs checking; open source detail |

"Confirmed" means calculated from currently recorded applicable source rules, not a completed checkout. Include as_of and a checkout-can-differ note near details. Avoid presenting generic free-shipping thresholds as a guaranteed pincode delivery quote.

## Detail and comparison

GET /products/{id}?variant_id=... returns only variants belonging to that product and appropriate gallery photos. Include source evidence summaries, measurement units/types, fulfilment and coverage status. Distinguish garment chest circumference, flat width and body-to-fit measurements; don't convert between them without knowing the source convention.

POST /compare accepts one to three product/variant pairs plus common quote context. Return parallel rows: cost arithmetic, selected-size status, fit and garment measurements, material composition, GSM, decoration/theme evidence, returns/exchanges/fees, fulfilment, checked time and source links. Three products from three merchants mean three separate one-item purchases, never a combined cart quote.

POST /recheck accepts a known product/variant ID only; disabled unless that source's approved bounded checker exists. Respond unsupported, queued, checked or unavailable with the original observation time. It must not become an arbitrary URL fetch endpoint. A nonblocking recheck must not delay the outbound link indefinitely.

## Outbound

GET /out/{link_id} validates stored destination, product/variant consistency, current campaign status and eligible traffic. Log at most one anonymous click event per intended navigation; retry/preview dedupe should not claim additional purchases. Redirect to the appropriate approved affiliate URL or ordinary merchant URL. No open redirect query parameter. Preserve variant selection only where the approved linking format supports it; otherwise tell the shopper to select it at the merchant.

A failed analytics write does not trap the shopper. A paused campaign falls back to ordinary link. A product becoming sold out should be reported if known, with shopper choice to continue or return to alternatives.

## UX states

- Home: one search field, two or three example requests, visible supported brands/categories. No upload placeholder in v1.
- Missing size: useful browse results plus "Choose size to check your availability". Never size-qualified before selection.
- Parsing uncertainty: editable chips and one concise clarification. Don't turn errors into a long onboarding quiz.
- Results: 3–5 cards, optional more, sticky compare tray. Distinguish verified delivered-budget group from unknown-total alternatives.
- Loading: preserve prior results/query, cancel stale responses, use straightforward progress and retry.
- No matches: original chips remain; one reversible relaxation at a time. Never silently broaden budget/category.
- Missing field: explicit "not stated"/"unknown"; not empty cells or false checkmarks.
- Stale source: checked time and limited availability claims; compare can request a supported refresh.
- Error: clear retry, no lost shortlist. Source outage affects that brand's coverage rather than removing the entire site.
- Free-tier exhaustion: graceful temporary reduced service without a paid upgrade action on the user's behalf.

Local shortlists store product/variant IDs and selected preferences only. Explain that clearing site data removes them. Currency and filter settings are local preference, not identity. Saved search re-run is supported; price/restock notifications are deferred until a reliable schedule and notification consent are built.

## Security contract

Only the server signs ImageKit requests and talks to Redis/service-role DB functions. Parameterise DB queries and constrain limits/sorts. Sanitize/escape merchant content. Bound pagination and reject unknown IDs/hosts. Treat all third-party text as data, not instructions. See SECURITY_AND_AFFILIATE.md.
