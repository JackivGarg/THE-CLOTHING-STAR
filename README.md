# Streetwear discovery — implementation handoff

**Current implementation:** A local prototype and a separate Supabase project now exist. See [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md) for setup, verified work, and outstanding limitations. The planning text below records the original baseline.

Planning baseline: 7 November 2026, Asia/Kolkata. Status: documentation only. No application, database, Redis instance, scheduled importer, deployed site, or affiliate integration has been created by this handoff.

## Product decision

Build a mobile-first Indian streetwear finder. A guest types requirements, confirms editable filters, receives 3–5 useful product choices across supported brands, compares up to three, and opens the merchant. Start with TEXT SEARCH. Reference-photo upload, image embeddings, vision tagging, conversational agents and cash rewards are deferred.

The catalogue includes product photographs for shopping cards; deferring image SEARCH does not mean a text-only interface.

## Read in this order

1. [AGENTS.md](AGENTS.md) — binding project rules for the implementing agent.
2. [PRODUCT.md](PRODUCT.md) — user needs, scope, assumptions and acceptance goals.
3. [SYSTEM_DESIGN.md](SYSTEM_DESIGN.md) — components, boundaries and request flows.
4. [DATABASE_DESIGN.md](DATABASE_DESIGN.md) — logical schema, relationships and constraints.
5. [TEXT_SEARCH.md](TEXT_SEARCH.md) — requirements parsing, theme evidence, ranking and unknowns.
6. [INGESTION.md](INGESTION.md) — collection, browser checks, publication and failure handling.
7. [REDIS.md](REDIS.md) — keys, TTLs, invalidation, rate limits and cost controls.
8. [API_AND_UX.md](API_AND_UX.md) — API contracts and shopper-facing states.
9. [BRANDS.md](BRANDS.md) and [brand-registry.json](brand-registry.json) — first ten brands and access evidence.
10. [FREE_TIER_AND_MEDIA.md](FREE_TIER_AND_MEDIA.md), [SECURITY_AND_AFFILIATE.md](SECURITY_AND_AFFILIATE.md).
11. [BUILD_SEQUENCE.md](BUILD_SEQUENCE.md), [acceptance-cases.json](acceptance-cases.json).
12. [RESEARCH_AND_EVIDENCE.md](RESEARCH_AND_EVIDENCE.md), [FUTURE_IMAGES.md](FUTURE_IMAGES.md), [OPEN_DECISIONS.md](OPEN_DECISIONS.md).

## Chosen baseline

- UI: React + TypeScript + Vite, responsive web. This is a recommendation for the build, not an existing installed stack.
- Hosting target: Cloudflare static hosting and thin Worker API; local development first.
- Durable catalogue: Supabase Postgres, standard full-text search and optional pg_trgm typo support. No vector dependency for v1.
- Redis: Upstash Free, server-side cache and lightweight rate limiting. Never the only copy of catalogue data or import progress.
- Product photos: ImageKit Free with approved source images and signed, restricted delivery.
- Importer: local Python process initially; browser inspection through the user's explicitly requested Codex browser. Computer must be running for local refreshes.
- No paid AI API on the critical request path. No hosted free-trial credit assumed to last indefinitely.

## How to start the next agent

Open this folder as the project, or copy its contents into the intended application repository so its AGENTS.md applies. Tell the next agent:

> Read AGENTS.md and README.md, follow the linked design in order, and start at the first unfinished step in BUILD_SEQUENCE.md. Keep image search deferred and respect the free-tier and data-evidence rules. Recheck source access before collecting. Record actual validation results; do not present historical observations as a newly completed import.

Use the documents as design requirements. They do not grant merchant licences, affiliate approvals, account access, or permission to incur spending. Routine local implementation can proceed when requested. Existing user authorizations should not be requested again unnecessarily.

## Scope of the historical audit

The chat examined feeds for the original eight brands, inspected Bonkers and Snitch in the Codex browser, and sampled Burger Bae and Powerlook. Full raw catalogue exports were not preserved as deliverables. This folder preserves findings and source references, not a ready-to-serve inventory. A new importer must take and validate its own snapshots.
