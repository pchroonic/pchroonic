# Namdar project status

Last updated: 2026-09-12 UTC

## Baseline

- Source: `pchroonic/pchroonic`, default branch `main`.
- Current product merge: `cbd189da5a1516238aa11b0d796ea865816892b4` from PR #36.
- Production deployment: `dpl_AZtJJiXSMRas45F8mU8KTfLjqHwR`, READY on `https://namdar.co.uk`.
- Supabase: `namdar-production` (`qjigldxjcpnrlyxgmlqq`), Free plan.
- Service catalog migration live: `20260912182925 service_catalog_activation`.
- Address-data platform foundation remains live but imports are intentionally parked.

## Main product areas

| Area | Status |
| --- | --- |
| Public website | Live; customer offer is now Window Cleaning only |
| Window Cleaning | LIVE/quotable; current commercial focus |
| Future services | Built/prepared but planned; Admin activation lifecycle live |
| Customer portal | Live; recurring-service selector obeys live catalog |
| Admin/Staff security | Mandatory AAL2/MFA live; Service launch stages available in Pricing |
| Email inbox | Spam controls + Inbox Security v2 live |
| Address system | Rights-aware registry + OS property/postcode schema live; imports parked |
| Future data API | Foundation live but disabled |
| Support tickets | Customer-only; public inbound email stays Admin Email inbox |

## Service rollout — LIVE

Namdar now launches services gradually.

Current status:
1. Window Cleaning — **LIVE**
2. Gutter Cleaning — planned
3. Patio & Jet Washing — planned
4. Roof Cleaning — planned
5. Handyman Services — planned
6. 3D Property Tours — planned

The order is not a permanent business promise. A future service can remain prepared, move to Coming soon, and later go Live when Namdar is genuinely ready to operate it.

## Service lifecycle / business-rule boundary

`service_catalog.status` supports:
- planned
- coming_soon
- live
- paused
- retired

Only `live` accepts new quote/service-specific postcode/subscription work. This is enforced server-side, not just by hiding UI.

Fail-safe on catalog failure: Windows live, all other known services planned.

Existing accepted customer commitments survive a later service pause.

## Public website / SEO

Production public data verifies:
- only Window Cleaning is live/quotable/public;
- only Window Cleaning pricing is returned;
- service-area public output resolves to `windows` only.

Homepage hides planned/retired services and disables non-live quote choices. Coming-soon/paused states can be visible without accepting quotes.

Future service HTML pages remain in the product so they can be activated later; while non-live they show an availability state, route quote actions to Windows and use `noindex,follow`.

Production sitemap currently includes only `/services/window-cleaning` among service pages.

## Customer portal

New recurring-service requests are catalog driven. With the current business state, Window Cleaning is the only subscription-service choice.

3D-specific project/ticket presentation remains suppressed until the 3D service is live.

## Admin service stages

Admin → Pricing contains **Service launch stages**.

Possible status changes: Planned / Coming soon / Live / Paused / Retired.

Before a service can go Live, the backend requires:
- pricing configured;
- active service-area coverage.

All six currently have prepared pricing and area readiness, but five remain planned by business choice. Status changes require settings permission/AAL2 and are audit logged.

## Release verification

- PR #36 exact head `ce21ffe89170b58ceb267298bcf1db690b72c798`.
- GitHub CI `34711279114` SUCCESS.
- Preview `dpl_Gwsoed8g4DVS6yVSPQ4ntiFYy2WR` READY / clean build.
- Migration live as `20260912182925`.
- Six catalog rows verified: Window live, five planned.
- RLS enabled; anon/authenticated have no direct catalog grants.
- direct production Gutter postcode/service request → HTTP 409 planned/unavailable.
- equivalent Window request → HTTP 200 covered.
- `/api/admin-services` unauthenticated → 401.
- production public data → only Windows pricing; area services `["windows"]`.
- production sitemap → Window service only.
- Supabase advisors found no new service-catalog security/FK problem.
- PR #36 merge `cbd189da5a1516238aa11b0d796ea865816892b4`.
- Production deployment `dpl_AZtJJiXSMRas45F8mU8KTfLjqHwR` READY on `namdar.co.uk`.

## Immediate next work

Improve Window Cleaning before launching another service:
1. review/calibrate the Window Cleaning pricing model;
2. improve the quote flow and questions specifically for windows;
3. refine booking/service-frequency options;
4. add strong Window Cleaning trust, FAQ, process and before/after content;
5. improve Admin operating flow from quote review to completed job;
6. add/confirm conversion measurement so the user can judge whether the stage is paying off.

Do not activate the next service simply because the technical switch exists.

## Parked address-data work

The OS Open UPRN + Code-Point foundation is live from PR #34, but no official OS rows have been imported. When deliberately resumed, the next address milestone is a controlled Code-Point service-area pilot.

GetAddress harvesting remains blocked under current terms/Namdar policy.

## Other open issues

- privileged fresh password/CAPTCHA/MFA completion pending;
- recurring `/api/booking-notifications` 504 investigation;
- remaining Auth templates + Magic Link;
- DMARC/BIMI;
- same-iPhone overflow confirmation;
- Stripe, SMS, legal and remaining launch checks.

## Handoff rule

Every substantial product/provider/data change updates `docs/AI_START.md`, `docs/AI_HANDOFF.md`, and this file. Never store credentials, raw API keys, customer secrets, TOTP codes or one-time Auth links. Service availability must remain enforced server-side.
