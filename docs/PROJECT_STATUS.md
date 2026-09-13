# Namdar project status

Last updated: 2026-09-13 UTC

## Production baseline
- Repo: `pchroonic/pchroonic`, default `main`.
- Latest deployed product release: PR #49 `Add secure Window Stripe payment foundation`.
- Exact tested PR #49 head: `3423e99ae7e7924f7cae7d60c908d4fdb6badfa9`.
- CI `34741505277`: SUCCESS.
- Exact-head preview `dpl_AtV51rETngSfh77isxD7hTWTBp45`: READY / clean build.
- Merge `94572eaabcb5f876a75c0123653f73a144ef54e2`.
- Production `dpl_ALo78vUX3j9xwVZ8PnMjC9mAASmw`: READY on `https://namdar.co.uk`, no alias error.
- Supabase: `namdar-production` (`qjigldxjcpnrlyxgmlqq`).
- Window Cleaning is the only live/quotable/bookable service; five future services remain planned.
- Address-data work remains parked.

## Window Cleaning Stage 1 — LIVE
Product sequence includes:
- PR #38: Window quote/recurring journey and quote-gate hardening;
- PR #40: server-enforced booking operations and postcode-area route density;
- PR #42: consent-aware acquisition funnel + direct-contribution reporting;
- PR #45: completed-job close-out + neutral feedback/Google-review foundation;
- PR #47: booking-notification resilience;
- PR #49: secure Stripe payment foundation, code-live but provider-disabled.

Live booking defaults remain 21 days, 24h notice, Mon–Sat, 08–11 / 11–14 / 14–17, max 3 jobs/day and postcode-area route density.

## Post-job / reviews — LIVE
Staff uses On my way → Start → Complete, then saves direct costs/travel. Immediate completion email remains; 24-hour follow-up asks every completed customer for private feedback and, only when configured, an equal optional honest Google review.

Google review CTA is still disabled because no official review URL is configured. Never selectively solicit only positive reviews or offer incentives.

## Stripe payment foundation — LIVE CODE / DISABLED PROVIDER
Production after PR #49 has:
- Stripe aggregate readiness false;
- Stripe secret false;
- Stripe webhook secret false;
- no `site_settings.payments` row;
- zero Stripe payment records;
- Window Cleaning still sole live service.

Therefore customers cannot yet make Stripe payments. Provider setup/test-mode verification is still required before Admin can deliberately activate payments.

Core security remains: verified webhook writes Stripe money, browser redirect cannot; Checkout amount is server-calculated; required payment policies are server-enforced before confirmation; no card data is stored by Namdar.

## CURRENT CANDIDATE — processor fees as internal cost, not customer surcharge
Branch: `feat/stripe-fee-accounting-20260913`.

### Customer pricing rule
Namdar does not add a separate consumer-facing Stripe/card processing charge at Checkout.

The candidate adds an optional Window **headline price allowance**, default OFF. If deliberately enabled, the configured percentage/fixed allowance is absorbed into the ordinary Window service price before promos/rewards. The resulting service price applies regardless of the customer's later payment method and is not itemised as a payment fee.

Default configured suggestion in code: 1.5% + £0.20, but disabled by default.

### Actual provider economics
The real Stripe cost is taken from Stripe balance-transaction data, not estimated from the allowance.

Pending migration:
`supabase/migrations/20260913103500_stripe_processor_fee_accounting.sql`

It adds nullable internal fields to existing `payment_records`:
- provider payment ID;
- provider balance transaction;
- actual provider fee;
- provider net;
- provider fee currency;
plus a partial provider-payment lookup index.

No new finance table is created. RLS/security model remains unchanged.

### Webhook reliability
The candidate records payment/refund money and synchronises invoice/booking state before attaching processor economics. If Stripe fee/net data is temporarily unavailable, the webhook returns retryable HTTP 503 after the money record is safely written. A replay uses the existing unique provider reference, cannot duplicate money/receipts and can patch the missing processor economics.

Staff manual payment entry cannot use method `stripe`; verified webhooks are the only source of Stripe ledger records.

Customer Billing explicitly omits all processor-cost/provider-balance fields.

### Performance/economics
Window reporting now plans to include actual captured Stripe processing fees in direct costs.

A completed job is contribution-ready only when:
1. staff has reviewed/saved job direct costs; and
2. every Stripe transaction linked to the job has known GBP provider-fee data.

If processor fee is missing or non-GBP, the job is excluded from aggregate direct contribution instead of assuming £0.

**Direct contribution remains not net profit.** Labour, overheads, tax and other business costs remain outside this metric.

## Notification 504 resilience — containment works, upstream 504 persists
A real authenticated cron invocation on 13 September 2026 at 05:00:02 UTC returned HTTP 200 but logged `booking_delivery 504 Gateway Timeout`. Stage isolation prevented whole-cron failure, but the transient Supabase REST issue remains.

Keep `Namdar Cron Watch` active. Do not mark the underlying 504 resolved.

## Candidate release gate
1. finish source/tests/docs;
2. open PR;
3. require full exact-head GitHub CI and exact-head Vercel preview clean;
4. apply and verify the additive Stripe processor-accounting migration;
5. confirm no synthetic Stripe records/payment-policy row and service catalog unchanged;
6. merge exact tested head;
7. verify production READY, clean build/runtime and Stripe still provider-disabled;
8. sync final handoff with exact release IDs.

## Stripe activation after code release
Only later:
1. connect/configure Stripe account securely;
2. store `STRIPE_SECRET_KEY` in Vercel;
3. configure production webhook `/api/stripe-webhook` and store `STRIPE_WEBHOOK_SECRET`;
4. test Checkout, delayed/duplicate webhook, actual processor-fee capture and refunds end-to-end in test mode;
5. deliberately enable Window online-payment policy;
6. independently decide whether to enable the headline price allowance.

Never request provider secrets in chat or commit them.

## Other open work
- official Google review-request URL;
- fresh privileged password/CAPTCHA/MFA interactive completion;
- SMS, legal and remaining launch checks;
- address-data pilot remains parked;
- Stage 2 remains blocked until deliberate business decision.

## Handoff rule
Every substantial product/provider/data change updates `docs/AI_START.md`, `docs/AI_HANDOFF.md`, and this file. Never store credentials, raw API keys, customer secrets, TOTP codes or one-time Auth links.
