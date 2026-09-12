# Namdar AI fast resume

Last verified: 2026-09-12 UTC

Read this first. Use `docs/AI_HANDOFF.md` for implementation detail and `docs/PROJECT_STATUS.md` for roadmap/status.

## Production baseline
- Repository: `pchroonic/pchroonic`, default `main`.
- Latest product release: PR #47, `Harden booking notification cron against gateway timeouts`.
- PR #47 exact head: `437ab7e56b8e74f4c68d92fe096b646110018b95`.
- GitHub Actions run `34719427324`: SUCCESS.
- Exact-head Vercel preview: `dpl_7QMQLeXV8rEF1qBcyS7d2FyLeLKX`, READY, clean errors-only build, `aliasError: null`.
- Product merge: `43f2db200463083cd9736485700c27a3d80974b8`.
- Product production: `dpl_7UXKtKqyitKF5xiGADPcwN9MwgZk`, READY on `https://namdar.co.uk`, `aliasError: null`.
- Supabase: `namdar-production` (`qjigldxjcpnrlyxgmlqq`).
- Window Cleaning is the only live/quotable/bookable service; gutters, jet washing, roof cleaning, handyman and 3D tours remain `planned`.
- Address-data work remains parked.
- Privileged Staff/Admin requires AAL2/MFA.

## Window Cleaning Stage 1 — LIVE
Current live foundation includes:
- Window-specific quote inputs and server-side service/live gating;
- one-off and 4/8/12-week guide pricing;
- server-enforced booking rules: 21-day horizon, 24h notice, Mon–Sat, 08–11 / 11–14 / 14–17, max 3 jobs/day, postcode-area route density;
- Staff field workflow: On my way → Start job → Complete job;
- completed-job direct-cost/travel close-out;
- consent-aware postcode → quote → sent final → accepted → booked → completed acquisition funnel;
- completed-job actual work timing, reviewed direct costs, direct contribution and direct margin reporting.

**Direct contribution is not net profit.** Labour, overheads, tax and other business costs are outside the Stage 1 metric. Jobs without a cost review are excluded rather than treated as £0 cost.

## Post-job close-out + honest review workflow — LIVE
PR #45 remains live underneath PR #47.

Completed Window jobs expose direct-cost/travel review in Staff using the existing `booking_job_costs` table. The action is assigned-job-only, completed-job-only, Window-only, AAL2/Bookings protected, bounded and audit logged.

The immediate completion email remains. A secure follow-up is scheduled 24 hours after completion. The follow-up asks for private Namdar feedback and, when configured, offers the same optional honest Google review choice to every completed customer regardless of private rating. Low private ratings still route to private support attention.

Do not restore positive-only review gating, discourage negative reviews, request a particular star rating, or offer review incentives.

Admin → Bookings has a Settings-protected Google Business Profile review-link field. Production still has no `site_settings.reviews` row, so Google public-review CTAs remain disabled until the official Google review-request URL is deliberately entered.

## Booking notification 504 resilience — LIVE
PR #47 is production-live.

### What production evidence showed
Before PR #47, Vercel grouped **21 Gateway Timeout errors** on `/api/booking-notifications` between 9 and 12 September 2026. Runtime stacks pointed to Supabase REST access inside business reminder scanning/queueing and, in one sample, due business-notification delivery.

This was not a volume or missing-index problem. At investigation time production had only:
- 1 pending final quote;
- 0 overdue invoices;
- 0 upcoming unassigned bookings in the next 24h;
- 1 stale scheduled booking;
- 4 sent `business_notifications` rows and no pending backlog.

Existing indexes already covered pending-due rows, entity lookup and unique event identity.

### Live fix
New `lib/business-followup-batched.js`:
- builds quote/invoice/booking reminder candidates in memory;
- bulk-loads invoice quote context rather than fetching one quote per invoice;
- de-duplicates candidates by the existing event identity;
- inserts in conflict-ignore batches (default 50, max 100) against the existing unique constraint;
- retries one transient 502/503/504 only for the idempotent conflict-ignore batch write;
- reports partial source/queue failures as degraded without discarding healthy sources.

`api/booking-notifications.js` now isolates four stages:
1. post-job follow-up delivery (10);
2. generic booking notification delivery (10);
3. batched business reminder scan;
4. due business notification delivery (10).

A transient failure in one stage no longer aborts the other stages. The endpoint returns a degraded result when only part of the run fails and reserves HTTP 503 for all four stages failing.

No database migration or new index was required.

### Release verification — PR #47
- branch: `fix/booking-notification-504-20260912`;
- exact head: `437ab7e56b8e74f4c68d92fe096b646110018b95`;
- final CI: `34719427324` SUCCESS;
- exact-head preview: `dpl_7QMQLeXV8rEF1qBcyS7d2FyLeLKX` READY / clean build;
- merge: `43f2db200463083cd9736485700c27a3d80974b8`;
- production: `dpl_7UXKtKqyitKF5xiGADPcwN9MwgZk` READY on `namdar.co.uk`, canonical alias present, no alias error;
- unauthenticated production `/api/booking-notifications` → 401 as expected;
- Vercel runtime errors for `/api/booking-notifications` since this production deployment: none at the release smoke check;
- production `business_notifications` still contained only the four previously sent rows; no synthetic queue rows were created;
- service catalog remained Window live and all five future services planned.

The historical 504 is **hardened but not yet declared permanently resolved**. Confirm at least one real authenticated scheduled cron execution on this deployment before closing the observation item.

## Next best work
1. observe the next real scheduled `/api/booking-notifications` execution and confirm no new 504/degraded run;
2. enter the official Google Business Profile review-request URL when available;
3. use Start → Complete → direct-cost review for every real Window job;
4. collect genuine before/after photos and authentic customer feedback/reviews;
5. calibrate Window pricing, capacity and route rules from real conversion, work time, travel and direct contribution;
6. assess Stage 2 only when real evidence supports it and the user deliberately chooses to proceed.

## Do not break
- Window Cleaning only is the current commercial offering.
- Do not activate Stage 2 without deliberate user decision.
- Customer service/booking restrictions remain server-side enforced.
- Existing accepted work survives service pauses.
- Privileged access requires AAL2/MFA.
- Review requests remain neutral and equally available; no incentives or positive-only gating.
- Address-data work stays parked unless deliberately resumed.
- Support tickets remain customer-only; public inbound email remains Admin Email inbox.
- Never expose secrets.
