# Namdar AI handoff

Last verified: 2026-09-12 UTC

Read `docs/AI_START.md` first. For the commercial address/property-data design read `docs/ADDRESS_DATA_PRODUCT.md`.

## Production source of truth

- Product: Namdar UK property services platform.
- Repository: `pchroonic/pchroonic`, default `main`.
- Current verified production product commit: `6c898735b58c03922d6ce24b97598af466242e85` from PR #32.
- Production Vercel: `dpl_81uZqzB2LA1efMcSXMXv4hs1kSHN`, READY on `https://namdar.co.uk`.
- Supabase: `namdar-production` (`qjigldxjcpnrlyxgmlqq`), Free plan.
- Production migration: `20260912173038 address_data_rights_and_distribution_guard`.
- Current DB size checked 2026-09-12: ~16 MB. Free database limit is 500 MB.
- Future Address API deployed but disabled; 0 API clients, 0 API keys, 0 rights-eligible rows.

## GetAddress remains operational-only

Do not run the old one-postcode/background harvest. Current GetAddress terms require human-initiated Autocomplete/Typeahead and restrict automated extraction/resale. The Vercel harvest schedule is removed; Admin/provider export/worker paths fail closed from rights metadata.

Production remains Automatic OFF, zero runs, zero queue rows, zero GetAddress cache rows.

## Current candidate branch

`feat/os-open-uprn-codepoint-foundation-20260912`

Candidate migration:
`supabase/migrations/20260912190000_os_open_property_foundation.sql`

Not yet applied to production. Apply only after candidate PR CI + exact-head Vercel preview are clean.

### Why the data model is split

Do not put OS Open UPRN rows into `master_addresses`. Open UPRN is a stable property identifier/location dataset, not a complete postal-address text product. Likewise Code-Point Open is postcode-unit geospatial/admin intelligence.

Candidate storage:
- existing `master_addresses` → address observations such as future licensed full-address data;
- `postcode_points` → Code-Point Open postcode-unit coordinates/admin codes;
- `property_entities` → UPRN-keyed OS Open UPRN locations;
- `property_field_observations` → sparse later enrichment facts with source/version/confidence/provenance;
- `open_data_import_runs` → upstream version/scope/checksum/row counters/status.

### Registry/count model

`address_dataset_registry` candidate additions:
- `record_store` (`master_addresses`, `postcode_points`, `property_entities`, `external`);
- `upstream_product_id`;
- `expected_refresh_days`;
- `last_checked_at`;
- `last_available_version`.

Mappings:
- GetAddress + OSM → `master_addresses`;
- `os-open-uprn` → `property_entities`, upstream `OpenUPRN`, target refresh ~42 days;
- `code-point-open` → `postcode_points`, upstream `CodePointOpen`, target refresh ~92 days.

`refresh_address_dataset_registry_count()` is replaced so exact counts are calculated from each source's record store. Statement-level insert/update/delete triggers keep counts in sync for all three stores.

Existing `address_dataset_health` must be dropped/recreated rather than replaced because the registry gains columns; the migration already handles this PostgreSQL view-column-order issue.

### New service-role-only tables/views

Tables:
- `open_data_import_runs`
- `postcode_points`
- `property_entities`
- `property_field_observations`

RLS is enabled; anon/auth revoked; service_role granted.

Commercial distribution views remain rights-gated and service-role-only:
- `postcode_distribution_eligible`
- `property_distribution_eligible`
- `property_field_distribution_eligible`

All require active row/source + `commercial_redistribution_allowed=true` + `subscription_api_allowed=true`.

`open_data_import_latest` gives latest run per source/scope.

### Import finalization

`finalize_open_data_import(run_id, complete_scope, activate_source)`:
- requires a running import run;
- only deactivates rows not seen in this run if caller explicitly marks the scope complete;
- deactivation is limited to the same source + coverage scope;
- refreshes exact registry count;
- records dataset version/check time/import time;
- activates source only when explicitly requested;
- marks run completed and returns a JSON summary.

This prevents a truncated/pilot import from deleting previous scope data or being silently presented as complete.

## Streaming importer

`lib/os-open-data.js`:
- dependency-free CSV parsing;
- Code-Point field normalisation;
- Open UPRN header-driven parsing;
- British National Grid EPSG:27700 → WGS84 conversion;
- Polygon/MultiPolygon/Feature GeoJSON filtering with holes;
- haversine radius fallback only if an area has no GeoJSON;
- OS product metadata/version helpers.

`scripts/os-open-data-import.mjs`:
- `--dataset=codepoint|uprn`;
- accepts one CSV or a directory of extracted CSVs;
- defaults to dry-run and `active-service-areas` scope;
- discovers upstream product version if `--version` is omitted;
- write mode requires `SUPABASE_URL` + server service key at runtime only;
- checks source rights and expected `record_store` before writing;
- write mode reads live active `service_areas`;
- Code-Point filters by live `admin_area_codes`;
- Open UPRN filters by live GeoJSON exactly; radius is only for areas without geometry;
- batches upserts (500 rows);
- writes import-run counters and calls finalizer;
- `--complete-scope` cannot be used with a truncated `--max-rows` sample;
- `--activate-source` requires complete scope;
- **all `scope=GB` writes are blocked unless `--allow-large-import` is explicitly supplied.**

The importer never embeds service-area borough codes in source. Production currently has one active administrative service area covering five London boroughs; dynamic DB settings remain authoritative.

## Capacity/scaling rule

The current Supabase Free project cannot safely store nationwide Open UPRN (~40m locations), and full Code-Point should also not be casually dumped into it. Service-area-first is mandatory while this capacity constraint remains.

For nationwide commercial scale, upgrade/move the data layer deliberately (e.g. larger Postgres/data warehouse/object-storage + staged bulk load) before using `--allow-large-import`.

Do not interpret the existence of the override as approval to use it on the current project.

## API contract candidate

`/api/address-data-v1` remains disabled by `ADDRESS_DATA_API_ENABLED`.

Candidate splits entitlements/data surfaces:
- `kind=address` / `address-v1` / `address_distribution_eligible`;
- `kind=postcode` / `postcode-v1` / `postcode_distribution_eligible`;
- `kind=property` / `property-v1` / `property_distribution_eligible`.

Each future API client must explicitly include the corresponding product entitlement. Existing hashed-key/quota/metering foundation remains unchanged. No API customer/key is created by this candidate.

## Candidate regression suite

New `scripts/os-open-data-foundation.test.mjs` covers:
- quoted CSV parsing;
- UK postcode normalisation;
- official Code-Point 10-field example;
- BNG → WGS84 result within a small tolerance of authoritative transform;
- PQI 90 no-coordinate behaviour;
- header-driven Open UPRN parsing;
- Polygon/MultiPolygon/hole filtering;
- no radius fallback when GeoJSON exists;
- OS product IDs/download endpoint constants;
- postcode/property public serializers;
- migration tables/RLS/rights-filtered views/finalizer;
- importer dry-run default, rights check, large-import block and activation safety;
- disabled API product split.

CI candidate adds syntax checks for `lib/os-open-data.js`, importer script, and this test file.

A local git clone/test attempt from the model container could not run because that runtime has no outbound DNS; do not record it as a code failure. GitHub CI is the authoritative executable check.

## Required next workflow

1. Finish handoff/product docs in candidate branch.
2. Compare branch to main and open PR.
3. Require GitHub CI success including new tests.
4. Require exact-head Vercel preview READY/clean build.
5. Review candidate migration once more, then apply to production.
6. Verify schema/RLS/grants and registry `record_store` mappings.
7. Transactionally test Code-Point/property insert/update/delete count triggers and import finalizer; rollback test data.
8. Verify rights-filtered views stay empty while OS sources remain inactive/empty.
9. Run Supabase security + performance advisors.
10. Verify GetAddress state still untouched and DB size safe.
11. Merge PR, verify production Vercel and API still returns disabled 503.
12. Then run controlled **official-data service-area pilots**. Do not activate from a truncated sample.

## Non-negotiable rules

- Data storage does not create redistribution rights.
- New/unreviewed sources fail closed.
- Paid surfaces query rights-filtered views only.
- No GetAddress automated harvesting unless explicit written permission changes policy.
- No national OpenData import into the current Free database without deliberate capacity migration/upgrade.
- No provider/API/Supabase/TOTP/SMTP/GitHub secrets in source/docs/chat.
- Support tickets remain customer-only; public inbound email remains Admin Email inbox.
- Privileged staff access requires AAL2.
