# Namdar AI fast resume

Last verified: 2026-09-15 UTC

Read this first. Use `docs/AI_HANDOFF.md` for implementation detail and `docs/PROJECT_STATUS.md` for roadmap/status.

## Production source of truth
- Repo `pchroonic/pchroonic`, default `main`.
- Current product main: `0027693a4be536752d1a189d42c2622c33d9d9ec` (PR #80).
- Current live customer release: booking cancellation / deposit policy v`6.4.34-cancellation-policy-1`.
- Production deployment `dpl_FLKBbTxKKqf6nWW3HrVNPGWpgxKP` is READY on `namdar.co.uk`; errors-only build is clean and `/api/health` returned HTTP 200 after release.
- Window Cleaning is the only live/quotable/bookable service.
- Stripe commercial customer payment policy remains OFF; no deposit percentage/minimum/payment mode has been commercially approved or enabled by this release.
- Ask Namdar provider AI remains disabled (`aiEnabled:false`).
- Privileged Staff/Admin requires CAPTCHA + AAL2/TOTP MFA.

## Booking cancellation / deposit policy — LIVE
PR #80 `Add fair 48-hour cancellation and deposit policy`.
Release version: `6.4.34-cancellation-policy-1`.
Policy version: `2026-09-15-v1`.
Exact tested PR head: `a2bd36aac340438373f8b432c758f9f48fcbf8b8`.
GitHub CI run `34959940870`: SUCCESS.
Exact preview `dpl_67P6wFeT4Ca624QKXgzCS6gVYqoS`: READY, clean errors-only build.
Product merge: `0027693a4be536752d1a189d42c2622c33d9d9ec`.
Production deployment: `dpl_FLKBbTxKKqf6nWW3HrVNPGWpgxKP`: READY, clean errors-only build.

Owner-approved customer rule:
- more than 48 hours before appointment: deposit normally refundable or transferable;
- within 48 hours, no-show, or failure to provide agreed access: Namdar may retain some/all only to cover reasonable direct loss, taking account of savings and whether the slot can be refilled;
- if Namdar cancels and no replacement appointment is agreed: refund payments for the unprovided service;
- statutory consumer rights remain unaffected;
- no blanket “all deposits are non-refundable” term.

### Production database / Terms
Migration `booking_cancellation_policy`, repo file `supabase/migrations/20260915104500_booking_cancellation_policy.sql`, is applied in production.
It safely added booking evidence fields for:
- Terms version;
- booking-policy version and acceptance timestamp;
- express early-service request/acknowledgement;
- 48-hour cancellation window;
- non-PII policy snapshot.

Production Terms & Conditions are published at version 2 and were verified to contain both the 48-hour policy and the statutory 14-day cancellation section.

### Customer / server behavior
- `account.js` live version is `6.4.34-cancellation-policy-1` and loads `account-booking-policy.js`.
- Appointment request shows the cancellation/deposit summary and links full Terms.
- Customer must explicitly accept Terms/cancellation policy and separately make the applicable early-service request/acknowledgement before submitting an appointment request.
- Booking API rejects bypassed/stale policy submissions and records the current server-side Terms/policy version with the booking.
- Future Stripe checkout is blocked if the booking lacks policy evidence.
- Customer data export includes booking policy acceptance evidence.
- Cancellation dialog shows the same 48-hour summary.

### Release verification
Verified live:
- `/api/health` HTTP 200;
- `/account.js` contains v6.4.34 and policy module;
- `/account-booking-policy.js` HTTP 200 with expected policy text;
- `/booking-policy.css` HTTP 200;
- `/api/legal?slug=terms` version 2 with 48-hour + 14-day sections;
- unauthenticated GET `/api/booking` and `/api/create-checkout` return 405 without mutation;
- production remains at one existing booking, with zero bookings carrying new-policy acceptance evidence from deployment testing;
- payment record count remains the existing 4 sandbox records;
- booking change requests remain 0.
No real booking, cancellation, deposit, refund or payment was created for release verification.

Runtime check showed only the pre-existing Node `url.parse()` deprecation warning on `/api/legal`; no new product error was identified. `url.parse()` cleanup remains tech debt.

## Privacy Centre / UK GDPR — LIVE
Version `6.4.33-privacy-centre-1` remains live. Controller formal legal name/public correspondence address publication is postponed by the owner. ICO fee self-assessment and Supabase Leaked Password Protection remain open manual items.

## Stable invariants / next commercial decision
- Customer booking journey v6.4.32 remains underneath the v6.4.34 policy layer.
- Security Hardening and Staff My Jobs auth recovery remain live.
- Business Finance remains private/sole-trader-first; Smart Receipts remain private/review-first.
- Customer payment policy remains OFF.
- Next payment work should deliberately choose deposit percentage/minimum, whether pay-in-full remains available, and then separately prepare/verify live Stripe rollout. Do not infer those decisions from the presence of the cancellation policy.
