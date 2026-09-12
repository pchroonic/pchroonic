# Namdar AI fast resume

Last verified: 2026-09-12 UTC

Read this first. Use `docs/AI_HANDOFF.md` for implementation detail and `docs/PROJECT_STATUS.md` for roadmap/status.

## Production baseline
- Repository: `pchroonic/pchroonic`, default `main`.
- Current product merge: `f1e813866c0c854ca3b14b73c4c867ea00475e64` from PR #45.
- PR #45 exact head: `6c87352fcbd1ee04215096ef4cdc41b70b53fb64`.
- GitHub Actions run `34718136246`: SUCCESS.
- Exact-head Vercel preview: `dpl_HZyaGdp8zWN48TuL9n2ZntPeDRt7`, READY, clean errors-only build, `aliasError: null`.
- Product production deployment: `dpl_6QT2rxS8epuMFvCq2t1EwMTjfWg8`, READY on `https://namdar.co.uk`, `aliasError: null`.
- Supabase: `namdar-production` (`qjigldxjcpnrlyxgmlqq`).
- Window Cleaning is the only live/quotable/bookable service; five future services remain `planned`.
- Address-data work remains parked.
- Privileged Staff/Admin requires AAL2/MFA.

## Window Stage 1 — LIVE
Current live Window Cleaning foundation includes:
- Window-specific quote inputs and server-side service/live quote gating;
- one-off and 4/8/12-week guide pricing;
- route-aware customer booking with 21-day horizon, 24h notice, Mon–Sat, 08–11 / 11–14 / 14–17, max 3 jobs/day and postcode-area route density;
- Staff field workflow: On my way → Start job → Complete job;
- consent-aware acquisition funnel: covered postcode → guide quote → sent final → accepted → booked → completed;
- completed-job actual work timing and reviewed direct-cost/direct-contribution reporting.

**Direct contribution is not net profit.** Labour, overheads, tax and other business costs are excluded. Jobs without a direct-cost review are excluded rather than treated as £0-cost.

## Post-job close-out + honest review workflow — LIVE
PR #45 is production-live.

### Staff completed-job close-out
Completed Window jobs in Staff now expose a direct-cost/travel close-out using the existing `booking_job_costs` table:
- consumables;
- parking;
- travel cost;
- other direct cost;
- travel minutes;
- travel miles;
- private note.

The staff action is assigned-job-only, completed-job-only, Window-only, bounded, AAL2/Bookings protected and audit logged as `booking.economics`. The close-out explicitly says direct contribution is not net profit.

### Customer follow-up
The immediate completion email remains. The existing `booking_notifications.notification_type='follow_up'` schedule still queues a follow-up 24 hours after completion.

A dedicated post-job processor now handles due follow-ups first and sends a neutral email that:
- thanks the customer;
- offers secure private Namdar feedback;
- when configured, offers an optional Google review to every completed customer regardless of their private rating;
- asks for an honest experience, positive, neutral or negative;
- states Namdar does not offer rewards for reviews.

Low private ratings still route to the existing private support escalation, but they no longer suppress the optional public-review link. Do not restore positive-only review gating.

### Google review setting
Admin → Bookings now has a Settings-protected Google Business Profile review-link control. Only HTTPS Google-owned links are accepted. Blank disables the public-review CTA.

Production verification on this release found **no `site_settings.reviews` row**, so Google public-review requests are currently disabled until the official Business Profile review-request URL is deliberately entered. Private Namdar feedback remains available.

### Notification timeout mitigation
`/api/booking-notifications` now processes bounded batches: 10 post-job follow-ups, then 10 generic booking notifications, then 10 business follow-ups. This reduces sequential work per invocation and is a mitigation for the historical 504 issue; do not claim the old 504 is fully resolved until real authenticated cron executions remain healthy.

## Release verification — PR #45
- product branch: `feat/window-post-job-followup-20260912`;
- exact head: `6c87352fcbd1ee04215096ef4cdc41b70b53fb64`;
- GitHub CI `34718136246`: SUCCESS;
- exact-head preview `dpl_HZyaGdp8zWN48TuL9n2ZntPeDRt7`: READY / clean errors-only build;
- merge: `f1e813866c0c854ca3b14b73c4c867ea00475e64`;
- production `dpl_6QT2rxS8epuMFvCq2t1EwMTjfWg8`: READY on `namdar.co.uk`, no alias error;
- production `/api/admin-review-settings` unauthenticated → 401;
- production `/api/booking-notifications` without cron secret → 401;
- production invalid `/api/feedback?token=bad` → 400;
- live `staff.js` loads `staff-closeout.js`;
- live `admin.js` loads `admin-post-job-followup.js`;
- production `booking_job_costs` count at verification: 0; no synthetic cost rows created;
- production `site_settings.reviews`: absent;
- service catalog rechecked: `windows` live, gutters/jetwash/roof/handyman/tour3d planned;
- no database migration required.

## Existing Stage 1 analytics/security
Server-only tables remain:
- `conversion_events`;
- `quote_funnel_links`;
- `booking_job_costs`.

They remain RLS-protected with no direct anon/authenticated table access. Historical quotes/bookings are not fabricated into acquisition tracking.

## Current candidate — booking notification 504 hardening
Branch: `fix/booking-notification-504-20260912`.

Production runtime evidence now proves the historical issue is still active: Vercel grouped 21 `Gateway Timeout` errors on `/api/booking-notifications` between 9 and 12 September 2026. The stack points to Supabase REST calls inside business follow-up scanning/queueing and, in one sample, due business-notification delivery.

This is not a current-volume problem. Production checks at investigation time showed:
- 1 pending final quote;
- 0 overdue invoices;
- 0 unassigned bookings in the next 24h;
- 1 stale scheduled booking;
- only 4 sent rows in `business_notifications` and no pending backlog.

The required `business_notifications` unique, entity and pending-due indexes already exist. The candidate therefore changes the access pattern instead of adding unnecessary indexes or schema.

New `lib/business-followup-batched.js`:
- builds quote/invoice/booking reminder candidates in memory;
- bulk-loads invoice quote context rather than fetching one quote per invoice;
- de-duplicates candidates by the existing unique event identity;
- inserts in conflict-ignore batches (default 50 rows) using the existing unique constraint;
- retries one transient 502/503/504 only for that idempotent conflict-ignore batch write;
- records source/queue degradation without discarding healthy sources.

`api/booking-notifications.js` now isolates four stages: post-job, generic booking delivery, business scan and business delivery. A partial stage failure is logged and returned as degraded without blocking the remaining stages; HTTP 503 is reserved for all four stages failing.

No migration is required. Do not call the 504 issue resolved until exact-head CI/preview pass, the change reaches production, and real authenticated cron executions remain healthy.

## Next best work
1. release and observe the booking-notification resilience candidate against real cron executions;
2. obtain the official Google Business Profile review-request URL and enter it in Admin → Bookings when ready;
3. use Start → Complete → direct-cost review for every real Window job;
4. collect genuine before/after photos and real customer reviews;
5. use funnel conversion, value/work-hour, travel and direct contribution to calibrate Window pricing and capacity;
6. assess Stage 2 only when real evidence supports it.

## Do not break
- Window Cleaning only is the current commercial offering.
- Do not activate Stage 2 without deliberate user decision.
- Customer service/booking availability stays server-side enforced.
- Existing accepted work survives service pauses.
- Privileged staff requires AAL2/MFA.
- Review requests must remain neutral and equally available; no review incentives or positive-only gating.
- Address-data work stays parked unless deliberately resumed.
- Support tickets remain customer-only; public inbound email remains Admin Email inbox.
- Never expose secrets.
