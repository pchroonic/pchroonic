# Namdar AI handoff

Last verified: 2026-09-13 UTC

Read `docs/AI_START.md` first.

## Production source of truth
- Repo: `pchroonic/pchroonic`, default `main`.
- Latest product release: PR #50 `Account for Stripe fees without customer surcharges`.
- Exact tested head: `17892e015f8e7f8b7c9a6b0b577292bb950d5c64`.
- GitHub Actions: `34752824319` SUCCESS.
- Exact-head Vercel preview: `dpl_2py2f1pDzH8YK5YD6GRkiD2hojfi` READY, clean errors-only build.
- Merge: `32e13016601492eae3daa2021f35195298b00f5b`.
- Product production: `dpl_Ce8kShg3ikTXVubaTYMKcgAFjztT` READY on `https://namdar.co.uk`, canonical alias present, `aliasError:null`, clean errors-only build.
- Runtime errors/fatal logs on that deployment during release verification: none.
- Supabase: `namdar-production` (`qjigldxjcpnrlyxgmlqq`).
- Only `windows` is live; gutters/jetwash/roof/handyman/tour3d remain `planned`.
- Address work remains parked.
- Staff/Admin privileged API access requires AAL2/MFA.

## Window Stage 1 live baseline
Keep the existing Window quote/recurring pricing, service-live gates, route-aware booking rules, Staff On my way → Start → Complete, completed-job direct-cost/travel review, consent-aware conversion funnel, direct-contribution reporting, neutral post-job review flow, Stripe foundation and processor-cost accounting.

`booking_job_costs` remains the staff-reviewed job-cost source. Missing review is not £0. Missing/incomplete Stripe processor cost is also not £0. Direct contribution is not net profit.

Public Google review requests remain disabled until the official Business Profile review-request URL is deliberately entered. Never restore positive-only review gating or incentives.

## Booking-notification resilience
PR #47 isolated the four hourly notification stages and batched business reminder work. A real scheduled authenticated run at 2026-09-13 05:00:02 UTC returned HTTP 200 while logging `Notification cron stage failed: booking_delivery 504 Gateway Timeout`.

Containment is working, but the intermittent upstream/Supabase REST 504 persists. Keep `Namdar Cron Watch`; do not declare it permanently resolved.

## PR #49 secure Stripe foundation — LIVE CODE, PROVIDER DISABLED
PR #49 added Window-only secure Checkout/payment policy without activating Stripe.

Core rules retained after PR #50:
- online payments default disabled;
- effective activation needs Admin activation + `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET`;
- Checkout is customer-owned, Window-only and server-calculated;
- deterministic idempotency key prevents duplicate Checkout creation for the same payment state;
- webhook preserves raw body and verifies Stripe signature before money writes;
- browser payment return/status is read-only for money;
- `payment_records.provider_reference` is unique and webhook inserts use conflict-ignore semantics;
- required deposit/full payment is enforced server-side before Window booking confirmation;
- card details never pass through or persist in Namdar.

Latest production health after PR #50 still reports `stripe:false`, `stripeSecret:false`, `stripeWebhook:false`; there is no payment-policy row and there are zero Stripe payment rows.

## PR #50 processor-fee accounting — LIVE
### Business rule
There is no separate consumer-facing Stripe/card surcharge in the Namdar journey. Customer-visible invoice/Checkout uses one ordinary service price.

An optional Window **headline price allowance** may be deliberately enabled in Admin. When enabled it applies to the ordinary service price regardless of eventual payment method and is never itemised as a card/Stripe fee. It is currently OFF because no `site_settings.payments` row exists.

Default allowance suggestion in code:
- 1.5%;
- £0.20 fixed;
- disabled by default.

`headlinePriceWithAllowance(base, policy)` uses `(base + fixed) / (1 - rate)` before the existing whole-pound guide-price rounding. Promo/reward discounts are applied after the headline allowance. This allowance is a configurable pricing buffer only; it is not used as the accounting source of truth for actual Stripe cost.

### Production migration
Migration `stripe_processor_fee_accounting` was applied successfully before PR #50 merge.

Migration file:
`supabase/migrations/20260913103500_stripe_processor_fee_accounting.sql`

Added nullable internal `payment_records` columns:
- `provider_payment_id text`;
- `provider_balance_transaction text`;
- `provider_fee numeric(12,2)`;
- `provider_net numeric(12,2)`;
- `provider_fee_currency text`.

Added partial index:
`payment_records_provider_payment_idx` on `provider_payment_id` where non-null.

Post-migration verification:
- all 5 columns present;
- index present;
- `payment_records` RLS still enabled;
- 0 Stripe ledger rows;
- 0 `site_settings.payments` rows;
- service catalog unchanged: Window live, five future services planned.

No new finance table was created.

### Stripe actual-cost source
`lib/stripe-payments.js` retrieves PaymentIntent, Charge, Refund and BalanceTransaction objects and normalises balance-transaction economics:
- actual `fee`;
- actual `net`;
- currency;
- balance-transaction reference.

These provider values are internal accounting data. Do not infer actual fee from the headline allowance or a generic Stripe rate.

### Retry-safe webhook reconciliation
`api/stripe-webhook.js` now processes successful payments/refunds in this order:
1. verify signed raw webhook, GBP, amount and Window ownership/metadata;
2. insert the idempotent payment/refund record with provider payment ID and nullable cost fields;
3. synchronise existing invoice/booking payment state;
4. send first-insert customer/staff notification only once;
5. retrieve actual Stripe processor economics;
6. patch the same ledger row with balance transaction, fee, net and currency.

If step 5/6 cannot complete because Stripe cost data is temporarily unavailable, the handler returns retryable HTTP 503 **after** the payment/refund and derived money state are already safely recorded. Stripe replay hits the same unique provider reference, does not duplicate money or receipts, and can finish processor-cost reconciliation.

### Manual Stripe rows prohibited
`api/admin-payments.js` rejects staff-created `method='stripe'` records. `admin-payment-settings.js` also removes Stripe from the manual payment dropdown. Stripe records must originate from the verified webhook so provider-fee data remains trustworthy.

Cash, bank transfer, manual card and other existing staff methods remain available.

### Customer privacy
`api/customer-billing.js` explicitly selects only customer-safe payment fields and omits all processor-cost/provider-balance identifiers.

`api/billing-document.js` may fetch full records internally but renders only ordinary receipt/invoice fields; it does not render `provider_fee`, `provider_net`, `provider_payment_id` or `provider_balance_transaction`. Regression tests cover both JSON Billing and PDFs.

### Window direct contribution
`api/admin-window-performance.js` now groups ledger rows by completed Window booking and calculates processor-cost completeness.

Contribution-ready requires:
- reviewed `booking_job_costs`; and
- every linked Stripe transaction to have known GBP `provider_fee` data.

For contribution-ready jobs:
`direct costs = reviewed consumables + parking + travel + other job cost + actual Stripe processing fee`

`direct contribution = job value - direct costs`

If any Stripe fee is missing or non-GBP, affected job is excluded from direct-contribution aggregates rather than assuming £0. Admin reporting displays processor fees and data-quality counters.

Direct contribution remains **not net profit**; labour, overheads, tax and other business costs remain outside this metric.

### Release verification
- PR: #50 `Account for Stripe fees without customer surcharges`;
- exact head: `17892e015f8e7f8b7c9a6b0b577292bb950d5c64`;
- CI: `34752824319` SUCCESS;
- exact-head preview: `dpl_2py2f1pDzH8YK5YD6GRkiD2hojfi` READY / clean;
- production migration applied and verified before merge;
- merge: `32e13016601492eae3daa2021f35195298b00f5b`;
- production: `dpl_Ce8kShg3ikTXVubaTYMKcgAFjztT` READY, canonical alias, no alias error;
- product production build clean;
- release-time runtime error/fatal query clean;
- `/api/health` after deploy still `stripe:false`, `stripeSecret:false`, `stripeWebhook:false`;
- Admin serves `6.4.22-stripe-fee-accounting-1`;
- post-deploy DB recheck: 0 Stripe rows, 0 payment-policy rows, service catalog unchanged.

## Stripe activation next
Stripe itself is still disabled. Activation sequence:
1. create/configure the Stripe account securely;
2. store `STRIPE_SECRET_KEY` in Vercel server-side environment;
3. configure Stripe webhook URL `https://namdar.co.uk/api/stripe-webhook`;
4. store `STRIPE_WEBHOOK_SECRET` in Vercel;
5. test in Stripe test mode: deposit/full Checkout, successful webhook, delayed/duplicate webhook, processor-fee capture, balance payment and refund;
6. confirm Admin reporting shows the actual fee and customer Billing/PDFs do not;
7. deliberately enable Window payment policy in Admin;
8. separately decide whether headline price allowance should be enabled. It remains OFF by default.

Never ask the user to paste provider secrets into chat or commit them.

## Non-negotiables
- Window Cleaning only.
- No separate customer card/Stripe surcharge.
- Actual Stripe fee is internal accounting data from provider balance transactions.
- Verified Stripe webhook is authoritative for Stripe money; browser redirect is not.
- Missing processor cost is not £0 and blocks contribution for that job.
- No card details/provider secrets in browser, source, logs, docs or chat.
- Privileged changes remain AAL2/MFA protected.
- Existing accepted work survives service pauses.
- Address work remains parked.
- Support tickets stay customer-only; public inbound email stays Admin Email inbox.
- Review solicitation stays neutral/equal.
