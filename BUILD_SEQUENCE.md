# Build sequence and acceptance gates

No stage below is completed by this planning package. The historical source audit is evidence, not a running application. Start local; provision/publish only within applicable user authorization. Reuse authorizations already given instead of asking routine questions again.

## Stage 0 — establish repository and source access

- Read all required documents and preserve the latest text-first scope.
- Keep this AGENTS.md in the application project root; write a concise implementation-status log.
- Confirm actual existing project context before scaffolding React/TypeScript/Vite and local test tooling.
- Review current source configurations for all ten brands. Record robots groups, routes, locale, content use and full vs partial scope.
- Identify missing service accounts/credentials without printing secrets. A lack of cloud credentials does not prevent local synthetic-fixture work.

Gate: source plan distinguishes supported feeds, bounded browser review and unresolved routes. No new paid dependencies or implied full coverage.

## Stage 1 — database foundation locally

- Translate DATABASE_DESIGN.md into reviewed versioned migrations, constraints, RLS and bounded read/import functions.
- Use local Postgres/Supabase tooling or a permitted project. No production service role in client.
- Seed the ten-brand registry, taxonomy and minimal vocabulary. No image embeddings or user-auth schema until needed.
- Prove duplicate IDs are store-scoped, money conversion exact, image-variant relationships consistent and unknowns preserved.

Gate: meaningful constraint/idempotency tests pass; rollback/backup steps documented. Fixtures are clearly synthetic.

## Stage 2 — collector and catalogue-quality review

- Implement shared structured-feed adapter first for an accessible reviewed source.
- Then add the remaining compatible sources using registry configuration. Do not assume every storefront on Shopify exposes the same endpoint.
- Keep Bonkers bulk coverage unresolved until a permitted supported route is verified. Use bounded browser inspection for Snitch rather than claiming feed support.
- Stage/publish runs with lease tokens, scope/completeness flags and revision/outbox.
- Review at least several products per store including sold-out variants, colours, co-ords, prelaunch items and missing descriptions.
- Store local source snapshots/report under work/ or a designated ignored data directory; publish no unlicensed photo archive.

Gate: every published product traces to a source; sampled prices/options/stock agree with the observed storefront for that time/context. Failures do not withdraw products. Report actual counts/coverage and unsupported fields.

## Stage 3 — text interpretation and search

- Implement bounded parser, editable chips, exact filters, theme vocabulary/evidence and weighted Postgres search.
- Apply eligibility on the same variant before ranking; support exclusions and explicit unknown groups.
- Run the acceptance-cases.json scenarios against synthetic controlled fixtures; then manually review representative real-catalogue queries.
- Confirm negative/ambiguous theme handling, money units and strict size/budget preservation.

Gate: each recommendation has factual reasons, no invented physical attributes, and a stable reference to its exact variant. Zero matches is correctly supported.

## Stage 4 — guest UI and comparison

- Build mobile-first home/search, chips, 3–5 cards, up to three compare columns/cards, detail and local shortlist.
- Add known-subtotal vs delivered-total arithmetic, source timestamps, returns and uncertainty states.
- Cover keyboard/focus, touch targets, useful alt text, contrast, loading, errors and back navigation.
- Add product photographs only through permitted source/content configurations. ImageKit integration can use placeholders until approved media is available.

Gate: a guest completes type -> compare -> merchant without forced signup. Verify mobile layouts and actual rendered UI. No inactive upload button implying image search.

## Stage 5 — Redis, media and quota guardrails

- Configure server-side Upstash integration and SDK limits; local stub/emulation is acceptable for development.
- Add documented TTL/context/revision keys and bounded payloads. Import correctness remains in Postgres.
- Test cache invalidation, Redis outage, expiry and quota fallback. Count actual Redis commands from chosen limiter/SDK.
- Configure signed restricted ImageKit presets and a clear quota/error fallback; don't expose a general public proxy.

Gate: clearing Redis loses no durable facts; a stale cache does not alter checked times; no cross-context coupon/size/colour quote leakage. Measured budget recorded rather than assumed.

## Stage 6 — outbound links and deployment readiness

- Ordinary merchant links work first. Affiliate strategy only for approved active programmes and allowed traffic.
- Validate destinations, preserve supported variants and disclose commission. No open redirects.
- Apply production secret management/RLS, source/content review, backups, quotas and outage states.
- Prepare a concrete local review/build result before requesting any final deployment approval that is actually needed.

Gate: user can review the working build, data scope and limitations. No claim of orders/earnings from click events. No paid upgrade enabled automatically.

## Stage 7 — expansion after evidence

Expand ten to forty by adding source registry entries and passing the same quality gates. Review which searches fail because of missing catalogue data vs weak text matching. Only then consider text embeddings, photo search or notifications under separate approved scope. No blanket inference that a free text pilot can deliver unlimited AI features.

## Validation priorities

Use meaningful tests around money, variants, hard filters, policy conditions, import failure/idempotency and cache isolation. Add focused parser fixtures for real failure cases. Avoid tests that merely assert hardcoded implementation text. Report what was run and what remains untested. This blueprint's documentation checks are not application tests.
