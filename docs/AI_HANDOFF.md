# Namdar AI handoff

Last verified: 2026-09-12 UTC

Read `docs/AI_START.md` first. This file contains implementation detail and release rules.

## Source of truth

- Product: Namdar UK property-services platform.
- Repository: `pchroonic/pchroonic`, default `main`.
- Current product merge: `cbd189da5a1516238aa11b0d796ea865816892b4` from PR #36.
- PR #36 exact head: `ce21ffe89170b58ceb267298bcf1db690b72c798`.
- GitHub CI `34711279114`: SUCCESS.
- Exact-head preview `dpl_Gwsoed8g4DVS6yVSPQ4ntiFYy2WR`: READY.
- Production `dpl_AZtJJiXSMRas45F8mU8KTfLjqHwR`: READY on `https://namdar.co.uk`, no alias error.
- Supabase: `namdar-production` (`qjigldxjcpnrlyxgmlqq`), Free plan.
- Production migration: `20260912182925 service_catalog_activation`.
- Privileged Admin/Staff access requires AAL2/MFA.

## Business decision

Namdar currently provides **Window Cleaning only**. The user wants to prove this service first, then activate additional services one by one. Future services must remain built/prepared so launch does not require a site rebuild.

Current live catalog:
- `windows` — live
- `gutters` — planned
- `jetwash` — planned
- `roof` — planned
- `handyman` — planned
- `tour3d` — planned

All six already have pricing and current active-area readiness. This is preparation, not permission to activate them.

## service_catalog — LIVE

`public.service_catalog` is the server-side source of truth.

Statuses:
- `planned`: hidden/not quotable
- `coming_soon`: may be marketed, no new work
- `live`: new quote/postcode/subscription work permitted
- `paused`: new work blocked, existing commitments preserved
- `retired`: no new work

RLS is enabled. anon/authenticated have no direct table grants. Server service role reads/writes the catalog.

`lib/service-catalog.js` fails closed if DB lookup fails: Window Cleaning remains live; all other known services become planned.

## Server enforcement

The original implementations are preserved as:
- `api/quote-core.js`
- `api/postcode-core.js`
- `api/subscription-core.js`

Wrappers enforce catalog state before new work:
- `api/quote.js`: unknown 400, non-live 409, live delegates to quote engine.
- `api/postcode.js`: when a `service` query is supplied, non-live is rejected before coverage logic; postcode-only lookups remain available for other workflows.
- `api/subscription.js`: POST new recurring request is blocked for non-live; GET existing subscriptions and PATCH cancellation remain unchanged.

Do not add a blanket live-status check to accepted quotes/bookings. A later pause stops new work and does not cancel existing commitments.

Production smoke:
- `/api/postcode?postcode=SE14%205TD&service=gutters` → 409 planned/unavailable.
- same postcode with `service=windows` → 200 covered in Lewisham.

## Public-data / website behaviour

`api/public-data.js` returns safe service status metadata and only exposes live-service pricing and live-service published work.

Production verified:
- Window Cleaning live/quotable/public.
- five future services planned/not quotable/not public.
- pricing response contains only `windows` (£50 base, £4.50 unit under current pricing rule).
- current public service-area output resolves empty DB `service_keys` to `["windows"]`.

`conversion.js`:
- applies synchronous Window-only fallback;
- planned/retired cards and quote radios hidden/disabled;
- coming-soon/paused can be visible but cannot initiate quote;
- 3D section/nav follows catalog;
- when Windows is sole live service, homepage metadata/copy/CTA/footer are Window-focused.

`seo-page.js`:
- future pages remain built;
- non-live page receives unavailable state and `noindex,follow`;
- quote CTA routes to live Window Cleaning journey;
- planned related-service links are hidden.

`account-service-availability.js`:
- rebuilds recurring-service dropdown from live services;
- currently Window Cleaning only;
- suppresses 3D-specific wording/category until 3D is live.

`api/sitemap.js`:
- includes only live service slugs and published work belonging to live services.
- production sitemap includes `/services/window-cleaning` and excludes gutter/roof/jetwash/handyman/3D service URLs.

## Admin launch stages

`api/admin-services.js` + `admin-services.js` are live in Admin → Pricing.

Security:
- `requireStaff(req,'settings')` uses existing AAL2 requirement;
- unauthenticated production request returns 401;
- every status change is audit logged.

Before `live`, server checks:
1. `pricing_rules` exists for the service;
2. at least one active service area supports it. Empty DB `service_keys` means all configured services are operationally eligible for that area.

Admin UI shows stage, status, pricing readiness and coverage readiness and confirms entering/leaving live.

## Release verification

- CI run `34711279114` passed service-catalog tests and syntax checks.
- Preview `dpl_Gwsoed8g4DVS6yVSPQ4ntiFYy2WR` READY, clean errors-only build.
- Migration live as `20260912182925`.
- 6 rows verified: one live + five planned.
- RLS enabled; no anon/auth direct grants.
- transaction/rollback status test left Gutter as planned.
- Supabase security advisor: expected INFO `RLS enabled, no policy` for server-only catalog, plus pre-existing leaked-password warning; no new service-catalog security issue.
- Performance advisor: new catalog index appears unused because feature is new; no new unindexed FK from this feature.
- Product PR #36 merged as `cbd189da5a1516238aa11b0d796ea865816892b4`.
- Production deployment `dpl_AZtJJiXSMRas45F8mU8KTfLjqHwR` READY and aliased to `namdar.co.uk`.

## Next recommended work

Stay on Window Cleaning. Improve the end-to-end customer/service operation before launching another stage:
- Window quote/pricing UX and pricing model;
- booking availability and operational rules;
- service-specific FAQs/content/trust proof;
- recurring Window Cleaning options;
- conversion tracking and funnel quality;
- Admin workflow for quote review/job completion.

Only move another service to live when the user deliberately decides the Window Cleaning stage has paid off and the next service is operationally ready.

## Parked address-data platform

PR #34 OS Open UPRN + Code-Point foundation remains live, but no official OS rows are imported. The Address API remains disabled. Do not restart the Code-Point pilot unless focus changes.

GetAddress automated harvesting remains prohibited under current provider terms/Namdar policy.

## Non-negotiable rules

- Window Cleaning only remains the current offer until deliberate activation.
- Never rely only on DOM/CSS hiding; new-work API gates are mandatory.
- Existing accepted work survives service pauses.
- Future service content/pricing may be prepared privately.
- Privileged staff access requires AAL2/MFA.
- Support tickets remain customer-only; public inbound email stays Admin Email inbox.
- Never expose Supabase/provider/SMTP/Turnstile/GitHub/cron/API secrets.
