# Collection operations

## Current collector workflow

Run from the repository root:

1. `npm run audit:sources` checks the configured robots rules and writes its audit under ignored `data/source-audits/`.
2. `npm run collect:feeds` requests each configured public product feed sequentially within the configured pacing and request cap. It writes compressed response snapshots and per-brand reports under ignored `data/catalogue/`.
3. `npm run prepare:staging` validates the local snapshots and writes product-level batches under ignored `data/catalogue/staging-batches-v3/`. Each staged product contains its variants and image references; the original source option names and values are retained.
4. `npm run balanced:sample` builds a separate, deterministic review sample from the available feed-backed brands. It does not edit or reduce the full dataset.

`collect:feeds` and `prepare:staging` do not themselves write to Supabase. The current Supabase upload is an explicit review/import step. Do not describe this pipeline as a single-command live importer until that step is automated with an appropriately restricted credential and idempotency checks.

## Browser verification and supplemental records

Use the in-app browser for the rendered product page when a feed omits detail needed for validation. The current verification sample contains one product page per brand. Its compact facts and short evidence notes are stored separately in the private `staged_product_page_observations` table, linked to the brand's source configuration and latest import run. All observations start as `pending`; they do not overwrite the feed payload or publish products.

Do not store full page text or copy product images into the verification table. Keep prices in INR minor units and preserve whether a price came from the current page or the feed. Record a null when the page does not expose a value. An absent size/color/material is unknown, not a guessed value.

## Source and retention rules

- Recheck robots and source scope before adding a route or another brand.
- The pilot limit is 100 requests per store/run, conservative pacing around one request per second per domain, and no query pagination where robots disallows it. Respect stricter source rules.
- Do not bypass blocked routes, change user agents to evade policy, or treat a robots allowance as permission to reuse text or images.
- Keep raw snapshots compressed and ignored under `data/`; do not commit snapshots, staging batches, credentials, or customer/session data.
- A partial, blocked, or failed run never deletes records. Reconcile only after comparable successful runs, and use explicit withdrawn status with evidence rather than hard deletion.
- All feed content and image-use permission remain private until source terms and reuse rights are reviewed.

See [COLLECTION_STATUS.md](COLLECTION_STATUS.md) for the current counts and completeness limits, and [INGESTION.md](INGESTION.md) for normalization and publication rules.
