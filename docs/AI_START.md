# Namdar AI fast resume

Last verified: 2026-09-12 UTC

Read this first. Use `docs/AI_HANDOFF.md` for implementation detail, `docs/PROJECT_STATUS.md` for the roadmap, `docs/ADDRESS_DATA_PRODUCT.md` for the parked address-data architecture, and `docs/OS_OPEN_DATA_IMPORT.md` for future OS import operations.

## Current production baseline

- Repository: `pchroonic/pchroonic`, default `main`.
- Current main: `870234204df1a9f0717cb43a4d0d91bb481a566c` after docs PR #35.
- Latest product release: PR #34 OS Open UPRN + Code-Point property foundation, product merge `c5d2d33cda10bf1d80ecdf6229e7f352146b4b55`.
- Production Vercel is READY on `https://namdar.co.uk`.
- Supabase: `namdar-production` (`qjigldxjcpnrlyxgmlqq`), Free plan; database about 16 MB after the OS schema release.
- Address-data API remains disabled. No official OS rows have been imported. GetAddress harvesting remains blocked and untouched.

## Current product focus — services

The user has deliberately parked the address-data pilot for now.

Business strategy:
- **Window Cleaning is the only service Namdar currently provides.**
- Prove that Window Cleaning pays off first.
- Add future services one stage at a time.
- Future services should remain built/prepared in the website and database so they can be activated later without redesigning Namdar.

Current code before this candidate hard-codes all six services as visible/selectable and the quote/subscription APIs accept them. Hiding cards alone is not sufficient because a caller could submit a dormant service directly to an API.

## Current candidate branch

`feat/service-catalog-window-cleaning-only-20260912`

Candidate migration:
`supabase/migrations/20260912192000_service_catalog_activation.sql`

Do not describe this candidate as production-live until PR/CI/preview/migration/merge/production verification are complete.

### Service lifecycle model

New server-side source of truth: `service_catalog`.

Statuses:
- `planned` — built/prepared but hidden and not quotable;
- `coming_soon` — may be shown publicly, but no new quote/subscription requests;
- `live` — public and available for new quote/subscription requests;
- `paused` — visible as temporarily unavailable; no new work;
- `retired` — no longer offered.

Seeded stages:
1. `windows` — **live**
2. `gutters` — planned
3. `jetwash` — planned
4. `roof` — planned
5. `handyman` — planned
6. `tour3d` — planned

Future stage order is operational, not a promise: Admin can change a service status when the business is actually ready.

## Candidate protections

Server-side gates:
- `/api/quote` checks `service_catalog` before the existing quote engine;
- `/api/postcode?service=...` rejects non-live service checks;
- `/api/subscription` rejects new recurring requests for non-live services;
- old quote/postcode/subscription logic is preserved in `*-core.js` files behind the new gate.

Fail-safe fallback if the catalog cannot be read:
- Window Cleaning remains live;
- every other known service is treated as planned.

Existing accepted quotes/bookings are intentionally not cancelled if a service later becomes paused. New-work gating is separate from honouring existing commitments.

## Candidate public behaviour

`/api/public-data` now returns safe service status metadata and exposes pricing/public portfolio jobs only for live services.

When a service area has an empty `service_keys` list (meaning all configured services), public output resolves that to the current live services. With the present strategy the map therefore says Window Cleaning rather than “All services”.

Homepage `conversion.js`:
- synchronously fails safe to Window Cleaning only;
- planned/retired service cards are hidden;
- coming-soon/paused cards can be visible but cannot start a quote;
- quote radios exist in the HTML for future stages but are disabled/hidden unless live;
- 3D navigation/section follows service status;
- current page copy is adjusted to Window Cleaning while it is the sole live service.

Service pages `seo-page.js`:
- future pages remain built;
- non-live pages show an unavailable/coming-soon/paused state;
- quote CTAs redirect to the live Window Cleaning journey;
- non-live service pages receive `noindex,follow` dynamically;
- related planned services are hidden.

Customer portal:
- recurring-service dropdown is rebuilt from live services only;
- 3D-specific portal wording is suppressed while 3D is not live.

Sitemap:
- only live service slugs and live-service published jobs are included.

## Candidate Admin activation control

New `/api/admin-services` + `admin-services.js` panel in the existing Pricing area.

Privileged access uses `requireStaff(req,'settings')`, therefore existing AAL2/MFA enforcement still applies.

Before Admin can switch a service to `live`, the server verifies:
- pricing exists in `pricing_rules`;
- at least one active service area covers the service (empty `service_keys` continues to mean all configured/live services).

Every status change is audit logged. The UI confirms transitions into/out of `live`.

## Validation required before release

1. CI must run `scripts/service-catalog.test.mjs` and syntax-check all new/wrapped files.
2. Exact-head Vercel preview must be READY with clean build.
3. Apply `service_catalog_activation` migration only after those checks.
4. Verify production rows: exactly Window Cleaning live and five future services planned.
5. Verify RLS/privileges keep `service_catalog` server-only.
6. Verify public-data returns only Window pricing and service-area output resolves to Window Cleaning.
7. Verify sitemap includes `/services/window-cleaning` and excludes future service slugs.
8. Verify planned-service quote/postcode/subscription requests are rejected while Window Cleaning remains accepted by the service gate.
9. Run Supabase security/performance advisors.
10. Merge and verify production UI/API state.
11. Update all three handoff docs to the live release state.

## Parked address-data work

Do not resume automatically. The next address-data milestone remains the controlled official Code-Point Open service-area pilot, followed later by a service-area UPRN pilot. The current Free Supabase database is not suitable for Britain-wide UPRN scale.

GetAddress rule remains unchanged: do not resume automated harvesting without explicit written provider permission and a rights review.

## Do not break

- Window Cleaning only is the current commercial offering unless the user deliberately activates another stage.
- UI hiding is not a security/business-rule boundary; new-work APIs must enforce live status server-side.
- Existing customer commitments should survive a later service pause.
- Future-service pricing/content may be prepared privately before launch.
- Storage does not create redistribution rights for address data.
- Never expose provider, Supabase, SMTP, Turnstile, GitHub, cron or future customer API secrets.
- Support tickets remain customer-only; public inbound email remains Admin Email inbox.
- Privileged staff access requires AAL2/MFA.
