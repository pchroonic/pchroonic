# Namdar project status

Last updated: 2026-09-13 UTC

## Production baseline
- Repo: `pchroonic/pchroonic`, default `main`.
- Latest product release: PR #54 `Fix Stripe webhook raw body handling on Vercel`.
- Exact tested head `d9a7d2cdded5905e032b53a38b725e30f50be531`.
- CI `34759777343`: SUCCESS.
- Exact-head preview `dpl_F38E2rKUyZsnG2afqhsdsMEo1eNx`: READY / clean build.
- Merge `3dfdd4cb7cbf244dc450631c23273792b3b82853`.
- Production `dpl_9maand6wJHASgET55huV2EtauFjp`: READY on `https://namdar.co.uk`.
- Supabase: `namdar-production` (`qjigldxjcpnrlyxgmlqq`).
- Window Cleaning is the only live/quotable/bookable service; five future services remain planned.
- Address-data work remains parked.

## Window Cleaning Stage 1 — LIVE
Product sequence includes:
- PR #38 Window quote/recurring journey and quote-gate hardening;
- PR #40 server-enforced booking operations and postcode-area route density;
- PR #42 consent-aware acquisition funnel + direct-contribution reporting;
- PR #45 completed-job close-out + neutral feedback/review foundation;
- PR #47 first booking-notification resilience layer;
- PR #49 secure Stripe payment foundation;
- PR #50 processor-cost accounting + no-surcharge headline pricing option;
- PR #52 bounded transient PostgREST/Data API recovery for notification cron + schedule moved to minute 7;
- PR #54 Vercel-compatible raw-body handling for verified Stripe webhooks.

## Notification 504 resilience — LIVE / MONITORED
PR #52 remains deployed. A real scheduled run at 2026-09-13 12:07 UTC completed non-degraded, so the Stripe setup gate was cleared. `Namdar Cron Watch` remains active because the upstream 504 source may still recur transiently.

## Stripe sandbox — CONNECTED AND VERIFIED, CUSTOMER PAYMENTS OFF
Stripe test credentials and webhook signing secret are present server-side in Vercel Production env solely so the real production hostname can receive sandbox webhooks.

Current live health:
- `stripe:true`
- `stripeSecret:true`
- `stripeWebhook:true`

These are test-mode credentials only.

Commercial state remains inactive:
- no `site_settings.payments` row;
- Window online payment policy not enabled;
- headline-price allowance OFF;
- no real customer payment path deliberately activated.

## Sandbox payment verification — PASSED
A one-time £1.23 Stripe sandbox payment was run against temporary Namdar test records.

The first attempt exposed a webhook bug: Vercel had parsed the body before Stripe signature verification because `readRawBody()` touched a lazy `request.body` getter. Webhook POSTs returned HTTP 400 and Namdar correctly did not record the browser success as money.

PR #54 fixed the raw-body path. After deployment Stripe automatically retried the same paid event:
- webhook returned HTTP 200 at 13:30:39 UTC;
- exactly one payment ledger row was created;
- invoice/booking became paid;
- actual sandbox processor fee captured: £0.24;
- provider net captured: £0.99.

This proves verified webhook authority and exact processor-cost capture.

## Sandbox refund verification — PASSED
A full £1.23 sandbox refund was then issued.

Result:
- Stripe refund succeeded;
- refund-related webhook calls returned HTTP 200 at 13:32:23 UTC;
- exactly one refund ledger row was created despite multiple relevant refund events;
- invoice and booking synchronized to refunded;
- refund balance transaction captured.

This proves the refund path is idempotent and synchronizes Namdar state correctly.

## Cleanup — COMPLETE
The one-time sandbox Payment Link is disabled.

Temporary test quote/booking/invoice/payment rows were deleted. Final database check:
- zero Stripe payment rows;
- zero payment-policy rows;
- Window live, all five future services still planned.

## Immediate next work
1. choose the Window online-payment policy: optional, deposit required, or full payment required;
2. choose deposit percentage/minimum and full-payment option if deposit mode is selected;
3. keep Stripe in sandbox while testing the normal signed-in My Namdar Checkout flow under that policy;
4. after normal-flow sandbox testing passes, connect/verify the Stripe live account and live webhook secret;
5. deliberately swap to live provider credentials;
6. enable the payment policy only when ready for real customers;
7. separately decide whether to enable the headline price allowance;
8. continue Window real-job evidence/pricing calibration.

## Other open work
- official Google review-request URL;
- fresh privileged password/CAPTCHA/MFA interactive completion;
- SMS, legal and remaining launch checks;
- address-data pilot remains parked.

## Handoff rule
Every substantial product/provider/data change updates `docs/AI_START.md`, `docs/AI_HANDOFF.md`, and this file. Never store credentials, raw API keys, customer secrets, TOTP codes or one-time Auth links.
