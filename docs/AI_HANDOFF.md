# Namdar AI handoff

Last verified: 2026-09-12 UTC

Read `docs/AI_START.md` first.

## Production source of truth
- Repo: `pchroonic/pchroonic`, default `main`.
- Latest product release: PR #47, `Harden booking notification cron against gateway timeouts`.
- Exact feature head: `437ab7e56b8e74f4c68d92fe096b646110018b95`.
- GitHub Actions: `34719427324` — SUCCESS.
- Exact-head preview: `dpl_7QMQLeXV8rEF1qBcyS7d2FyLeLKX` — READY, clean errors-only build, `aliasError: null`.
- Product merge: `43f2db200463083cd9736485700c27a3d80974b8`.
- Product production: `dpl_7UXKtKqyitKF5xiGADPcwN9MwgZk` — READY on `https://namdar.co.uk`, canonical alias present, `aliasError: null`.
- Supabase: `namdar-production` (`qjigldxjcpnrlyxgmlqq`).
- Only `windows` is live; gutters/jetwash/roof/handyman/tour3d remain planned.
- Address-data work is parked.
- Staff/Admin privileged API access requires AAL2/MFA.

## Window Stage 1 baseline
Live through PR #47:
- Window-specific quote inputs and server-side service/live enforcement;
- one-off/4/8/12-week guide pricing;
- server-enforced customer booking operations and postcode-area route density;
- Staff On my way / Start / Complete workflow, photos and notes;
- completed-job direct-cost/travel close-out;
- neutral post-job private feedback / optional Google review workflow;
- consent-aware acquisition funnel;
- actual job timing and direct-contribution reporting.

`booking_job_costs` remains the single Stage 1 direct-cost source of truth. Missing rows mean “not reviewed”, not £0 cost. Direct contribution is not net profit.

## PR #45 post-job workflow — remains live
### Staff close-out
`staff-closeout.js` augments completed Window jobs. `api/staff-jobs.js` exposes existing economics; `api/staff-job-action.js` accepts `action='economics'` only for the authenticated staff member's assigned, completed Window booking.

Bounds:
- consumables / parking / travel / other direct cost: non-negative, max £100,000;
- travel minutes: 0–1440;
- travel miles: 0–10,000;
- note: max 1500 chars.

The action upserts `booking_job_costs`, records `updated_by`, and audit logs `booking.economics`.

### Neutral review flow
Completion continues to schedule `booking_notifications.notification_type='follow_up'` 24 hours after completion. `lib/post-job-followup.js` validates the current completed booking event, ensures the secure `booking_feedback` invite and sends a neutral follow-up.

If `publicReviewUrl()` is configured, every completed customer gets the same optional honest Google review choice regardless of private rating. Low ratings still trigger private support attention. Do not restore positive-only review gating or add review incentives.

Admin → Bookings exposes a Settings/AAL2-protected Google Business Profile review-link setting. Production currently has no `site_settings.reviews` row, so public Google review CTAs remain disabled until the official URL is deliberately added.

## PR #47 booking-notification resilience — LIVE
### Evidence / root cause
Before PR #47, Vercel production runtime errors showed 21 `Gateway Timeout` errors on `/api/booking-notifications` from 2026-09-09 through 2026-09-12 21:00 UTC.

Observed stacks were in Supabase REST access from:
- `queueBusinessNotification()` during `scanBusinessFollowUps()`;
- `processDueBusinessNotifications()` in one sample.

The failure was therefore in business-notification database access, not the new post-job review processor.

Production scale at investigation time was small:
- pending final quotes: 1;
- overdue invoices: 0;
- upcoming unassigned bookings (24h): 0;
- stale scheduled bookings: 1;
- `business_notifications`: 4 sent rows, no pending backlog.

Existing indexes were already appropriate:
- pending due index on `(status, due_at)`;
- entity index on `(entity_type, entity_id, created_at desc)`;
- unique event index on `(notification_type, entity_type, entity_id, event_key)`.

No new index or schema change was warranted.

### Live implementation
New `lib/business-followup-batched.js` is used by the hourly cron business scan. It:
- preserves quote reminder stages at 2 and 7 days;
- preserves overdue invoice stages at 1, 8, 15 and 29 days;
- preserves upcoming-unassigned and stale-scheduled booking alerts;
- bulk-loads invoice quote context once;
- builds candidates in memory and de-duplicates by the existing unique event identity;
- inserts candidates in `business_notifications` using conflict-ignore batches (default 50, max 100);
- relies on the existing unique constraint `(notification_type, entity_type, entity_id, event_key)`;
- retries once on transient 502/503/504 only for the idempotent conflict-ignore batch insert;
- reports partial source/queue failures as degraded instead of discarding healthy sources.

### Cron stage isolation
`api/booking-notifications.js` now runs four isolated stages:
1. `processPostJobFollowUps(10)`;
2. `processDueBookingNotifications(10)`;
3. `scanBusinessFollowUpsBatched({db,env,isManagedInboxAddress})`;
4. `processDueBusinessNotifications(10)`.

Each stage returns its own `ok/data` or `ok:false/error`. A partial database/provider failure marks the response degraded but does not prevent the remaining stages from running. HTTP 503 is reserved for all four stages failing.

This is specifically intended to stop a transient business reminder gateway error from blocking unrelated post-job or generic booking notifications in the same hourly invocation.

### Tests and CI history
New `scripts/booking-notification-resilience.test.mjs` covers:
- in-memory event de-duplication;
- conflict-ignore batch insert behavior;
- one transient 504 retry for the idempotent batch write;
- bulk invoice quote context / batched queueing rather than per-event queue lookups;
- partial source failure reported as degraded without throwing.

Initial CI `34719266923` failed because the existing PR #45 regression still expected the old combined `processBusinessFollowUps(10)` call. That test was updated to the isolated-stage contract.

Second CI `34719348831` failed because the updated stage-order assertion matched the scanner import instead of its handler invocation. The assertion was corrected to the exact invocation.

Final exact head `437ab7e56b8e74f4c68d92fe096b646110018b95` passed GitHub Actions run `34719427324`.

### PR #47 release verification
- local resilience suite: 5/5 passed before final CI;
- exact-head GitHub Actions `34719427324`: SUCCESS;
- exact-head Vercel preview `dpl_7QMQLeXV8rEF1qBcyS7d2FyLeLKX`: READY, errors-only clean, no alias error;
- merge `43f2db200463083cd9736485700c27a3d80974b8`;
- production `dpl_7UXKtKqyitKF5xiGADPcwN9MwgZk`: READY on `namdar.co.uk`, canonical alias present, no alias error;
- production build errors-only log clean;
- unauthenticated `/api/booking-notifications` → 401 as expected;
- Vercel runtime-error query from the new production deployment time found no `/api/booking-notifications` errors at release smoke-check time;
- `business_notifications` still contained only the four previously sent rows; no synthetic queue records were created;
- service catalog rechecked: Window live, five future services planned;
- no database migration required.

Do **not** yet call the historical 504 permanently resolved. The code fix is live and immediate post-deploy runtime checks are clean, but the remaining observation gate is at least one real authenticated scheduled cron execution on the new production deployment.

## Existing performance/security rules
Keep these Stage 1 rules:
- acquisition tracking is consent-aware and session-only;
- funnel endpoint is Window-only;
- direct contribution is not net profit;
- jobs without cost review are excluded from direct contribution/margin;
- productivity requires valid `started_at → completed_at`;
- `conversion_events`, `quote_funnel_links`, `booking_job_costs` remain server-only/RLS protected;
- service/booking restrictions remain server-side enforced;
- support tickets stay customer-only;
- address-data work stays parked unless deliberately resumed.

Closed duplicate PR #43 remains superseded. Do not revive it.

## Next recommended work
1. observe the next authenticated hourly `/api/booking-notifications` cron run and inspect runtime errors/degraded status;
2. enter the official Google Business Profile review-request URL when available;
3. complete every real Window job with Start → Complete and save its direct-cost/travel review;
4. collect authentic before/after evidence and customer feedback;
5. calibrate price/capacity/route rules from real conversion, work time, travel and direct contribution;
6. consider Stage 2 only after the user deliberately decides the Window evidence supports it.

## Non-negotiables
- Window Cleaning remains the only current commercial service.
- Do not activate another service without deliberate user decision.
- Address-data work stays parked unless deliberately resumed.
- Existing accepted work survives later service pauses.
- Privileged access remains AAL2/MFA protected.
- Review solicitation remains neutral and equally available; no incentives or positive-only gating.
- Never expose secrets.
