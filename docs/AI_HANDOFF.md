# Namdar AI handoff

Last verified: 2026-09-12 UTC

Read `docs/AI_START.md` first. For the commercial address/property-data design read `docs/ADDRESS_DATA_PRODUCT.md`.

## Source of truth

- Product: Namdar UK property services platform.
- Repository: `pchroonic/pchroonic`, default `main`.
- Current verified product commit: `6c898735b58c03922d6ce24b97598af466242e85` from merged PR #32.
- PR #32 exact head: `5fc878943989bee78f2a2a3435fdaf24927ff20f`.
- GitHub workflow `34708390739`: SUCCESS.
- Exact-head Vercel preview: `dpl_GTEsv7CqMkqKgGqRMMXTVw68XPkg`, READY, clean build.
- Production Vercel: `dpl_81uZqzB2LA1efMcSXMXv4hs1kSHN`, READY on `https://namdar.co.uk`, no alias error.
- Supabase: `namdar-production` (`qjigldxjcpnrlyxgmlqq`), Free plan.
- Production migration: `20260912173038 address_data_rights_and_distribution_guard`.

## Provider-terms correction — GetAddress harvest is NOT the roadmap

The previous plan to perform a controlled one-postcode GetAddress harvest is superseded.

Current GetAddress Terms say Autocomplete/Typeahead must be human-input initiated, automated address lookups can cause account closure, large offline dataset extraction is prohibited, and resale needs explicit permission.

Therefore:
- do not run manual/background GetAddress harvest;
- do not enable automatic harvest;
- do not re-add `/api/address-harvest-cron` to Vercel schedule;
- do not bulk-export GetAddress-derived cache/backups;
- do not sell/re-serve GetAddress-derived data through Namdar's paid API unless explicit written permission is obtained and policy is deliberately changed.

The old worker remains source-controlled for possible future licensed use, but normal Admin/cron paths are blocked by a compliance layer before priority Typeahead discovery can run.

Production remains clean: Automatic OFF, zero harvest runs, zero queue rows and zero `getaddress-daily-cache` rows. No GetAddress harvest lookup was consumed by this release.

## Live rights architecture

Migration added machine-readable fields to `address_dataset_registry`:
- licence category/name/reference;
- operational-use permission;
- human-input requirement;
- automated-ingest permission;
- commercial-redistribution permission;
- subscription-API permission;
- bulk-export permission;
- share-alike flag;
- attribution;
- terms/permission reference;
- review timestamp/notes.

New/unknown sources default fail-closed.

Current production policies:
- `getaddress-daily-cache`: `restricted_provider`; operational=true, human input=true, automated=false, commercial=false, subscription=false, export=false.
- `osm-postcode-cache`: `odbl`; operational=true, share-alike=true, commercial=true in principle, but subscription=false/export=false until an ODbL-compatible product is deliberately designed.
- `os-open-uprn`: inactive planned `ogl`; automation/commercial/subscription/export true in principle after import verification.
- `code-point-open`: inactive planned `ogl`; same.

## Bugs fixed

### Provider-rights ambiguity
Before PR #32, GetAddress had no machine-readable licence/automation/resale/export flags. Now `lib/address-policy.js` centralises policy and fails closed if rights metadata is unavailable.

### Priority discovery before restriction
A restriction only in the base paid worker would have been too late because `lib/address-harvest-priority.js` can issue Typeahead calls first. New `lib/address-harvest-compliance.js` checks source rights before entering the priority worker.

### Unsafe bulk provider export
`api/admin-address-harvest-export.js` now checks `bulkExportAllowed` before full cache or per-run backup retrieval. GetAddress policy blocks it.

### Scheduled harvest still existed
`vercel.json` no longer contains `/api/address-harvest-cron`. The endpoint remains authenticated/rights-guarded only as defense in depth.

### Dataset count drift
Production had 1 OSM `master_addresses` row while registry count was 0. Migration reconciled to 1. Statement-level insert/update/delete triggers now recalculate exact counts for affected source datasets. `address_dataset_health` shows stored vs actual counts and sync state.

All current registered sources report `count_in_sync=true`.

## Distribution firewall

`address_distribution_eligible` is a security-invoker, service-role-only view. It only returns active `master_addresses` rows whose source has both:
- `commercial_redistribution_allowed=true`
- `subscription_api_allowed=true`

Current eligible rows = 0 by design. Neither GetAddress nor OSM can enter the future proprietary subscription surface under current policy.

anon/authenticated cannot select this view.

## Future paid Address API foundation — LIVE BUT DISABLED

Tables, all RLS + service-role-only:
- `address_api_clients`
- `address_api_keys`
- `address_api_usage_daily`

API keys store SHA-256 hash plus prefix only; raw issued keys must never be persisted after issuance.

`consume_address_api_request(...)` enforces active client + monthly quota and records request/row/byte usage. Transactional production test with monthly limit 2: request 1 passed, request 2 passed, request 3 correctly blocked; test client was removed.

`/api/address-data-v1`:
- deployed;
- currently returns HTTP 503 `Namdar Address API is not enabled.` because `ADDRESS_DATA_API_ENABLED` is not enabled;
- requires bearer API key when enabled;
- active client + `address-v1` entitlement;
- monthly quota;
- max 100 rows/request;
- only queries `address_distribution_eligible`;
- returns provenance/licence/attribution metadata;
- response cache disabled.

Current production: 0 API clients, 0 API keys, 0 eligible rows.

Do not enable API yet.

## Security/database verification

- Migration live as `20260912173038`.
- GetAddress rights verified fail-closed.
- OSM count fixed to actual 1.
- planned OS sources inactive with 0 rows.
- all source registry counts in sync.
- count triggers tested inside rollback transaction: insert updated source count 0→1; delete 1→0.
- API quota function tested as described above.
- anon/auth have no SELECT on API client tables or distribution view and no EXECUTE on quota function.
- Supabase security advisor reports expected `RLS enabled, no policy` INFO for new server-only tables; this is deliberate. No new exposed-data finding.
- performance advisor reported no new unindexed foreign key from the subscription schema. API key prefix index is unused as expected because API is disabled/no customers.

## Admin/live production verification

- `admin-address-harvest.js` HTTP 200 on production and contains rights UI.
- Admin panel disables automatic/manual provider harvesting and bulk export when policy blocks them.
- unauthenticated `/api/admin-address-harvest` returns 401.
- unauthenticated `/api/address-harvest-cron` returns 401, but endpoint is no longer scheduled.
- `/api/address-data-v1` returns 503 disabled.

## Commercial data roadmap

Next address milestone is **not GetAddress harvesting**.

1. Import OS Open UPRN with dataset versioning/deltas and required attribution.
2. Import Code-Point Open with versioning/deltas and required attribution.
3. Build `property_entities` keyed by UPRN.
4. Build `property_field_observations` with source, source record, field value, observed time, authority/confidence and redistribution rights.
5. Add quality model: source authority, freshness, independent agreement, completeness, coordinate confidence, contradiction/anomaly state.
6. Launch licence-safe products first: UPRN lookup/enrichment, postcode/location intelligence, serviceability/territory/routing analytics and data-quality tools.
7. Obtain explicit redistribution/subscription rights for full postal-address text before a complete address resale product.
8. Later add API customer/key admin UI, key rotation, rate limits, Stripe plans, API terms, SLA, webhooks/deltas and enterprise exports.

Do not use HM Land Registry Price Paid address strings as a full-address resale source; third-party Royal Mail/OS rights apply. OSM requires deliberate ODbL/share-alike handling.

## GetAddress future operational role

GetAddress can still improve Namdar where requests are human-triggered and permitted by current terms. Candidates to investigate/integrate later:
- Validate API to clean/correct a customer-entered address;
- customer postcode/address search initiated by typing/input;
- Private Addresses for Namdar-specific verified addresses in search;
- provider usage/cost monitoring;
- domain/browser token patterns that avoid exposing server API keys where appropriate.

Never conflate these operational features with ownership of a redistributable address dataset.

## Server-side secrets

- GetAddress provider keys remain server-side only.
- `ADDRESS_DATA_API_ENABLED` must remain absent/false until commercial launch readiness.
- Future customer API keys must be generated securely, raw value shown once, only hash stored.
- No provider/API/TOTP/SMTP/GitHub secrets in Git/docs/chat.

## Other open work

- privileged Admin fresh password/CAPTCHA/MFA completion pending;
- recurring `/api/booking-notifications` 504 investigation;
- remaining Auth templates + Magic Link;
- DMARC/BIMI;
- same-iPhone overflow confirmation;
- Stripe/SMS/legal/general launch checks.

## Non-negotiable rules

- Storage != redistribution rights.
- Every data source needs explicit rights metadata before automation/distribution.
- New/unreviewed sources fail closed.
- Paid data APIs/exports use a rights-filtered surface, never raw `master_addresses`.
- Do not restore GetAddress automated harvesting without explicit written provider permission and a recorded rights review.
- Support tickets remain customer-only; public inbound email remains Admin Email inbox.
- Privileged staff access requires AAL2.
- Never use/reproduce the previously exposed GitHub PAT.

## Required workflow

For substantial data/provider work use branch → PR → CI → preview → migration/data verification → merge → production verification, and update `AI_START`, this file and `PROJECT_STATUS` together. Never overclaim a provider/runtime path that was not exercised.