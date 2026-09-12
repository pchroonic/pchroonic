# Namdar AI fast resume

Last verified: 2026-09-12 UTC

Read this first. Use `docs/AI_HANDOFF.md` for implementation detail and `docs/PROJECT_STATUS.md` for the roadmap.

## Current production baseline

- Repository: `pchroonic/pchroonic`, default `main`.
- Current product merge: `cbd189da5a1516238aa11b0d796ea865816892b4` from PR #36.
- PR #36 exact head: `ce21ffe89170b58ceb267298bcf1db690b72c798`.
- GitHub CI run `34711279114`: SUCCESS.
- Exact-head Vercel preview `dpl_Gwsoed8g4DVS6yVSPQ4ntiFYy2WR`: READY, clean build.
- Production Vercel `dpl_AZtJJiXSMRas45F8mU8KTfLjqHwR`: READY on `https://namdar.co.uk`, no alias error.
- Supabase migration live: `20260912182925 service_catalog_activation`.
- Address-data work is parked; Address API remains disabled and GetAddress harvesting remains blocked.

## Current business model — LIVE

**Window Cleaning is Namdar's only live/bookable service.**

Future services remain fully prepared in the website/database and can be activated later from Admin without rebuilding the site:
1. Window Cleaning — LIVE
2. Gutter Cleaning — planned
3. Patio & Jet Washing — planned
4. Roof Cleaning — planned
5. Handyman Services — planned
6. 3D Property Tours — planned

Stage order is operational and can be changed later.

## Service lifecycle

`service_catalog.status` is the server-side source of truth:
- `planned` — hidden/not quotable;
- `coming_soon` — may be shown but not quotable;
- `live` — accepts new work;
- `paused` — blocks new work while preserving existing commitments;
- `retired` — no new work.

If the catalog cannot be read, Namdar fails safe to Window Cleaning live and every other known service planned.

## New-work protection

The live-status rule is enforced server-side for:
- `/api/quote`;
- `/api/postcode?service=...`;
- `/api/subscription` POST.

Existing accepted quotes/bookings are intentionally preserved if a service is later paused.

Production verification:
- direct Gutter Cleaning postcode request returns HTTP 409 planned/unavailable;
- equivalent Window Cleaning postcode request succeeds for a covered postcode.

## Public website state

Production `/api/public-data` verifies:
- Window Cleaning `live=true`, `quotable=true`;
- all five future services `planned`, `quotable=false`, `public=false`;
- only Window Cleaning pricing is exposed publicly;
- current public service-area `service_keys` resolves to `["windows"]`.

Homepage/customer portal/service pages follow the same catalog:
- planned services hidden from normal customer journeys;
- coming-soon/paused can be displayed without quote access;
- future service pages stay built and become usable when moved to live;
- customer recurring-service selector shows live services only;
- non-live service pages use `noindex,follow` and route quote actions to Window Cleaning.

Production sitemap includes `/services/window-cleaning` and excludes the five future service slugs.

## Admin service activation

Admin → Pricing now has **Service launch stages**.

Before a service can be made `live`, the server requires:
- pricing configured;
- at least one active service area covering it.

All six services currently have prepared pricing and active-area readiness, but only Window Cleaning is live. Status changes require privileged `settings` access, AAL2/MFA and are audit logged. Unauthenticated `/api/admin-services` returns 401.

## Security / database verification

- `service_catalog` has RLS enabled.
- anon/authenticated have no direct table grants; service role is the server access path.
- Supabase advisor only adds the expected INFO that this deliberately server-only RLS table has no browser policy; no new service-catalog security/FK issue.
- Status-change rollback test returned Gutter Cleaning to `planned`.

## Immediate next service work

Focus on making the **Window Cleaning customer journey excellent** before activating another service: pricing/quote UX, booking flow, service-specific content, trust/proof, operational rules and conversion improvements.

Do not activate another service merely because pricing/coverage already exists; activation should follow the user's business decision that Window Cleaning has paid off and the next service is operationally ready.

## Parked address-data work

Do not resume automatically. The next address-data milestone remains the controlled Code-Point Open service-area pilot. The current Free Supabase database is not suitable for Britain-wide UPRN scale.

GetAddress automated harvesting remains prohibited under current provider terms and Namdar policy.

## Do not break

- Window Cleaning only is the current commercial offering unless deliberately activated otherwise.
- UI hiding is not the business-rule boundary; new-work APIs must enforce live status server-side.
- Existing customer commitments survive a later service pause.
- Future service content/pricing can be prepared privately before launch.
- Privileged staff access requires AAL2/MFA.
- Support tickets remain customer-only; public inbound email remains Admin Email inbox.
- Never expose provider, Supabase, SMTP, Turnstile, GitHub, cron or API secrets.
