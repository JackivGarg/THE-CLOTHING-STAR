# Hosted catalogue baseline

Checked 18 November 2026 at 10:21 IST against Supabase project `cvziesdqhxhahiqladlg` after restoring the existing project. The project reported healthy. Counts are from SQL, rather than the table browser's row estimates.

| Table or measure | Count |
| --- | ---: |
| Normalized products | 8,222 |
| Normalized variants | 59,844 |
| Staged catalogue records | 12,079 |
| Sitemap discoveries | 13,463 |
| Product image references | 55,820 |
| Product attribute evidence | 91,388 |
| Variant source observations | 27,050 |
| Published products | 0 |

All variant source observations and all attribute evidence were pending review. The image references had unknown content-use status. All 59,844 normalized variants had unknown preorder state. None of the products had ready fulfilment recorded. These states are inputs for the next review and collection work.

| Brand | Products | Variants | Variants with colour | Product descriptions |
| --- | ---: | ---: | ---: | ---: |
| Bonkers Corner | 3,471 | 20,214 | 0 | 3,471 |
| Burger Bae | 1,114 | 12,580 | 12,132 | 1,098 |
| Everdion | 481 | 4,900 | 4,432 | 481 |
| Genrage | 230 | 1,066 | 0 | 230 |
| Hauntrex | 257 | 1,648 | 1,168 | 178 |
| JNORSS | 161 | 902 | 12 | 161 |
| Powerlook | 2,038 | 15,750 | 15,493 | 2,025 |
| Sagacity | 62 | 312 | 1 | 61 |
| WTFlex | 408 | 2,472 | 2,472 | 407 |

The database reported 154 MB. The deployed schema has product descriptions, source tags, variant options and preorder fields. The public catalogue view does not yet provide the complete search contract. The local migration history and deployed migration history should be reconciled before applying changes. The local queue draft was absent from the deployed migration list.

The project was restored and inspected. A separately restorable backup and its restore test are still needed before migration or import. The local environment has PostgreSQL 18 command-line binaries, but the project environment file contains a publishable key and no database connection password. Docker Desktop's Linux engine was unavailable during the initial check.
