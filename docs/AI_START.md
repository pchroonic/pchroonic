# Namdar AI fast resume

Last verified: 2026-09-12 UTC

Read this first. Use `docs/AI_HANDOFF.md` for implementation detail, `docs/PROJECT_STATUS.md` for the roadmap, and `docs/ADDRESS_DATA_PRODUCT.md` for the address/property-data business architecture.

## Current phase

**Phase 7 — Launch Security & Readiness**

## Production baseline

- Repository: `pchroonic/pchroonic`, default `main`.
- Rights/commercial-data foundation from PR #32 is production-live.
- Product merge: `6c898735b58c03922d6ce24b97598af466242e85`.
- Production deployment: `dpl_81uZqzB2LA1efMcSXMXv4hs1kSHN`, READY on `https://namdar.co.uk`.
- Supabase: `namdar-production` (`qjigldxjcpnrlyxgmlqq`), Free plan.
- Production rights migration: `20260912173038 address_data_rights_and_distribution_guard`.
- Future `/api/address-data-v1` remains disabled; 0 API clients/keys and 0 distributable rows.

## Critical GetAddress rule

Do **not** resume GetAddress background/manual harvesting. Current provider terms require human-initiated Autocomplete/Typeahead use and restrict large offline extraction/resale. The scheduled harvest is removed and code/database policy blocks automation/export/distribution unless explicit written permission is obtained.

Production remains: Automatic OFF, 0 harvest runs, 0 queue rows, 0 `getaddress-daily-cache` rows.

## Current candidate — OS Open UPRN + Code-Point foundation

Branch: `feat/os-open-uprn-codepoint-foundation-20260912`.

Goal: build Namdar's licence-safe postcode/property intelligence layer without forcing UPRN data into postal-address tables.

Candidate adds:
- `postcode_points` for Code-Point Open postcode-unit coordinates/admin codes;
- `property_entities` keyed by UPRN for OS Open UPRN locations;
- sparse `property_field_observations` for later source/confidence/freshness enrichment;
- `open_data_import_runs` for source version, scope, checksum/metadata and row counters;
- source registry `record_store`, upstream product/version/check timestamps and refresh cadence;
- exact source counts across `master_addresses`, `postcode_points` and `property_entities`;
- rights-filtered `postcode_distribution_eligible`, `property_distribution_eligible`, and field-observation views;
- service-role-only import finalizer with safe scope deactivation/version updates;
- streaming `scripts/os-open-data-import.mjs` for Code-Point/Open UPRN CSVs;
- dynamic service-area filtering from live `service_areas` on writes;
- Code-Point filtering by live administrative area codes;
- UPRN filtering by exact live GeoJSON, with radius used only when no boundary geometry exists;
- British National Grid → WGS84 conversion for Code-Point convenience coordinates;
- future disabled API products split into `address-v1`, `postcode-v1`, and `property-v1`.

Candidate migration: `supabase/migrations/20260912190000_os_open_property_foundation.sql`.

**Migration is not production-applied yet.** Wait for PR CI + exact-head preview review first.

## Capacity rule — service-area pilot first

Current production database size is ~16 MB, but the Supabase Free plan database cap is 500 MB. OS Open UPRN covers roughly 40 million locations; national UPRN/Code-Point writes are therefore blocked by the importer unless `--allow-large-import` is deliberately supplied after capacity is upgraded/moved.

Default importer behaviour:
- dry-run unless `--write`;
- scope `active-service-areas`;
- reads live service-area boundaries/codes for writes;
- source rights must allow automated ingest;
- full/national writes require explicit large-import override;
- partial samples cannot be marked complete/activated;
- sources stay inactive until a complete intended scope is deliberately activated.

For the current active service area, Code-Point can filter by the live London borough codes and Open UPRN can filter by the service-area GeoJSON. Do not hard-code the borough list into the importer.

## API remains OFF

The disabled API contract now separates future products:
- `kind=address` → `address-v1` → licensed full-address rows only;
- `kind=postcode` → `postcode-v1` → rights-approved Code-Point rows;
- `kind=property` → `property-v1` → rights-approved UPRN/property rows.

Each requires its own client entitlement when the API is eventually enabled. `ADDRESS_DATA_API_ENABLED` must remain absent/false.

## Immediate next action

1. Finish candidate tests/docs.
2. Open PR and require GitHub CI + exact-head Vercel preview.
3. If clean, apply `os_open_property_foundation` migration to production.
4. Verify new tables/views/RLS/grants, exact row-count triggers and finalizer transactionally.
5. Verify GetAddress state remains untouched and API remains disabled.
6. Merge candidate and verify production deployment.
7. Then run a **controlled service-area Code-Point pilot** from official current OS data. Do not activate a source from a truncated sample.
8. Run the service-area Open UPRN pilot only from a runner provisioned to stream the large national source safely; do not load Britain-wide UPRN into the current Free database.

## Do not break

- Storage does not equal redistribution rights.
- New/unreviewed datasets fail closed for automation/distribution.
- Paid data surfaces use rights-filtered views, never raw stores.
- Do not re-add GetAddress automated harvesting without explicit written permission and recorded rights review.
- Do not national-import OS OpenData into the current Free database by accident.
- Never expose provider, Supabase, SMTP, Turnstile, GitHub, cron or future customer API secrets.
- Support tickets remain customer-only; public inbound email remains Admin Email inbox.
