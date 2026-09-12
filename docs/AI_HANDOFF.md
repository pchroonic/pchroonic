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

## Next recommended work
Use the release on real jobs before adding more systems:
1. enter the official Google Business Profile review URL when available;
2. complete every field job with Start → Complete;
3. save the direct-cost/travel review, including genuine £0-cost jobs;
4. collect authentic before/after evidence and feedback;
5. calibrate price/capacity/route rules from real results;
6. consider Stage 2 only after the user deliberately decides the Window evidence supports it.

## Non-negotiables
- Window Cleaning remains the only current commercial service.
- Address-data work stays parked unless deliberately resumed.
- Service/booking restrictions remain server-side enforced.
- Existing commitments survive service pauses.
- Privileged access remains AAL2/MFA protected.
- Review solicitation remains neutral and equal.
- Support tickets stay customer-only.
- Never expose secrets.
