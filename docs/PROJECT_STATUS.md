# Namdar project status

Last updated: 2026-09-12 UTC

## Production baseline
- Repo: `pchroonic/pchroonic`, default `main`.
- Latest product release: PR #47, merge `43f2db200463083cd9736485700c27a3d80974b8`.
- Exact PR #47 head: `437ab7e56b8e74f4c68d92fe096b646110018b95`.
- CI `34719427324`: SUCCESS.
- Exact-head preview `dpl_7QMQLeXV8rEF1qBcyS7d2FyLeLKX`: READY / clean build.
- Production `dpl_7UXKtKqyitKF5xiGADPcwN9MwgZk`: READY on `https://namdar.co.uk`, no alias error.
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
- PR #47: booking-notification cron resilience and business-reminder batching.

Live booking defaults remain 21 days, 24h notice, Mon–Sat, 08–11 / 11–14 / 14–17, max 3 jobs/day, postcode-area route density.

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

Production has no `site_settings.reviews` row at the latest verification, so Google review CTAs remain disabled until the official Google Business Profile review-request URL is deliberately entered.

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

## Notification 504 resilience — LIVE, observation pending
Before PR #47, Vercel recorded 21 `/api/booking-notifications` `Gateway Timeout` errors from 9–12 September 2026. Runtime stacks pointed to Supabase REST calls inside business reminder scan/queue work and one due-business-delivery path.

The issue was not explained by current volume or missing indexes. Investigation-time production state was:
- 1 pending final quote;
- 0 overdue invoices;
- 0 upcoming unassigned bookings in 24h;
- 1 stale scheduled booking;
- 4 sent `business_notifications` rows and no pending backlog.

Existing indexes already covered pending due rows, entity lookup and unique event identity.

PR #47 changed the runtime access pattern without changing schema:
- business reminder candidates are built and de-duplicated in memory;
- invoice quote context is bulk-loaded once;
- candidates are inserted in conflict-ignore batches against the existing unique event constraint;
- the idempotent batch insert retries once on transient 502/503/504;
- source/queue failures are reported as degraded while healthy sources continue;
- the cron isolates post-job delivery, generic booking delivery, business scan and business delivery so one transient stage failure does not block all notification work;
- HTTP 503 is reserved for all four stages failing.

### PR #47 release verification
- exact head `437ab7e56b8e74f4c68d92fe096b646110018b95`;
- final CI `34719427324` SUCCESS;
- exact-head preview `dpl_7QMQLeXV8rEF1qBcyS7d2FyLeLKX` READY / clean build / no alias error;
- merge `43f2db200463083cd9736485700c27a3d80974b8`;
- production `dpl_7UXKtKqyitKF5xiGADPcwN9MwgZk` READY with canonical alias and no alias error;
- production build clean;
- unauthenticated cron endpoint still rejects with 401;
- runtime-error check from the new production deployment time found no `/api/booking-notifications` errors at smoke-check time;
- `business_notifications` still contained only the four previously sent rows; no synthetic queue rows were created;
- service catalog remained Window live, five planned;
- no database migration required.

The resilience fix is live, but do **not** mark the historical 504 permanently resolved until at least one real authenticated scheduled cron run on the new deployment is observed healthy.

## Database/security
Server-only Stage 1 tables remain:
- `conversion_events`;
- `quote_funnel_links`;
- `booking_job_costs`.

They remain RLS-protected with no direct anon/authenticated table access. PR #47 introduced no migration or new table/index.

## Immediate next work
1. Observe the next real authenticated `/api/booking-notifications` cron execution; confirm no new 504 and inspect any degraded stage response/logging.
2. Add the official Google Business Profile review-request URL in Admin → Bookings when available.
3. Use the complete Staff lifecycle and direct-cost close-out on every real Window job.
4. Collect genuine before/after photos and authentic customer feedback/reviews.
5. Calibrate Window pricing/capacity/route rules from real conversion, work time, travel and direct contribution.
6. Assess Stage 2 only after enough evidence exists and the user deliberately chooses to proceed.

## Other open work
- fresh privileged password/CAPTCHA/MFA interactive completion;
- Stripe, SMS, legal and remaining launch checks;
- address-data pilot remains parked.

## Handoff rule
Every substantial product/provider/data change updates `docs/AI_START.md`, `docs/AI_HANDOFF.md`, and this file. Never store credentials, raw API keys, customer secrets, TOTP codes or one-time Auth links.
