# Namdar AI fast resume

Last verified: 2026-09-13 UTC

Read this first. Use `docs/AI_HANDOFF.md` for implementation detail and `docs/PROJECT_STATUS.md` for roadmap/status.

## Production baseline
- Repository: `pchroonic/pchroonic`, default `main`.
- Latest product release: PR #50, `Account for Stripe fees without customer surcharges`.
- PR #50 exact tested head: `17892e015f8e7f8b7c9a6b0b577292bb950d5c64`.
- GitHub Actions `34752824319`: SUCCESS.
- Exact-head preview: `dpl_2py2f1pDzH8YK5YD6GRkiD2hojfi`, READY, clean errors-only build.
- Merge: `32e13016601492eae3daa2021f35195298b00f5b`.
- Production: `dpl_Ce8kShg3ikTXVubaTYMKcgAFjztT`, READY on `https://namdar.co.uk`, canonical alias present, no alias error, clean errors-only build and no release-time runtime errors.
- Supabase: `namdar-production` (`qjigldxjcpnrlyxgmlqq`).
- Window Cleaning is the only live/quotable/bookable service. Gutters, jet washing, roof cleaning, handyman and 3D tours remain `planned`.
- Address-data work remains parked.
- Privileged Staff/Admin requires AAL2/MFA.

## Window Stage 1 — LIVE
Live foundation includes Window quote/pricing rules, route-aware booking, Staff On my way → Start → Complete, completed-job direct-cost/travel close-out, consent-aware acquisition funnel, direct-contribution reporting, neutral post-job feedback/reviews, secure Stripe payment foundation and processor-fee accounting.

**Direct contribution is not net profit.** Missing reviewed cost or unresolved Stripe processor cost is not £0 and is excluded from contribution totals.

## Stripe payments — CODE READY, PROVIDER STILL DISABLED
PR #49 delivered secure Checkout/webhook/payment-policy foundations. PR #50 added processor-cost accounting and the no-surcharge pricing model.

Latest production verification after PR #50:
- `/api/health`: `stripe:false`, `stripeSecret:false`, `stripeWebhook:false`;
- no `site_settings.payments` row;
- zero `payment_records` with `method='stripe'`;
- Window remains the only live service;
- Admin serves `6.4.22-stripe-fee-accounting-1`.

Therefore customers still cannot make real Stripe payments. Do not describe Stripe as activated until provider setup and test-mode verification are completed.

## Processor-fee accounting — LIVE
Migration `stripe_processor_fee_accounting` is applied to production.

Existing `payment_records` now has nullable internal fields:
- `provider_payment_id`;
- `provider_balance_transaction`;
- `provider_fee`;
- `provider_net`;
- `provider_fee_currency`.

The partial `payment_records_provider_payment_idx` exists and RLS remains enabled. No new finance table was created.

Verified Stripe webhooks will record payment/refund money first, then attach the actual Stripe balance-transaction fee/net. If processor economics are temporarily unavailable, the webhook returns retryable HTTP 503 after money/state is safely recorded; replay cannot duplicate money or receipts and can complete the fee data.

Customer Billing and PDF invoices/receipts do not expose processor-fee/net/balance-transaction fields. Staff cannot manually create `method='stripe'` rows.

## Customer pricing rule — no separate card/Stripe surcharge
Namdar does not add a separate Stripe/card fee at Checkout.

Admin → Payments now has an optional **headline price allowance** for Window Cleaning. It is **OFF by default**. If deliberately enabled, the configured allowance becomes part of the ordinary Window service price for everyone regardless of later payment method and is never itemised as a payment fee.

Default suggestion in code is 1.5% + £0.20, configurable. This is only a pricing buffer. Actual processor cost in reporting comes from Stripe balance-transaction data.

Window direct contribution now subtracts captured actual Stripe processing cost alongside reviewed consumables, parking, travel and other direct job costs. Jobs with missing/non-GBP Stripe fee data are excluded until reconciled.

## Booking-notification resilience
PR #47 containment remains live. A real authenticated cron run at 2026-09-13 05:00:02 UTC returned HTTP 200 but logged `booking_delivery 504 Gateway Timeout`.

Keep `Namdar Cron Watch`. Do not call the underlying intermittent Supabase 504 permanently resolved.

## Next action
1. connect/configure Stripe securely without sharing secrets in chat;
2. configure production webhook `https://namdar.co.uk/api/stripe-webhook` and its signing secret in Vercel;
3. test Checkout, delayed/duplicate webhook, actual fee capture and refund end-to-end in Stripe test mode;
4. deliberately enable Window online-payment policy only after those tests pass;
5. separately decide whether to enable the headline price allowance; it remains OFF now.

## Do not break
- Window Cleaning only; do not activate Stage 2 without deliberate decision.
- No separate consumer card/Stripe surcharge.
- Actual Stripe fee is internal accounting data from provider balance transactions.
- Verified Stripe webhook, not browser redirect, is authoritative for Stripe money.
- Missing processor cost is not £0.
- Never expose Stripe/Supabase/SMTP/Turnstile/cron secrets.
- Existing accepted work survives service pauses.
- Privileged access remains AAL2/MFA protected.
- Review requests stay neutral/equal; no positive-only gating or incentives.
- Address work stays parked.
- Support tickets remain customer-only; public inbound email remains Admin Email inbox.
