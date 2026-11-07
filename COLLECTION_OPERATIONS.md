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

## Detail enrichment work in progress

The Bonkers normalizer and Snitch rendered-text parser accept supplied data only; neither is a complete live adapter, job runner, or database importer. Validate current source permissions, actual response shapes, prices and variants on multiple live pages before use. Snitch displayed size choices do not establish availability. No new product data has been imported by these modules. Supabase integration for the next stage remains outstanding.

`prepare:staging` writes a manifest naming the batches of the current snapshot. Consumers must use that manifest; old files remain present and must not be replayed. Product content hashes exclude volatile observation timestamps and validation metadata. Existing DB rows were not changed.

## Bonkers product detail runs

Run `node scripts/collect-bonkers-details.mjs --limit 100` from the repository root. The collector reads the saved sitemap URL set and checks the current robots rules for each product detail route. It schedules candidates across title-based category and audience hints. The hints only determine request order. Keep merchant tags and source options in the staged payload for later classification.

The process uses one local domain lock, spaces requests by at least 1.1 seconds and includes the robots fetch in the request budget. It stops on access restrictions, rate limiting or low disk space. If a process crashes and leaves the lock, inspect the process and the saved manifests before clearing it. A new run must respect any outstanding Retry-After value and the source access rules.

The collector prints its run directory. Inspect its manifest and the files under `validated/`. For an explicit, private Supabase import, use the following commands to generate SQL for the authorized project `cvziesdqhxhahiqladlg`.

```text
node scripts/prepare-bonkers-detail-import.mjs <validated-manifest> 0
node scripts/bonkers-detail-import-sql.mjs <validated-manifest> setup
node scripts/bonkers-detail-import-sql.mjs <validated-manifest> <chunk-index>
node scripts/bonkers-detail-import-sql.mjs <validated-manifest> finish
```

The first command reports the number of chunks. Apply setup first, apply each numbered chunk in order starting at zero, then finish. Verify the staged product IDs and source URLs against the manifest. After verification, write `validated/import-verified.json` with `manifest_sha256` for the exact validated manifest bytes, `verified_at` in ISO format and the matching `product_ids` array. A later collector skips only verified imports and existing feed URLs. A JSON array of additional database-matched URLs can be passed via `--exclude`. Retry URLs that did not produce a durable verified record. The original feed and each detail run keep separate scope records.
