# Namdar AI handoff

Last verified: 2026-09-12 UTC

Read `docs/AI_START.md` first.

## Production source of truth before current candidate
- Repo `pchroonic/pchroonic`, default `main`.
- Current main: `6c4171258cd12553d3bd94cabc8d02fdcb5ec262`.
- Booking operations product release: PR #40 merge `858500c6c48d05af918c70d5ee087b319b9caf35`.
- Production is READY on `https://namdar.co.uk`.
- Supabase `namdar-production` (`qjigldxjcpnrlyxgmlqq`).
- Only `windows` is live; gutters/jetwash/roof/handyman/tour3d remain planned.
- Privileged staff requires AAL2/MFA.

## Current candidate
Branch: `feat/window-conversion-profitability-20260912`.

Purpose: measure the Window Cleaning Stage 1 funnel and direct job economics before considering another service.

## Existing timestamps reused
Do not duplicate these stages in analytics tables:
- `quotes.created_at` = guide quote request;
- `quotes.sent_at` = final quote sent;
- `quotes.customer_response/customer_responded_at` = accepted/declined;
- non-cancelled `bookings` = booked;
- `bookings.started_at/completed_at` = actual field work timing/completion.

The only missing acquisition link was covered postcode check → quote.

## Consent-aware postcode linkage
`conversion.js` now wraps the existing browser `api()` only for measurement. It creates a session-only anonymous visitor ID when `localStorage.namdar_cookie_choice === 'marketing'`. It does not create tracking storage for non-consenting visitors.

On successful `/api/postcode` responses it posts `/api/funnel-event` with the anonymous ID, service and coverage result. The server stores only the postcode area prefix letters, e.g. SE/SW; full postcodes are not written to funnel analytics.

When the same visitor submits `/api/quote`, the wrapper adds `visitorId`. `api/quote.js` preserves the live-service gate and Window input normalization, captures the successful quote ID and upserts `quote_funnel_links`. Link write failure does not fail the customer quote.

`api/funnel-event.js`:
- accepts POST only;
- allowlists `postcode_checked` and known service keys;
- validates anonymous IDs;
- derives postcode area server-side;
- deduplicates identical visitor/service/area/coverage events for 30 minutes.

## Database migration
Production migration already applied: `window_stage1_conversion_profitability`.
Repo migration: `supabase/migrations/20260912204000_window_stage1_conversion_profitability.sql`.

New server-only tables:
1. `conversion_events`
2. `quote_funnel_links`
3. `booking_job_costs`

All have RLS enabled. Direct grants to `anon` and `authenticated` are revoked. The event sequence is also revoked from public roles.

`booking_job_costs` stores direct operational inputs only: consumables, parking, travel, other direct cost, travel minutes/miles and an optional note. It does not attempt payroll, overhead or tax accounting.

## Window performance API
`api/admin-window-performance.js` requires `analytics` permission and reports a consented visitor cohort for the selected 30d/90d/YTD/all-time range:
1. covered postcode visitor;
2. guide quote requested;
3. final quote sent;
4. final quote accepted;
5. appointment booked;
6. job completed.

Every stage uses unique anonymous visitors from the same covered-postcode cohort, preventing misleading >100% conversion from repeat quote requests.

Data quality metadata states that postcode-to-quote linkage starts with this release. Historical downstream records are not retroactively invented.

Completed-job economics are independent of acquisition consent and include all completed Window jobs in the selected completion range:
- job value = invoice total, falling back to final quote then guide estimate;
- collected revenue = linked payments minus refunds;
- actual work hours = `started_at → completed_at` when valid;
- job value per actual work hour;
- direct cost only when a `booking_job_costs` review exists;
- direct contribution = reviewed job value − reviewed direct costs;
- direct margin = direct contribution / reviewed job value.

Jobs without direct-cost review do not silently count as £0 cost. Actual-time metrics only use jobs with valid start/completion timestamps.

## Admin UI
`admin-window-performance.js` injects a Stage 1 performance panel into Admin → Reporting. It follows the existing reporting range selector and refresh control.

It renders:
- six-stage consented funnel;
- tracking/data-quality note;
- completed jobs, job value, collected revenue, actual work time, value/work-hour, reviewed direct costs and direct contribution;
- completed-job table with editable consumables/parking/travel/other costs plus travel minutes/miles.

`api/admin-job-economics.js` requires `bookings` permission, validates/clamps non-negative values, upserts `booking_job_costs` and audit logs the change. Analytics-only staff can view performance but cannot edit costs.

The UI explicitly says direct contribution is **not net profit** because labour, overheads, tax and other business costs are excluded.

`admin.js` candidate version: `6.4.19-window-performance-1`, loading `admin-window-performance.js` after booking operations.

## Tests / release gates
New `scripts/window-performance.test.mjs` covers:
- RLS/server-only migration posture;
- privacy-safe event storage;
- consent-aware session tracking;
- quote link capture without weakening service gate;
- six funnel stages and direct contribution calculation;
- analytics/bookings permission separation;
- audit logging;
- explicit not-net-profit wording;
- Window-only fallback state.

CI syntax-checks the new browser/API modules and runs this suite.

Release gate remains: update all 3 handoff docs → PR → exact-head CI → exact-head Vercel preview/clean build → security/smoke checks → merge → production verification → docs sync with exact live IDs.

## Booking operations remain live
21-day horizon, 24h notice, Mon–Sat, 3 standard windows/day, max 3 jobs/day, postcode-area route density. These are stored in `site_settings.booking_operations` and editable from MFA-protected Admin.

## Non-negotiables
- Do not activate another service without deliberate user decision.
- Do not resume address-data work automatically.
- Existing accepted work survives service pause.
- Service and booking restrictions remain server-side enforced.
- Privileged access remains AAL2/MFA protected.
- Support tickets stay customer-only.
- Never expose secrets.
