# Redis design

## Role and provider

Use one Upstash Redis Free database in a suitable nearby region when the build is ready. It is NOT provisioned. Provider pricing checked 2026-11-07 lists 250 MB data, 10 GB monthly bandwidth and 500,000 monthly commands; verify dashboard limits at setup. Do not auto-upgrade plans.

Use Redis for transient response caches and lightweight rate limits. Postgres owns catalogue facts, source progress, correctness leases and revision/outbox state. No Redis vector/search service, durable job queue or agent memory is needed for v1.

## Namespaces and TTL contract

Prefix all keys with sw:v1:{environment}. Production and preview must not share keyspace; a separate free database is not assumed.

| Key suffix | Payload | TTL |
|---|---|---|
| revision | Latest known durable catalogue revision and rules version | 60 seconds; refresh from DB on miss |
| search:{revision}:{rules}:{contextHash} | At most 20 ranked variant/product references and bounded response facts, including original observation times | 120 seconds, small random jitter; hard maximum 150 seconds |
| product:{revision}:{productId}:{variantId} | Sanitised bounded public detail | 300 seconds |
| policy:{policyVersionId} | Public policy summary | 1 hour; new policy gets a new ID |
| noresult:{revision}:{contextHash} | Empty-search marker | 30 seconds |
| rl:search:{rotatingIdentifier}:{window} | Rate-limit counter | 60–120 seconds |
| rl:out:{rotatingIdentifier}:{window} | Outbound burst counter | 60–120 seconds |

All transient keys expire. Do not cache whole feeds or galleries as base64. Cap a cache item at 32 KB and card responses at the fields needed to render. Refuse unbounded query strings before key creation.

## Canonical cache context

Include category, colour families and raw colour strictness, theme, fit strictness, size, budget/currency, price mode, country/pincode-derived shipping context if used, payment mode, first-order status, return/material requirements, include-unverified flag, sort, page cursor, catalogue revision and search rule version. Sort unordered filter lists before hashing. Do not share first-order/prepaid quotes with a different shopper context.

Never expose an IP-based identifier to the client. If IP is used for abuse controls, generate a rotating server-side HMAC and expire it; do not call it anonymous proof of a unique human. Account for shared networks and browser privacy. Free MVP needs no persistent session in Redis.

## Read/write and invalidation flow

1. Apply edge/local request bounds, then the selected Redis limiter if available.
2. Read revision from a short process-local cache (maximum 30 seconds), otherwise Redis, otherwise Postgres.
3. GET the canonical response key. Re-evaluate freshness using the stored source times; never rewrite checked_at on a cache hit.
4. On miss query Postgres, which returns its actual revision. Cache under that actual revision, not a stale assumed revision.
5. On successful catalogue publish, DB commits the new revision and outbox record. Publisher updates Redis revision; retry failures later.
6. Old revision keys expire naturally. Do not KEYS/SCAN the full database on each import or delete broad patterns.

Versioned keys prevent old policy/attribute data mixing with a new successful revision. A missed invalidation can still briefly serve old cached results; the stated TTLs bound this. Recheck selected variant detail on comparison rather than treating cached result cards as an inventory reservation.

## Rate limits and failure policy

Proposed starting limits: search 30 submitted requests/minute per rotating identifier, product detail 60/minute, outbound 30/minute. These are tuning defaults, not security guarantees. Do not count every keypress. Add progressive local backoff and return useful Retry-After for 429.

Prefer a bounded fixed-window counter operation or a documented limiter with measured command usage. Counter increment and expiry must be atomic; do not leave a counter immortal when expiry fails. A pipeline reduces HTTP round trips but does NOT make its commands atomic or free. Pin the SDK and inspect official/bundled docs before implementation.

Redis outage/quota: read-only catalogue can fall back to Postgres with process-local soft limits and edge protections. Do not let a Redis failure unlock importer/admin writes. Expensive future AI work should fail closed or return a graceful unavailable result. A shared cache is not a correctness lock: eviction can remove keys, so import leases remain in Postgres.

Upstash defaults to rejecting writes when full unless eviction is enabled. If using eviction, accept that cache/limiter state may disappear. Keep the DB lease design independent. Set an application target below 25 MB cache storage and prune via TTL, not a custom always-running eviction worker.

## Command budget

Estimate 4–6 Redis commands per submitted search INCLUDING the chosen limiter, cache lookup/write and amortised revision lookup; measure actual SDK commands. At 2,000 searches/day x 30 days x 6 = 360,000 commands before detail/outbound use. This is already a material fraction of a 500K monthly free allowance. Pipelining does not change that arithmetic.

Use 60%/80% local usage targets: at 60%, review unnecessary lookups; at 80%, reduce nonessential Redis writes/revision reads, prefer process-local/edge caching where safe, and keep availability/freshness truthful. Do not sample away essential limit checks while claiming they still enforce their policy. Monitor via provider dashboard or infrequent telemetry, not one Redis usage command per request. No surprise paid fallback.

Sources: [pricing](https://upstash.com/pricing/redis), [pipeline vs transaction](https://upstash.com/docs/redis/sdks/ts/pipelining/pipeline-transaction), [eviction](https://upstash.com/docs/redis/features/eviction).
