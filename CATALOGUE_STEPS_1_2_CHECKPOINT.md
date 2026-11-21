# Catalogue coverage and offer review checkpoint

21 November 2026, Asia/Kolkata. Steps 1 and 2 of [the backend plan](BACKEND_COMPLETION_PLAN.md). Live project `cvziesdqhxhahiqladlg`.

## Merchant section coverage

The section import stores the exact page URL, content hash, check time, product handles, next link and unresolved handles in `import_runs.cursor`. A membership requires an exact handle or canonical product URL that resolves to one existing product in the same brand. The importer treats the section as a relationship. A generic section or mixed grid supplies no automatic department or garment classification.

| Brand | Checked section | Resolved / observed | Remaining |
| --- | --- | ---: | --- |
| Bonkers Corner | [Men's hoodies](https://www.bonkerscorner.com/collections/mens-hoodie) | 18 / 20 | Page 2 query route disallowed. Two observed handles need merchant IDs. |
| JNORSS | [Hoodies](https://www.jnorss.in/collections/hoodies) | 33 / 35 | Captured both pages. Two handles need merchant IDs. The section has no explicit audience. |
| WTFlex | [Women's jeans](https://wtflex.in/collections/jeans-for-women) | 9 / 9 | Captured the observed section end. Other departments and categories still need coverage. |
| Burger Bae | [Men's hoodies](https://www.burgerbaeclothing.com/collections/hoodies-for-men) | 80 / 80 | Captured pages 1–2. Page 3 remains in the latest run cursor. |
| Powerlook | [Jeans and cargo](https://www.powerlook.in/collections/bottoms-jeans-cargo) | 36 / 39 | Page 2 returned 429 on initial attempt and after the cooldown. Three handles need merchant IDs. |
| Sagacity | [Hoodies](https://thesagacity.in/collections/hoodies) | 12 / 12 | Page 2 returned 429 twice. The observed grid also includes jackets. |
| Everdion | [Men's hoodies and jackets](https://everdion.com/collections/male-hoodie-and-jacket) | — | Page 1 returned 429 twice. |
| Hauntrex | [Original oversized hoodies](https://hauntrex.com/collections/original-oversized-hoodies) | — | Page 1 returned 429 twice. |
| Genrage | [Hoodies for men and women](https://genrage.com/collections/hoodies-for-men-women) | — | Initial connection and repeat robots checks timed out. |

The denominators count the saved grid pages in each section. 195 distinct section/handle pairs were observed. 188 resolved to stored products. The seven unresolved handles remain in the respective run cursor. A newly resolved product can be attached during the next section snapshot. Product/variant creation requires separate merchant identity evidence.

For a saved, permitted HTML response, use:

```powershell
python scripts/inspect-collection-grid.py BRAND URL SNAPSHOT.html --observed-at TIMESTAMP
node scripts/prepare-section-import.mjs PAGE1.json PAGE2.json
```

The parser uses Beautiful Soup 4 and selects the primary grid for the known theme. Save the first command's JSON output as a page manifest. The second command emits the SQL for one transaction-sized statement. Use only permitted responses from the advertised next-link chain. Verify the parser against the rendered section whenever a theme changes. Replaying an identical manifest chain inserts zero runs and memberships.

## Reviewed variant offers

Two current JNORSS Shopify product responses and one Bonkers response were checked against the exact product and variant IDs, stored size option, INR price and explicit availability. The 14 new observations retain the source check time and response digest alongside the older records.

| Style / size | November 18 source capture | Current accepted observation |
| --- | --- | --- |
| [Metallica Electric Thrash Omen Hoodie](https://www.jnorss.in/products/mettalica-electric-thrash-omen), L | Unavailable | Available at ₹1,499. Fulfilment and preorder remain unknown. |
| [Thorn Vein Hoodie](https://www.jnorss.in/products/jnorss-thorn-vein-acid-wash-hoodie), XL | Available | Unavailable. Listed at ₹1,499. |

The Bonkers Black Signature Oversized Heavyweight Hoodie is a verified member of the observed men's hoodie grid. Its M variant, ID `44072981135460`, is now priced at ₹1,799. The normalized catalogue still carries ₹1,599. A strict ₹1,500 result should exclude this variant. [Bonkers product page](https://www.bonkerscorner.com/products/black-signature-oversized-heavyweight-hoodie-fleece-1)

The [reviewed offer import](scripts/prepare-reviewed-offer-import.mjs) is for reviewed single-size-option Shopify responses with minor-unit prices and independently verified INR. It requires every supplied variant to resolve to the same stored product and exact option value. Offer-only staging is excluded from the full-catalogue quality report. The price and stock fields come from the same fetch. Explicit preorder/fulfilment need additional evidence.

The private `public.catalogue_reviewed_variant_offers` view returns the latest accepted observation with its exact variant, check time and shopping state. It is selectable by `service_role` under RLS. Anonymous and authenticated roles have no SELECT grant. Search, brand pages and comparison still need to adopt the new serving contract. The public catalogue has zero published products.

The mismatch report still compares normalized legacy data with the newest raw observation. After this pilot it shows **1,944 pending discrepancies**, including 128 for JNORSS, plus nine reviewed discrepancy rows. The view has 14 accepted offers and zero ready-to-ship offers. Take a stratified sample for each additional source shape, then review that scope before promotion. Keep unknown colour, variant options, shipping, preorder and stale checks explicit.

[Original discrepancy report](scripts/report-offer-discrepancies.sql) · [Private view migration](supabase/migrations/20261121072404_catalogue_reviewed_variant_offers.sql) · [Shopify Product Ajax API](https://shopify.dev/docs/api/ajax/reference/product)
