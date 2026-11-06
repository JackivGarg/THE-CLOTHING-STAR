# Implementation status

This is an early local prototype, not a production catalogue. Start the API with `npm run server`, and in another terminal run `npm run dev`. Open the local Vite URL. The demo products are fictional.

Supabase project `the-clothing-star` was created separately in the Jackyy organization (Mumbai) and the starter migration applied. It contains no product data. The API reads published records using a publishable key, with RLS and select-only grants; no service-role key is needed. Redis expects `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`; cache failure falls back to the database. No Redis instance has been created yet. Do not use in production until full RLS tests, import review, pagination, rate limits, and deployment hardening are complete.

ImageKit public and private keys supplied by the owner are stored in ignored `.env`. A delivery URL endpoint and permission-reviewed media are still needed. Do not put the private key in frontend code, screenshots, or the repository. No ImageKit upload or usage has been performed.

The UI and search are partial: no real scraping, affiliate linking, image search, complete acceptance suite, editable filter chips, comparison, reliable theme extraction, or policy calculation yet. Source access and media rights remain unresolved. The 1,000-row in-memory prototype search is not suitable for the planned full catalogue. The historical planning documents describe intended scope, not completed features.
