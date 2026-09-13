# Namdar AI handoff

Last verified: 2026-09-13 UTC

Read `docs/AI_START.md` first.

## Production source of truth
- Repo: `pchroonic/pchroonic`, default `main`.
- Latest product release: PR #54 `Fix Stripe webhook raw body handling on Vercel`.
- Exact tested head: `d9a7d2cdded5905e032b53a38b725e30f50be531`.
- CI: `34759777343` SUCCESS.
- Exact-head preview: `dpl_F38E2rKUyZsnG2afqhsdsMEo1eNx` READY / clean errors-only build.
- Merge: `3dfdd4cb7cbf244dc450631c23273792b3b82853`.
- Product production: `dpl_9maand6wJHASgET55huV2EtauFjp` READY on `https://namdar.co.uk`.
- Supabase: `namdar-production` (`qjigldxjcpnrlyxgmlqq`).
- Only `windows` is live; gutters/jetwash/roof/handyman/tour3d remain `planned`.
- Address work remains parked.
- Staff/Admin privileged API access requires AAL2/MFA.

## Notification cron status
PR #52 remains deployed with bounded transient Data API read retries and schedule `7 * * * *`.

A real scheduled run at 2026-09-13 12:07 UTC completed non-degraded and cleared the Stripe setup gate. Keep `Namdar Cron Watch` active; do not assume upstream 504s can never recur.

## Stripe provider state — SANDBOX CONNECTED, COMMERCIAL PAYMENTS OFF
The user connected Stripe test mode (`New business`) and added sandbox `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` to Vercel Production env so the real `namdar.co.uk` webhook path could be tested safely.

Live `/api/health` now returns:
- `stripe:true`
- `stripeSecret:true`
- `stripeWebhook:true`

These are sandbox credentials only, not live-money credentials.

Webhook destination is enabled at:
`https://namdar.co.uk/api/stripe-webhook`

Selected events:
- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `refund.created`
- `refund.updated`
- `charge.refunded`

Commercial safety remains:
- no `site_settings.payments` row;
- customer online payment policy not active;
- headline allowance OFF;
- no real customer payment flow deliberately activated;
- card details never pass through Namdar.

## Sandbox test harness
Because the ChatGPT Stripe connector exposes Checkout Sessions read-only, a one-time Stripe sandbox Payment Link was used purely as a test harness. It created a normal Stripe Checkout Session and carried the same internal metadata the Namdar webhook expects.

Test amount: £1.23 GBP. No real customer or real service was involved.

## Failure discovered during first payment
The Stripe payment itself completed successfully, but Namdar initially remained unpaid.

Production Vercel logs at 13:16:49 and 13:17:03 UTC showed POST `/api/stripe-webhook` HTTP 400 with:
`Webhook raw body is unavailable.`

Root cause: Vercel's Node request body helper is lazy. Existing `readRawBody()` touched `req.body` first, which caused JSON parsing and destroyed the exact raw byte sequence required for Stripe signature verification.

For signed webhooks, never reconstruct JSON from a parsed object. Signature verification must use the exact bytes received.

## PR #54 — LIVE raw-body fix
Implementation in `lib/stripe-payments.js`:
- stream async-iterable/Vercel requests before any `req.body` access;
- preserve exact raw bytes;
- enforce the existing body-size limit while streaming;
- retain Buffer/string/Uint8Array fallback for non-stream adapters only.

Regression in `scripts/stripe-payments.test.mjs`:
- async-iterable request mock has a `body` getter that throws;
- `readRawBody()` must return exact bytes without touching that getter.

Release identities:
- exact head `d9a7d2cdded5905e032b53a38b725e30f50be531`;
- CI `34759777343` SUCCESS;
- preview `dpl_F38E2rKUyZsnG2afqhsdsMEo1eNx` READY;
- merge `3dfdd4cb7cbf244dc450631c23273792b3b82853`;
- production `dpl_9maand6wJHASgET55huV2EtauFjp` READY / clean build.

## End-to-end payment verification — PASSED
After PR #54 deployed, Stripe automatically retried the already-paid Checkout event.

Production result:
- 13:30:39 UTC POST `/api/stripe-webhook` -> HTTP 200;
- exactly one Stripe `payment_records` row created;
- invoice became paid with amount_paid £1.23;
- booking `payment_status` became paid;
- provider PaymentIntent/balance-transaction identifiers stored;
- actual Stripe sandbox fee captured from the balance transaction: £0.24;
- provider net captured: £0.99;
- browser success page was not used as payment proof.

This confirms the verified webhook is the authoritative Stripe money writer.

## End-to-end refund verification — PASSED
A full £1.23 sandbox refund was created against the PaymentIntent.

Production result:
- refund succeeded in Stripe;
- refund-related webhook POSTs at 13:32:23 UTC returned HTTP 200;
- exactly one refund ledger row was created despite multiple relevant Stripe refund events;
- invoice status synchronized to refunded, amount_paid 0;
- booking `payment_status` synchronized to refunded;
- refund balance transaction captured;
- refund provider fee £0.00 and provider net -£1.23 in this sandbox transaction.

This validates refund idempotency and state synchronization.

## Cleanup / current state
The one-time sandbox Payment Link was deactivated after the test.

Temporary test quote/booking/invoice/payment rows were deleted. Final DB check:
- zero Stripe `payment_records` rows;
- zero `site_settings` rows where `key='payments'`;
- `windows` remains the only live service;
- five future services remain `planned`.

No real customer data was used for the test records.

## Next sequence
1. choose Window payment policy: optional payment, required deposit, or full payment required;
2. if deposit is chosen, choose deposit percentage/minimum and whether customers can pay in full instead;
3. keep sandbox credentials while testing Namdar's real signed-in customer Checkout route under that policy;
4. verify deposit/full/balance behavior through the normal My Namdar flow;
5. only then connect the Stripe live account and configure the live webhook signing secret;
6. replace sandbox credentials with live credentials deliberately;
7. enable payment policy only when ready for real money;
8. separately decide whether to enable the headline-price allowance.

## Non-negotiables
- Window Cleaning only.
- No separate customer card/Stripe surcharge.
- Verified Stripe webhook is authoritative for Stripe money; browser success is never payment proof.
- No blind replay of non-idempotent writes.
- No secrets in source, logs, docs or chat.
- Sandbox-ready does not mean live-money-ready.
- Missing Stripe processor cost is not £0; direct contribution is not net profit.
- Privileged changes remain AAL2/MFA protected.
- Address work remains parked.
- Review solicitation stays neutral/equal.
