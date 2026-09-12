# Namdar AI handoff

Last verified: 2026-09-12 UTC

Read `docs/AI_START.md` first. This file contains implementation detail and release rules.

## Source of truth

- Product: Namdar UK property-services platform.
- Repository: `pchroonic/pchroonic`, default `main`.
- Production main before the current services candidate: `870234204df1a9f0717cb43a4d0d91bb481a566c`.
- Canonical domain: `https://namdar.co.uk`.
- Supabase: `namdar-production` (`qjigldxjcpnrlyxgmlqq`), Free plan.
- Privileged Admin/Staff browser/API/RLS access requires AAL2/MFA.
- Support tickets remain customer-only. Public inbound email remains Admin Email inbox.

## Current business decision

Namdar currently provides **Window Cleaning only**.

The user wants to prove the Window Cleaning business first. If it performs well, additional services will be launched one by one. The website should nevertheless retain future service pages, pricing structures and code so a later stage can be activated without rebuilding the product.

Address-data expansion is deliberately parked while this services work is completed. Do not restart the Code-Point/Open UPRN pilot unless focus changes again.

## Problem found in the existing product

Before this candidate, six services are hard-coded throughout the public site:
- Window Cleaning (`windows`)
- Gutter Cleaning (`gutters`)
- Roof Cleaning (`roof`)
- Patio / Jet Washing (`jetwash`)
- Handyman (`handyman`)
- 3D Property Tours (`tour3d`)

All six appear on the homepage and quote radio list. More importantly, `/api/quote`, `/api/postcode` and `/api/subscription` accept dormant service keys directly. Therefore a CSS/UI-only hide would not enforce the business model.

Production already has pricing rules for all six. The current active service area has `service_keys=[]`, historically meaning all services. That configuration is retained so future live services inherit the area automatically unless an area is later made service-specific.

## Current candidate

Branch:
`feat/service-catalog-window-cleaning-only-20260912`

Migration:
`supabase/migrations/20260912192000_service_catalog_activation.sql`

This migration is NOT production-live until the release workflow verifies and applies it.

## New service_catalog model

`public.service_catalog` is the server-side source of truth for whether Namdar is accepting new work for a service.

Columns include:
- `service_key` primary key
- `name`
- `short_name`
- `slug`
- `status`
- `stage_number`
- `display_order`
- `description`
- `live_since`
- timestamps

Allowed statuses:
- `planned`: prepared but hidden/not quotable
- `coming_soon`: may be marketed as upcoming but still not quotable
- `live`: new quotes/postcode service checks/subscription requests permitted
- `paused`: visible as temporarily unavailable, new work blocked
- `retired`: no new work

Initial seeded state:
1. windows → live
2. gutters → planned
3. jetwash → planned
4. roof → planned
5. handyman → planned
6. tour3d → planned

The table has RLS enabled. `anon` and `authenticated` have direct privileges revoked; `service_role` owns server access. Public clients receive only a safe projection through `/api/public-data`.

## Fail-closed helper

`lib/service-catalog.js` contains the canonical definitions and status helpers.

If the database catalog cannot be read, it deliberately falls back to:
- Window Cleaning = live
- every other known service = planned

This prevents a database/runtime failure from accidentally making future services available.

## New-work server gates

### Quote

The original quote implementation has been preserved byte-for-byte as `api/quote-core.js`.

New `api/quote.js` wrapper:
- parses requested service;
- loads service status server-side;
- returns 400 for unknown service;
- returns 409 with a status-specific message for planned/coming-soon/paused/retired;
- delegates to the original quote engine only for `live`.

### Postcode/service coverage

Original implementation preserved as `api/postcode-core.js`.

New wrapper checks a supplied `service` query param and refuses non-live service checks before the existing geography/coverage logic runs. Postcode-only lookups without a service remain valid for address/profile workflows.

### Recurring subscriptions

Original implementation preserved as `api/subscription-core.js`.

New wrapper blocks POST creation for non-live services. GET existing subscriptions and PATCH cancellation remain untouched.

### Existing commitments

Do NOT add a blanket live-status check to existing accepted quotes/bookings. A later pause is meant to stop **new work**, not break work Namdar already agreed with customers.

## Public-data behaviour

`api/public-data.js` now loads the catalog first.

It returns safe service objects containing status/stage/public/quotable flags.

Only live services expose:
- public `pricing_rules` rows;
- published portfolio jobs on the public surfaces.

For public service-area output:
- explicit area `service_keys` are intersected with live services;
- empty area `service_keys` means all currently live services.

This fixes the previous public label “All services” while only Window Cleaning is actually offered.

## Homepage behaviour

`conversion.js` now owns availability presentation without requiring the large static `index.html` to be rebuilt every stage.

It applies a synchronous safe default before any network response:
- Windows card + quote choice available;
- all future-service cards/quote choices hidden/disabled.

After `/api/public-data` returns:
- live: card + quote option available;
- coming_soon: card visible with status, quote action disabled;
- paused: card visible with status, quote action disabled;
- planned/retired: hidden.

The 3D homepage nav/section follows service status. When Window Cleaning is the sole live service, visible homepage wording, mobile CTA, footer and document metadata are adjusted toward Window Cleaning.

## Static service pages

All future `services/*.html` pages stay built in the repo.

`seo-page.js` maps the current slug to catalog status.

For non-live services it:
- applies `noindex,follow` dynamically;
- adds a clear Planned / Coming soon / Paused / Retired notice;
- changes quote CTAs to the currently live Window Cleaning quote journey;
- hides related planned/retired service links;
- updates mobile CTA/footer wording.

When Admin later sets a service to `live`, normal content/quote behaviour is restored from the same page structure without creating a new page.

## Customer portal

`account-service-availability.js` is loaded after the existing account scripts.

It:
- immediately falls back to Window Cleaning only;
- rebuilds the recurring-service dropdown from live catalog services;
- disables new subscription submission if no live service exists;
- suppresses 3D-specific portal/ticket wording while 3D is not live.

This closes the existing account-side bypass where Gutter and Jet Washing were statically selectable.

## Search/indexing

`api/sitemap.js` is now catalog driven.

Only live service slugs are included. Published job URLs are only added when their `service_key` is live. Future service pages remain in source control but are no longer intentionally advertised in the sitemap before launch.

## Admin launch controls

New endpoint: `api/admin-services.js`.
New UI module: `admin-services.js`, loaded by `admin.js` into the existing Pricing tab.

Security:
- `requireStaff(req,'settings')` → existing AAL2/MFA wrapper still applies;
- status changes are audit logged.

Readiness check before `live`:
1. matching `pricing_rules` row must exist;
2. at least one active `service_areas` row must support it (empty `service_keys` counts as supporting all configured services).

Admin UI shows stage, current status, pricing readiness, coverage readiness and active area names. Entering or leaving `live` requires an explicit confirmation.

## Tests / CI candidate

`scripts/service-catalog.test.mjs` verifies:
- fallback is Window-only live;
- database status overrides merge safely;
- migration seeds one live + five planned;
- quote/postcode/subscription entrypoints all call the live-status gate;
- public data hides dormant pricing;
- sitemap is live-service-driven;
- Admin requires pricing + coverage before live;
- homepage/account fail safe Window-only;
- future service pages are noindex/unquotable.

CI workflow syntax-checks all new wrapper/core/UI/helper files and runs the service-catalog test.

## Required release workflow

1. Keep all three handoff docs updated in the feature branch.
2. Compare branch to main and open PR.
3. Require GitHub CI success.
4. Require exact-head Vercel preview READY / clean build.
5. Apply `service_catalog_activation` migration only after those gates.
6. Verify table rows, status values, RLS and direct grants.
7. Verify public-data has exactly one live service, one public pricing row, and service-area service_keys resolve to windows.
8. Verify sitemap has Window Cleaning and excludes five future service pages.
9. Verify Admin endpoint unauthenticated/AAL1 behaviour remains protected; privileged interactive testing may still require user MFA.
10. Verify direct planned-service POST/new-work paths are blocked where a runnable HTTP client is available; unit tests are mandatory regardless.
11. Run Supabase security and performance advisors; fix any new finding caused by this schema.
12. Merge PR and verify production deployment/aliases.
13. Verify production public-data, sitemap and visible homepage/service-page state.
14. Create docs-only live-state sync if exact deployment/migration IDs changed after the product PR.

## Parked address-data platform

PR #34 remains production-live with:
- `postcode_points`
- `property_entities`
- `property_field_observations`
- `open_data_import_runs`
- rights-filtered postcode/property distribution views

No official OS rows are imported. Future Address API remains disabled. Current Free project is not suitable for Britain-wide UPRN.

GetAddress automated harvesting remains prohibited under current provider terms and Namdar policy. Automatic is OFF; do not restore the old cron/harvest roadmap without explicit written rights.

## Non-negotiable rules

- Window Cleaning only remains the current offer until an Admin status is deliberately moved to live.
- Never rely only on hidden DOM/CSS for service availability.
- Live activation must pass pricing + service-area readiness.
- Existing accepted work survives service pauses.
- Keep future service assets/code rather than deleting them.
- Privileged staff access requires AAL2/MFA.
- Support tickets remain customer-only; public inbound email stays Admin Email inbox.
- Never commit or expose Supabase/provider/SMTP/Turnstile/GitHub/cron/API secrets.
