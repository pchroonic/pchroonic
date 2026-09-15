# Namdar AI handoff

Last verified: 2026-09-15 UTC

Read `docs/AI_START.md` first.

## Production baseline
- Repo `pchroonic/pchroonic`, default `main`.
- Current main: `a48a8acbf7d7ab98916d66d4e0ac0fc04f275e0c` (PR #79 docs sync).
- Current live product release: PR #78 Privacy Centre / UK GDPR operations; product merge `3b56a12620c754853f3d5145c3daa277caa07c70`.
- Supabase production `qjigldxjcpnrlyxgmlqq`.
- Window Cleaning only live.
- Stripe commercial customer payment policy OFF. Do not enable payments in this release.
- Ask Namdar provider AI OFF (`aiEnabled:false`).
- Privileged Staff/Admin requires CAPTCHA + AAL2/TOTP MFA.

# Booking cancellation / deposit policy — IMPLEMENTED ON BRANCH

Branch: `feature/cancellation-deposit-policy-20260915`
Version: `6.4.34-cancellation-policy-1`
Policy version: `2026-09-15-v1`
Cancellation window: 48 hours.

## Owner-approved policy model
The user approved this customer policy:
- >48 hours before appointment: booking deposit normally refunded or transferred to a replacement appointment;
- within 48 hours, no-show or failure to provide agreed access: Namdar may retain some/all of the deposit only to cover reasonable direct loss actually caused by the cancellation, after considering savings and whether the appointment can be refilled;
- no blanket “non-refundable in all circumstances” term;
- if Namdar cancels and no replacement date is agreed, refund payments for the unprovided service;
- statutory consumer rights remain unaffected.

This matches the fairness approach in current CMA/GOV.UK consumer guidance: cancellation charges/upfront-payment retention must be fair, transparent and proportionate to genuine loss. The Terms also preserve the separate statutory cancellation rules for qualifying distance/off-premises service contracts.

## New migration
Repo file:
- `supabase/migrations/20260915104500_booking_cancellation_policy.sql`

Schema changes to `bookings` (safe additive columns):
- `terms_version integer`
- `booking_policy_version text`
- `booking_policy_accepted_at timestamptz`
- `early_service_requested_at timestamptz`
- `early_service_acknowledged boolean not null default false`
- `cancellation_window_hours integer`
- `booking_policy_snapshot jsonb`

The snapshot contains policy metadata only, not extra customer PII.

The same migration publishes Terms & Conditions v2 covering:
- guide estimate vs final quote;
- quote acceptance vs appointment request/confirmation;
- deposits and payment;
- fair 48-hour customer cancellation rule;
- no-show/no-access treatment using the same reasonable-loss test;
- Namdar cancellation/refund;
- 14-day statutory cancellation period for qualifying online/off-premises service contracts;
- express service-start request and consequences of performance during that period;
- cancellation method/model wording;
- access, safety and weather;
- scope changes;
- reasonable care and skill / complaints;
- version accepted for a booking is recorded and later updates do not silently rewrite it.

## Customer UI
New `account-booking-policy.js` loaded after `account-booking-journey.js` via `account.js`.
New `booking-policy.css`.

Appointment request modal now displays:
- concise 48-hour policy;
- statutory-rights statement;
- link to `/terms`;
- required checkbox accepting Terms/cancellation/deposit policy;
- required explicit request/acknowledgement for service to proceed on the agreed date if it falls within an applicable statutory cancellation period.

The module replaces the existing appointment-submit handler so the request body carries:
- `bookingPolicyAccepted:true`
- `bookingPolicyVersion:'2026-09-15-v1'`
- `earlyServiceRequested:true`

It also augments the existing cancellation dialog with the policy summary. It does not auto-forfeit or auto-refund money.

## Booking API enforcement
`api/booking-core.js` now:
- requires explicit boolean policy acceptance;
- requires explicit boolean early-service request/acknowledgement;
- rejects stale browser policy versions so cached clients must refresh after a future policy update;
- loads the current published Terms version server-side;
- stores the current Terms version, policy version, timestamps, 48-hour value and policy snapshot in the booking row;
- adds Terms/cancellation information to the booking-request acknowledgement email.

This means a direct API caller cannot bypass the customer-facing checkboxes.

## Online payment safeguard
`api/create-checkout.js` now rejects future Stripe checkout unless the booking has:
- `booking_policy_accepted_at`;
- `booking_policy_version`;
- `early_service_acknowledged=true`.

This is only a readiness safeguard. Stripe commercial customer payments remain OFF and no payment-policy mode/deposit percentage was changed.

## Privacy/export
`api/customer-data-export.js` now includes booking policy acceptance metadata/snapshot in the signed-in customer's self-service data copy. No additional customer secret/provider data is exposed.

## Regression coverage
New `scripts/booking-cancellation-policy.test.mjs` verifies:
- Terms v2 contains fair 48-hour/actual-loss/statutory-rights wording;
- all policy-evidence schema fields exist;
- booking UI requires both acknowledgements;
- booking API rejects bypass and stores server-side versions/evidence;
- future Stripe checkout is policy-gated;
- account loader version/module.

`.github/workflows/ai-handoff-check.yml` syntax-checks `account-booking-policy.js` and runs this test.

## Release gate
Before merge:
1. all three continuity docs current;
2. exact-head CI SUCCESS;
3. exact-head Vercel preview READY + errors-only build clean;
4. apply production migration only after exact code is green;
5. verify new booking columns and published Terms v2;
6. merge exact tested head;
7. production deployment READY + clean build;
8. `/api/health` 200;
9. live `account.js` version `6.4.34-cancellation-policy-1` and `account-booking-policy.js` / `booking-policy.css` HTTP 200;
10. Terms endpoint version 2;
11. unauthenticated booking/payment APIs remain protected.

Do not create a real booking, customer cancellation, deposit, refund or payment just for deployment verification.

# Privacy Centre / UK GDPR — LIVE
PR #78 / version `6.4.33-privacy-centre-1` remains live. Owner postponed publication of the sole-trader/controller legal name and postal address. ICO data-protection fee self-assessment and Supabase Leaked Password Protection remain open manual work.

## Stable systems that must not regress
- Customer booking journey v6.4.32 remains the base journey.
- Staff My Jobs auth recovery remains live and user-confirmed.
- Security Hardening remains live.
- Account Supabase JS stays pinned to 2.116.0.
- Window Cleaning only live.
- Stripe customer payment policy OFF.
- Business Finance/Smart Receipts private and sole-trader-first.
