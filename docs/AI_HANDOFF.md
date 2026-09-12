# Namdar AI handoff

Last verified: 2026-09-12 UTC

Read `docs/AI_START.md` first.

## Source of truth
- Repo: `pchroonic/pchroonic`
- Default branch: `main`
- Current production main before this change: `1748f3949237cadc4b414b46c1a05b31f1d23e12`
- Working branch: `feat/window-post-job-followup-20260912`
- Vercel project: `namdar-website-starter-1`
- Supabase project: `namdar-production` (`qjigldxjcpnrlyxgmlqq`)
- Canonical production: `https://namdar.co.uk`
- Only `windows` is live; all other service-catalog rows remain planned.
- Address-data work is parked.
- Staff/Admin privileged API access requires AAL2/MFA.

## Live Window Stage 1 baseline
The live product already has:
- Window-specific quote inputs and server-side quote/live-service gating;
- one-off and 4/8/12-week guide pricing;
- server-enforced booking operations and postcode-area route density;
- staff On my way / Start / Complete lifecycle with before/after photos and notes;
- immediate completion email plus a queued 24-hour follow-up;
- consent-aware postcode → quote acquisition tracking;
- completed-job actual timing and direct-contribution reporting.

Performance reporting uses:
- `started_at → completed_at` for actual work time;
- `booking_job_costs` only when a direct-cost review exists;
- direct contribution, never “net profit”.

## Post-job workflow change in this branch

### Staff close-out
New `staff-closeout.js` augments completed Window jobs in the existing Staff app without rewriting `staff-original.js`.

`api/staff-jobs.js` now returns the assigned job's existing `booking_job_costs` row as `economics`.

`api/staff-job-action.js` accepts `action='economics'` only when:
- the booking is assigned to the authenticated staff member;
- the job is completed;
- the linked quote is `service_key='windows'`.

Values use the same bounds as Admin job economics:
- consumables / parking / travel / other direct cost: non-negative, max £100,000;
- travel minutes: 0–1440;
- travel miles: 0–10,000;
- note: max 1500 chars.

The action upserts `booking_job_costs`, sets `updated_by`, and writes `booking.economics` to the audit log.

### Neutral 24-hour follow-up
Existing completion paths continue to call `scheduleBookingFollowUp()`, so no scheduling behavior or schema changes are needed.

New `lib/post-job-followup.js` processes due `booking_notifications.notification_type='follow_up'` before the legacy generic worker:
- verifies booking still exists and is completed;
- validates the existing follow-up event key against the completion event;
- ensures the existing secure `booking_feedback` invite;
- sends a neutral email asking for private feedback;
- includes an optional “Leave an honest Google review” CTA only if `site_settings.reviews.value.public_review_url` is configured;
- explicitly welcomes positive, neutral or negative experience and says no review rewards are offered;
- archives the message in My Namdar.

`api/booking-notifications.js` processes 10 post-job follow-ups first, then 10 generic booking notifications and 10 business follow-ups. Stage 1 capacity is max 3 jobs/day, so this keeps normal throughput while reducing the previous 100+100 sequential timeout risk.

### Review gating removed
Previous `api/feedback.js` behavior exposed the public-review URL only after private status `positive`. That is being removed.

New behavior:
- GET returns configured public review availability regardless of rating/status;
- `public_review_click` does not require a positive rating;
- duplicate and newly submitted feedback responses return the configured review URL regardless of rating;
- 1–3 ratings still create/escalate private support work;
- the client displays the same optional honest-review CTA after either positive or needs-attention private feedback.

Do not restore positive-only review links.

### Admin review settings
New:
- `api/admin-review-settings.js`
- `admin-post-job-followup.js`

Admin → Bookings can view the setting with Bookings access; editing requires Settings permission/AAL2.

Only HTTPS Google-owned review URLs are accepted (`google.com` subdomains, `g.page`, `goo.gl` / subdomains). Empty value disables Google review requests.

Production currently has no `site_settings` key `reviews`; therefore this release does not invent or enable a Google review URL.

### Database
No migration is required. Reused tables:
- `bookings`
- `booking_notifications`
- `booking_feedback`
- `booking_job_costs`
- `site_settings`

At implementation inspection, production `booking_notifications` had only two historical sent rows: one confirmation and one 24h reminder; no synthetic completion/follow-up rows were created.

## Regression coverage
`scripts/post-job-followup.test.mjs` checks:
- completed Window-only staff cost capture;
- direct-contribution wording;
- neutral post-job email;
- public review no longer gated on positive private feedback;
- Google-only/audited admin settings;
- bounded cron batch order;
- Admin/Staff module loading.

The GitHub workflow also syntax-checks all new/changed modules.

## After product merge
Update all three continuity docs with:
- PR number;
- exact feature head;
- final GitHub Actions run;
- exact-head Vercel preview deployment;
- merge commit;
- production deployment and alias status;
- production smoke checks;
- whether a Google review link remains unconfigured or has been deliberately entered.

## Non-negotiables
- Window Cleaning only until deliberate Stage 2 decision.
- No address-data work unless deliberately resumed.
- Existing accepted work survives later pauses.
- Service/booking rules remain server-side enforced.
- Staff remains AAL2/MFA protected.
- Review requests must remain neutral and equally available.
- Support tickets remain customer-only.
- Never expose secrets.
