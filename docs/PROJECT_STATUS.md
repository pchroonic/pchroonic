# Namdar project status

Last updated: 2026-09-13 UTC

## Production baseline
- Repo: `pchroonic/pchroonic`, default `main`.
- Current main: `ebca3eb768e80a7104ff74169bce4337d49eec11`.
- Latest product release: PR #47 booking-notification resilience, merge `43f2db200463083cd9736485700c27a3d80974b8`.
- PR #47 CI `34719427324` SUCCESS; exact-head preview `dpl_7QMQLeXV8rEF1qBcyS7d2FyLeLKX` READY; product production `dpl_7UXKtKqyitKF5xiGADPcwN9MwgZk` READY.
- Final handoff production from PR #48: `dpl_BhUY6TcpjfCk3XsV8cwcsZ1uE5g1` READY on `https://namdar.co.uk`.
- Supabase: `namdar-production` (`qjigldxjcpnrlyxgmlqq`).
- Window Cleaning is the only live/quotable/bookable service; five future services remain planned.
- Address-data work remains parked.

## Window Cleaning Stage 1 — LIVE
Product sequence:
- PR #38: Window quote/recurring journey and quote-gate hardening.
- PR #40: server-enforced booking operations and postcode-area route density.
- PR #42: consent-aware acquisition funnel + direct-contribution reporting.
- PR #45: completed-job close-out + neutral feedback/Google-review foundation.
- PR #47: booking-notification cron resilience and business-reminder batching.

Live booking defaults remain 21 days, 24h notice, Mon–Sat, 08–11 / 11–14 / 14–17, max 3 jobs/day and postcode-area route density.

## Post-job / reviews — LIVE
Staff uses On my way → Start → Complete, then saves direct costs/travel. Immediate completion email remains; 24-hour follow-up asks every completed customer for private feedback and, only when configured, an equal optional honest Google review.

Google review CTA is still disabled because no official review URL is configured. Never selectively solicit only positive reviews or offer incentives.

## Performance / economics — LIVE
Admin reporting measures consented acquisition funnel, completed jobs, invoice/collected value, work time, travel, reviewed direct costs, direct contribution and margin.

**Direct contribution is not net profit.** Missing cost reviews are excluded, not treated as £0.

## Notification 504 resilience — containment working, upstream 504 persists
PR #47 replaced per-candidate business notification DB round trips with batch writes and isolated the four hourly notification stages.

A real authenticated cron invocation on **13 September 2026 at 05:00:02 UTC** returned HTTP 200 but logged a `booking_delivery` 504 Gateway Timeout. This confirms the resilience behavior works—the rest of the cron can continue—but the transient Supabase REST failure still occurs.

Keep `Namdar Cron Watch` active. Do not mark the underlying 504 resolved.

## Stripe Window payment foundation — CURRENT CANDIDATE
Branch: `feat/stripe-payment-foundation-20260913`.

### Existing finance system reused
Namdar already has the v5.2 finance foundation:
- one invoice per booking;
- payment/refund ledger;
- unique provider reference;
- derived booking payment states;
- Admin Payments workspace;
- customer Billing workspace and PDF invoices/receipts.

The Stripe candidate layers verified provider payments onto that system. **No database migration or new accounting table is required.**

Production pre-candidate state:
- Stripe readiness false;
- no payments policy setting row found;
- zero Stripe payment ledger rows.

### Candidate capabilities
- Fail-safe payment policy in `site_settings.payments`, default disabled.
- Window-only optional/deposit-required/full-required modes.
- Configurable deposit percentage and minimum deposit.
- Online payments only become effective when `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` exist and Admin deliberately enables them.
- Server-calculated Checkout amount; customers cannot submit arbitrary payment values.
- Stripe Checkout creation uses idempotency key and internal metadata.
- Verified raw-body webhook is the only authoritative Stripe payment/refund writer.
- Existing unique `payment_records.provider_reference` prevents duplicate webhook money entries.
- Browser success/status endpoint is read-only for money.
- Payment/refund webhook resynchronises existing invoice and booking payment state.
- Failed/abandoned Checkout does not mark paid or confirm work.
- Required deposit/full-payment policy is enforced server-side before Window booking confirmation.
- My Namdar can show deposit, Pay in full and balance actions once provider/policy are enabled.
- Admin → Payments exposes provider readiness and policy controls under AAL2/Settings protection.
- Health endpoint reports Stripe secret/webhook readiness as booleans without exposing values.
- Card details never pass through or persist in Namdar.

### Activation status
The code is being prepared but **Stripe is not live**. Do not enable payment policy until:
1. branch CI and exact-head preview are clean;
2. candidate is merged/deployed;
3. Stripe account/provider is connected securely;
4. production webhook `/api/stripe-webhook` is configured in Stripe and `STRIPE_WEBHOOK_SECRET` is stored in Vercel;
5. Checkout, duplicate/delayed webhook and refund flows are tested end-to-end;
6. Admin deliberately switches the policy on.

Never request Stripe secret keys in chat or commit them to GitHub.

## Database/security
No schema change is planned for the Stripe candidate. Existing `invoices`, `payment_records`, `bookings`, `site_settings`, audit logs and customer/staff notification systems are reused.

Privileged Admin payment configuration remains AAL2/MFA protected. Payment confirmation is derived from the server-side ledger rather than editable browser state.

## Immediate next work
1. complete Stripe candidate CI/preview and release gate;
2. verify production remains safely payment-disabled after deployment;
3. connect/configure Stripe and webhook securely, then run test-mode end-to-end payment/refund verification;
4. deliberately enable Window payment policy only after verification;
5. continue real-job Window evidence collection and pricing/capacity calibration;
6. keep monitoring intermittent cron 504s;
7. Stage 2 remains blocked until deliberate business decision.

## Other open work
- official Google review-request URL;
- fresh privileged password/CAPTCHA/MFA interactive completion;
- SMS, legal and remaining launch checks;
- address-data pilot remains parked.

## Handoff rule
Every substantial product/provider/data change updates `docs/AI_START.md`, `docs/AI_HANDOFF.md`, and this file. Never store credentials, raw API keys, customer secrets, TOTP codes or one-time Auth links.
