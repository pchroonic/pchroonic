# Namdar AI handoff

Last verified: 2026-09-12 UTC

Read `docs/AI_START.md` first.

## Production source of truth
- Repo: `pchroonic/pchroonic`, default `main`.
- PR #45: `Add Window post-job close-out and honest review workflow`.
- Exact feature head: `6c87352fcbd1ee04215096ef4cdc41b70b53fb64`.
- GitHub Actions: `34718136246` — SUCCESS.
- Exact-head preview: `dpl_HZyaGdp8zWN48TuL9n2ZntPeDRt7` — READY, clean errors-only build, no alias error.
- Product merge: `f1e813866c0c854ca3b14b73c4c867ea00475e64`.
- Product production: `dpl_6QT2rxS8epuMFvCq2t1EwMTjfWg8` — READY on `https://namdar.co.uk`, aliases include `namdar.co.uk`, `aliasError: null`.
- Supabase: `namdar-production` (`qjigldxjcpnrlyxgmlqq`).
- Only `windows` is live; gutters/jetwash/roof/handyman/tour3d remain planned.
- Address-data work is parked.
- Staff/Admin privileged API access requires AAL2/MFA.

## Window Stage 1 baseline
Live before and through PR #45:
- Window-specific quote inputs and service-live enforcement;
- one-off/4/8/12-week guide pricing;
- server-enforced customer booking operations and postcode-area route density;
- Staff On my way / Start / Complete workflow, photos and notes;
- consent-aware acquisition funnel;
- actual job timing and direct-contribution reporting.

`booking_job_costs` is the single Stage 1 direct-cost source of truth. Missing rows mean “not reviewed”, not £0 cost.

## PR #45 implementation

### Staff close-out
New `staff-closeout.js` augments completed Window jobs without rewriting the large legacy Staff UI.

`api/staff-jobs.js` returns the assigned job's existing `booking_job_costs` row as `economics`.

`api/staff-job-action.js` accepts `action='economics'` only when:
- the booking is assigned to the authenticated staff member;
- the job is completed;
- the linked quote has `service_key='windows'`.

Bounds match Admin economics:
- consumables / parking / travel / other direct cost: non-negative, max £100,000;
- travel minutes: 0–1440;
- travel miles: 0–10,000;
- note: max 1500 chars.

It upserts `booking_job_costs`, sets `updated_by`, and audit logs `booking.economics`.

### Neutral 24-hour follow-up
Completion paths still call the existing `scheduleBookingFollowUp()`; no new notification type or migration was introduced.

New `lib/post-job-followup.js` processes due `follow_up` rows before the generic booking worker:
- atomically claims pending rows;
- resets stale sending rows;
- verifies the booking still exists and is completed;
- verifies the follow-up event key against the current completion event;
- loads the linked quote;
- ensures an existing secure `booking_feedback` invite;
- sends a neutral post-job email;
- archives it for My Namdar;
- retries provider failures up to the existing five-attempt ceiling.

The message offers private Namdar feedback to every completed customer. If `publicReviewUrl()` returns a configured Google URL, it also shows an optional `Leave an honest Google review` CTA and explicitly welcomes positive, neutral or negative experiences with no review rewards.

### Review gating removed
Prior behavior in `api/feedback.js` exposed the public review URL only when private feedback status was `positive`. PR #45 deliberately removes that gating.

Current behavior:
- GET returns configured public-review availability regardless of private rating/status;
- `public_review_click` requires a valid secure feedback token and configured public URL, not a positive rating;
- duplicate and newly submitted feedback responses return the configured review URL regardless of rating;
- 1–3 private ratings still create/escalate the existing private support workflow;
- `feedback.js` renders the same optional honest-review CTA after either positive or needs-attention feedback.

Do not restore positive-only review solicitation, discourage negative reviews, request a particular star rating, or add incentives.

### Admin review setting
New:
- `api/admin-review-settings.js`
- `admin-post-job-followup.js`

Admin → Bookings:
- GET requires Bookings/AAL2;
- edit requires Settings/AAL2;
- only blank or HTTPS Google-owned hosts are accepted (`google.com` subdomains, `g.page`, `goo.gl` and subdomains such as `maps.app.goo.gl`);
- update is audit logged as `reviews.settings_update`.

Production currently has no `site_settings` row with key `reviews`, therefore Google public-review CTAs are disabled until the official Business Profile review-request link is deliberately entered.

### Notification worker
`api/booking-notifications.js` now runs:
1. `processPostJobFollowUps(10)`;
2. `processDueBookingNotifications(10)`;
3. `processBusinessFollowUps(10)`.

This bounds sequential work and mitigates the prior 504 risk. It is not proof that the historical 504 is fully resolved; verify real cron runs before closing that item.

### Database
No migration in PR #45. Reused:
- `bookings`;
- `booking_notifications`;
- `booking_feedback`;
- `booking_job_costs`;
- `site_settings`.

Production after release:
- `booking_job_costs`: 0 rows at verification;
- `site_settings.reviews`: absent;
- no synthetic feedback, cost or notification records were created for testing.

## Release verification
- local regression suite `scripts/post-job-followup.test.mjs`: 6/6 passed before PR;
- exact-head GitHub Actions `34718136246`: SUCCESS;
- exact-head Vercel preview `dpl_HZyaGdp8zWN48TuL9n2ZntPeDRt7`: READY, errors-only clean;
- merge commit `f1e813866c0c854ca3b14b73c4c867ea00475e64`;
- production `dpl_6QT2rxS8epuMFvCq2t1EwMTjfWg8`: READY, canonical alias present, no alias error;
- unauthenticated `/api/admin-review-settings` → 401 `Please sign in as Namdar staff.`;
- `/api/booking-notifications` without cron authorization → 401;
- invalid `/api/feedback?token=bad` → 400;
- live `staff.js` loads `/staff-closeout.js` with version `6.4.20-post-job-followup-1`;
- live `admin.js` loads `/admin-post-job-followup.js` with the same version;
- service catalog: Window live, five future services planned.

## Existing performance foundation
Keep these Stage 1 rules:
- acquisition tracking is consent-aware and session-only;
- funnel endpoint is Window-only;
- direct contribution is not net profit;
- no-cost-review jobs are excluded from contribution/margin;
- actual productivity requires valid `started_at → completed_at`;
- `conversion_events`, `quote_funnel_links`, `booking_job_costs` remain server-only/RLS protected.

Closed duplicate PR #43 remains superseded. Do not revive it.

## Current candidate — `/api/booking-notifications` 504 resilience
Branch: `fix/booking-notification-504-20260912`.

### Evidence / diagnosis
Vercel production runtime errors for the last 7 days show 21 `Gateway Timeout` errors on `/api/booking-notifications`, first seen 2026-09-09 and last seen 2026-09-12 21:00 UTC. The current-production stack identifies Supabase REST calls from:
- `queueBusinessNotification()` called by `scanBusinessFollowUps()`;
- `processDueBusinessNotifications()` in one sample.

The runtime failure is therefore in business-notification DB access, not in the new review/feedback processor.

Production scale at investigation time is tiny:
- pending final quotes: 1;
- overdue invoices: 0;
- upcoming unassigned bookings (24h): 0;
- stale scheduled bookings: 1;
- `business_notifications`: 4 sent rows, no pending backlog.

Database checks also confirmed existing indexes are appropriate:
- pending due index on `(status, due_at)`;
- entity index on `(entity_type, entity_id, created_at desc)`;
- unique event index on `(notification_type, entity_type, entity_id, event_key)`.

Do not add another index for this issue unless new evidence shows a slow query. Current evidence points to the number/shape of REST round trips and transient gateway behavior.

### Candidate implementation
New `lib/business-followup-batched.js` replaces per-candidate scan queueing in the cron path. It:
- preserves the current quote reminder stages (2 and 7 days);
- preserves invoice reminder stages (1, 8, 15 and 29 days overdue);
- preserves upcoming-unassigned and stale-scheduled booking alerts;
- bulk-loads invoice quote context once;
- builds candidates in memory and de-duplicates by the existing unique event identity;
- inserts candidates in conflict-ignore batches (50 by default, max 100);
- retries one 502/503/504 only for the idempotent conflict-ignore batch insert;
- does not revive already sent/failed/cancelled duplicate event rows;
- records partial source or queue failures as degraded results instead of throwing away healthy sources.

Current Supabase docs/changelog were checked before implementation. Bulk upsert/ignore-duplicates remains supported, and there is no relevant hosted-platform breaking change for this pattern as of 2026-09-12.

### Cron stage isolation
Candidate `api/booking-notifications.js` no longer calls the old combined `processBusinessFollowUps()` path. It runs four isolated stages:
1. post-job follow-up delivery (10);
2. generic booking notification delivery (10);
3. batched business reminder scan;
4. due business notification delivery (10).

Each stage returns `ok/data` or `ok:false/error`. One stage's transient DB failure is logged and marks the cron response `degraded`, but the remaining stages continue. HTTP 503 is returned only if all four stages fail.

This prevents a transient business scan/delivery gateway error from blocking unrelated post-job and booking notifications in the same hourly run.

### Tests / release gate
New `scripts/booking-notification-resilience.test.mjs` covers:
- in-memory event de-duplication;
- conflict-ignore batch insert behavior;
- one transient 504 retry for idempotent batch insert;
- one bulk invoice-quote context fetch / one queue batch rather than per-event queue lookups;
- partial source failure reported as degraded without throwing.

Local candidate checks: 5/5 tests passed and both new/changed JS files passed `node --check` before push.

No database migration is required. Release still requires exact-head CI, exact-head Vercel preview/build verification, merge, production deployment and real authenticated cron observation before the 504 issue can be marked resolved.

## Next recommended work
1. finish release verification for the 504 resilience candidate and observe real cron health;
2. enter the official Google Business Profile review URL when available;
3. complete every field job with Start → Complete;
4. save the direct-cost/travel review, including genuine £0-cost jobs;
5. collect authentic before/after evidence and feedback;
6. calibrate price/capacity/route rules from real results;
7. consider Stage 2 only after the user deliberately decides the Window evidence supports it.

## Non-negotiables
- Window Cleaning remains the only current commercial service.
- Address-data work stays parked unless deliberately resumed.
- Service/booking restrictions remain server-side enforced.
- Existing commitments survive service pauses.
- Privileged access remains AAL2/MFA protected.
- Review solicitation remains neutral and equal.
- Support tickets stay customer-only.
- Never expose secrets.
