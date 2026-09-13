# Namdar AI handoff

Last verified: 2026-09-13 UTC

Read `docs/AI_START.md` first.

## Production source of truth
- Repo: `pchroonic/pchroonic`, default `main`.
- Latest deployed product release: PR #49 `Add secure Window Stripe payment foundation`.
- PR #49 exact tested head: `3423e99ae7e7924f7cae7d60c908d4fdb6badfa9`.
- CI: `34741505277` SUCCESS.
- Exact-head preview: `dpl_AtV51rETngSfh77isxD7hTWTBp45` READY / clean build.
- Merge: `94572eaabcb5f876a75c0123653f73a144ef54e2`.
- Production: `dpl_ALo78vUX3j9xwVZ8PnMjC9mAASmw` READY on `https://namdar.co.uk`, canonical alias present, no alias error.
- Supabase: `namdar-production` (`qjigldxjcpnrlyxgmlqq`).
- Only `windows` is live. Gutters/jetwash/roof/handyman/tour3d remain `planned`.
- Address work remains parked.
- Staff/Admin privileged access requires AAL2/MFA.

## Window Stage 1 live baseline
Keep the existing Window quote/recurring pricing, service-live gates, route-aware booking rules, Staff On my way → Start → Complete, completed-job direct-cost/travel review, consent-aware conversion funnel, direct-contribution reporting and neutral post-job review flow.

`booking_job_costs` remains the source for staff-reviewed job costs. Missing review is not £0 cost. Direct contribution is not net profit.

Public Google review requests remain disabled until the official Business Profile review-request URL is deliberately entered. Never restore positive-only review gating or incentives.

## Booking-notification resilience
PR #47 isolated four hourly notification stages and batched business reminder work. A real scheduled authenticated run at 2026-09-13 05:00:02 UTC returned HTTP 200 while logging `Notification cron stage failed: booking_delivery 504 Gateway Timeout`.

Interpretation: containment is working, but the underlying intermittent Supabase REST 504 persists. Keep the hourly Namdar Cron Watch and do not declare it permanently resolved.

## PR #49 Stripe foundation — deployed but provider disabled
PR #49 reused the existing invoice/payment ledger and added secure Stripe readiness without activating Stripe.

Production verification immediately after release:
- `/api/health`: `stripe:false`, `stripeSecret:false`, `stripeWebhook:false`;
- no `site_settings.payments` row;
- zero Stripe payment ledger rows;
- no service activation beyond Window Cleaning.

Important PR #49 security behavior:
- `lib/payment-policy.js` defaults online payments to disabled;
- effective activation requires stored Admin activation plus `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`;
- `api/create-checkout.js` is authenticated/customer-owned/Window-only and server-calculates deposit/full/balance amounts;
- Checkout uses deterministic Stripe idempotency keys;
- `api/stripe-webhook.js` preserves raw body and verifies Stripe signature before writing money;
- `api/payment-status.js` is read-only for money;
- `payment_records.provider_reference` uniqueness + conflict-ignore makes webhook replay idempotent;
- required deposit/full policy is enforced server-side before a Window booking can be confirmed;
- card details never pass through or persist in Namdar.

Do not call Stripe payments live until the provider is securely connected and test-mode end-to-end verification is complete.

## Current candidate — Stripe processing cost as Namdar internal cost
Branch: `feat/stripe-fee-accounting-20260913`.

### Business rule
There must be no separate consumer-facing Stripe/card surcharge in the Namdar payment journey. Customer-visible invoices/Checkout use one service price.

Namdar may optionally build an estimated processing-cost allowance into its normal Window headline price, provided that same service price applies regardless of the customer's eventual payment method. The allowance is a pricing buffer, not an itemised payment fee.

Actual processor cost for reporting comes from Stripe's balance-transaction data, not from the configured allowance or an assumed card rate.

### Payment policy extension
`lib/payment-policy.js` adds disabled-by-default fields:
- `headlineAllowanceActive:false`;
- `headlineAllowancePercent:1.5`;
- `headlineAllowanceFixed:0.20`.

`headlinePriceWithAllowance(base, policy)` calculates `(base + fixed) / (1 - rate)` when enabled, rounded to two decimals. Existing quote pricing continues to round the resulting guide amount through its established whole-pound guide-price behavior. With the allowance disabled, pricing is unchanged.

`api/admin-payment-settings.js` stores the allowance inside `site_settings.payments` and audit-logs its state. `admin-payment-settings.js` clearly labels it as part of the normal service price for everyone, never a card/Stripe surcharge. The allowance can remain configured independently of Stripe provider activation, but default is off.

`api/quote-core.js` applies the allowance only to Window Cleaning and before promo/reward reductions. It stores internal allowance metadata inside quote inputs when applied, but customer messaging never itemises a Stripe/card fee.

### Actual Stripe provider economics
New additive migration:
`supabase/migrations/20260913103500_stripe_processor_fee_accounting.sql`

It adds nullable internal fields to existing `payment_records`:
- `provider_payment_id`;
- `provider_balance_transaction`;
- `provider_fee`;
- `provider_net`;
- `provider_fee_currency`.

It also adds a partial index on `provider_payment_id`. Existing RLS/security model is unchanged. No new finance table is introduced.

`lib/stripe-payments.js` can retrieve PaymentIntent/Charge/Refund/balance-transaction details and normalises Stripe balance-transaction `fee`, `net`, currency and reference into internal decimal values.

### Retry-safe webhook cost capture
`api/stripe-webhook.js` keeps money recording idempotent and makes processor-cost reconciliation retry-safe:
1. validate signed webhook + metadata/currency/amount;
2. insert the payment/refund ledger row using unique provider reference, initially with provider payment ID and nullable fee fields;
3. synchronise invoice/booking payment state and send first-insert notifications/receipt only once;
4. fetch actual processor economics from Stripe balance transaction;
5. patch the existing ledger row with actual fee/net/currency/balance-transaction reference;
6. if provider-cost data is temporarily unavailable, return retryable HTTP 503 **after** the money/state is safely recorded. Stripe replay cannot duplicate the payment or customer receipt and can complete the missing processor-cost fields.

This prevents a transient Stripe API lookup problem from permanently treating processor cost as £0.

### Manual Stripe entries blocked
`api/admin-payments.js` no longer allows staff to manually record `method='stripe'`. Such records must come from verified webhooks so provider cost remains trustworthy. `admin-payment-settings.js` removes the Stripe option from the existing manual-payment dropdown at runtime.

Cash, bank transfer, manually recorded card and other payment methods remain available through the existing staff workflow.

### Customer privacy
`api/customer-billing.js` uses an explicit payment-record field selection and does not expose any provider-fee/net/payment-intent/balance-transaction fields. The customer's invoice total is not increased at checkout based on payment method and no processor fee line is shown.

### Window contribution reporting
`api/admin-window-performance.js` now:
- groups payment records per completed Window booking;
- sums actual GBP `provider_fee` from Stripe ledger rows;
- treats non-Stripe methods as having no Stripe processor cost;
- marks processor economics incomplete when any Stripe transaction lacks fee data or is non-GBP;
- requires both reviewed job costs and complete processor-cost data before including a job in direct contribution;
- computes direct costs as reviewed job costs + captured Stripe processing fees;
- exposes processor-fee data quality counters.

`admin-window-performance.js` shows Stripe processing cost and flags jobs whose contribution is excluded because processor-cost reconciliation is incomplete.

Direct contribution still explicitly excludes labour, overheads, tax and other business costs, so it must never be called net profit.

### Tests
`scripts/stripe-payments.test.mjs` covers:
- disabled allowance defaults;
- headline allowance formula;
- no card/Stripe fee wording in customer quote source;
- Stripe balance-transaction fee/net conversion;
- provider-accounting migration fields;
- customer Billing not exposing provider fields;
- staff manual Stripe entries blocked;
- existing signature/idempotency/payment confirmation safeguards.

`scripts/window-performance.test.mjs` now checks that processor cost participates in direct-contribution readiness and Admin labels remain accurate.

### Release sequence
Do not merge code before the additive migration exists in production, because the new webhook/report API selects/writes the new columns.

Release gate:
1. finish candidate docs/UI/cache version;
2. open PR;
3. require exact-head GitHub CI SUCCESS and exact-head Vercel preview READY/clean;
4. apply `stripe_processor_fee_accounting` migration to production;
5. verify columns/index/RLS/no synthetic Stripe rows/no payment-policy row/service catalog unchanged;
6. merge the exact tested PR head;
7. verify production build/runtime and `/api/health` still show Stripe disabled;
8. perform a final docs sync with exact release IDs.

## Stripe activation later
After this code release, Stripe itself still remains disabled until:
1. Stripe account is configured securely;
2. `STRIPE_SECRET_KEY` is stored server-side in Vercel;
3. webhook points to `https://namdar.co.uk/api/stripe-webhook`;
4. `STRIPE_WEBHOOK_SECRET` is stored in Vercel;
5. Checkout, delayed/duplicate webhook, fee capture and refund are tested end-to-end in test mode;
6. Admin deliberately enables the payment policy;
7. headline allowance is separately enabled only if desired.

Never ask the user to paste provider secrets into chat or commit them.

## Non-negotiables
- Window Cleaning only.
- No separate customer card/Stripe surcharge.
- Actual Stripe fee is internal accounting data and comes from provider balance transactions.
- Verified Stripe webhook is authoritative for Stripe money; browser redirect is not.
- Missing processor cost is not £0 and blocks contribution for the affected job.
- No card details or provider secrets in browser/logs/docs/chat.
- Privileged changes remain AAL2/MFA protected.
- Address work stays parked.
- Support tickets stay customer-only; public inbound email stays Admin Email inbox.
- Review solicitation stays neutral/equal.
