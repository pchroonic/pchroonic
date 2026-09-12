# Namdar project status

Last updated: 2026-09-12 UTC

## Baseline
- Source: `pchroonic/pchroonic`, default `main`.
- Current product main before this docs sync: `5249e2b4d2ed0c108a15facac01258d66bf4dece` from PR #42.
- Product production deployment: `dpl_5f1vCtVuo2LTFFPzWrqdfXLp8CbV`, READY on `https://namdar.co.uk`, no alias error.
- Supabase: `namdar-production` (`qjigldxjcpnrlyxgmlqq`).
- Window Cleaning is the only live/quotable/bookable service.
- Five future services remain planned.
- Address-data imports remain parked.

## Window Cleaning Stage 1 — LIVE
PR #38: Window-specific quote/recurring journey and quote-gate hardening.
PR #40: operational customer booking rules and postcode-area route density.
PR #42: consent-aware conversion funnel and completed-job direct-contribution reporting.

Live booking defaults: 21 days, 24h notice, Mon–Sat, 08–11 / 11–14 / 14–17, max 3 jobs/day, route density enabled.

## Conversion funnel — LIVE
Admin → Reporting now measures consented visitors through:
1. covered postcode check;
2. guide quote request;
3. final quote sent;
4. accepted quote;
5. booked appointment;
6. completed job.

Existing business timestamps remain authoritative for quote/acceptance/booking/completion. New tracking only supplies the missing covered-postcode → quote link.

Tracking is consent-aware: only visitors with Namdar's existing `marketing` cookie choice receive a session-only anonymous ID. Analytics stores postcode area letters only, not full postcode. Non-consenting customers quote/book normally and are not included in acquisition-cohort reporting.

Historical Window quotes/bookings are not falsely retro-linked to old postcode checks.

## Direct-contribution / productivity reporting — LIVE
Completed Window jobs report:
- total and average job value;
- payments collected net of refunds;
- actual work hours from Start → Complete;
- job value per actual work hour;
- reviewed consumables/parking/travel/other direct costs;
- travel minutes/miles;
- direct contribution and direct margin for reviewed jobs.

Direct contribution is explicitly **not net profit**; labour, overheads, tax and other business costs are outside this Stage 1 metric.

Jobs without cost review are excluded from contribution/margin rather than treated as £0 cost. Jobs without valid actual timing are excluded from work-hour productivity calculations.

`api/admin-job-economics.js` is AAL2/Bookings protected, Window-only and audit logged.

## Database/security
Committed migrations:
- `20260912204000_window_stage1_conversion_profitability.sql`;
- `20260912204500_window_stage1_costs_updated_by_index.sql`.

Internal tables:
- `conversion_events`;
- `quote_funnel_links`;
- `booking_job_costs`.

Production verification:
- RLS enabled on all three;
- no direct anon/authenticated grants;
- 0 rows in all three at release verification (no fabricated analytics/cost data).

Migration history also contains idempotent `window_funnel_profitability_foundation` from closed/unmerged duplicate PR #43. It re-asserted the same empty-table security/index foundation and is not the product implementation. Do not revive PR #43.

## Release verification — PR #42
- [x] production Stage 1 schema migrations applied
- [x] dedicated regression suite in CI
- [x] exact head `ba6e03376364ae571429b5fbded7bc681271aaac`
- [x] final GitHub CI `34716653998` SUCCESS
- [x] exact-head preview `dpl_6nBDUseeU7xSAefFzNQQLk6N9n6Y` READY / clean build
- [x] merged PR #42 as `5249e2b4d2ed0c108a15facac01258d66bf4dece`
- [x] production `dpl_5f1vCtVuo2LTFFPzWrqdfXLp8CbV` READY on `namdar.co.uk`, no alias error
- [x] unauthenticated Admin performance endpoint returns 401
- [x] funnel endpoint rejects GET with 405
- [x] live conversion script has marketing-consent + session-only tracking
- [x] analytics tables RLS/grants rechecked
- [x] service catalog rechecked: Window live, five planned
- [x] duplicate PR #43 closed unmerged

## Current live service stages
1. Window Cleaning — LIVE
2. Gutter Cleaning — planned
3. Patio & Jet Washing — planned
4. Roof Cleaning — planned
5. Handyman Services — planned
6. 3D Property Tours — planned

Do not activate Stage 2 simply because technical readiness exists. Use Stage 1 evidence and completed jobs first.

## Immediate next work
1. collect real Window Cleaning funnel/job data;
2. ensure completed jobs record Start/Complete and direct-cost review consistently;
3. use value/work-hour, travel and direct contribution to calibrate pricing/capacity;
4. add genuine before/after work and customer reviews;
5. assess Stage 2 only after enough evidence exists.

## Other open work
- fresh privileged password/CAPTCHA/MFA completion pending;
- `/api/booking-notifications` 504 investigation remains separate;
- Stripe, SMS, legal and remaining launch checks;
- address-data pilot remains parked.

## Handoff rule
Every substantial product/provider/data change updates `docs/AI_START.md`, `docs/AI_HANDOFF.md`, and this file. Never store credentials, raw API keys, customer secrets, TOTP codes or one-time Auth links.
