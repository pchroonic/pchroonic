# Namdar project status

Last updated: 2026-09-12 UTC

## Baseline

- Source: `pchroonic/pchroonic`, default branch `main`.
- Current verified production product commit: `6c898735b58c03922d6ce24b97598af466242e85` from PR #32.
- Production deployment `dpl_81uZqzB2LA1efMcSXMXv4hs1kSHN` READY on `https://namdar.co.uk`.
- Supabase project: `namdar-production` (`qjigldxjcpnrlyxgmlqq`), Free.
- Rights migration live: `20260912173038 address_data_rights_and_distribution_guard`.
- Production DB size checked at ~16 MB; current Free database limit is 500 MB.

## Main product areas

| Area | Status |
| --- | --- |
| Public website | Live; Windows/Edge overflow fixed, same-iPhone final confirmation pending |
| Customer portal | Email + Google auth, customer MFA option, Turnstile/Supabase CAPTCHA live |
| Admin/Staff security | Mandatory AAL2/MFA live; fresh password + CAPTCHA + MFA completion still pending |
| Email inbox | Spam controls + Inbox Security v2 live |
| Address system | Rights-aware source registry/count firewall LIVE; GetAddress automated harvesting BLOCKED |
| OS property/postcode data | UPRN + Code-Point storage/import candidate in progress on feature branch |
| Future data API | Foundation LIVE but disabled; candidate split into address/postcode/property products |
| Support tickets | Customer-only; public inbound email stays Admin Email inbox |

## GetAddress status

Old harvesting roadmap remains cancelled under current provider terms unless explicit written permission is obtained.

Production remains Automatic OFF, zero harvest runs, zero queue rows, zero GetAddress master rows. Scheduled harvesting is absent from Vercel and restricted automation/export paths fail closed.

## Current candidate: OS Open UPRN + Code-Point Open

Branch: `feat/os-open-uprn-codepoint-foundation-20260912`.

Candidate migration: `20260912190000_os_open_property_foundation.sql` — **not applied yet**.

### New property/postcode model

- `postcode_points`: Code-Point postcode unit, PQI, grid coordinates, derived WGS84 and administrative codes.
- `property_entities`: one row per UPRN with OS Open UPRN location/source/version.
- `property_field_observations`: sparse future enrichment facts keyed to UPRN with source/version/confidence.
- `open_data_import_runs`: source version, scope, metadata/checksum, row counters and completion state.

`master_addresses` remains the correct place for actual address observations. UPRN/location data is no longer forced into an address-shaped table.

### Rights/count architecture

Registry candidate adds `record_store`, OS product ID, expected refresh cadence and version-check metadata.

Source count tracking will work across:
- address rows (`master_addresses`),
- postcode rows (`postcode_points`),
- property rows (`property_entities`).

Rights-filtered service-role-only views:
- `postcode_distribution_eligible`;
- `property_distribution_eligible`;
- `property_field_distribution_eligible`.

Sources still need active + redistribution/API rights before rows can enter paid surfaces.

### Version/import safety

Import finalizer supports complete-scope refreshes without treating samples as complete:
- only a declared complete scope can deactivate old rows;
- only an explicit activation can make a source commercially visible;
- exact count/version/check timestamps update at finalization.

Streaming importer defaults to dry-run and current active service areas. It dynamically reads live service settings in write mode.

- Code-Point → filters by live administrative area codes.
- Open UPRN → exact GeoJSON filtering; radius only for service areas without boundary geometry.
- all national (`scope=GB`) writes require explicit `--allow-large-import`.
- partial `--max-rows` samples cannot be complete or activated.

### Capacity decision

Do not load Britain-wide Open UPRN into the current Free Supabase database. OS Open UPRN is roughly 40 million locations and would vastly exceed the current project's safe capacity. Full Code-Point is also blocked by default for national writes.

Current plan:
1. ship schema/importer safely;
2. service-area Code-Point pilot;
3. service-area UPRN pilot from a runner able to stream the large source file;
4. move/upgrade the data layer before national scale.

### Future API products

The API remains disabled but candidate contract separates:
- `address-v1` — full address data only when separately licensed;
- `postcode-v1` — rights-approved Code-Point intelligence;
- `property-v1` — rights-approved UPRN/property location intelligence.

Per-product client entitlements remain required; existing hashed API keys/quota metering remain.

## Candidate validation

New regression suite checks CSV parsing, official Code-Point mapping, BNG/WGS84 transform, UPRN parsing, polygon/hole filters, strict administrative boundaries, importer safety, rights-filtered views and API serializers/product split.

CI workflow is updated to syntax-check the new library/importer and run the new suite. GitHub CI/preview are still pending because the PR has not yet been opened.

## Immediate next work

1. Open candidate PR.
2. Pass GitHub CI + exact-head Vercel preview.
3. Apply migration only after those checks.
4. Verify new RLS/grants/count triggers/import finalizer transactionally.
5. Run Supabase advisors.
6. Merge and verify production/API disabled state.
7. Begin controlled official-data Code-Point service-area pilot.
8. Prepare a suitably provisioned runner for the much larger Open UPRN service-area stream/filter pilot.

## Other open issues

- privileged fresh password/CAPTCHA/MFA completion pending;
- recurring `/api/booking-notifications` 504 investigation;
- remaining Auth templates + Magic Link;
- DMARC/BIMI;
- same-iPhone overflow confirmation;
- Stripe, SMS, legal and remaining launch checks.

## Handoff rule

Every substantial provider/data-product change updates `docs/AI_START.md`, `docs/AI_HANDOFF.md`, and this file together. Never store credentials, raw API keys, customer secrets, TOTP codes or one-time Auth links. Dataset rights and capacity must be reviewed before enabling automation or distribution.
