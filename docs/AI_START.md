# Namdar AI fast resume

Last verified: 2026-09-12 UTC

Read this first. Use `docs/AI_HANDOFF.md` for implementation detail, `docs/PROJECT_STATUS.md` for the roadmap, `docs/ADDRESS_DATA_PRODUCT.md` for commercial architecture, and `docs/OS_OPEN_DATA_IMPORT.md` for import operations.

## Current production baseline

- Repository: `pchroonic/pchroonic`, default `main`.
- Latest product release: PR #34 `Add OS Open UPRN and Code-Point property data foundation`.
- Product merge: `c5d2d33cda10bf1d80ecdf6229e7f352146b4b55`.
- Exact PR head: `c8fa029ba0ea18174aace2f15c87a43008a57980`.
- GitHub CI: `34709973230`, success.
- Exact-head preview: `dpl_892iE2LPJ5bCpjQAXrMChrTRkK5L`, READY.
- Production deployment: `dpl_9DUfnUNbuENpdWZypq4uYiMjVFwe`, READY and aliased to `https://namdar.co.uk`.
- Supabase: `namdar-production` (`qjigldxjcpnrlyxgmlqq`), Free plan.
- Production migrations:
  - `20260912173038 address_data_rights_and_distribution_guard`
  - `20260912175957 os_open_property_foundation`
  - `20260912180242 os_open_import_fk_indexes`

## Live OS property/postcode foundation

Production now contains the schema and code for a licence-aware OS OpenData platform, but **no OS dataset rows have been imported yet**.

Live stores:
- `postcode_points` — Code-Point Open postcode-unit coordinates/admin codes;
- `property_entities` — UPRN-keyed OS Open UPRN property locations;
- `property_field_observations` — future sparse enrichment facts with source/version/confidence;
- `open_data_import_runs` — import source/version/scope/counters/status.

Registry `record_store` mapping:
- GetAddress + OSM → `master_addresses`;
- `code-point-open` → `postcode_points`;
- `os-open-uprn` → `property_entities`.

Exact count triggers and `address_dataset_health` work across all three stores.

Rights-filtered service-role-only views:
- `postcode_distribution_eligible`;
- `property_distribution_eligible`;
- `property_field_distribution_eligible`.

Both OS source registry rows remain **inactive** and empty, so all new distribution views currently return zero rows.

## Importer now live in source

`scripts/os-open-data-import.mjs`:
- defaults to dry-run;
- defaults to `active-service-areas` scope;
- reads live service-area settings for writes;
- Code-Point filters by live administrative area codes;
- Open UPRN filters by exact live GeoJSON; radius is used only when no boundary geometry exists;
- validates source rights before writing;
- supports upstream version discovery;
- batches writes and records import runs;
- prevents partial `--max-rows` samples from being declared complete/activated;
- blocks **all national `scope=GB` writes** unless `--allow-large-import` is deliberately supplied.

Do not use the large-import override on the current Free Supabase database merely to bypass the guard.

## Capacity state

Production DB after schema release: ~16 MB. Current Supabase Free database limit: 500 MB.

OS Open UPRN is national-scale (~40m locations). The current database is appropriate for a controlled service-area pilot, not a Britain-wide UPRN warehouse. Before national scale, move/upgrade the data layer and use a bulk-load architecture rather than REST batches.

## Validation completed

- CI regression suite passed CSV parsing, official Code-Point field mapping, BNG→WGS84 conversion, UPRN parsing, polygon/hole filters, strict administrative boundaries, import safeguards and API product split.
- Production migration applied cleanly.
- Disposable Code-Point + UPRN rows proved exact insert/delete source counts; all test rows removed.
- Disposable import source proved finalizer completion and complete-scope deactivation; all QA data/source removed.
- Advisor-found missing import-run FK indexes were added; recheck shows no new unindexed FK findings from these tables.
- Current state after cleanup: 0 `postcode_points`, 0 `property_entities`, 0 `open_data_import_runs`, 0 postcode/property eligible rows.
- GetAddress remains Automatic OFF, 0 runs, 0 queue, 0 cache rows.

## Future data API

`/api/address-data-v1` is still deliberately disabled and production verification returns HTTP 503 `Namdar Address API is not enabled.`

Prepared future products:
- `address-v1` → licensed full-address observations;
- `postcode-v1` → rights-approved Code-Point intelligence;
- `property-v1` → rights-approved UPRN/location intelligence.

Do not set `ADDRESS_DATA_API_ENABLED=true` yet.

## Immediate next milestone

Run a **controlled official Code-Point Open service-area pilot**:
1. obtain/extract current official Code-Point Open CSV;
2. dry-run importer against the current service-area filter;
3. inspect selected row count and coordinate/admin-code quality;
4. perform a complete intended service-area write only if the dry run is plausible;
5. verify DB size/counts/coverage before deciding whether to activate `code-point-open`;
6. keep paid API disabled.

After Code-Point is proven, prepare a suitably provisioned runner to stream/filter the much larger Open UPRN national file into the same service-area scope. Do not load Britain-wide UPRN into the current Free project.

## GetAddress rule

Do not resume automated GetAddress harvesting. Current provider terms require human-initiated Autocomplete/Typeahead and restrict bulk extraction/resale. GetAddress remains an operational lookup/validation source only unless explicit written permission changes the rights record.

## Do not break

- Storage does not create redistribution rights.
- New/unreviewed sources fail closed.
- Paid surfaces query rights-filtered views only.
- Never expose provider, Supabase, SMTP, Turnstile, GitHub, cron or future customer API secrets.
- Support tickets remain customer-only; public inbound email remains Admin Email inbox.
- Privileged staff access requires AAL2/MFA.
