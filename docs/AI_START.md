# Namdar AI fast resume

Last verified: 2026-09-12 UTC

Read this first. Use `docs/AI_HANDOFF.md` for implementation detail and `docs/PROJECT_STATUS.md` for roadmap/status.

## Production baseline
- Repository: `pchroonic/pchroonic`, default `main`.
- Current production main before the post-job release: `1748f3949237cadc4b414b46c1a05b31f1d23e12`.
- Last live product release: Window Stage 1 performance, PR #42 merged as `5249e2b4d2ed0c108a15facac01258d66bf4dece`.
- Last verified production deployment: `dpl_G88LjzMWa3wsMG4ZVwUWhV7ky1hs`, READY on `https://namdar.co.uk`.
- Supabase: `namdar-production` (`qjigldxjcpnrlyxgmlqq`).
- Window Cleaning is the only live/bookable service; five future services remain planned.
- Address-data work remains parked.
- Privileged staff requires AAL2/MFA.

## Window Stage 1 — live foundation
Live capabilities include:
- Window-only quote and recurring-service journey;
- server-side service/live quote gating;
- 21-day route-aware customer booking with 24h notice, Mon–Sat, 08–11 / 11–14 / 14–17, max 3 jobs/day and postcode-area route density;
- consent-aware acquisition funnel;
- completed-job timing/productivity;
- reviewed direct-cost/direct-contribution reporting.

**Direct contribution is not net profit.** Labour, overheads, tax and other business costs are excluded. Jobs without a direct-cost review are not treated as £0-cost jobs.

Production analytics tables remain server-only with RLS and no direct anon/authenticated grants:
- `conversion_events`
- `quote_funnel_links`
- `booking_job_costs`

## Current product change — post-job completion and review workflow
Branch: `feat/window-post-job-followup-20260912`.

This change is being built to make every real completed Window job useful operationally:
1. staff still uses On my way → Start job → Complete job;
2. completed Window jobs expose a Staff close-out form for consumables, parking, travel cost, other direct cost, travel minutes/miles and a private note;
3. the close-out upserts the existing `booking_job_costs` row and is Bookings/AAL2 protected, Window-only and audit logged;
4. the existing immediate completion email remains the thank-you confirmation;
5. the existing 24-hour `follow_up` queue is processed by a neutral post-job worker that offers private Namdar feedback to every completed customer;
6. when an official Google Business Profile review URL is configured, the same optional Google review choice is offered to every completed customer regardless of their private rating;
7. low private ratings still alert Namdar support but no longer suppress access to the public-review option;
8. Admin → Bookings gets a settings panel for the official Google review URL; production currently has no `site_settings.reviews` row, so Google review requests stay disabled until the user enters the official link;
9. the hourly booking-notification worker uses smaller bounded batches to reduce timeout risk.

No new database table is required. Existing `booking_notifications`, `booking_feedback`, `booking_job_costs` and `site_settings` are reused.

## Review-request rule
Never reintroduce review gating. Do not:
- show Google review links only after 4–5 star feedback;
- discourage negative reviews;
- ask for a specific star rating;
- offer rewards/discounts for reviews.

Private support escalation for low ratings is allowed, but it must not remove the customer's equal option to publish an honest review.

## Next best work after this release
1. enter the official Google Business Profile review-request link in Admin when available;
2. use Start → Complete → direct-cost review on every real Window job;
3. collect genuine before/after photos and customer reviews;
4. use real funnel, value/work-hour, travel and direct contribution to calibrate price/capacity;
5. only then assess Stage 2.

## Do not break
- Window Cleaning only is the current commercial offering.
- Do not activate Stage 2 until the user deliberately decides Stage 1 evidence supports it.
- Customer service/booking availability stays server-side enforced.
- Existing accepted work survives service pauses.
- Privileged staff requires AAL2/MFA.
- Address-data work stays parked unless the user deliberately changes focus.
- Support tickets remain customer-only; public inbound email remains Admin Email inbox.
- Never expose secrets.
