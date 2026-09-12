# Namdar project status

Last updated: 2026-09-12 UTC

## Production baseline
- Repo: `pchroonic/pchroonic`, default `main`.
- Current production main before this change: `1748f3949237cadc4b414b46c1a05b31f1d23e12`.
- Canonical production: `https://namdar.co.uk`.
- Supabase: `namdar-production` (`qjigldxjcpnrlyxgmlqq`).
- Window Cleaning is the only live/quotable/bookable service.
- Gutter Cleaning, Patio & Jet Washing, Roof Cleaning, Handyman Services and 3D Property Tours remain planned.
- Address-data work remains parked.

## Window Cleaning Stage 1 — LIVE
Live:
- Window-only quote and recurring journey;
- server-side service/quote gating;
- route-aware customer booking;
- Staff field-job lifecycle;
- consent-aware acquisition funnel;
- actual work-time/productivity reporting;
- reviewed direct-cost/direct-contribution reporting.

Live booking defaults: 21 days, 24h notice, Mon–Sat, 08–11 / 11–14 / 14–17, max 3 jobs/day, postcode-area route density.

Direct contribution is **not net profit**. Labour, overheads, tax and other business costs are outside the Stage 1 metric. Jobs without cost review are excluded instead of being assumed £0-cost.

## In progress — completed-job close-out + honest review workflow
Branch: `feat/window-post-job-followup-20260912`.

Scope:
- Staff completed Window jobs get direct-cost/travel close-out using existing `booking_job_costs`;
- staff cost edits are assigned-job-only, completed-job-only, Window-only, bounded and audit logged;
- immediate completion email remains;
- 24-hour follow-up becomes a neutral request for private feedback plus optional honest Google review;
- positive-only public-review gating is removed;
- low private ratings still alert support without suppressing the public-review option;
- Admin gets a Settings-protected official Google review URL control;
- notification cron work is reduced from large 100-item batches to bounded 10-item stages to reduce timeout risk;
- no schema migration or synthetic data is needed.

Production currently has no `site_settings.reviews` row, so Google review requests remain disabled until the official Business Profile review link is deliberately entered.

## Review integrity rule
Never selectively solicit only positive reviews. Never offer incentives or ask for a particular star rating. The same Google review choice must be available to completed customers regardless of their private rating.

## Database/security
Existing Stage 1 internal tables:
- `conversion_events`
- `quote_funnel_links`
- `booking_job_costs`

They remain RLS-protected and server-only.

The post-job release reuses:
- `booking_notifications`
- `booking_feedback`
- `booking_job_costs`
- `site_settings`

No new table is planned.

## Immediate next work after release
1. enter the official Google review-request link if/when the Google Business Profile is ready;
2. use Start → Complete → direct-cost review for each real Window job;
3. collect genuine before/after photos and reviews;
4. calibrate price, capacity and route rules from real value/work-hour, travel and direct contribution;
5. assess Stage 2 only after enough evidence exists.

## Other open work
- fresh privileged password/CAPTCHA/MFA completion pending;
- Stripe, SMS, legal and remaining launch checks;
- address-data pilot remains parked.

## Handoff rule
Every substantial product/provider/data change updates `docs/AI_START.md`, `docs/AI_HANDOFF.md`, and this file. Never store credentials, raw API keys, customer secrets, TOTP codes or one-time Auth links.
