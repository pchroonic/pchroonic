# Namdar project status

Last updated: 2026-09-12 UTC

## Baseline

- Source: `pchroonic/pchroonic`, default branch `main`.
- Production main before current service candidate: `870234204df1a9f0717cb43a4d0d91bb481a566c`.
- Production: `https://namdar.co.uk` on Vercel.
- Supabase: `namdar-production` (`qjigldxjcpnrlyxgmlqq`), Free plan.
- Address-data platform foundation is live but its next dataset import is intentionally parked.

## Main product areas

| Area | Status |
| --- | --- |
| Public website | Live; current service-offer accuracy is being fixed so only Window Cleaning is available |
| Window Cleaning | Current commercial service; must remain live/quotable |
| Future services | Built in site/code/pricing; candidate activation lifecycle being added |
| Customer portal | Email + Google auth, customer MFA option, Turnstile/Supabase CAPTCHA live; subscriptions being service-gated |
| Admin/Staff security | Mandatory AAL2/MFA live; fresh privileged password/CAPTCHA/MFA completion still pending |
| Email inbox | Spam controls + Inbox Security v2 live |
| Address system | Rights-aware source registry and OS property/postcode schema live; imports parked |
| Future data API | Foundation live but disabled |
| Support tickets | Customer-only; public inbound email stays Admin Email inbox |

## Business rollout decision

Namdar will launch services gradually instead of presenting six services as already available.

Current offer:
- **Window Cleaning only**.

Future stage candidates already present in the product:
1. Window Cleaning — current/live
2. Gutter Cleaning — future
3. Patio & Jet Washing — future
4. Roof Cleaning — future
5. Handyman Services — future
6. 3D Property Tours — future

The order can change later; the important product requirement is that a future service can be prepared privately and activated only when Namdar is ready to operate it.

## Current candidate — staged service activation

Branch: `feat/service-catalog-window-cleaning-only-20260912`.

Migration: `20260912192000_service_catalog_activation.sql` — candidate, not production-live yet.

### Lifecycle

`service_catalog.status` supports:
- planned
- coming_soon
- live
- paused
- retired

Only `live` accepts new quote/service-area/subscription work.

Initial desired state:
- Windows live;
- Gutters / Jet Washing / Roof / Handyman / 3D planned.

### Server enforcement

Candidate wraps the existing quote, postcode and subscription implementations with server-side live-status gates. Original implementations are preserved as `quote-core.js`, `postcode-core.js`, `subscription-core.js`.

If the catalog is unavailable, fallback is intentionally Window-only live.

Existing accepted customer commitments continue even if a service is later paused.

### Public website

Homepage will show/quote only live services. Planned and retired services are hidden. Coming-soon or paused services can be visible without quote access.

Future service HTML pages remain built. Non-live pages display their launch state and redirect quote CTAs to Window Cleaning; they are dynamically marked noindex until live.

Public pricing and public portfolio jobs are filtered to live services.

Public service areas with `service_keys=[]` resolve to current live services rather than displaying “All services”.

The sitemap includes live services only.

### Customer portal

Recurring-service requests use the same live-service catalog. With the initial state, only Window Cleaning appears in the subscription selector.

3D-specific portal/ticket wording is suppressed until 3D is live.

### Admin

A new Service launch stages panel is injected into Pricing.

Admin can move a service through Planned / Coming soon / Live / Paused / Retired. Making a service live is rejected unless:
- pricing exists;
- an active service area covers it.

Status changes require privileged settings access and are audit logged.

## Why this is needed

The old public UI lists all six services and old API code accepts all six service keys. Merely hiding future cards would leave a direct API bypass. The new catalog is therefore the business-rule boundary, while frontend visibility is only presentation.

## Validation/release checklist

- [ ] service-catalog regression suite passes in GitHub CI
- [ ] exact-head Vercel preview READY and clean
- [ ] migration applied after preview/CI gates
- [ ] exactly 6 catalog rows: Window live, five planned
- [ ] RLS/direct grants verified service-role-only
- [ ] public data shows one live service + Window pricing only
- [ ] active service area public output resolves to Windows
- [ ] sitemap includes Window Cleaning and excludes future service slugs
- [ ] planned new-work API requests blocked
- [ ] Supabase advisors show no new schema problem
- [ ] PR merged and production deployment READY on `namdar.co.uk`
- [ ] all three continuity docs synced to final live state

## Parked address-data work

The OS Open UPRN + Code-Point foundation remains production-live from PR #34, but no official OS rows have been imported. The next address milestone, when deliberately resumed, is a controlled Code-Point Open service-area pilot.

GetAddress harvesting remains blocked. Do not restore automated Typeahead/Autocomplete harvesting, bulk extraction, resale or the removed cron under current provider terms.

## Other open issues

- privileged fresh password/CAPTCHA/MFA completion pending;
- recurring `/api/booking-notifications` 504 investigation;
- remaining Auth templates + Magic Link;
- DMARC/BIMI;
- same-iPhone overflow confirmation;
- Stripe, SMS, legal and remaining launch checks.

## Handoff rule

Every substantial product/provider/data change updates `docs/AI_START.md`, `docs/AI_HANDOFF.md`, and this file. Never store credentials, raw API keys, customer secrets, TOTP codes or one-time Auth links. Service availability must be enforced server-side, not just visually.
