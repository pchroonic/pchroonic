# Namdar project status

Last updated: 2026-09-12 UTC

## Production baseline
- Repo: `pchroonic/pchroonic`, default `main`.
- Latest product release: PR #45, merge `f1e813866c0c854ca3b14b73c4c867ea00475e64`.
- Product production: `dpl_6QT2rxS8epuMFvCq2t1EwMTjfWg8`, READY on `https://namdar.co.uk`, no alias error.
- Supabase: `namdar-production` (`qjigldxjcpnrlyxgmlqq`).
- Window Cleaning is the only live/quotable/bookable service.
- Gutter Cleaning, Patio & Jet Washing, Roof Cleaning, Handyman Services and 3D Property Tours remain planned.
- Address-data work remains parked.

## Window Cleaning Stage 1 — LIVE
Product sequence:
- PR #38: Window-specific quote/recurring journey and quote-gate hardening.
- PR #40: operational customer booking rules and postcode-area route density.
- PR #42: consent-aware acquisition funnel + completed-job direct-contribution reporting.
- PR #45: field close-out + neutral post-job feedback/Google-review workflow.

Live booking defaults: 21 days, 24h notice, Mon–Sat, 08–11 / 11–14 / 14–17, max 3 jobs/day, postcode-area route density.

## Post-job workflow — LIVE
For real Window jobs:
1. Staff uses On my way → Start job → Complete job.
2. Completed jobs expose direct-cost/travel close-out.
3. Saving close-out creates/updates the existing `booking_job_costs` review.
4. Immediate completion email remains.
5. Existing follow-up scheduling sends a neutral request 24 hours after completion.
6. Private Namdar feedback remains available to every completed customer.
7. If the official Google review URL is configured, the same optional honest public-review choice is available regardless of private rating.
8. Low private ratings still alert support privately.

Production currently has no `site_settings.reviews` row, so Google review CTAs are disabled until the official Google Business Profile review-request link is deliberately entered.

## Review integrity rule
Do not selectively solicit only positive reviews. Do not discourage negative reviews, request a particular star rating, or offer incentives. Private support escalation may coexist with the same neutral public-review option.

## Performance / economics — LIVE
Admin → Reporting measures:
- consented postcode → quote → final sent → accepted → booked → completed funnel;
- completed jobs;
- total/average job value;
- collected revenue;
- actual work hours;
- value per work hour;
- reviewed direct costs;
- travel minutes/miles;
- direct contribution and margin.

**Direct contribution is not net profit.** Labour, overheads, tax and other business costs are excluded. Missing cost reviews are excluded from contribution/margin rather than assumed £0.

Production `booking_job_costs` contained 0 rows at PR #45 release verification; no synthetic job-cost data was inserted.

## Database/security
Server-only Stage 1 tables remain:
- `conversion_events`;
- `quote_funnel_links`;
- `booking_job_costs`.

They remain RLS-protected with no direct anon/authenticated table access.

PR #45 required no schema migration and reused:
- `booking_notifications`;
- `booking_feedback`;
- `booking_job_costs`;
- `site_settings`.

## PR #45 release verification
- exact head `6c87352fcbd1ee04215096ef4cdc41b70b53fb64`;
- CI `34718136246` SUCCESS;
- exact-head preview `dpl_HZyaGdp8zWN48TuL9n2ZntPeDRt7` READY / clean build;
- merge `f1e813866c0c854ca3b14b73c4c867ea00475e64`;
- production `dpl_6QT2rxS8epuMFvCq2t1EwMTjfWg8` READY with canonical alias and no alias error;
- unauthenticated review-settings endpoint 401;
- cron endpoint without secret 401;
- invalid feedback token 400;
- live Admin/Staff entrypoints load the new modules;
- service catalog: Window live, five planned;
- no review URL invented and no synthetic job-cost records created.

## Notification 504 — active issue / fix candidate
Production Vercel runtime evidence now shows 21 `/api/booking-notifications` `Gateway Timeout` errors from 9–12 September 2026, including on the latest PR #45 production deployment. The stack points to Supabase REST calls inside business reminder scanning/queueing and due business delivery.

This is not caused by current business volume. Investigation-time production counts were:
- 1 pending final quote;
- 0 overdue invoices;
- 0 upcoming unassigned bookings in 24h;
- 1 stale scheduled booking;
- 4 sent `business_notifications` rows and no pending backlog.

Existing database indexes already cover pending due rows, entity lookup and unique business event identity. No new index or schema change is proposed.

Candidate branch: `fix/booking-notification-504-20260912`.

Candidate changes:
- new `lib/business-followup-batched.js` batches reminder candidate inserts instead of calling the old per-candidate queue lookup path;
- invoice quote context is bulk-loaded once;
- duplicate event candidates are de-duplicated in memory and inserted with conflict-ignore semantics against the existing unique constraint;
- idempotent batch insert retries once on transient 502/503/504;
- source/queue failures are reported as degraded while healthy scan sources continue;
- `/api/booking-notifications` isolates post-job, booking delivery, business scan and business delivery stages so one transient stage failure does not block the others;
- HTTP 503 is reserved for all four stages failing.

Local regression checks for the candidate: 5/5 passed; changed/new JS syntax checks passed.

Do not mark the 504 resolved until candidate CI/preview pass, it is merged/deployed, and real authenticated hourly cron executions remain healthy.

## Immediate next work
1. Complete and release the `/api/booking-notifications` resilience candidate; observe real cron health.
2. Add the official Google Business Profile review-request URL in Admin → Bookings when available.
3. Use the complete Staff lifecycle and direct-cost close-out on every real Window job.
4. Collect genuine before/after photos and customer feedback/reviews.
5. Calibrate Window pricing/capacity/route rules from real conversion, work time, travel and direct contribution.
6. Assess Stage 2 only after enough evidence exists and the user deliberately chooses to proceed.

## Other open work
- fresh privileged password/CAPTCHA/MFA interactive completion;
- Stripe, SMS, legal and remaining launch checks;
- address-data pilot remains parked.

## Handoff rule
Every substantial product/provider/data change updates `docs/AI_START.md`, `docs/AI_HANDOFF.md`, and this file. Never store credentials, raw API keys, customer secrets, TOTP codes or one-time Auth links.
