# Namdar project status

Last updated: 2026-09-12 UTC

## Baseline

- Source: `pchroonic/pchroonic`, default branch `main`.
- Latest main docs merge before current candidate: `ae67594d6f744ee0c9c26520ba041402282e224b`.
- Latest verified product behavior before candidate: `945091c31cab6600916cd07854de3df4ac830d6a` from PR #30.
- Production: `https://namdar.co.uk` on Vercel project `namdar-website-starter-1`.
- Supabase: `namdar-production` (`qjigldxjcpnrlyxgmlqq`), Free.
- Resend domain verified; sending/receiving enabled.

## Main product areas

| Area | Status |
| --- | --- |
| Public website | Live; Windows/Edge overflow fixed, same-iPhone final confirmation pending |
| Customer portal | Email + Google auth, customer MFA option, Turnstile/Supabase CAPTCHA live |
| Auth email branding | Reset Password live/verified; remaining prepared templates pending hosted apply/test |
| Sender avatar / BIMI | Paused; no DMARC record added yet |
| Admin/Staff security | Mandatory privileged AAL2/MFA live; Turnstile integration live; full fresh password + CAPTCHA + MFA completion still pending |
| Email inbox | Spam controls + Inbox Security v2 live |
| Address system | Existing master/directory/OSM lookup live; GetAddress automated harvesting is now considered provider-terms incompatible and is being hard-blocked; rights-aware commercial foundation candidate in progress |
| Future Address API | Foundation candidate only; disabled by default; no customers/keys/data product live |
| Support tickets | Customer-only; public inbound email stays in Admin Email inbox |

## Critical GetAddress terms finding

The previous one-postcode/automatic-harvest roadmap is superseded.

Current GetAddress Terms state that Autocomplete/Typeahead queries must be initiated by human input, automated address lookups can lead to account closure, large offline dataset extraction is prohibited, and resale requires explicit permission.

Decision:
- keep GetAddress as an operational/human-initiated source only where permitted;
- no automated database harvesting;
- no bulk provider-cache exports;
- no GetAddress-derived paid subscription API/resale without explicit written permission;
- remove the scheduled harvest cron;
- enforce the rule in code and database rights metadata, not only documentation.

Production remains clean: zero GetAddress harvest runs, zero queue rows, zero GetAddress master rows and no harvest lookup spent.

## Address data audit bugs found

### 1. Provider rights were not machine-readable

`getaddress-daily-cache` was registered with `licence_name = null` and no automation/resale/export flags. Future features could therefore accidentally treat restricted rows like ordinary Namdar data.

Fix candidate: extend `address_dataset_registry` with explicit operational/automation/redistribution/API/export/share-alike rights and fail-closed defaults.

### 2. Full GetAddress cache/backups could be exported

Protected Admin endpoint could download the entire GetAddress cache as CSV/JSON or per-run backups. That is unsafe under the provider's large offline extraction/resale restrictions.

Fix candidate: `bulkExportAllowed` guard before any dataset/backup export.

### 3. Automation guard was too late conceptually

The priority worker can perform Typeahead discovery before the base paid worker. Merely blocking the paid lookup would not be enough.

Fix candidate: new compliance wrapper checks source rights **before the priority worker is entered**, so restricted automation cannot make Typeahead/Autocomplete calls.

### 4. Scheduled harvest still existed

`vercel.json` still scheduled `/api/address-harvest-cron` daily at 03:30 UTC even though Automatic was OFF.

Fix candidate: remove the cron schedule entirely; endpoint remains guarded for defense in depth.

### 5. Dataset row counts drift

Production currently has 1 `osm-postcode-cache` row in `master_addresses`, but registry `row_count` says 0.

The GetAddress worker also incremented registry count by rows upserted, which can over-count duplicate/upserted records.

Fix candidate:
- exact reconciliation;
- statement-level source-aware insert/update/delete triggers;
- `address_dataset_health` view with actual count + sync state.

## Current candidate branch

`fix/address-data-rights-and-commercial-foundation-20260912`

Candidate migration:
`supabase/migrations/20260912172500_address_data_rights_and_distribution_guard.sql`

### Rights registry

Adds:
- licence category;
- operational use;
- human-input requirement;
- automated bulk ingest;
- commercial redistribution;
- subscription API;
- bulk export;
- share-alike;
- attribution;
- terms/permission references;
- reviewed timestamp/notes.

Policies:
- GetAddress → operational/human-input only, automation/resale/API/export blocked.
- OSM → ODbL/share-alike tracked; excluded from proprietary subscription API by default.
- OS Open UPRN → planned/inactive OGL source, commercial/API/export allowed in principle once imported/verified.
- Code-Point Open → planned/inactive OGL source, commercial/API/export allowed in principle once imported/verified.

### Commercial data firewall

`address_distribution_eligible` is service-role-only and returns only active rows whose source explicitly allows both commercial redistribution and subscription API use.

Future paid data endpoints must query this view, not raw `master_addresses`.

### Subscription API foundation

Server-only/RLS tables:
- `address_api_clients`;
- `address_api_keys` (hash only);
- `address_api_usage_daily`.

Server function `consume_address_api_request` checks active client/monthly quota and records usage.

Candidate endpoint `/api/address-data-v1`:
- OFF unless `ADDRESS_DATA_API_ENABLED=true`;
- bearer API key required;
- active client + `address-v1` entitlement required;
- max 100 rows/request;
- queries only `address_distribution_eligible`;
- returns provenance/licence/attribution;
- no API customer/key is created by migration.

Do not enable yet.

### Admin/worker safeguards

- new central `lib/address-policy.js`;
- new `lib/address-harvest-compliance.js` checks rights before priority discovery/provider calls;
- Admin API blocks enabling/running restricted automation;
- cron endpoint also uses compliance wrapper;
- Vercel scheduled harvest removed;
- provider bulk export blocked when rights say no;
- Admin panel displays rights state and disables restricted controls.

### Regression tests

`address-commercial-foundation.test.mjs` verifies:
- unknown source fails closed;
- restricted GetAddress policy blocks automation/resale;
- approved source can pass;
- API key hashing/output minimisation;
- no scheduled harvest cron;
- migration distribution filters/API tables;
- bulk export rights guard.

CI now syntax-checks new API/policy/compliance files and runs the new test.

## Commercial address/property strategy

See `docs/ADDRESS_DATA_PRODUCT.md`.

Recommended foundation:
1. OS Open UPRN — stable UPRN/property-point identity + coordinates under OGL.
2. Code-Point Open — postcode/location intelligence under OGL.
3. UPRN-based property entity + field-level source provenance/confidence.
4. Obtain explicit full-address redistribution/subscription rights before selling complete postal-address data.
5. Keep OSM share-alike data and restricted provider observations separated from proprietary licensed data.

Potential future products before full-address resale:
- UPRN lookup/enrichment;
- postcode coordinates/territory intelligence;
- serviceability/coverage API;
- route/area analytics;
- data normalisation/quality scoring;
- later licensed full-address API, enterprise snapshots/deltas and property intelligence.

## Current production address state before candidate migration

- Automatic GetAddress setting OFF.
- Service-area priority ON.
- Daily cap 20.
- Zero harvest runs.
- Zero harvest queue rows.
- Zero GetAddress master rows.
- 1 OSM master row; registry incorrectly says 0 until migration reconciliation.
- No paid/scheduled harvest provider lookup consumed.

## Immediate next actions

1. Run candidate CI and Vercel preview.
2. Apply/review Supabase rights/commercial-foundation migration.
3. Verify rights flags, grants/RLS/views, OSM row count correction and API tables.
4. Merge only after checks pass.
5. Verify production has no address-harvest cron and restricted actions are blocked.
6. Do not run the old one-postcode GetAddress harvest test.
7. Next address engineering milestone: OS Open UPRN + Code-Point Open import/versioning plan and UPRN property entity model.

## Auth/security

- Canonical Site URL/redirect allowlist hardened.
- Email + Google intentionally enabled.
- Cloudflare Turnstile/Supabase CAPTCHA live.
- Customer login/password-reset request smoke-tested.
- Privileged Turnstile repair live; fresh Admin password/CAPTCHA/MFA completion still requires interactive user action.
- Privileged browser/API/RLS access requires AAL2.
- Leaked Password Protection unavailable on current Supabase Free plan.

## Other open issues

- recurring `/api/booking-notifications` 504s need separate investigation;
- remaining Auth templates + Magic Link;
- DMARC/BIMI;
- same-iPhone overflow confirmation;
- Stripe, SMS, legal, cron/double-booking and controlled customer-support launch checks.

## Handoff rule

Every substantial provider/data-product change updates `docs/AI_START.md`, `docs/AI_HANDOFF.md`, and this file together. Never store credentials, raw API keys, customer secrets, TOTP codes or one-time Auth links. Data-source rights must be reviewed before enabling automation or distribution.