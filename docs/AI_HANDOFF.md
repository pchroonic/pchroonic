# Namdar AI handoff

Last verified: 2026-09-12 UTC

Read `docs/AI_START.md` first. For the address-data business architecture read `docs/ADDRESS_DATA_PRODUCT.md`.

## Source of truth

- Product: Namdar UK property services platform.
- Repository: `pchroonic/pchroonic`, default `main`.
- Latest main docs merge before this candidate: `ae67594d6f744ee0c9c26520ba041402282e224b`.
- Latest verified product behavior before this candidate: `945091c31cab6600916cd07854de3df4ac830d6a` from PR #30.
- Production: `https://namdar.co.uk` on Vercel project `namdar-website-starter-1`.
- Backend/Auth: Supabase `namdar-production` (`qjigldxjcpnrlyxgmlqq`), Free plan.
- Privileged Admin/Staff access requires AAL2/MFA.

## Critical provider-terms correction

The previous handoff said the next step was a controlled one-postcode GetAddress harvest. **That plan is superseded.**

On 2026-09-12, current GetAddress Terms were re-read. They state that Autocomplete/Typeahead requests must be initiated by human input, automated address lookups can lead to account closure, attempts to download whole/large sections of the dataset for offline use are prohibited, and resale of the service/data requires explicit permission.

Terms: `https://getaddress.io/Terms`.

GetAddress's public FAQ separately says received addresses may be cached, but the more specific automation/offline extraction/resale restrictions mean Namdar must not use the existing harvest system as an automated database-building mechanism without explicit written provider permission.

**Do not run the one-postcode harvest, do not enable automatic harvesting, and do not re-add the scheduled harvest cron unless written permission is obtained and recorded.**

Production is still clean: zero harvest runs, zero queue rows, zero `getaddress-daily-cache` rows. No provider harvest lookup has been consumed.

## Current candidate branch

`fix/address-data-rights-and-commercial-foundation-20260912`

### New migration

`supabase/migrations/20260912172500_address_data_rights_and_distribution_guard.sql`

Not yet production-applied at the time this candidate handoff was written.

It adds machine-readable rights to `address_dataset_registry`:
- `licence_category`;
- `operational_use_allowed`;
- `human_input_required`;
- `automated_bulk_ingest_allowed`;
- `commercial_redistribution_allowed`;
- `subscription_api_allowed`;
- `bulk_export_allowed`;
- `share_alike_required`;
- attribution, terms/permission references, review timestamp and rights notes.

Unknown/new sources default to fail closed for automation/distribution.

GetAddress registry policy becomes:
- operational use allowed;
- human input required;
- automated bulk ingest false;
- commercial redistribution false;
- subscription API false;
- bulk export false;
- terms reference `https://getaddress.io/Terms`.

OpenStreetMap registry policy becomes:
- ODbL;
- operational use true;
- redistribution potentially true under ODbL;
- subscription API and bulk export false by default because share-alike obligations need an explicit product design;
- attribution retained.

Planned inactive commercial-friendly source registry entries:
- `os-open-uprn` — OGL, intended UPRN/coordinate foundation;
- `code-point-open` — OGL, intended postcode/location foundation.

### Exact source counts

Audit found current production drift:
- actual `master_addresses`: 1 OSM row / 1 postcode;
- registry OSM `row_count`: 0.

The old GetAddress worker also incremented row count by rows upserted/returned, which can over-count when an upsert updates an existing source record.

Candidate migration adds:
- exact count reconciliation;
- statement-level insert/update/delete triggers that recalculate only affected source counts;
- `address_dataset_health` security-invoker view exposing actual count + sync state;
- `refresh_address_dataset_registry_count(text)` server-only helper.

### Distribution firewall

`address_distribution_eligible` is a security-invoker, service-role-only view over `master_addresses` joined to source rights. It includes only rows where the source is active and both:
- `commercial_redistribution_allowed = true`
- `subscription_api_allowed = true`

Future paid APIs/exports must use this view or a stricter equivalent, never raw `master_addresses`.

### GetAddress automation/export blocking

New `lib/address-policy.js`:
- normalises source rights;
- fails closed if metadata/migration lookup fails;
- central helpers for automation/distribution decisions.

New `lib/address-harvest-compliance.js` wraps the existing priority worker **before any Typeahead discovery**. When the GetAddress source rights say automation is not allowed, `runHarvest()` returns `provider_terms_blocked` and never invokes the provider worker.

Updated:
- `api/admin-address-harvest.js` uses compliance wrapper and rejects enabling/running restricted automation;
- `api/address-harvest-cron.js` uses compliance wrapper as defense in depth;
- `vercel.json` removes `/api/address-harvest-cron` from scheduled crons;
- `api/admin-address-harvest-export.js` checks `bulkExportAllowed` before full cache or provider backup export;
- `admin-address-harvest.js` displays rights state and disables restricted automation/export controls.

The old provider worker remains in source for possible future use only if provider rights explicitly change; normal product paths are guarded before it can issue Typeahead/Autocomplete calls.

### Future paid Address API foundation

Migration adds server-only/RLS tables:
- `address_api_clients` — status, plan, monthly request limit, product entitlements, future Stripe refs;
- `address_api_keys` — key prefix + SHA-256 hash only; no raw key storage;
- `address_api_usage_daily` — requests, rows and bytes served.

`consume_address_api_request(...)` is SECURITY INVOKER, executable by service role only, and atomically checks active client/monthly quota before usage increments.

New `lib/address-data-api.js` provides normalisation/API-key hashing/public row minimisation.

New `/api/address-data-v1`:
- disabled unless `ADDRESS_DATA_API_ENABLED=true`;
- bearer API key required;
- active client + `address-v1` entitlement required;
- monthly quota enforced;
- max 100 rows per request;
- only queries `address_distribution_eligible`;
- returns source/licence/attribution metadata;
- no public API clients/keys are created by the migration.

Do not enable this API yet.

### CI/regression protection

New `scripts/address-commercial-foundation.test.mjs` covers:
- unknown sources fail closed;
- GetAddress-style restricted policy blocks automation/resale;
- approved source can pass automation/distribution checks;
- API helper normalisation/key hashing/minimal output;
- Vercel config contains no address-harvest cron;
- migration contains GetAddress block + subscription-eligible view + API tables;
- provider bulk export checks rights.

CI workflow syntax-checks all new files and runs the new tests.

## Commercial source strategy

Preferred next data sources:
1. **OS Open UPRN** under OGL — UPRN/property points/coordinates; free commercial foundation, not full postal address text.
2. **Code-Point Open** under OGL — postcode-unit coordinates/intelligence, not full premises addresses.
3. Later obtain an explicit full-address redistribution/subscription licence (e.g. appropriate OS address/partner product or another provider with clear redistribution rights).

Do not treat HM Land Registry Price Paid address strings as a free resale address source: HMLR documents third-party Royal Mail/OS rights on those address fields. Transaction intelligence may be added later with field-level rights/provenance review.

OpenStreetMap can be commercially used under ODbL but its derivative-database/share-alike obligations require a separate deliberate product design; it stays out of the proprietary subscription view by default.

## Future intelligence architecture

`master_addresses` remains source-specific observations. Do not destructively blend restricted/open/licensed providers into a source-less canonical row.

After OS Open UPRN import, build:
- `property_entities` keyed by UPRN;
- `property_field_observations` with source record + field + value + observed time + confidence + redistribution eligibility;
- authority/freshness/source-agreement scoring;
- anomaly/contradiction tracking;
- canonical values selected without losing provenance.

See `docs/ADDRESS_DATA_PRODUCT.md`.

## Production DB state before candidate migration

- GetAddress harvest setting `enabled=false`;
- `prioritize_service_areas=true`;
- daily cap 20;
- zero harvest runs;
- zero harvest queue rows;
- zero GetAddress master rows;
- one OSM master-address row;
- OSM registry row count currently stale at zero.

## Required next workflow

1. Run candidate CI and exact-head Vercel preview.
2. Review migration security/DDL.
3. Apply `address_data_rights_and_distribution_guard` to production.
4. Verify rights flags, views/RLS/grants, API tables, exact OSM count=1 and GetAddress count=0.
5. Verify no GetAddress provider call/run occurred.
6. Merge PR only after checks pass.
7. Verify production Vercel config has no harvest cron and Admin/API fail closed.
8. Update handoff from candidate to live state.
9. Move next address milestone to OS Open UPRN + Code-Point Open import design, not GetAddress harvesting.

## Non-negotiable rules

- Storage does not equal ownership/redistribution permission.
- No provider/API secrets in GitHub/docs/chat.
- New datasets default to no automation/no paid distribution until reviewed.
- Paid data surfaces must carry source/licence/attribution metadata.
- GetAddress automated harvest stays blocked unless explicit written permission changes the policy.
- ODbL data must not be silently repackaged into a proprietary dataset without satisfying ODbL obligations.
- Support tickets remain customer-only; public inbound email stays Admin Email inbox.
- Privileged staff access requires AAL2.
- Never use/reproduce the previously exposed GitHub PAT.

## Other open work

- privileged Admin fresh password/CAPTCHA/MFA completion still pending;
- recurring `/api/booking-notifications` 504s need separate investigation;
- remaining Auth templates + Magic Link;
- DMARC/BIMI;
- same-iPhone overflow confirmation;
- Stripe/SMS/legal/launch checks.

## Required workflow rule

Substantial product/provider changes use branch → PR → CI → preview/testing → migration/database verification → merge → production verification, with all three continuity files updated. Never overclaim a provider/runtime path that was not exercised.