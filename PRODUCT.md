# Product brief

## Confirmed intent

An Indian Gen Z shopper likes niche streetwear brands but does not want to browse every brand. They describe requirements, compare suitable items and purchase on a merchant website. Initial budget examples are around INR 1,500. The system should support tees, hoodies, sweaters, pants and other catalogue categories, not assume every search is a hoodie search. Start with ten brands and design configuration to allow forty later.

The user requires a free-first approach, Redis in the design, a carefully planned database, and a handoff another agent can implement. Photo search is deferred by explicit user instruction. Brand product photos still appear in results.

## Synthetic shopper debate

Three agents represented a budget shopper (19–22), image-led shopper (22–25) and skeptical shopper (25–28). This was a design exercise, not real market research. Their useful consensus:

- Size and delivered budget should constrain eligibility before relevance ranking.
- Unknown shipping cannot be presented as a confirmed within-budget total.
- Explain the strongest match and the main compromise.
- Guest use and local shortlists beat forced signup.
- Allow original-payment refunds and size exchanges as optional hard requirements; display restrictions for everyone.
- On zero results, preserve the original request and offer one explicit relaxation at a time.
- Do not show multiple gallery views as separate products.
- Prefer useful saved searches over purchase streaks or spinning rewards.

## Primary flow

Type request -> editable interpretation chips -> 3–5 eligible choices -> compare up to three -> open merchant. Retain query and compare state when returning from the merchant.

Example: "black hoodie with racing prints under 1500, size M". Interpretation: hoodie category, black garment colour, racing graphic theme, M label, maximum total 150000 paise. Expose any missing shipping/pincode/payment/coupon context rather than inventing it.

## V1 capabilities

- Natural-looking text box with deterministic parsing for supported vocabulary and visible corrections.
- Category, garment colour, size, price mode, budget, fit and theme filters.
- Optional material, GSM and return requirements only when evidence exists.
- Local save/compare; browser-local preferences only with clear delete/reset.
- Source-backed product details, image gallery, policy summaries and cost arithmetic.
- Affiliate outbound links only when an active approved campaign exists; otherwise ordinary merchant links.
- Admin/import review for missing attributes, policy conflicts and failed source checks.

## Deferred

Image upload/search, vision tags, text embeddings, LLM chat, fit prediction, checkout integration, cart merging, cross-device accounts, push/email alerts, user reviews, automated order tracking, cash rewards and multi-touch attribution experiments.

## Proposed interaction targets to validate

- A new guest can get a useful shortlist without a tutorial, questionnaire or account.
- Search results should feel immediate; aim for a two-second initial search on normal mobile connections, but measure rather than advertise an untested guarantee.
- A shopper can identify price, selected size and the return catch before leaving the site.
- Zero matches are an acceptable truthful result; a violated hard requirement is not.
- At least 30 representative queries should be judged manually for relevance before declaring text search ready. These are proposed validation targets, not completed studies.

## Visual/interaction direction

Operate mode: one prominent search field, quick examples, editable chips, product photos, low-clutter result cards, and a sticky compare tray. Mobile comparison uses stacked/swipeable cards with common fields aligned. Accessible labels, visible keyboard focus, large tap targets, readable contrast and reduced-motion support are required. Do not decorate with fake customer counts, urgency timers or fabricated ratings.
