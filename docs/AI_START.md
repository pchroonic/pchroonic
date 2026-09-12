# Namdar AI fast resume

Last verified: 2026-09-12 UTC

Read this first. Use `docs/AI_HANDOFF.md` for implementation detail, `docs/PROJECT_STATUS.md` for the roadmap, and `docs/ADDRESS_DATA_PRODUCT.md` for the address/property-data business architecture.

## Current phase

**Phase 7 — Launch Security & Readiness**

## Address data rights/commercial foundation — LIVE

PR #32 `Make address data rights-aware and subscription-ready` is merged and deployed.

- Product merge: `6c898735b58c03922d6ce24b97598af466242e85`.
- Exact PR head: `5fc878943989bee78f2a2a3435fdaf24927ff20f`.
- GitHub CI run `34708390739`: SUCCESS, including commercial/right-safety tests.
- Exact-head Vercel preview `dpl_GTEsv7CqMkqKgGqRMMXTVw68XPkg`: READY, clean build.
- Production deployment `dpl_81uZqzB2LA1efMcSXMXv4hs1kSHN`: READY, aliased to `https://namdar.co.uk`, no alias error.
- Supabase migration live: `20260912173038 address_data_rights_and_distribution_guard`.

## Critical GetAddress rule — DO NOT HARVEST

The old plan to build Namdar's database by automatic/manual background GetAddress harvesting is permanently superseded unless GetAddress grants explicit written permission.

Current GetAddress Terms say Autocomplete/Typeahead must be initiated by human input; automated address lookups can cause account closure; large offline dataset extraction is prohibited; and resale requires explicit permission.

Therefore:
- no scheduled GetAddress harvest;
- no manual harvest run;
- no full GetAddress cache/backup export;
- no GetAddress-derived paid API/resale;
- keep GetAddress only for permitted human-triggered operational address quality/search unless rights change.

The old endpoint remains protected/guarded as defense in depth, but `/api/address-harvest-cron` is no longer in Vercel's cron schedule.

Production remains clean:
- GetAddress Automatic OFF;
- zero harvest runs;
- zero harvest queue rows;
- zero `getaddress-daily-cache` rows;
- no provider harvest lookup was consumed by this work.

## Rights-aware source model now live

`address_dataset_registry` now records machine-readable rights including automation, human-input requirement, commercial redistribution, subscription API, bulk export, share-alike, attribution and terms/permission references.

Current policies:
- **GetAddress** — `restricted_provider`; operational use allowed, human input required; automation, commercial redistribution, subscription API and bulk export BLOCKED.
- **OpenStreetMap** — `odbl`; operational use allowed; share-alike tracked; excluded from proprietary subscription API/bulk export by default.
- **OS Open UPRN** — planned inactive `ogl` source; automation/commercial/API/export allowed in principle after import/verification.
- **Code-Point Open** — planned inactive `ogl` source; same commercial foundation role after import/verification.

Unknown/new sources fail closed.

## Bugs fixed

1. Provider rights were previously not machine-readable; fixed with explicit rights fields and central policy checks.
2. GetAddress provider cache/backups could previously be downloaded wholesale; now blocked by source rights.
3. Priority Typeahead discovery could start before a late provider restriction check; new compliance wrapper checks rights before entering the priority worker.
4. Vercel still scheduled the old daily harvest endpoint; schedule removed.
5. Dataset counts could drift/over-count. Production OSM registry was stale at 0 while one actual row existed; migration reconciled it to 1 and statement triggers now keep counts exact.

`address_dataset_health` currently reports every registered source `count_in_sync = true`.

## Commercial distribution firewall

`address_distribution_eligible` is server-only and returns rows only when the source is active AND both:
- `commercial_redistribution_allowed = true`
- `subscription_api_allowed = true`

Current eligible rows = **0**, intentionally. Restricted GetAddress and ODbL OSM observations cannot accidentally leak into the future proprietary Address API merely because they exist in `master_addresses`.

## Future Namdar Address API — FOUNDATION LIVE, PRODUCT OFF

Server-only tables are live:
- `address_api_clients`
- `address_api_keys` — hashes only, never raw issued keys
- `address_api_usage_daily`

Quota function was transactionally verified: with monthly limit 2, requests 1 and 2 succeeded and request 3 was blocked.

`/api/address-data-v1` is deployed but returns HTTP 503 `Namdar Address API is not enabled.` because `ADDRESS_DATA_API_ENABLED` is not enabled. There are zero API clients and zero API keys.

When eventually enabled it requires bearer API key, active entitled client, monthly quota, max 100 rows/request and reads only `address_distribution_eligible` with source/licence/attribution metadata.

Do not enable it yet.

## Commercial roadmap

Build a sellable Namdar property/data product from rights-safe sources, not restricted provider caching:

1. Import **OS Open UPRN** for stable property IDs and coordinates.
2. Import **Code-Point Open** for postcode/location intelligence.
3. Add versioned import/update pipelines and quality/coverage metrics.
4. Build `property_entities` keyed by UPRN and `property_field_observations` with source, observed date, confidence and redistribution rights.
5. Offer licence-safe products first: UPRN lookup/enrichment, postcode/geospatial intelligence, serviceability/territory/route analytics and data-quality tools.
6. Obtain explicit redistribution/subscription rights for complete full postal-address text before selling a full-address product.
7. Add billing/API-key issuance/rotation/admin UI, throttling, API terms/SLA and Stripe only when the data/licence layer is ready.

Do not use HM Land Registry Price Paid address strings as a shortcut to a resale address database; third-party Royal Mail/OS address rights apply. Keep OSM provenance separate because ODbL share-alike obligations can affect redistribution.

## GetAddress can still benefit Namdar

Potential future human-triggered uses, subject to current terms:
- Validate/correct a customer-entered address;
- human postcode/address search in the customer flow;
- Private Addresses so Namdar-specific verified addresses can appear in searches;
- provider usage/cost monitoring.

These are operational product improvements, not a wholesale data-harvesting strategy.

## Immediate next address milestone

Design/import **OS Open UPRN + Code-Point Open** and the UPRN property entity model. Do not resume the one-postcode GetAddress harvest test.

## Security verification

- New API client/key/usage tables have RLS enabled and no anon/auth browser privileges; service role only.
- anon/auth cannot select `address_distribution_eligible` or execute the quota function.
- Supabase advisor only reports expected `RLS enabled, no policy` INFO for these server-only tables; no new exposed-data issue.
- Count insert/delete triggers and API quota logic were verified transactionally.

## Other open work

- fresh privileged Admin password + CAPTCHA + MFA completion still pending;
- recurring `/api/booking-notifications` 504s need separate investigation;
- remaining Auth templates + Magic Link;
- DMARC/BIMI;
- same-iPhone overflow confirmation;
- Stripe, SMS, legal and remaining launch checks.

## Do not break

- Storage does not equal ownership/redistribution permission.
- New/unreviewed datasets fail closed for automation/distribution.
- Paid data surfaces must query a rights-aware eligible surface, not raw `master_addresses`.
- Never expose provider, Supabase, SMTP, Turnstile, GitHub, cron or future customer API secrets.
- Do not re-add GetAddress automated harvesting without explicit written permission and a recorded rights review.
- Support tickets remain customer-only; public inbound email remains Admin Email inbox.