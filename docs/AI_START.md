# Namdar AI fast resume

Last verified: 2026-09-12 UTC

Read this first. Use `docs/AI_HANDOFF.md` for implementation detail, `docs/PROJECT_STATUS.md` for the roadmap, and `docs/ADDRESS_DATA_PRODUCT.md` for the commercial address/property-data architecture.

## Current phase

**Phase 7 — Launch Security & Readiness**

## Critical GetAddress terms finding — DO NOT HARVEST

A 2026-09-12 provider-terms audit changed the previous GetAddress activation plan.

Current GetAddress Terms state that:
- Autocomplete and Typeahead requests must be initiated by human input; automated address lookups with those APIs can lead to account closure;
- attempts to download the whole or large sections of the provider dataset for offline use are prohibited;
- the service/data cannot be resold without explicit permission.

Provider terms: `https://getaddress.io/Terms`.

Therefore **do not perform the previously planned one-postcode automated/manual harvest test and do not enable the harvest cron** unless GetAddress grants explicit written permission covering the intended automation.

The production database remains clean: zero GetAddress harvest runs, zero harvest queue rows and zero `getaddress-daily-cache` rows. No paid GetAddress lookup has been consumed by the harvest implementation/testing so far.

## Current candidate branch

`fix/address-data-rights-and-commercial-foundation-20260912`

This branch converts the address system from provider-harvest-centric design to a rights-aware commercial data platform.

Candidate changes:
- machine-readable data rights on every registered address source;
- GetAddress marked operational/human-initiated only, with automation, paid redistribution and bulk export blocked;
- OpenStreetMap marked separately with ODbL/share-alike obligations and excluded from the proprietary subscription API by default;
- planned OS Open UPRN and Code-Point Open sources registered as OGL commercial foundations, inactive until imported;
- new `address_distribution_eligible` view exposes only sources explicitly approved for commercial redistribution **and** subscription API use;
- new `address_dataset_health` view reports exact live source counts and count drift;
- statement-level database triggers keep `address_dataset_registry.row_count` synchronized with actual `master_addresses` rows;
- fixes an existing count bug: production currently has 1 OSM master-address row while the registry says 0;
- scheduled `/api/address-harvest-cron` removed from Vercel config;
- harvest cron/admin manual run routed through a fail-closed rights guard;
- Admin cannot enable or run provider automation when rights prohibit it;
- full GetAddress cache/backups cannot be bulk-exported when rights prohibit it;
- Admin panel shows automation/redistribution/API/export rights instead of presenting unsafe controls as normal operations;
- future subscription tables for API clients, hashed API keys and daily metering/quota;
- `/api/address-data-v1` created but disabled unless `ADDRESS_DATA_API_ENABLED=true`; it only reads `address_distribution_eligible`;
- new commercial/address-rights regression tests in CI.

No raw provider secret or future customer API key is stored in Git.

## Production baseline before this candidate

- Repository: `pchroonic/pchroonic`, default branch `main`.
- Latest main docs merge before this branch: `ae67594d6f744ee0c9c26520ba041402282e224b`.
- Latest verified product-behavior commit before this branch: `945091c31cab6600916cd07854de3df4ac830d6a` from PR #30.
- Canonical production: `https://namdar.co.uk` on Vercel project `namdar-website-starter-1`.
- Supabase: `namdar-production` (`qjigldxjcpnrlyxgmlqq`), Free plan.
- Privileged Admin/Staff browser, API and RLS access require AAL2/MFA.
- Customer support tickets remain customer-only; public inbound email stays in Admin Email inbox.

Production harvest state before this branch:
- Automatic OFF;
- service-area priority ON;
- daily cap 20;
- no last run/success/error;
- zero harvest runs;
- zero harvest queue rows;
- zero GetAddress-cached rows.

## Address commercial strategy

Do not try to create a sellable database by scraping/caching restricted provider data.

Preferred foundation:
1. import **OS Open UPRN** for stable property identifiers + coordinates under OGL;
2. import **Code-Point Open** for postcode/location intelligence under OGL;
3. retain source-level provenance and licence flags for every row;
4. build a UPRN-based canonical property/entity model with field-level source/confidence later;
5. obtain an explicit redistribution/subscription licence for complete full postal-address text (for example an appropriate OS/partner/full-address product licence);
6. expose only licence-approved data through the paid API/export boundary.

OpenStreetMap remains useful operationally, but its ODbL share-alike obligations mean it must not silently contaminate a proprietary paid full-address product.

HM Land Registry Price Paid Data can add transaction intelligence later, but its address strings include third-party rights and should not be used as a shortcut to create a resale address database.

See `docs/ADDRESS_DATA_PRODUCT.md`.

## Future Namdar Address API

The candidate API foundation is intentionally OFF.

When eventually enabled:
- bearer API key required;
- only SHA-256 hashes of issued keys stored;
- active API client/plan required;
- product entitlement `address-v1` required;
- monthly request quota enforced server-side;
- max 100 rows/request;
- data comes only from `address_distribution_eligible`;
- licence/provenance/attribution travels with each response;
- restricted GetAddress rows cannot appear simply because they are stored in `master_addresses`.

Do not set `ADDRESS_DATA_API_ENABLED=true` until licence-safe data has been imported, API key issuance/rotation/admin tooling is ready, billing/terms are ready, and the API has been security/load tested.

## Immediate next action

1. Finish branch tests and Vercel preview.
2. Review/apply the new Supabase rights/commercial-foundation migration.
3. Verify GetAddress rights flags fail closed, OSM count reconciles to the actual row count, planned OS sources exist inactive, and API tables/views are server-only.
4. Merge only after CI + preview + database verification.
5. Verify production has **no GetAddress harvest cron**, automation remains OFF, and no provider lookup occurred.
6. Then move the address roadmap to importing OS Open UPRN / Code-Point Open and building UPRN/property intelligence.

Do **not** resume the previous one-postcode GetAddress harvest plan unless explicit provider permission is obtained and documented.

## Auth/security state

- Supabase Site URL: `https://namdar.co.uk`; redirect allowlist: `https://namdar.co.uk/**`.
- Email + Google sign-in intentionally enabled; do not disable Google without identity migration/recovery.
- Cloudflare Turnstile/Supabase CAPTCHA live.
- Customer login/password-reset request smoke tests passed.
- Privileged Admin/Staff CAPTCHA integration live; a complete fresh Admin password + CAPTCHA + MFA session still requires interactive user completion.
- Supabase Leaked Password Protection remains unavailable/disabled on the current Free plan.

## Other open work

- recurring `/api/booking-notifications` 504s observed; investigate separately;
- remaining Auth templates + Magic Link;
- DMARC/BIMI after sender audit;
- same-iPhone homepage overflow confirmation;
- Stripe, SMS, legal, cron/double-booking and controlled customer-support launch checks.

## Do not break

- Never expose GetAddress, Supabase, SMTP, Turnstile, GitHub or cron secrets.
- Never use/reproduce the previously exposed GitHub PAT.
- Do not make support tickets public.
- Do not move production back to Netlify.
- Never treat storage in Namdar as proof of redistribution rights.
- New/unreviewed data sources must fail closed for automation, paid API and bulk export.
- Paid address data surfaces must query a rights-aware eligible view, not raw `master_addresses`.