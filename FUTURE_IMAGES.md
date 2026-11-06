# Deferred image-search extension

Do not implement this in v1. The user explicitly deferred reference-photo upload/search. This file preserves earlier analysis so it is not accidentally rebuilt as an active requirement.

If approved later: optional guest photo -> manual garment crop -> choose appearance priority (shape, wash/colour, graphic) -> budget/size filters -> closest available options with differences explained. Avoid selfie/body-shape requirements or exact-fit predictions.

Catalogue product photos already have product/variant associations in the v1 schema. Add versioned image embeddings only after testing a model. Match user/catalogue preprocessing and model/version exactly. Re-index new/changed images, not each repeated price refresh. Group gallery views into a single product result and do not borrow a different colour's price.

Browser-local inference can avoid per-query cloud inference fees and keep photos local, but model download, battery, memory, browser support and device speed are real constraints. Earlier candidate CLIP vision models had tens-of-MB downloads; no phone benchmark or retrieval-quality experiment was completed. An open model is not free compute or a guarantee of good fashion matching.

Default user photo handling should remain local/temporary, with explicit save/delete choice if storage is later added. Do not put private reference uploads in publicly accessible ImageKit media paths. ImageKit delivery alone is not a visual search engine. Cloud inference is not covered by an unlimited free assumption.

Before approval-to-launch: test on ordinary phones, diverse reference crops, front/back views and low-confidence/no-match cases. Compare human relevance judgements, avoid a fabricated match percentage, keep hard requirements and disclose indexed catalogue coverage. Vision cannot prove material, GSM, durability, availability or return rights.
