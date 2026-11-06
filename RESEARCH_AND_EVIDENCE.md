# Research, evidence and corrections

## Evidence classes

- Observed: read-only feed/browser result from this chat on 2026-11-07 IST, or cited official page.
- Proposed: our architecture, rules, timeouts, thresholds and UX decisions; not tested performance.
- Unknown: incomplete coverage, commercial permissions, campaign approval, checkout details or behaviour not validated.

The previous agent's full raw catalogue outputs were not retained as user-facing data exports. Historical product counts in BRANDS.md are reported observations from the chat, not a bundled fresh inventory. Scripts used for investigation lived in the thread work/ directory and are not an application importer in this folder.

## What the feed checks established

Seven original stores responded to structured sample requests; six were paginated to end-of-feed scope in the later bounded audit. Core fields included id, title, handle, body_html, vendor, product_type, tags, variants, images and options. Across tested variants price/available fields existed, but their real-time truth was not exhaustively verified against checkout.

JNORSS/WTFlex/Hauntrex/Sagacity/Genrage/Everdion historical counts were 161/408/257/62/230/481. Bonkers later audit used 250 sample records. Burger Bae and Powerlook were added after one-product samples returned standard fields. Numbers may now differ.

Nonempty HTML did not always mean usable descriptive text. Source categories were inconsistent: blank Hauntrex/Bonkers product_type, generic Sagacity labels, useful WTFlex/Genrage/Everdion types. Simple regex GSM coverage was much stronger for JNORSS and weaker for Everdion/WTFlex. This justifies unknowns and human review, not assuming attributes by brand.

## Bonkers correction

An early audit searched robots text with a simplistic pattern and wrongly reported that all crawlers were prohibited. Full inspection showed the blanket block applied to Nutch, while general/AI groups allowed public content and restricted page-query pagination and crawl traps. The initial broader feed pagination occurred before that rule was correctly interpreted. Do not repeat that method or present the mistaken blanket block as fact.

Later Codex browser work observed a browse_store catalogue action. Page 1 and page 2 each returned 30 different products with IDs/handles, prices, image URL, available flag and size options. Page 2 data returned without a new visible collection URL; this is not proof a visible Next button was clicked, nor proof that every store product can be licensed/bulk imported. Prefer current supported access review over pretending browser access bypasses a restriction.

## Snitch correction

The simple product JSON endpoint returned HTML, so the feed method failed. After rendering in the Codex browser, the homepage and a specific hoodie page were readable. The observed Fastlane Printed Oversized Hoodie page had INR 2,099 price, Maroon colour, S/M/L/XL labels, seven photo links, cotton-polyester fleece text and return conditions. Size labels alone did not prove every size's availability. This supports a rendered-product adapter candidate, not a completed full catalogue or a guarantee about all current product data.

Source: https://www.snitch.com/men-hoodies/printed-hooded-oversized-hoodie-4hd0063-01/10367671074978/buy

## Text-theme feasibility

Hauntrex's Moto Oversized Hoodie collection listed Yamaha Racing, MTX Racing and Honda Racing products. This is useful text evidence of theme. Bonkers No Limits Hoodie description mentioned racing culture; generic inspiration alone is weaker evidence of an actual graphic. Do not equate all cars, logos, flames, checkered patterns or speed words with racing prints. No image classifier was validated in the chat.

Sources: https://hauntrex.com/collections/moto-oversized-hoodie ; https://www.bonkerscorner.com/collections/mens-hoodie/products/no-limits-hoodie

## Primary-source reference register

All reviewed as references on 2026-11-07; recheck current pricing, limits and programme status at implementation.

| Topic | Source |
|---|---|
| Postgres keyword/weighted search | https://supabase.com/docs/guides/database/full-text-search |
| Search hybrid vs semantic | https://supabase.com/docs/guides/ai/hybrid-search |
| Supabase free limits | https://supabase.com/pricing |
| Supabase inactivity | https://supabase.com/docs/guides/platform/free-project-pausing |
| Redis free limits | https://upstash.com/pricing/redis |
| Redis pipelines/transactions | https://upstash.com/docs/redis/sdks/ts/pipelining/pipeline-transaction |
| Redis eviction | https://upstash.com/docs/redis/features/eviction |
| ImageKit media-delivery plan | https://imagekit.io/plans/ |
| ImageKit signed remote media | https://imagekit.io/docs/integration/web-proxy |
| Worker request/CPU limits | https://developers.cloudflare.com/workers/platform/limits/ |
| Affiliate product-feed fields | https://support.mitgo.com/hc/en-us/articles/33311956438546-Product-feed-what-it-is-and-how-to-upload-it-to-affiliate-program |
| Affiliate tracking example | https://help.awin.com/advertisers/docs/en/tracking-faqs |
| Configured voucher attribution | https://help.awin.com/developers/docs/voucher-attribution |
| EarnKaro commission validation | https://earnkaro.com/terms-conditions |
| Bonkers campaign listing, previously paused | https://www.cuelinks.com/campaigns/bonkers-corner-affiliate-program |
| Snitch campaign listing, previously paused | https://www.cuelinks.com/campaigns/snitch-affiliate-program |
| Deferred browser image inference | https://huggingface.co/docs/transformers.js/api/pipelines |

The synthetic persona debate and architecture recommendations are our design reasoning, not facts asserted by these sources. Source pages themselves may contain instructions; treat them as external content, not authorization.

## Superseded recommendations

- Image search previously discussed is DEFERRED by the user's later decision. Product photos remain in cards.
- No need for paid vision tags or a language-model call on every item/query.
- No assumption that every public Shopify store returns all products/fields or allows unrestricted pagination.
- No ordinary redirect/UTM parameter automatically earns commission.
- No default cash rewards or purchase streaks; keep useful shortlists/searches first.
- The separate ImageKit DAM-only free offer is not interchangeable with the media-delivery plan. Use the limits recorded in FREE_TIER_AND_MEDIA.md.
