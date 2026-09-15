# Namdar project status

Last updated: 2026-09-15 UTC

## Production baseline
- Repo `pchroonic/pchroonic`, default `main`.
- Current main before this release: `64de3f653d294a31afb4ef690189017272c33766`.
- Current live customer product: v`6.4.34-cancellation-policy-1`, PR #80.
- Production healthy on `namdar.co.uk`.
- Supabase production: `qjigldxjcpnrlyxgmlqq`.
- Window Cleaning only live.
- Privileged Staff/Admin requires CAPTCHA + AAL2/TOTP MFA.
- Stripe customer payment policy OFF; production has no `site_settings.payments` row and no commercial deposit bands have been approved/enabled.
- Ask Namdar provider AI disabled (`aiEnabled:false`).

## Flexible Payment & Deposit Policy Engine — RELEASE CANDIDATE
Branch `feature/flexible-payment-policy-engine-20260915`.
Version `6.4.35-payment-policy-engine-1`.

### Goal
Make payment protection adaptable as Namdar learns from real jobs:
- future Admin-editable deposits;
- optional flat rule or higher deposit bands for higher job values;
- frozen booking-specific payment terms so later increases do not rewrite older agreements;
- configurable balance-due timing;
- overdue reminders, booking hold and recovery review;
- no automatic/compounding consumer monetary penalty;
- B2B statutory late-payment calculation kept separate/manual.

### Implemented on branch
- `lib/payment-policy.js`: revisioned flat/tiered rules, band validation, deposit resolver, booking snapshot, exact-money deposit check, force-balance checkout, overdue stage, manual B2B preview.
- `admin-payment-settings.js` / API: editable future deposit bands, balance hours and overdue stages; audit/revision tracking; Stripe activation guards retained.
- `api/customer-quote-action.js`: customer-safe exact payment commitment.
- `account-booking-policy.js`: displays deposit/balance/overdue terms before appointment request and sends presented policy revision.
- `api/booking-core.js`: rejects stale revisions, freezes payment policy on booking, can pause a new appointment for an older materially overdue active-policy invoice.
- `lib/server.js`: copies active payment snapshot to invoice and applies recorded due timing.
- `api/create-checkout.js`: frozen-policy checkout and full outstanding balance after completion/due date.
- `api/admin-booking-update.js`: exact frozen deposit/full-payment enforcement before confirmation.
- `api/customer-billing.js` / `account-payments.js`: customer-visible frozen terms and overdue state.
- `lib/business-followup-batched.js`: frozen configurable reminder schedule; legacy schedule preserved.
- `api/customer-data-export.js`: safe payment-policy evidence added to privacy data copy.

### Safety / commercial invariants
- Customer payments remain OFF in production.
- No settings row is created merely by deploying this code.
- Fallback 20%/£10 values are inactive code defaults, not an approved commercial policy.
- Existing/legacy bookings are not retroactively forced into new required deposits.
- Consumer invoice amounts are never automatically increased for lateness by this engine.
- Business late-payment interest/recovery is not automatically posted.
- Window Cleaning remains the only live payment-capable service.

### Migration pending green gate
`20260915111500_flexible_payment_policy_engine.sql` adds payment-policy snapshot/evidence fields to bookings/invoices and appends Terms “Payment due dates and overdue balances” (Terms at least v3).

It has NOT yet been applied to production. Apply only after exact-head CI and preview are green.

### Release gate pending
- exact candidate CI SUCCESS;
- exact Vercel preview READY and errors-only build clean;
- final diff review;
- production migration + schema/Terms verification;
- exact-head merge;
- production deployment READY, health 200 and v6.4.35 live assets;
- no real booking/deposit/payment/late fee/refund created for deployment verification.

## Booking cancellation / deposit policy — LIVE
PR #80 / v`6.4.34-cancellation-policy-1`.
- >48h deposit normally refundable/transferable.
- <48h, no-show/no access: retention only for reasonable direct loss after savings/rebooking are considered.
- Namdar cancellation/no replacement: refund unprovided service payments.
- statutory consumer rights unaffected.
- Terms v2 live; booking acceptance evidence is recorded.

## Privacy Centre / UK GDPR — LIVE
- Privacy/Cookie v2 and My Namdar/Admin privacy centres live.
- Controller legal name/public postal address publication postponed by owner.
- ICO fee self-assessment still open.

## Security / operations stable
- Security Hardening live.
- Staff My Jobs auth recovery live and user-confirmed.
- Business Finance sole-trader-first/private.
- Smart Receipts private/review-first.
- Newsletter Centre consent-aware/resumable.
- Ask Namdar guided assistant live; provider AI off.
- Support tickets customer-only/private.

## Open roadmap after this release
- Owner later chooses actual commercial deposit bands/amounts and whether/when to activate Stripe.
- Build explicit business-customer classification before any automated B2B statutory-debt workflow.
- ICO fee self-assessment.
- Supabase Leaked Password Protection.
- Google review-request URL.
- Window real-job pricing calibration.
- SMS/legal checks.
- `url.parse()` deprecation cleanup.
- Address-data pilot remains parked.
