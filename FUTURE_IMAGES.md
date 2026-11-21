# Reference-photo search

Photo matching is now part of the backend roadmap. On 21 November 2026 a local CPU experiment on public clothing images completed. The next step is a held-out test with real fashion photos cleared for indexing. The pilot design, results, cost and release criteria are in the [backend completion plan](BACKEND_COMPLETION_PLAN.md#4-add-photo-search-without-a-paid-inference-service).

The planned guest flow accepts a garment crop, optional appearance preferences such as shape or graphic, and the usual size and budget filters. It returns similar styles with their qualifying variants and explains differences.

Catalogue product photos already have product/variant associations in the v1 schema. Add versioned image embeddings only after testing a model. Match user/catalogue preprocessing and model/version exactly. Re-index new/changed images, not each repeated price refresh. Group gallery views into a single product result and do not borrow a different colour's price.

The first experiment used an existing computer and a pinned 83.3 MiB quantized vision model. Browser-local inference remains an option if phone download, battery, memory and latency measurements support it. The desktop test measured category retrieval on a small grayscale gallery. Phone and real-fashion retrieval tests are pending.

Default user photo handling should remain local/temporary, with explicit save/delete choice if storage is later added. Do not put private reference uploads in publicly accessible ImageKit media paths. ImageKit delivery alone is not a visual search engine. Cloud inference is not covered by an unlimited free assumption.

Before approval-to-launch: test on ordinary phones, diverse reference crops, front/back views and low-confidence/no-match cases. Compare human relevance judgements, avoid a fabricated match percentage, keep hard requirements and disclose indexed catalogue coverage. Vision cannot prove material, GSM, durability, availability or return rights.
