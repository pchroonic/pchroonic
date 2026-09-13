# Namdar AI fast resume

Last verified: 2026-09-13 UTC

Read this first. Use `docs/AI_HANDOFF.md` for implementation detail and `docs/PROJECT_STATUS.md` for roadmap/status.

## Production baseline
- Repository: `pchroonic/pchroonic`, default `main`.
- Current `main`: `ebca3eb768e80a7104ff74169bce4337d49eec11` (PR #48 handoff sync after PR #47).
- Latest product release: PR #47 booking-notification resilience, merge `43f2db200463083cd9736485700c27a3d80974b8`.
- Product production: `dpl_7UXKtKqyitKF5xiGADPcwN9MwgZk`; final docs production: `dpl_BhUY6TcpjfCk3XsV8cwcsZ1uE5g1`; both READY on `https://namdar.co.uk`.
- Supabase: `namdar-production` (`qjigldxjcpnrlyxgmlqq`).
- Window Cleaning is the only live/quotable/bookable service. Five future services remain `planned`.
- Address-data work remains parked.
- Privileged Staff/Admin requires AAL2/MFA.

## Window Stage 1 — LIVE
Live foundation includes Window quote/pricing rules, route-aware customer booking, Staff On my way → Start → Complete, completed-job direct-cost/travel close-out, consent-aware acquisition funnel, direct-contribution reporting and neutral post-job feedback/review workflow.

**Direct contribution is not net profit.** Missing cost review is not £0.

Google public-review requests remain disabled because production still has no configured official Google Business Profile review-request URL.

## Booking-notification resilience — LIVE, upstream 504 still intermittent
PR #47 batches business reminder scans and isolates post-job, booking delivery, business scan and business delivery stages.

A real authenticated cron run on 2026-09-13 at 05:00:02 UTC returned HTTP 200 but logged:
`Notification cron stage failed: booking_delivery 504 Gateway Timeout`

This proves stage isolation is working: one transient Supabase gateway failure no longer aborts the whole cron. It also proves the underlying transient database 504 has not disappeared. Keep the hourly `Namdar Cron Watch`; do not call this issue permanently resolved.

## Current candidate — Stripe Window payment foundation
Branch: `feat/stripe-payment-foundation-20260913`.

Production provider state before this candidate:
- `/api/health`: Stripe not ready;
- no `site_settings.payments` row;
- zero `payment_records` with `method='stripe'`.

The candidate deliberately reuses the existing v5.2 `invoices`, `payment_records` and booking `payment_status` ledger. No new payment/accounting table or migration is introduced.

### Security / money flow
- `lib/payment-policy.js`: configurable, fail-safe Window policy; default is disabled.
- Online payment requires **both** `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`, plus deliberate Admin activation.
- `api/create-checkout.js`: Window-only, customer-owned booking only, deterministic idempotency key, server-calculated deposit/full/balance amount; customer cannot choose an arbitrary amount.
- `api/stripe-webhook.js`: raw-body Stripe signature verification; verified webhook is the authoritative writer of Stripe payments/refunds; duplicate delivery is ignored through existing unique `provider_reference`.
- `api/payment-status.js`: customer return/status endpoint is read-only and can no longer create payment ledger entries.
- Failed/cancelled checkout never confirms a booking and never records payment.
- Stripe payment confirmation updates the existing invoice/booking payment state; no browser redirect can mark money paid.
- Stripe refunds received by verified webhook are inserted into the existing refund ledger and resynchronise invoice/booking payment state.
- Namdar never handles/stores card details.

### Payment policy / UX
Admin → Payments gains a Settings/AAL2-protected policy panel:
- disabled / enabled;
- optional, deposit-required or full-payment-required policy;
- configurable deposit percentage;
- configurable minimum deposit;
- optional customer choice to pay in full instead of deposit;
- provider readiness shown without exposing secrets.

My Namdar Billing supports pending/confirmed/completed Window bookings and can show secure deposit, balance or full-payment actions when the policy is actually enabled.

Required deposit/full-payment modes are enforced server-side before an Admin can move a Window booking from Pending to Confirmed. Under a required policy, a new appointment must first be created Pending, paid, then confirmed.

### Activation gate
Do **not** describe Stripe payments as live yet. Production currently lacks Stripe configuration and the payment policy is absent/default-disabled. After candidate CI/preview/release, the next interactive step is to connect/configure Stripe securely, create the production webhook endpoint for `/api/stripe-webhook`, add the webhook secret in Vercel, run real/test-mode end-to-end Checkout/webhook/refund tests, then deliberately enable the policy in Admin.

## Do not break
- Window Cleaning only; do not activate Stage 2.
- Stripe webhook, not browser redirect, is authoritative for money.
- Never expose or commit Stripe/Supabase/SMTP/Turnstile/cron secrets.
- Existing accepted work survives service pauses.
- Privileged access remains AAL2/MFA protected.
- Review requests stay neutral/equal; no positive-only gating or incentives.
- Address work stays parked.
- Support tickets remain customer-only; public inbound email remains Admin Email inbox.
