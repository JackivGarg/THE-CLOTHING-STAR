# Text search and evidence-based themes

## V1 choice

Use a reviewed fashion vocabulary plus deterministic extraction and Postgres full-text search. No paid AI request on each product or search. Do not claim a general conversational assistant understands arbitrary requests; support known requirements and expose editable interpretation chips.

## Query interpretation

For "black hoodies with racing prints under 1500 size M", extract category=hoodie, garment_colour=black, theme=racing, max_minor=150000 INR, size=M. Interpret "racing prints" as a racing-graphic theme unless the shopper explicitly distinguishes printed vs embroidered technique. Show what was understood and allow correction. Missing price mode is delivered-total by default. Shipping context may remain unknown.

Support explicit negatives: "no anime", "without back print", "not sleeveless". A term mentioned negatively is not positive evidence. "No back print" requires front/back evidence; when not supplied it remains unverified, not assumed absent. Preserve field associations: black GARMENT vs red PRINT. If unsupported association cannot be parsed confidently, ask one short clarification or leave that chip unresolved.

Normalise Unicode/case/whitespace, plural hoodie/hoodies, INR/Rs/rupee symbols, 1500/1,500/1.5k, size aliases such as XXL/2XL, and curated colloquial aliases. Avoid silently expanding "black" to grey/charcoal. Avoid silently equating boxy, baggy, relaxed and oversized; they are related fit concepts and can be optional relaxations.

## Search document

Build per-product text from title + own description + tags + original product type + actual collection membership + accepted theme evidence. Remove script/style, HTML markup, nav, unrelated recommendations and boilerplate. A site-wide racing-menu link must not cause every product to match racing. Image alt text is a weak optional text source, not visual proof.

Variant colour/size/price/stock remain structured filters. Never let a black thumbnail or a description mentioning an XL model satisfy an unavailable black/XL variant.

## Theme vocabulary

| Theme | Strong/contextual terms | Cautions |
|---|---|---|
| racing | racing, motorsport, Formula 1, Grand Prix, race-car graphic | Formula/F1 alone needs context; "speed inspired" is weak |
| motorcycle-racing | MotoGP, motocross, explicit motorcycle racing | "moto" may mean a silhouette or motorcycle styling |
| automotive | car graphic, Porsche, Ferrari, Skyline, garage | A car brand is not proof of a racing print |
| band | Metallica, Nirvana, Slipknot, named band collection | Artist text does not prove an officially licensed collaboration |
| anime | named series/characters plus relevant product context | Short strings can be ambiguous; preserve provenance |
| floral | floral graphic, flower pattern | General lifestyle language is not a pattern |
| typography | slogan, lettering graphic, typographic print | A title containing words is not proof of a typography design |

Maintain exact/alias/related/weak relations. Related themes broaden recall only when a shopper opts in or a clearly labelled related group is shown. Do not build a transitive expansion that turns every car into Formula 1.

## Evidence strength

Explicit product title/detail is strongest, own product tag/actual category membership supports it, general descriptive association is inferred, generic hype is weak. For every derived theme store the excerpt, field, source URL, observed time and rule version. Store a theme as unknown if no evidence exists. Rules may suggest review candidates; they may not manufacture physical features.

Example: "Honda Racing Designed Oversized Hoodie" supports a racing-related theme. It does not independently prove black colour, screen-print technique, cotton percentage, current M availability or official licensing. Those require their own evidence.

Conflicting metadata goes to review. A generic title like "Midnight Hoodie" with no descriptive text cannot be classified by this method even if a human can see a car in its image. Manual curation of that subset is acceptable. Vision tagging remains deferred.

## Eligibility before ranking

1. Category and explicit exclusions.
2. Selected variant size and garment colour.
3. Current source availability and ready/preorder preference.
4. Hard material/GSM/return requirements supported by accepted evidence.
5. Budget quote in the chosen price mode. Unknown delivered total cannot pass confirmed delivered budget.
6. Theme/fit relevance. For strict theme requests require sufficient evidence; weak alternatives appear separately only if requested.

No result may be labelled eligible if these constraints were silently relaxed. Users who omit size can browse with "Choose size to confirm availability"; they have not received size-qualified recommendations yet.

## Ranking

The local preview accepts Men, Women, Unisex or Anyone. It assigns audience only from explicit merchant tags and audience labels in the product title. Items labelled unisex qualify for either Men or Women. Items with missing or conflicting labels remain available under Anyone. These labels describe how the merchant lists the product.

The Recommended order applies eligibility first. It prefers a direct audience match and an exact product name when requested, then checks whether the matching variant has a recorded size and colour and the product has a photo. Among equally relevant candidates, the first five bring in different brands where possible. The remaining ties use recorded item price and product ID. Explicit price sorting orders by price across all eligible items.

Start with deterministic weighted full-text relevance: title > explicit accepted theme evidence > own tags/collections > description. Add understandable tie-breaks for exact vs related theme, requested fit, cost certainty and source freshness. Within similarly relevant groups use delivered price if known, then a stable product ID. Commission and MRP-discount percentage are not organic relevance signals.

Return at most one initial result per merchant product/colour group; collapse its gallery and size variants. Do not collapse two merchant IDs solely by title. A reviewed product-group relationship may later combine true duplicates.

Use typo fallback for short category/theme words only when exact/alias search fails; retain hard price, size and colour filters. Do not allow fuzzy matching to turn M into L or INR 1500 into INR 15000. Postgres FTS handles linguistic forms; a curated synonym dictionary handles domain concepts. Optional later text embeddings can improve recall, but cannot recover graphic information absent from text.

## Explainability and unknowns

Cards get one main reason and one compromise, derived from real evidence: "Racing theme named by brand; black M listed available. GSM not stated." Do not show a fake match percentage or material/quality score.

Zero result actions are precise and reversible: allow sweatshirt, allow grey, include unverified shipping, increase item budget. Keep the original request and show exactly which constraint changed. Do not automatically display a more expensive item as a compliant result.

Sources: [full-text search](https://supabase.com/docs/guides/database/full-text-search), [hybrid-search distinction](https://supabase.com/docs/guides/ai/hybrid-search). Text semantic/vision search is not a v1 dependency.
