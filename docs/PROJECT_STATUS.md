# Namdar project status

Last updated: 2026-09-13 UTC

## Production baseline
- Repo: `pchroonic/pchroonic`, default `main`.
- Latest product release: PR #50 `Account for Stripe fees without customer surcharges`.
- Exact tested PR #50 head: `17892e015f8e7f8b7c9a6b0b577292bb950d5c64`.
- CI `34752824319`: SUCCESS.
- Exact-head preview `dpl_2py2f1pDzH8YK5YD6GRkiD2hojfi`: READY / clean build.
- Product merge `32e13016601492eae3daa2021f35195298b00f5b`.
- Product production `dpl_Ce8kShg3ikTXVubaTYMKcgAFjztT`: READY.
- Docs-only PR #51 merge `c350fc3a225c96ad0033a54727e5ab5d8c2490f7`; current production deployment `dpl_7sFz4g2vR4RmLhHS7J7PthjLydbi` READY on `https://namdar.co.uk`.
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
- PR #50: actual Stripe processor-cost accounting + no-surcharge headline pricing option.

Live booking defaults remain 21 days, 24h notice, Mon–Sat, 08–11 / 11–14 / 14–17, max 3 jobs/day and postcode-area route density.

## CURRENT BLOCKER — notification cron intermittent 504s
Stripe provider connection is paused until the cron reliability issue is hardened and observed on a real scheduled run.

### Production failures
Authenticated `/api/booking-notifications` runs on 13 September 2026 showed unrelated stages/sources failing with 504s:
- 05:00 UTC: booking delivery;
- 06:00 UTC: post-job, booking delivery, admin contact, overdue invoices;
- 07:00 UTC: booking delivery, quote reminders, unassigned bookings;
- 08:00 UTC: booking delivery, booking attention;
- 09:00 UTC: post-job, admin contact, business delivery;
- 10:00 UTC: booking delivery, unassigned bookings.

The outer endpoint often still returned HTTP 200 because PR #47 isolated stages, but `degraded:true` behavior means notification work was not fully healthy.

### Diagnosis
This is not supported by evidence as a slow-query problem:
- only 6 quotes, 2 bookings, 2 invoices, 4 business notifications and 2 booking notifications;
- no due pending/sending backlog when diagnosed;
- PostgREST observed on 14.5;
- authenticator timeout 8s;
- `pg_notification_queue_usage()` 0;
- database connection limit normal (`-1`);
- due-notification SQL averages ~3.6 ms, max ~311 ms in `pg_stat_statements`.

Random 504s across small unrelated Data API reads point to transient PostgREST/Data API pool acquisition pressure. Supabase documents 504/PGRST003 as a pool acquisition timeout and current retry guidance includes 504 as transient for idempotent API calls.

## CURRENT CANDIDATE — cron PostgREST 504 recovery
Branch: `fix/cron-postgrest-504-retries-20260913`.

Changes:
- add `lib/notification-cron-resilience.js`;
- retry transient idempotent GET/HEAD/OPTIONS Data API reads up to 3 total attempts with short jittered backoff;
- classify 408/429/502/503/504/520/522/524 plus network/reset/timeout failures as transient;
- never auto-replay POST/PATCH/PUT/DELETE through the generic read wrapper;
- retry thrown transient top-level post-job, booking-delivery and business-delivery stages;
- feed the resilient read wrapper into the batched business scanner so admin-contact/quote/invoice/unassigned/attention reads can recover before being marked degraded;
- expose `databaseRetries` plus stage attempt/recovery metadata in cron JSON;
- move hourly Vercel cron from minute `0` to minute `7` to avoid the repeated exact-hour contention pattern;
- preserve all notification event keys, recipient rules, email content and business cadence.

The existing business queue batch POST remains conflict-ignore/idempotent and keeps its own one transient retry.

Tests prove GET recovery and prove mutation requests are not automatically replayed.

No database migration is required.

### Release gate
1. exact-head GitHub CI SUCCESS;
2. exact-head Vercel preview READY / clean;
3. merge/deploy exact tested head;
4. verify production schedule is `7 * * * *` and build/runtime are clean;
5. inspect the first real authenticated `:07` scheduled run;
6. only mark cron healthy after a real non-degraded run; recovered retry telemetry is acceptable containment but does not prove upstream pool instability vanished.

Keep `Namdar Cron Watch` active.

## Stripe — CODE READY, PROVIDER DISABLED
Production still has:
- `stripe:false`;
- `stripeSecret:false`;
- `stripeWebhook:false`;
- no `site_settings.payments` row;
- zero Stripe payment records.

No provider connection should be attempted until the cron candidate is released and observed.

Core security remains:
- verified webhook writes Stripe money;
- browser return/status cannot write payment records;
- Checkout amount is server-calculated;
- payment requirements are enforced before Window confirmation;
- card data is never stored by Namdar.

## Processor-fee accounting — LIVE
Production migration `stripe_processor_fee_accounting` is applied and verified.

`payment_records` has nullable internal provider fields for payment ID, balance transaction, actual fee, provider net and fee currency. Staff cannot manually create Stripe payment rows. Customer Billing/PDFs do not expose these fields.

## Pricing rule — no customer Stripe/card surcharge
Namdar does not add a separate consumer-facing payment fee.

Admin → Payments has an optional Window **headline price allowance**, currently OFF. Default suggestion is 1.5% + £0.20. If enabled, it is part of the normal service price for every payment method and is never itemised as a Stripe/card fee.

Actual Stripe cost in reporting comes from balance-transaction data, not the allowance.

## Performance/economics — LIVE
Window reporting includes actual captured Stripe processing fees in direct costs when available.

A completed job enters direct-contribution totals only when staff costs are reviewed and all linked Stripe transactions have known GBP processor-fee data. Missing fee data excludes the job rather than assuming £0.

**Direct contribution is not net profit.**

## Post-job / reviews — LIVE
Immediate completion and 24-hour neutral feedback/review workflows remain. Google review CTA is disabled until the official review URL is configured. Never selectively solicit only positive reviews or offer incentives.

## Immediate next work
1. release and verify the notification cron 504 recovery candidate;
2. observe the first real `:07` production cron run;
3. then resume Stripe secure provider/webhook setup and test-mode verification;
4. deliberately enable Window payment policy only after Stripe tests pass;
5. separately decide whether to enable headline price allowance;
6. continue real-job Window evidence/pricing calibration;
7. Stage 2 remains blocked until deliberate business decision.

## Other open work
- official Google review-request URL;
- fresh privileged password/CAPTCHA/MFA interactive completion;
- SMS, legal and remaining launch checks;
- address-data pilot remains parked.

## Handoff rule
Every substantial product/provider/data change updates `docs/AI_START.md`, `docs/AI_HANDOFF.md`, and this file. Never store credentials, raw API keys, customer secrets, TOTP codes or one-time Auth links.
