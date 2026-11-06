# Free-first operating budget and images

Pricing reviewed on 2026-11-07. These are provider-published allowances, not guaranteed capacity or already-created accounts. Recheck at setup and store the actual dashboard limits in operational configuration. Do not enable paid billing/automatic upgrades as a hidden dependency.

| Component | Proposed free baseline | Main constraint |
|---|---|---|
| Supabase Postgres | 500 MB database, 5 GB uncached and 5 GB cached egress; free projects may pause after a week of inactivity | Keep metadata/history compact; no automatic free backup assumption |
| Upstash Redis | 250 MB, 10 GB bandwidth, 500K commands/month | Command count includes SDK internals; pipeline is not one billable command |
| ImageKit media delivery | 20 GB bandwidth/month, 3 GB media storage, two external origins | No unlimited galleries/model hosting assumption |
| Cloudflare static/Worker | Static frontend; Workers Free lists 100K requests/day and 10 ms CPU/request | Keep source collection/heavy work outside request-serving Worker |
| Local collector | Python tooling without scraper subscription | Machine uptime, internet and maintenance still required |

Sources: [Supabase](https://supabase.com/pricing), [Upstash](https://upstash.com/pricing/redis), [ImageKit](https://imagekit.io/plans/), [Cloudflare](https://developers.cloudflare.com/workers/platform/limits/).

## Planning budgets

Target <=250 MB Postgres during the pilot, <=25 MB Redis, <60% of monthly Redis commands, and <=12 GB ImageKit bandwidth. These are application targets below vendor ceilings, not another set of provider quotas. Measure real query payloads, row sizes, indexes and photos before promising a user-count capacity. Keep a 70% review and 85% degradation threshold for storage/egress. Degrade features or pause collection rather than incur surprise charges.

All ten sources can contain many non-apparel, duplicate, sold-out or historical records. Import metadata according to verified scope but serve a clearly defined curated published catalogue. Do not claim all products are image-backed or in stock. Do not shard a single database into multiple free accounts solely to evade quotas.

## Product image strategy

Store original URLs and associations in Postgres. Product images remain necessary in text-first shopping cards. Defer image embeddings, visual inference, uploads and AI tagging.

Use ImageKit only for approved catalogue photos. Prefer remote origin delivery over uploading every original to media storage. With only two origins, evaluate a signed web-proxy origin with an allowlist of merchant image hosts plus an optional owned-asset origin. Do not let the client pass arbitrary remote URLs or arbitrary transformation parameters. Resolve image IDs on the server, apply fixed size presets and sign the approved destination. A proxy feature is technical capability, not permission to republish merchant media.

Presets proposed: small listing thumbnail, medium detail, source-size cap. Lazy-load after the initial viewport; do not preload every gallery. Select the correct colour image before loading. Keep meaningful source version query parameters so changed photos refresh correctly. On unavailable images show a labelled placeholder and working merchant link.

Illustrations of cost, not traffic forecasts: 2,000 products x two copies x 150 KB is about 600 MB if stored; 10,000 products approaches 3 GB with that assumption. 5,000 browsing sessions x 20 thumbnails x 100 KB is about 10 GB delivered, before galleries. Remote images still consume output bandwidth. Browser/CDN caching helps only if actual repeated requests are cached; measure it.

No user reference uploads in v1. Never expose private photos through a public ImageKit path. If image search is approved later, follow FUTURE_IMAGES.md rather than adding uploads to this flow casually.

## Operations and graceful limits

- Keep source snapshots local and compressed, purge per INGESTION.md.
- Export backups locally before major publishes and retain a small rotation. Store credentials separately.
- Track storage/egress/command consumption using dashboards and infrequent usage reports. Do not spend a command on telemetry for every command.
- Keep only recent changes and anonymous event rollups. No full request-body logs.
- No cloud GPU, per-query LLM subscription, paid crawler or paid notification service in the baseline.
- Domain can use the free hosting subdomain initially. Custom domain registration is optional spending.
- Inactive free Supabase projects can pause. Do not run fake traffic to evade it; explain restore behaviour and real free-tier limitations.
