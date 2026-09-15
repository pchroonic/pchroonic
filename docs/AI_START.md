# Namdar AI fast resume

Last verified: 2026-09-15 UTC

Read this first. Use `docs/AI_HANDOFF.md` for implementation detail and `docs/PROJECT_STATUS.md` for roadmap/status.

## Production source of truth
- Repo `pchroonic/pchroonic`, default `main`.
- Current main: `a48a8acbf7d7ab98916d66d4e0ac0fc04f275e0c` (PR #79 docs sync).
- Current live product release: PR #78 Privacy Centre / UK GDPR operations, product merge `3b56a12620c754853f3d5145c3daa277caa07c70`.
- Production Vercel is healthy on `namdar.co.uk`.
- Window Cleaning is the only live/quotable/bookable service.
- Stripe commercial customer payment policy remains OFF; do not enable it as part of cancellation-policy work.
- Ask Namdar provider AI remains disabled (`aiEnabled:false`).
- Privileged Staff/Admin requires CAPTCHA + AAL2/TOTP MFA.

## Booking cancellation / deposit policy — IMPLEMENTED ON BRANCH, NOT LIVE YET
Branch: `feature/cancellation-deposit-policy-20260915`
Release version: `6.4.34-cancellation-policy-1`
Policy version: `2026-09-15-v1`

User approved the fair-policy model:
- more than 48 hours before appointment: deposit normally refundable or transferable;
- within 48 hours, no-show, or failure to provide agreed access: Namdar may retain some/all of a deposit only to cover reasonable direct loss, taking account of savings and whether the slot can be refilled;
- if Namdar cancels and no replacement appointment is agreed: refund payments for the unprovided service;
- statutory consumer rights remain unaffected.

### Terms / evidence
New migration `supabase/migrations/20260915104500_booking_cancellation_policy.sql`:
- upgrades Terms & Conditions to version 2 with final-quote/booking formation, deposit/cancellation, 48-hour rule, Namdar cancellation, statutory 14-day distance/off-premises service cancellation wording, access/safety/weather, scope changes and complaints;
- adds booking evidence fields for terms version, booking-policy version/time, early-service request/acknowledgement, cancellation window and non-PII policy snapshot.

### Customer booking UI
New `account-booking-policy.js` + `booking-policy.css`:
- displayed in the appointment-request dialog before submission;
- shows the fair 48-hour deposit/cancellation summary and links to full Terms;
- requires explicit acceptance of Terms/cancellation policy;
- separately records an express request to provide service on the agreed date if it falls within an applicable statutory cancellation period, with acknowledgement of the consequence of full performance;
- cancellation dialog also shows the 48-hour policy summary.

### Server safeguards
`api/booking-core.js`:
- rejects bypassed appointment requests unless both acknowledgements are explicit booleans;
- rejects stale policy versions;
- reads current published Terms version server-side rather than trusting the browser;
- writes the acceptance evidence and non-PII policy snapshot to the booking;
- booking acknowledgement email links to Terms and states the 48-hour policy/statutory-rights separation.

`api/create-checkout.js`:
- future Stripe checkout is blocked for a booking lacking policy/early-service acceptance evidence.
- Stripe customer payments remain OFF in this release.

`api/customer-data-export.js` includes the booking policy acceptance evidence in the authenticated customer data copy.

### Verification / release gate
- CI syntax checks the new account module and runs `scripts/booking-cancellation-policy.test.mjs`.
- Before merge: update all three continuity docs, exact-head CI SUCCESS, exact-head Vercel preview READY/clean, then apply the safe production migration, verify Terms v2/columns, and merge only the exact tested head.
- After merge: production READY, `/api/health` 200, live `account.js` version `6.4.34-cancellation-policy-1`, new policy assets HTTP 200, Terms version 2, and safe API behavior.
- Do not create a real booking or real payment merely to test this release.

## Privacy Centre / UK GDPR — LIVE
Version `6.4.33-privacy-centre-1` remains live. Controller formal legal name/public correspondence address is deliberately postponed by the owner. ICO fee self-assessment and Supabase Leaked Password Protection remain open manual items.

## Stable invariants
- Customer booking journey v6.4.32 behavior remains underneath the new booking-policy layer.
- Security Hardening and Staff My Jobs auth recovery remain live.
- Business Finance remains private/sole-trader-first; Smart Receipts remain private/review-first.
- Customer payment policy stays OFF until a separate deliberate live-payment decision.
