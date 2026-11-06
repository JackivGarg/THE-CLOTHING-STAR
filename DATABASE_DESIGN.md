# Logical database design and current schema

Use Supabase Postgres. The migrations in `supabase/migrations/` are applied to the separate project. This document keeps the original logical target design; where it differs from the deployed schema, treat it as a future design contract. The deployed subset and private staging state are summarized in `IMPLEMENTATION_STATUS.md`. V1 uses ordinary relational indexes and full-text search. Do not install a vector extension or allocate embedding tables until image/text semantic search is approved.

## Deployed private collection layer

Current migrations create `brands`, `source_configs`, `import_runs`, `staged_catalogue_records`, and `staged_product_page_observations` alongside the empty publishable catalogue tables. `staged_catalogue_records` stores one record per product with source variants and image references nested in `payload`. `staged_product_page_observations` stores append-only rendered-page evidence separately, linked to a source config and import run. Both staging tables are RLS protected, explicitly denied to public roles, and remain private until review. The active deployed schema is authoritative for implementation details.
## Types and identity

- Internal identifiers: UUID. External merchant product/variant IDs: text to avoid numeric precision loss.
- Times: timestamptz in UTC; render in the shopper's context. Historical audit date is 2026-11-07 IST.
- Money: bigint minor units, currency as a three-letter code. For INR, 159900 = INR 1,599. Parse decimal strings without binary floating-point rounding.
- Null means unknown. Availability is an enum (in_stock, sold_out, unknown), not a default-true boolean. Preorder/prelaunch is a separate fulfilment status.
- Unique merchant identity is store_id + external_id. Product titles, names, URLs and SKUs can change or repeat.

## Core tables

### brands

id PK; slug UNIQUE; display_name; official_site_url; active; created_at. Brand identity is independent of the merchant offering it, so marketplaces can be added without duplicating the brand.

### stores

id PK; slug UNIQUE; brand_id FK nullable; canonical_domain UNIQUE; display_name; country_code; default_currency; platform_hint; active; catalogue_coverage (unknown/sample/partial/feed_complete); coverage_scope JSONB; last_complete_run_id FK nullable; latest_observed_at; created_at.

Coverage is an observation about one source/scope, not a claim to every item the brand sells.

### source_configs

id PK; store_id FK; adapter_kind (shopify_feed/rendered_page/partner_feed/manual); base_url; public_source_urls JSONB; permitted_paths JSONB; price_unit (major_decimal/minor_integer); robots_review_url; robots_checked_at; access_notes; content_use_status (unknown/restricted/approved); enabled; config_version; request_delay_ms; request_cap; scope_key; created_at.

One store can have multiple sources, but exactly one primary catalogue source per active scope. Robots review records must keep agent-group/path reasoning rather than a single global "allowed" flag.

### import_runs

id PK; source_config_id FK; started_at; ended_at; status (running/success/partial/failed/review_required); scope_key; scope_version; complete boolean; cursor JSONB; request_count; discovered_count; seen_count; staged_count; rejected_count; error_summary; collector_version; snapshot_location nullable; published_revision nullable.

Raw snapshots remain compressed locally during the pilot, not duplicated indefinitely inside the 500 MB DB. They contain public product data, not cookies or account information. Keep enough local evidence to reproduce parser errors.

### import_leases

store_id + scope_key composite PK; owner_run_id FK; lease_expires_at; fencing_token bigint; updated_at. Acquire/renew atomically through a restricted DB function. Every stage/publish checks the current fencing token. A stale worker cannot publish after another worker acquires the lease. This is the correctness lock; Redis eviction must not release it.

### categories

id PK; slug UNIQUE; display_name; parent_id FK nullable. Examples: hoodie, sweatshirt, knit-sweater, tee, shirt, jacket, jeans, trousers, shorts, accessories. "Oversized" is fit, not a category. Preserve original merchant type separately.

### products

id PK; store_id FK; brand_id FK; external_id; handle; canonical_url; title; description_text; original_product_type nullable; category_id FK nullable; raw_tags JSONB; fit_label nullable; gsm nullable; material_summary nullable; decoration_type nullable; fulfilment_status (ready/preorder/unknown); lifecycle (active/not_seen/withdrawn); first_seen_at; last_seen_at; content_observed_at; source_updated_at nullable; content_hash; source_config_id FK; source_run_id FK; published_revision.

UNIQUE(store_id, external_id). gsm must be positive if present; reject implausible parsing for review rather than silently fixing. Description is sanitised plain text. Typed fields are published projections of reviewed/accepted evidence, not a replacement for evidence. An importer must not turn missing current facts into inherited verified facts without preserving their older times.

### variants

id PK; product_id FK; store_id FK; external_id; sku nullable; source_option_values JSONB; size_raw nullable; size_normalised nullable; colour_raw nullable; colour_families text[]; price_minor nullable; compare_at_minor nullable; currency; availability; observed_at; price_observed_at; stock_observed_at; variant_url nullable; image_external_id nullable; source_run_id FK; last_seen_at; lifecycle.

UNIQUE(store_id, external_id). Enforce that variant store_id equals its product's store_id through a composite relationship or controlled write function. Never sum sizes across colour variants. XXS, XS, S, M, L, XL, 2XL etc. are merchant labels, not garment dimensions. Preserve waist-based numeric sizes and distinguish gift-card denominations/Default Title from apparel sizes.

### product_images

id PK; product_id FK; external_id nullable; source_url; imagekit_path nullable; content_hash nullable; source_version nullable; gallery_order; alt_text nullable; view_label nullable; observed_at; content_use_status; width nullable; height nullable.

UNIQUE(product_id, source_url). Avoid unsafe URL normalisation that drops a meaningful merchant version query. Repeated transformed URLs may be deduplicated by verified content hash. Do not infer colour purely from filename. image_variant_links(image_id FK, variant_id FK) composite PK maps explicit associations; enforce the same product on both sides.

### attribute_evidence

id PK; product_id FK; variant_id FK nullable; attribute_key; value_json; source_kind (variant/title/description/tag/collection/detail_page/manual); source_url; source_field_path nullable; excerpt; observed_at; evidence_level (explicit/inferred/ambiguous); rule_version; review_status (accepted/pending/rejected/conflict); supersedes_id FK nullable.

If variant_id exists it must belong to product_id. Use this for material composition, fit, GSM, colour, garment measurements and print technique. A manual correction is a separate record with rationale; never overwrite it with a scraped guess. Evidence is limited to relevant excerpts, not full repeated pages.

## Theme/search tables

### themes and vocabulary_terms

themes(id PK, slug UNIQUE, name, parent_id FK nullable, description, active). Examples: racing, motorcycle-racing, automotive, band, anime, football, typography, floral.

vocabulary_terms(id PK, kind, phrase, normalised_value, target_theme_id FK nullable, language_hint, relation (exact/alias/related/weak), context_rule nullable, rule_version, active). Include category aliases, colour aliases, spelling rules and theme terms. Prefer reviewed, bounded expansion over a giant uncontrolled synonym graph.

### product_theme_evidence

id PK; product_id FK; theme_id FK; source_kind; source_url; excerpt; evidence_level; rule_version; review_status; observed_at. UNIQUE on a stable evidence fingerprint. Racing title evidence is stronger than "speed-inspired" marketing. Automotive is related to racing, not equivalent. A theme cannot prove a printing technique.

### product_search_documents

product_id PK/FK; title_terms; description_terms; tag_terms; collection_terms; accepted_theme_ids; weighted_search_vector; search_rules_version; document_hash; published_revision; rebuilt_at.

This table is a rebuildable projection, not the source of truth. Its builder removes nav/footer/recommendation boilerplate. Only a product's own verified collection membership contributes collection terms. Selected variant eligibility is applied by joining variants, never by searching this text document for an arbitrary size or colour string.

## Commerce rules and quotes

policy_versions(id PK, store_id FK, source_url, policy_kind, summary, observed_at, effective_from nullable, effective_to nullable, conflict_state, evidence_excerpt).

commerce_rules(id PK, policy_version_id FK, rule_kind (shipping/cod/return/exchange/promotion), scope_json, conditions_json, outcomes_json, priority, reviewed_at nullable, status (verified/unknown/conflicting/expired)). Conditions must cover payment method, first-order status, date window, geography, minimum subtotal, excluded items/categories and promotional restrictions where relevant. Return outcome distinguishes original_payment/store_credit/exchange_only/no_routine_returns/unknown.

quotes are computed responses in v1, not permanently stored rows for every query. Include the exact variant and all conditions used. Item price, shipping, COD, discount, known subtotal and delivered total are separate. Null delivered total is valid. Cache only by complete context fingerprint.

Price observations: variant_observations(id PK, variant_id FK, observed_at, price_minor, compare_at_minor, currency, availability, source_run_id FK). Write only when tracked values change; keep 30 days initially plus current state. No impression-based price history. Do not advertise "lowest price" from an incomplete history.

## Revisions and outbound links

catalogue_state(id singleton PK, revision bigint, published_at, search_rules_version). Increment revision in the same publish transaction that changes visible catalogue/rules.

publication_outbox(id PK, revision UNIQUE, created_at, cache_notified_at nullable, attempts). Allows retrying Redis invalidation without losing a successful DB publication.

affiliate_campaigns(id PK, store_id FK, network, status (unknown/applied/active/paused/rejected/expired), checked_at, allowed_traffic_json, terms_url, approved_link_strategy, attribution_notes). Credentials stay outside DB rows/client responses.

outbound_links(id PK, product_id FK, variant_id FK nullable, campaign_id FK nullable, destination_url, destination_kind (merchant/affiliate), status, checked_at). Validate scheme/host and affiliate path against a reviewed allowlist. An active ordinary merchant link is not proof of affiliate approval.

click_events(id PK, outbound_link_id FK, occurred_at, anonymous_click_ref, query_fingerprint nullable, source_surface). No raw IP, personal photo, full chat text or account identity. Retain raw events 30 days and roll up counts. Link-click events are not orders or confirmed commission.

## Index plan

- Unique store/external IDs for products/variants and indexed foreign keys.
- products(category_id, lifecycle), variants(product_id, availability, size_normalised), variants(currency, price_minor) and a suitable index for colour filtering after inspecting query plans.
- GIN on weighted_search_vector; optional trigram title index for controlled typo fallback. Do not trigram-scan every long description.
- product_theme_evidence(theme_id, review_status, product_id).
- observations(variant_id, observed_at DESC), runs(source_config_id, started_at DESC), evidence(product_id, attribute_key, review_status).
- No indexes on every JSONB column without measured demand. Projection fields provide the hot filters.

## Access and retention

Public API returns bounded read models, not raw tables. Import/admin writes go through server credentials and restricted functions; service role is never in the browser. Apply RLS appropriate to all exposed tables/functions. Audit return types and security-definer functions before exposure.

Keep recent raw source snapshots locally for 7 days, change history/clicks for 30 days, concise failed-run summaries for 90 days, and current source evidence while its fact remains published. Export database backups locally before major imports; free tier does not include automatic backups. Target below 250 MB initially and investigate by 70% of the provider quota.
