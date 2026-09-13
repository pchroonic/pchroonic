# Namdar project status

Last updated: 2026-09-13 UTC

## Production baseline
- Repo: `pchroonic/pchroonic`, default `main`.
- Latest product release: PR #52 `Harden notification cron against transient PostgREST 504s`.
- Exact tested head: `0cc73a93772d99f38eedc5287b7901fb14853185`.
- CI `34753702507`: SUCCESS.
- Exact-head preview `dpl_HPyvguMrtVaXT8Aw8BnrnFNU9g6J`: READY / clean build.
- Merge `2efca178f49221d3ca819b3c4df9d1780d759579`.
- Production `dpl_HSbQuHWcKxVQLPHJKZFb9RDctkVm`: READY on `https://namdar.co.uk`, canonical alias present, no alias error.
- Supabase: `namdar-production` (`qjigldxjcpnrlyxgmlqq`).
- Window Cleaning is the only live/quotable/bookable service; five future services remain planned.
- Address-data work remains parked.

## Window Cleaning Stage 1 — LIVE
Product sequence includes:
- PR #38: Window quote/recurring journey and quote-gate hardening;
- PR #40: server-enforced booking operations and postcode-area route density;
- PR #42: consent-aware acquisition funnel + direct-contribution reporting;
- PR #45: completed-job close-out + neutral feedback/Google-review foundation;
- PR #47: first booking-notification resilience layer;
- PR #49: secure Stripe payment foundation;
- PR #50: actual Stripe processor-cost accounting + no-surcharge headline pricing option;
- PR #52: bounded transient PostgREST/Data API recovery for notification cron + schedule moved to minute 7.

Live booking defaults remain 21 days, 24h notice, Mon–Sat, 08–11 / 11–14 / 14–17, max 3 jobs/day and postcode-area route density.

## Notification 504 resilience — RELEASED, OBSERVATION PENDING
Before PR #52, production notification cron had repeated random 504s across post-job, booking delivery, admin contact, quote reminders, overdue invoices, unassigned bookings, booking attention and business delivery. The issue was still present at 11:00 UTC on 13 September 2026.

Database diagnosis found tiny tables, no backlog and SQL execution in milliseconds, so the evidence did not support slow SQL. The failure pattern is consistent with transient PostgREST/Data API connection-pool acquisition failures.

PR #52 is now live with:
- max-three-attempt transient recovery for idempotent cron reads;
- GET/HEAD/OPTIONS only in the generic read wrapper;
- no generic automatic replay of mutation methods;
- bounded recovery for thrown transient post-job / booking-delivery / business-delivery stage reads;
- resilient business-scan reads;
- retry/recovery telemetry;
- hourly Vercel schedule `7 * * * *` instead of top-of-hour.

Release smoke:
- production READY and clean build;
- `/api/health` 200;
- database/email/reminders/follow-ups healthy;
- no due pending booking/business notification backlog;
- Window remains only live service;
- Stripe still disabled/no Stripe ledger rows/no payment-policy row.

The 504 problem is **not yet declared permanently resolved**. The required proof is a real authenticated scheduled run on PR #52 production. Clean with no retries = healthy run. Clean after recovered retries = resilience worked but upstream transient remains. Any degraded stage after retries = issue still active.

Keep `Namdar Cron Watch` active.

## Stripe — CODE READY, PROVIDER DISABLED
Stripe connection remains paused until the cron observation gate passes.

Production remains:
- `stripe:false`;
- `stripeSecret:false`;
- `stripeWebhook:false`;
- no `site_settings.payments` row;
- zero Stripe payment records.

Core security remains: verified webhook writes Stripe money, browser return/status cannot, Checkout amount is server-calculated, and card data is never stored by Namdar.

## Processor-fee accounting / no-surcharge pricing — LIVE FOUNDATION
Internal Stripe processor-cost columns/reporting remain deployed. Staff cannot manually create Stripe payment rows and customers do not see internal processor economics.

Namdar does not add a separate customer payment surcharge. Optional Window headline-price allowance remains OFF; if later enabled it applies to the normal service price for every payment method.

## Performance/economics — LIVE
Window reporting includes actual captured Stripe processing fees when available. Missing reviewed direct costs or incomplete processor-fee data excludes affected jobs from contribution rather than assuming £0.

**Direct contribution is not net profit.**

## Post-job / reviews — LIVE
Immediate completion and 24-hour neutral feedback/review workflows remain. Google review CTA stays disabled until the official review URL is configured. Never selectively solicit only positive reviews or offer incentives.

## Immediate next work
1. inspect first real PR #52 production cron at minute 7;
2. after a healthy observation, resume secure Stripe provider/webhook setup and test-mode verification;
3. deliberately enable Window online-payment policy only after Stripe tests pass;
4. separately decide whether to enable headline price allowance;
5. continue real-job Window evidence/pricing calibration;
6. Stage 2 remains blocked until deliberate business decision.

## Other open work
- official Google review-request URL;
- fresh privileged password/CAPTCHA/MFA interactive completion;
- SMS, legal and remaining launch checks;
- address-data pilot remains parked.

## Handoff rule
Every substantial product/provider/data change updates `docs/AI_START.md`, `docs/AI_HANDOFF.md`, and this file. Never store credentials, raw API keys, customer secrets, TOTP codes or one-time Auth links.
