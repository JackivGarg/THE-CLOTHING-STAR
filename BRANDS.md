# First ten brands

Baseline checked/reviewed 2026-11-07 IST. Preserve spellings below. Original user's names were informal spellings; the matched sites are explicit. Additional choices are Burger Bae (baggy/graphic hoodies) and Powerlook (textured knitwear/budget streetwear). They are style choices, not an endorsement of fulfilment quality.

| Brand | Official site used | Evidence and intended route | Remaining limitation |
|---|---|---|---|
| Bonkers Corner | https://www.bonkerscorner.com | Shopify-shaped product sample; browser catalogue tool returned pages 1 and 2, 30 records each | General robots rules restrict pagination URLs; full supported collection route and commercial image use need review. No blanket crawl prohibition. |
| JNORSS | https://www.jnorss.in | Earlier public feed ended at 161 products; many explicit fit/GSM descriptions | Sizes and policies require current checks; product page vs policy return wording previously conflicted. |
| WTFlex / What The Flex | https://wtflex.in | Earlier feed ended at 408 products; descriptive text, colours and sizes | Feed text audit found little/no GSM; .co rendered international/currency context earlier, so don't mix it with INR .in. |
| Hauntrex | https://hauntrex.com | Earlier feed ended at 257 products; named graphic-theme collections and tags | Product type blank; some HTML descriptions become empty after cleaning. |
| Sagacity | https://thesagacity.in | Earlier feed ended at 62 products with photos/descriptions | Generic product type labels; do not use international sagacityclothing.com prices as INR offers. |
| Snitch | https://www.snitch.com | Public feed request returned HTML; browser-rendered hoodie page exposed usable product details | One product observed, no full rendered importer or reliable size-level availability extraction yet. |
| Genrage | https://genrage.com | Earlier feed ended at 230 products; categories/variants/descriptions | Some Default Title/non-apparel/prelaunch records need filtering; homepage sale banner isn't a dated campaign contract. |
| Everdion | https://everdion.com | Earlier feed ended at 481 products; rich tags, variant options and photos | Ready/prelaunch must be distinguished; GSM sparse. Shipping/coupon assumptions require review. |
| Burger Bae | https://www.burgerbaeclothing.com | Today one-product feed sample returned standard fields; hoodie collection visible | Whole feed, category taxonomy, stock accuracy and image terms have not been audited. |
| Powerlook | https://www.powerlook.in | Today one-product feed sample returned standard fields; winter collection visible | Whole feed and variant fidelity have not been audited. Product pages may conflict about fit/material, so preserve evidence. |

Machine-readable starting configuration is [brand-registry.json](brand-registry.json). It deliberately does not auto-enable any new mass import. The builder must review current source rules and record a valid source_config before enabling it. This is a technical setup gate, not a demand to ask the user again for already authorized routine research.

## Historical inventory quality (not current stock)

| Brand/scope | Product records | Variants | Image links | Readable descriptions | GSM text match |
|---|---:|---:|---:|---:|---:|
| JNORSS full public-feed scope | 161 | 902 | 1,103 | 161 | 159 |
| Bonkers first 250 sample | 250 | 1,261 | 1,440 | 250 | 109 |
| WTFlex full public-feed scope | 408 | 2,472 | 3,364 | 407 | 0 |
| Hauntrex full public-feed scope | 257 | 1,648 | 1,173 | 178 | 149 |
| Sagacity full public-feed scope | 62 | 312 | 701 | 61 | 33 |
| Genrage full public-feed scope | 230 | 1,066 | 1,475 | 230 | 64 |
| Everdion full public-feed scope | 481 | 4,900 | 4,647 | 481 | 9 |

"Full" above means the observed public endpoint scope reached its end during that audit. These totals are not the brand's entire business inventory. Image links may repeat content. GSM/fit coverage was a simple regex audit, not a reviewed extraction result. A prior Hauntrex count of 244 counted nonempty HTML; 178 counted actual readable text after stripping HTML. Use the latter for search-readiness. Do not silently mix metrics.

## Reaching forty later

Add a registry row and capability audit for each new brand: domain/locale, robots review, source strategy, IDs/units, pagination, category coverage, variant mapping, stock accuracy, media use, policy sources and affiliate status. Do not add forty brands by guessing domains or copying third-party coupon claims. A brand with poor data can be listed as discovery-only without claiming price/stock matching.
