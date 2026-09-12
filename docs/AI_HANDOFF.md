# Namdar AI handoff

Last verified: 2026-09-12 UTC

Read `docs/AI_START.md` first. For commercial architecture read `docs/ADDRESS_DATA_PRODUCT.md`; for imports read `docs/OS_OPEN_DATA_IMPORT.md`.

## Production source of truth

- Product: Namdar UK property services platform.
- Repository: `pchroonic/pchroonic`, default `main`.
- Latest product release: PR #34 `Add OS Open UPRN and Code-Point property data foundation`.
- Product merge: `c5d2d33cda10bf1d80ecdf6229e7f352146b4b55`.
- PR #34 final head: `c8fa029ba0ea18174aace2f15c87a43008a57980`.
- Final GitHub workflow: `34709973230`, success.
- Final exact-head Vercel preview: `dpl_892iE2LPJ5bCpjQAXrMChrTRkK5L`, READY.
- Production Vercel deployment: `dpl_9DUfnUNbuENpdWZypq4uYiMjVFwe`, READY on `https://namdar.co.uk`, no alias error.
- Supabase: `namdar-production` (`qjigldxjcpnrlyxgmlqq`), Free plan.
- Production DB after release: about 16 MB.
- Production migrations now include:
  - `20260912173038 address_data_rights_and_distribution_guard`
  - `20260912175957 os_open_property_foundation`
  - `20260912180242 os_open_import_fk_indexes`

## GetAddress remains operational-only

Do not resume the old postcode/background harvesting plan. Current GetAddress terms require human-initiated Autocomplete/Typeahead and restrict automated extraction/resale. Vercel has no scheduled GetAddress harvest; Admin/export/worker paths fail closed from rights metadata.

Verified production state remains:
- Automatic OFF;
- zero harvest runs;
- zero harvest queue rows;
- zero `getaddress-daily-cache` rows.

## OS Open UPRN + Code-Point foundation — LIVE

The schema/import framework is production-live, but **no official OS dataset rows have been imported yet**.

### Data model

Do not put OS Open UPRN into `master_addresses`. It is property-identifier/location data, not complete postal-address text.

Live stores:
- `master_addresses` — source-specific address observations, including future separately licensed full-address data;
- `postcode_points` — Code-Point Open postcode-unit coordinates and administrative codes;
- `property_entities` — UPRN-keyed OS Open UPRN property locations;
- `property_field_observations` — sparse future enrichment facts with source/version/confidence/provenance;
- `open_data_import_runs` — upstream version/scope/checksum/row counters/status.

### Registry/count model

`address_dataset_registry` now includes:
- `record_store`;
- `upstream_product_id`;
- `expected_refresh_days`;
- `last_checked_at`;
- `last_available_version`.

Live mappings:
- GetAddress + OSM → `master_addresses`;
- `os-open-uprn` → `property_entities`, upstream `OpenUPRN`, expected refresh ~42 days;
- `code-point-open` → `postcode_points`, upstream `CodePointOpen`, expected refresh ~92 days.

`refresh_address_dataset_registry_count()` resolves the correct record store, and statement-level insert/update/delete triggers keep counts synchronized. `address_dataset_health` reports actual/active counts and count drift across all stores.

### Rights/security boundary

New tables are RLS-enabled, browser roles have no grants/policies, and server service role is the intended access path.

Service-role-only rights-filtered views:
- `postcode_distribution_eligible`;
- `property_distribution_eligible`;
- `property_field_distribution_eligible`.

Rows only qualify when row/source are active and the source explicitly allows both commercial redistribution and subscription API use.

Both OS registry sources remain inactive and currently contain zero rows, so these commercial views return zero rows.

### Import finalizer

`finalize_open_data_import(run_id, complete_scope, activate_source)` is live and verified:
- requires a running import;
- deactivates older rows only when the caller explicitly declares the same source/scope complete;
- never treats a truncated sample as complete automatically;
- refreshes exact source count;
- updates dataset/version/check/import metadata;
- activates the source only when explicitly requested.

Disposable QA verification showed complete-scope refresh deactivates old same-scope rows while preserving the current run. All QA source/rows/runs were removed afterward.

## Streaming importer — LIVE IN SOURCE

`lib/os-open-data.js` provides:
- dependency-free CSV parsing;
- Code-Point field mapping;
- header-driven Open UPRN parsing;
- British National Grid EPSG:27700 → WGS84 conversion;
- Polygon/MultiPolygon/Feature GeoJSON filtering including holes;
- radius fallback only when a service area has no geometry;
- OS product IDs/download endpoint constants and product-version helpers.

`scripts/os-open-data-import.mjs`:
- `--dataset=codepoint|uprn`;
- file or recursive directory input;
- dry-run default;
- default `active-service-areas` scope;
- upstream version discovery if `--version` omitted;
- write mode needs server-only Supabase credentials at runtime;
- checks source rights + expected `record_store` before writing;
- write mode reads live active `service_areas` dynamically;
- Code-Point filters by live `admin_area_codes`;
- Open UPRN uses live GeoJSON exactly and does not expand polygon-backed administrative areas using radius;
- batches writes and records import-run counters;
- `--complete-scope` cannot be used with `--max-rows`;
- `--activate-source` requires complete scope;
- **all national `scope=GB` writes are blocked unless `--allow-large-import` is explicitly supplied.**

Never use the large-import override on the current Free database merely to bypass capacity safety.

## Capacity/scaling rule

Production DB is ~16 MB, but the current Free database limit is 500 MB. OS Open UPRN is roughly 40 million locations, so the current project is for a controlled service-area pilot, not a nationwide UPRN warehouse.

Before nationwide scale:
- move/upgrade the data store deliberately;
- size tables + indexes + staging/headroom;
- use bulk-loading rather than REST batches;
- benchmark query/update windows;
- keep source/version/import-run provenance and OGL attribution.

## Future Address API

`/api/address-data-v1` remains deliberately disabled by `ADDRESS_DATA_API_ENABLED`.

Production smoke test after PR #34:
- `kind=postcode` request returned HTTP 503 `Namdar Address API is not enabled.`

Prepared future products:
- `address-v1` → `address_distribution_eligible`;
- `postcode-v1` → `postcode_distribution_eligible`;
- `property-v1` → `property_distribution_eligible`.

Each client must explicitly be entitled to the requested product. Existing hashed API-key/quota/metering infrastructure remains. No API customer/key was created by PR #34.

## Verification completed for PR #34

- CI passed new OS-data regression suite.
- Exact-head preview READY/clean.
- Production migrations applied successfully.
- Disposable Code-Point + UPRN inserts proved registry count triggers; deletion returned both OS counts to zero.
- Disposable QA import source proved normal and complete-scope finalization; all QA artifacts deleted.
- Supabase performance advisor initially identified three new missing import-run FK indexes; follow-up migration added:
  - `postcode_points_import_run_idx`
  - `property_entities_import_run_idx`
  - `property_field_observations_import_run_idx`
- Re-run performance advisor no longer reports those three unindexed FKs.
- Security advisor reports expected `RLS enabled, no policy` INFO on the service-role-only new tables, plus the existing leaked-password-protection warning. RLS lint reference: `https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy`. Password protection reference: `https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection`.
- Final clean state: 0 postcode points, 0 property entities, 0 OS import runs, 0 postcode/property eligible rows.

## Immediate next milestone

Run a controlled **official Code-Point Open service-area pilot**:
1. obtain/extract current official Code-Point CSV;
2. dry-run the importer against current service-area filters;
3. inspect selected row count, coordinates and administrative district codes;
4. if plausible, run a complete intended service-area write without truncation;
5. verify `address_dataset_health`, imported coverage and DB size/headroom;
6. activate `code-point-open` only after the complete intended-scope import is verified;
7. keep the paid API disabled.

Then prepare a suitably provisioned runner to stream/filter the much larger Open UPRN source for the same service-area scope. Do not load Britain-wide UPRN into the current Free project.

## Non-negotiable rules

- Data storage does not create redistribution rights.
- New/unreviewed sources fail closed.
- Paid surfaces query rights-filtered views only.
- No GetAddress automated harvesting unless explicit written permission changes policy.
- No national OS OpenData import into the current Free database without a deliberate capacity migration/upgrade.
- No provider/API/Supabase/TOTP/SMTP/GitHub secrets in source/docs/chat.
- Support tickets remain customer-only; public inbound email remains Admin Email inbox.
- Privileged staff access requires AAL2/MFA.
