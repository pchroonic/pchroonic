# Namdar project status

Last updated: 2026-09-12 UTC

## Baseline

- Source: `pchroonic/pchroonic`, default branch `main`.
- Latest product release: PR #34 `Add OS Open UPRN and Code-Point property data foundation`.
- Product merge: `c5d2d33cda10bf1d80ecdf6229e7f352146b4b55`.
- Final PR head: `c8fa029ba0ea18174aace2f15c87a43008a57980`.
- Final CI workflow `34709973230` succeeded.
- Exact-head preview `dpl_892iE2LPJ5bCpjQAXrMChrTRkK5L` READY.
- Production deployment `dpl_9DUfnUNbuENpdWZypq4uYiMjVFwe` READY on `https://namdar.co.uk`.
- Supabase: `namdar-production` (`qjigldxjcpnrlyxgmlqq`), Free.
- Production DB size after release: ~16 MB.
- Live data-platform migrations:
  - `20260912173038 address_data_rights_and_distribution_guard`
  - `20260912175957 os_open_property_foundation`
  - `20260912180242 os_open_import_fk_indexes`

## Main product areas

| Area | Status |
| --- | --- |
| Public website | Live; Windows/Edge overflow fixed, same-iPhone final confirmation pending |
| Customer portal | Email + Google auth, customer MFA option, Turnstile/Supabase CAPTCHA live |
| Admin/Staff security | Mandatory AAL2/MFA live; fresh password + CAPTCHA + MFA completion still pending |
| Email inbox | Spam controls + Inbox Security v2 live |
| Address system | Rights-aware source registry/count firewall LIVE; GetAddress automated harvesting BLOCKED |
| OS postcode data | Code-Point storage/version/import framework LIVE; 0 official rows imported yet |
| OS property data | UPRN property-entity/version/import framework LIVE; 0 official rows imported yet |
| Future data API | Address/Postcode/Property product contract LIVE but API deliberately disabled |
| Support tickets | Customer-only; public inbound email stays Admin Email inbox |

## GetAddress status

Automated harvesting remains cancelled under current provider terms unless explicit written permission is obtained and the source rights record is deliberately revised.

Verified production state:
- Automatic OFF;
- zero harvest runs;
- zero queue rows;
- zero GetAddress master rows;
- no scheduled harvest in Vercel;
- restricted automation/export paths fail closed.

## OS Open UPRN + Code-Point foundation — LIVE

### Data model

- `postcode_points` — Code-Point postcode unit, PQI, BNG coordinates, derived WGS84, country/NHS/admin codes.
- `property_entities` — one row per UPRN with OS Open UPRN location/source/version.
- `property_field_observations` — sparse future UPRN enrichment facts with source/version/confidence.
- `open_data_import_runs` — source version, scope, metadata/checksum, row counters and completion state.

`master_addresses` remains for address observations; UPRN/location data is deliberately separated rather than forced into an address-shaped table.

### Rights/count architecture

Registry is now record-store-aware:
- GetAddress + OSM → `master_addresses`;
- Code-Point Open → `postcode_points`;
- OS Open UPRN → `property_entities`.

Exact count tracking and `address_dataset_health` work across all stores.

Service-role-only commercial views:
- `postcode_distribution_eligible`;
- `property_distribution_eligible`;
- `property_field_distribution_eligible`.

Rows only qualify when row/source are active and the source explicitly allows both commercial redistribution and subscription API use.

Both OS sources remain inactive and empty; all new eligible views currently return 0 rows.

### Import/version safety

`finalize_open_data_import` is live and verified:
- only a declared complete source/scope can deactivate unseen older rows;
- activation is explicit;
- exact source count/version/check metadata update at finalization.

Streaming importer `scripts/os-open-data-import.mjs` is live in source:
- dry-run default;
- default active-service-area scope;
- dynamic live service-area settings for writes;
- Code-Point filtering by live administrative-area codes;
- Open UPRN filtering by exact GeoJSON, with radius used only if geometry is absent;
- source-right and expected-store checks before write;
- upstream version discovery;
- batched upserts/import-run counters;
- partial `--max-rows` samples cannot be declared complete/activated;
- all national (`scope=GB`) writes require explicit `--allow-large-import`.

Operational instructions: `docs/OS_OPEN_DATA_IMPORT.md`.

### Capacity decision

Do not load Britain-wide Open UPRN into the current Free Supabase database. Open UPRN is national-scale (~40m locations) and the Free project has a 500 MB database limit. National Code-Point writes are also deliberately blocked by default.

Current scaling plan:
1. controlled service-area Code-Point pilot;
2. service-area Open UPRN stream/filter pilot from a suitably provisioned runner;
3. deliberate larger/dedicated data-store architecture before national scale;
4. bulk-load/benchmark/backup/version strategy before using the national-write override.

## Future data API

`/api/address-data-v1` remains disabled. Post-release production smoke test returned HTTP 503 `Namdar Address API is not enabled.`

Prepared product entitlements:
- `address-v1` — rights-approved/full-address product when separately licensed;
- `postcode-v1` — rights-approved Code-Point intelligence;
- `property-v1` — rights-approved UPRN/location intelligence.

Hashed API keys, product entitlements and monthly metering/quota remain server-side. No API customers/keys were created by PR #34.

## PR #34 verification

- New regression suite passed in CI: CSV parsing, Code-Point field mapping, BNG/WGS84 conversion, UPRN parsing, polygon/hole filters, strict boundary behaviour, import safeguards and API product separation.
- Exact-head Vercel preview READY.
- Production migrations applied cleanly.
- Disposable postcode/UPRN rows verified insert/delete count triggers, then were removed.
- Disposable QA import source verified normal and complete-scope finalization, then all QA rows/runs/source were removed.
- Supabase advisor found three missing new import-run FK indexes; follow-up migration added all three and the performance advisor no longer reports them.
- Security advisor only added expected RLS/no-browser-policy INFO for these service-role-only tables; the leaked-password-protection warning is pre-existing/current plan limitation.
- Final clean state after QA: 0 postcode points, 0 property entities, 0 import runs, 0 postcode/property eligible rows.
- GetAddress remained untouched: Automatic OFF, 0 runs, 0 queue, 0 cached rows.

## Immediate next milestone

Run the first **official Code-Point Open service-area pilot**:
1. obtain/extract the current official Code-Point Open CSV;
2. dry-run with the current service-area filter;
3. inspect selected row count, administrative district codes and coordinates;
4. if plausible, run a complete intended service-area write without truncation;
5. verify DB size/headroom, coverage and `address_dataset_health`;
6. activate `code-point-open` only if that complete intended-scope import is verified;
7. keep the paid API disabled.

After Code-Point, run a service-area Open UPRN pilot from a runner able to stream/filter the large national source. Do not load national UPRN into the current Free DB.

## Other open issues

- privileged fresh password/CAPTCHA/MFA completion pending;
- recurring `/api/booking-notifications` 504 investigation;
- remaining Auth templates + Magic Link;
- DMARC/BIMI;
- same-iPhone overflow confirmation;
- Stripe, SMS, legal and remaining launch checks.

## Handoff rule

Every substantial provider/data-product change updates `docs/AI_START.md`, `docs/AI_HANDOFF.md`, and this file together. Never store credentials, raw API keys, customer secrets, TOTP codes or one-time Auth links. Dataset rights and capacity must be reviewed before enabling automation or distribution.
