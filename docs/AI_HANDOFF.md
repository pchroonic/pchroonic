# Namdar AI handoff

Last verified: 2026-09-13 UTC

Read `docs/AI_START.md` first.

## Production source of truth
- Repo: `pchroonic/pchroonic`, default `main`.
- Current main: `ebca3eb768e80a7104ff74169bce4337d49eec11` (PR #48 docs sync).
- Latest product release: PR #47, merge `43f2db200463083cd9736485700c27a3d80974b8`.
- PR #47 exact head `437ab7e56b8e74f4c68d92fe096b646110018b95`; CI `34719427324` SUCCESS; preview `dpl_7QMQLeXV8rEF1qBcyS7d2FyLeLKX` READY; product production `dpl_7UXKtKqyitKF5xiGADPcwN9MwgZk` READY.
- Final docs production from PR #48: `dpl_BhUY6TcpjfCk3XsV8cwcsZ1uE5g1`, READY on `namdar.co.uk`.
- Supabase: `namdar-production` (`qjigldxjcpnrlyxgmlqq`).
- Only `windows` is live. Gutters/jetwash/roof/handyman/tour3d remain planned.
- Address work remains parked.
- Privileged Staff/Admin access requires AAL2/MFA.

## Window Stage 1 live baseline
Keep the existing Window quote/recurring pricing, service-live gates, route-aware booking rules, Staff On my way → Start → Complete, completed-job direct-cost/travel review, consent-aware conversion funnel, direct-contribution reporting and neutral post-job review flow.

`booking_job_costs` is the direct-cost source of truth. Missing review is not £0 cost. Direct contribution is not net profit.

Public Google review requests remain disabled until the official Business Profile review-request URL is entered. Never restore positive-only review gating or incentives.

## Booking-notification resilience — live; containment verified, upstream 504 persists
PR #47 replaced per-event business reminder queueing with batched conflict-ignore writes and isolated four cron stages.

A real scheduled authenticated run at **2026-09-13 05:00:02 UTC** returned HTTP 200 on `/api/booking-notifications` while logging:
`Notification cron stage failed: booking_delivery 504 Gateway Timeout`

Interpretation:
- stage isolation/containment is working because the whole hourly run no longer aborts;
- the underlying intermittent Supabase REST 504 is still present, now observed in generic booking delivery as well as earlier business-notification paths;
- keep `Namdar Cron Watch` running and do not declare the 504 permanently resolved.

## Current candidate — Stripe Window payment foundation
Branch: `feat/stripe-payment-foundation-20260913`.

### Verified production state before candidate
- `https://namdar.co.uk/api/health` reported `stripe:false`.
- Production did not expose a `site_settings` row with `key='payments'` in the verification query.
- Production `payment_records` contained **0** rows with `method='stripe'`.
- Existing v5.2 payment schema is already present: one invoice per booking, payment/refund ledger, unique `provider_reference`, and booking payment states `unpaid|deposit_paid|paid|refunded`.

No new finance table is required. This candidate deliberately reuses the existing ledger.

### `lib/payment-policy.js`
Adds a fail-safe online payment policy:
- default `active:false`;
- modes: `optional`, `deposit_required`, `full_required`;
- default deposit 20%;
- default minimum deposit £10;
- optional full-payment choice;
- provider readiness requires **both** `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`;
- `effectiveActive` requires stored Admin activation plus both provider secrets;
- DB/settings failure falls back to disabled.

### `lib/stripe-payments.js`
Dependency-free Stripe helper using native `fetch` and Node `crypto`:
- Stripe REST requests never expose the secret to browser code;
- Checkout creation uses an `Idempotency-Key` derived from a SHA-256 hash of invoice/payment state, not customer PII;
- Checkout metadata links booking, invoice, customer, Window service and expected amount;
- PaymentIntent receives the same internal metadata for later refund reconciliation;
- raw-body reader for webhook requests;
- Stripe signature parser + HMAC SHA-256 verification with timestamp tolerance and `timingSafeEqual`.

Stripe official docs were checked during implementation: webhook signatures require the unmodified raw body + `Stripe-Signature` + endpoint secret; POST creation supports idempotency keys.

### `api/create-checkout.js`
Hardened customer Checkout creation:
- authenticated customer only;
- booking ownership checked server-side;
- Window Cleaning only;
- booking must be pending, confirmed or completed, not cancelled;
- online policy must be effectively active;
- invoice is created/issued through existing ledger;
- deposit/full/balance amount is calculated server-side; arbitrary customer amount is impossible;
- optional customer full-payment choice only when policy allows;
- deterministic Stripe idempotency key prevents duplicate Checkout session creation for the same invoice/payment state;
- success redirect is not trusted as payment proof;
- latest Checkout session id may be stored on booking only as a reference, never as proof of payment.

### `api/stripe-webhook.js` — authoritative Stripe writer
New production webhook endpoint, with Vercel body parsing disabled to preserve raw request bytes.

It:
- requires `STRIPE_WEBHOOK_SECRET` and `STRIPE_SECRET_KEY`;
- verifies Stripe signature before JSON parsing/processing;
- handles successful `checkout.session.completed` / async success only when Stripe says paid;
- validates GBP, internal metadata, booking/invoice/customer relationship and Window service;
- validates Stripe `amount_total` against the expected checkout metadata;
- writes Stripe payments into existing `payment_records` with conflict-ignore on unique `provider_reference`;
- resynchronises invoice and booking payment status using `syncInvoicePaymentState()`;
- cancels pending overdue reminders when balance reaches zero;
- creates staff payment notification and customer receipt/message only on the first ledger insert;
- does **not** auto-confirm a booking;
- handles successful Stripe refunds (`refund.created`, `refund.updated`, and `charge.refunded`) by reconciling PaymentIntent metadata and inserting idempotent refund ledger records.

A duplicate Stripe webhook delivery cannot create a duplicate money record because `payment_records.provider_reference` is already unique and inserts use conflict-ignore semantics.

### `api/payment-status.js`
The customer return/status endpoint is now **read-only for money**:
- retrieves Checkout session from Stripe;
- verifies booking belongs to signed-in customer and is Window Cleaning;
- checks whether the webhook-created Stripe payment ledger row exists;
- can report `pendingWebhook` when Stripe reports paid but Namdar ledger has not received the verified webhook yet;
- may call `syncInvoicePaymentState()` to refresh derived totals;
- can no longer insert `payment_records`.

Therefore a success URL/browser redirect cannot mark a booking paid.

### `api/customer-billing.js` + `account-payments.js`
Customer Billing now receives safe payment policy/readiness only, never secrets.

When policy is actually enabled, My Namdar supports:
- pending Window booking initial payment;
- deposit button with server-calculated amount;
- optional Pay in full button if allowed;
- remaining balance payment after a deposit;
- completed-job outstanding balance payment;
- payment history and existing PDF invoice/receipt downloads.

The online payment action is absent when policy/provider is disabled.

### Admin settings + confirmation enforcement
`api/admin-payment-settings.js` and `admin-payment-settings.js` add Admin → Payments controls.

GET requires Payments/AAL2. Editing requires Settings/AAL2. Settings updates are audit logged as `payments.settings_update`.

Admin can configure:
- active/disabled;
- optional vs deposit-required vs full-required;
- deposit percentage;
- minimum deposit;
- customer full-payment choice.

Attempting to activate online payments without both Stripe secret + webhook secret is rejected.

`api/admin-booking-update.js` now enforces required Window payment policy server-side:
- if deposit/full payment is required and active, a brand-new staff-created appointment cannot be created directly as Confirmed; create Pending first;
- when Pending → Confirmed, the invoice ledger is resynchronised and confirmation is rejected unless required deposit/full payment is satisfied;
- optional mode and inactive provider preserve existing booking behavior;
- non-Window services are unaffected (and remain planned/non-live anyway).

No browser or manually editable booking payment field is trusted; confirmation checks the invoice ledger.

### Health / activation safety
`api/health.js` now distinguishes `stripeSecret`, `stripeWebhook` and aggregate `stripe` readiness using booleans only.

Production must remain payment-disabled until all of these are true:
1. Stripe account is connected/configured securely;
2. `STRIPE_SECRET_KEY` is stored server-side in Vercel;
3. Stripe webhook endpoint points to `https://namdar.co.uk/api/stripe-webhook`;
4. its signing secret is stored as `STRIPE_WEBHOOK_SECRET` in Vercel;
5. Checkout success, duplicate webhook, delayed webhook and refund behavior are tested end-to-end;
6. only then set Admin → Payments active.

Never ask the user to paste Stripe secrets into chat or commit them.

### Database / migration impact
No database migration in this candidate. Reuses:
- `site_settings` for `key='payments'` policy;
- `bookings.stripe_checkout_session_id` reference;
- `bookings.payment_status`;
- `invoices`;
- `payment_records` unique `provider_reference`;
- existing audit/customer/staff notification infrastructure.

No production payment policy row or synthetic Stripe payment record was inserted during implementation.

### Candidate files
New:
- `lib/payment-policy.js`
- `lib/stripe-payments.js`
- `api/admin-payment-settings.js`
- `api/stripe-webhook.js`
- `admin-payment-settings.js`
- `account-payments.js`
- `scripts/stripe-payments.test.mjs`

Changed:
- `api/create-checkout.js`
- `api/payment-status.js`
- `api/customer-billing.js`
- `api/admin-booking-update.js`
- `api/health.js`
- `account.js`
- `admin.js`
- `.github/workflows/ai-handoff-check.yml`
- continuity docs.

CI now syntax-checks all payment modules and runs `scripts/stripe-payments.test.mjs`.

## Immediate release/next action
1. open the Stripe foundation PR;
2. require full GitHub CI + exact-head Vercel preview/build clean;
3. merge/deploy only if green;
4. verify production remains Stripe-disabled with no payment policy/ledger fabrication;
5. then connect Stripe securely and perform provider/webhook test-mode activation before enabling Admin payment policy.

## Non-negotiables
- Window Cleaning only.
- Stripe verified webhook is authoritative for Stripe money; browser success redirect is not.
- No card details or provider secrets in Namdar data/browser/logs/docs/chat.
- Privileged changes remain AAL2/MFA protected.
- Existing service/booking security and accepted commitments remain intact.
- Address work remains parked.
- Support tickets customer-only; public inbound email stays Admin Email inbox.
- Review solicitation remains neutral/equal.
