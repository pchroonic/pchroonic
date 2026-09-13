# Namdar AI fast resume

Last verified: 2026-09-13 UTC

Read this first. Use `docs/AI_HANDOFF.md` for implementation detail and `docs/PROJECT_STATUS.md` for roadmap/status.

## Production baseline
- Repository: `pchroonic/pchroonic`, default `main`.
- Current production product release: PR #49, `Add secure Window Stripe payment foundation`.
- PR #49 exact tested head: `3423e99ae7e7924f7cae7d60c908d4fdb6badfa9`.
- GitHub Actions `34741505277`: SUCCESS.
- Exact-head preview: `dpl_AtV51rETngSfh77isxD7hTWTBp45`, READY, clean errors-only build.
- Merge: `94572eaabcb5f876a75c0123653f73a144ef54e2`.
- Production: `dpl_ALo78vUX3j9xwVZ8PnMjC9mAASmw`, READY on `https://namdar.co.uk`, canonical alias present, no alias error.
- Supabase: `namdar-production` (`qjigldxjcpnrlyxgmlqq`).
- Window Cleaning is the only live/quotable/bookable service. Gutters, jet washing, roof cleaning, handyman and 3D tours remain `planned`.
- Address-data work remains parked.
- Privileged Staff/Admin requires AAL2/MFA.

## Window Stage 1 — LIVE
Live foundation includes Window quote/pricing rules, route-aware customer booking, Staff On my way → Start → Complete, completed-job direct-cost/travel close-out, consent-aware acquisition funnel, direct-contribution reporting and neutral post-job feedback/review workflow.

**Direct contribution is not net profit.** Missing reviewed cost is not £0.

Google public-review requests remain disabled until the official Google Business Profile review-request URL is deliberately configured.

## Stripe Window payment foundation — CODE LIVE, PROVIDER DISABLED
PR #49 is deployed, but real Stripe customer payments are deliberately off.

Production verification after PR #49:
- `/api/health`: `stripe:false`, `stripeSecret:false`, `stripeWebhook:false`;
- no `site_settings.payments` row;
- zero `payment_records` with `method='stripe'`;
- Window remains the only live service.

Security rules:
- verified Stripe webhook is authoritative for Stripe payments/refunds;
- browser success/return is read-only for money;
- server calculates deposit/full/balance amounts;
- required payment mode is enforced before Window booking confirmation;
- card data never passes through or persists in Namdar;
- do not ask for or expose Stripe secrets in chat/docs/source.

## Current candidate — internal Stripe cost accounting, no customer surcharge
Branch: `feat/stripe-fee-accounting-20260913`.

Goal: treat Stripe processing as a Namdar business cost while keeping one normal customer service price.

Candidate behavior:
- adds internal `payment_records` fields for Stripe PaymentIntent/balance-transaction reference, actual provider fee, provider net and fee currency;
- verified webhook records payment/refund first, then attaches actual processor economics from Stripe balance transactions;
- if processor-cost lookup is temporarily unavailable, the webhook returns a retryable 503 after the money record/state is safely written; webhook replay is idempotent and can complete the fee data without duplicating money or receipts;
- Window direct contribution subtracts captured Stripe processing cost in addition to reviewed consumables/parking/travel/other direct costs;
- jobs with missing/non-GBP processor cost are excluded from direct-contribution totals rather than assuming £0;
- customer Billing never receives processor-fee/net/balance-transaction fields;
- staff cannot manually record a payment as Stripe; Stripe rows come only from verified webhooks;
- Admin gains an optional **headline price allowance**. Default is OFF. If enabled, it becomes part of the same Window service price for every customer regardless of payment method; it is never itemised as a card/Stripe fee.
- default allowance suggestion in code is 1.5% + £0.20, configurable and disabled by default. This is a pricing buffer, not the source of truth for actual processor cost.

Pending migration before candidate merge:
`supabase/migrations/20260913103500_stripe_processor_fee_accounting.sql`

It only adds nullable provider-accounting columns and a partial lookup index to existing `payment_records`; no new finance table and no customer-facing fee field.

## Booking-notification resilience — containment works, upstream 504 remains intermittent
PR #47 stage isolation remains live. A real authenticated cron run at 2026-09-13 05:00:02 UTC returned HTTP 200 but logged `booking_delivery 504 Gateway Timeout`.

Keep `Namdar Cron Watch`. Do not call the underlying Supabase 504 permanently resolved.

## Immediate next action
1. finish fee-accounting candidate tests/docs;
2. open PR and require full CI + exact-head Vercel preview;
3. only after green gates, apply the additive processor-fee migration and verify it;
4. merge/deploy and verify Stripe remains disabled/no synthetic payment data;
5. later connect Stripe securely, configure `/api/stripe-webhook`, test Checkout/webhook/refund end-to-end, then deliberately enable payment policy;
6. headline allowance remains OFF unless deliberately enabled.

## Do not break
- Window Cleaning only; do not activate Stage 2.
- No separate consumer card/Stripe surcharge in the customer journey.
- Actual provider fee is internal accounting data.
- Stripe webhook, not browser redirect, is authoritative for money.
- Never expose Stripe/Supabase/SMTP/Turnstile/cron secrets.
- Existing accepted work survives service pauses.
- Privileged access remains AAL2/MFA protected.
- Review requests stay neutral/equal; no positive-only gating or incentives.
- Address work stays parked.
- Support tickets remain customer-only; public inbound email remains Admin Email inbox.
