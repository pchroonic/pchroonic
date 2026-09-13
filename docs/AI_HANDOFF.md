# Namdar AI handoff

Last verified: 2026-09-13 UTC

Read `docs/AI_START.md` first.

## Production source of truth
- Repo: `pchroonic/pchroonic`, default `main`.
- Latest merged product release: PR #52, merge `2efca178f49221d3ca819b3c4df9d1780d759579`.
- Current production deployment after sandbox env redeploy: `dpl_DiD8jChsRaA64fRBdovzr3euKHj8` READY on `https://namdar.co.uk`.
- Supabase: `namdar-production` (`qjigldxjcpnrlyxgmlqq`).
- Only `windows` is live; gutters/jetwash/roof/handyman/tour3d remain `planned`.
- Address work remains parked.
- Staff/Admin privileged API access requires AAL2/MFA.

## Notification cron status
PR #52 remains deployed with bounded transient Data API read retries and schedule `7 * * * *`.

A real scheduled run at 2026-09-13 12:07 UTC completed non-degraded. That cleared the temporary gate for beginning Stripe sandbox setup. Continue `Namdar Cron Watch`; do not assume upstream 504s can never recur.

## Stripe provider state — SANDBOX CONNECTED, COMMERCIAL PAYMENTS OFF
The user connected Stripe test mode (`New business`) and added sandbox `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` to Vercel Production env, then redeployed.

Live `/api/health` now returns:
- `stripe:true`
- `stripeSecret:true`
- `stripeWebhook:true`

Stripe webhook destination exists and is enabled at:
`https://namdar.co.uk/api/stripe-webhook`

Events currently selected:
- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `refund.created`
- `refund.updated`
- `charge.refunded`

Commercial safety remains:
- no `site_settings.payments` row;
- online payment policy not active;
- no customer-facing Stripe checkout route available from normal Namdar flow;
- headline allowance remains OFF;
- no real card details pass through Namdar.

## First sandbox payment test
Because ChatGPT's Stripe connector exposes Checkout Sessions read-only, a one-time Stripe sandbox Payment Link was created as a test harness. It was limited to one successful completion and linked to temporary Namdar metadata.

Temporary Namdar records:
- quote `b1057c1c-d417-43aa-9fe9-3483ba31126d`
- booking `4eb3100f-d05a-4f5c-977b-b569f25c3cb2`
- invoice `805706a9-d9ff-4ed1-9cc6-8721a2454eb6`
- £1.23, no real customer/service

Stripe result:
- Payment Link `plink_1UFDFECu9tojH31yXfYKohbS`
- Checkout Session `cs_test_a1rhCJPgb8NFQHyLHbE2sXRSMTL9Vmb71XE78YyAbUefryGboc7uxuIEQm`
- PaymentIntent `pi_3UFDH1Cu9tojH31y1wLg0gaK`
- Stripe session status `complete`
- Stripe payment status `paid`
- amount 123 pence GBP

Namdar result before fix:
- booking remained `payment_status='unpaid'`
- invoice remained `issued`, `amount_paid=0`
- no `payment_records` row

Production logs at 13:16:49 and 13:17:03 UTC showed POST `/api/stripe-webhook` HTTP 400 with `Webhook raw body is unavailable.`

## Root cause
Vercel's Node request body helper is lazy: reading `request.body` triggers parsing. Existing `readRawBody()` checked `req.body` before streaming the request. On Stripe JSON requests that parsed the payload first and lost the exact byte sequence Stripe signed.

For signed webhooks, never reconstruct raw JSON from a parsed object. Signature verification must use the exact request bytes.

## PR #54 — webhook raw body fix CANDIDATE
Branch: `fix/stripe-webhook-raw-body-20260913`
PR #54: `Fix Stripe webhook raw body handling on Vercel`

Current head before docs commits: `fcd149882d604e5b3865246e22fc5324c258e634`.
Exact-head Vercel preview for that code head: `dpl_76VaZhk28MRTWKiJYm7BLVVGFi5X` READY, clean errors-only build.

Implementation in `lib/stripe-payments.js`:
- if request is async-iterable, stream it immediately;
- never touch `req.body` on the Vercel stream path;
- enforce 1 MiB limit while streaming;
- retain Buffer/string/Uint8Array fallback only for non-stream adapters.

Regression in `scripts/stripe-payments.test.mjs`:
- uses an async-iterable mock whose `body` getter throws;
- asserts `readRawBody()` returns exact bytes and never touches the getter.

First CI run `34759643914`:
- syntax/tests passed;
- failed only at continuity gate because these three docs had not yet been changed.

After docs commits, require a new exact-head CI success and exact-head READY preview before merge.

## Post-merge verification sequence
1. deploy PR #54 to production;
2. wait for Stripe automatic retry of the already-paid Checkout event or create a fresh one-time sandbox test if necessary;
3. require webhook HTTP 200;
4. confirm exactly one Stripe `payment_records` row for the Checkout Session;
5. confirm invoice paid / booking payment_status paid;
6. confirm processor fee/net/balance transaction captured;
7. verify duplicate webhook does not duplicate ledger/notifications;
8. issue sandbox refund and verify exactly one refund ledger row + invoice/booking sync;
9. clean up temporary Namdar test records after verification;
10. only then consider enabling the Window payment policy.

## Non-negotiables
- Window Cleaning only.
- No separate customer card/Stripe surcharge.
- Verified Stripe webhook is authoritative for Stripe money; browser success is never payment proof.
- No blind replay of non-idempotent writes.
- No secrets in source, logs, docs or chat.
- Customer online payments remain disabled until sandbox payment/refund verification passes.
- Missing Stripe processor cost is not £0; direct contribution is not net profit.
- Privileged changes remain AAL2/MFA protected.
- Address work remains parked.
- Review solicitation stays neutral/equal.
