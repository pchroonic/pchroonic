# Namdar project status

Last updated: 2026-09-15 UTC

## Production baseline
- Repo `pchroonic/pchroonic`, default `main`.
- Current main: `a48a8acbf7d7ab98916d66d4e0ac0fc04f275e0c` (PR #79 docs sync).
- Current live product release: PR #78 Privacy Centre / UK GDPR operations; product merge `3b56a12620c754853f3d5145c3daa277caa07c70`.
- Production is healthy on `namdar.co.uk`.
- Supabase production: `qjigldxjcpnrlyxgmlqq`.
- Window Cleaning only live.
- Privileged Staff/Admin requires CAPTCHA + AAL2/TOTP MFA.
- Stripe customer payment policy OFF.
- Ask Namdar provider AI disabled (`aiEnabled:false`).

## Booking cancellation / deposit policy — RELEASE CANDIDATE
Branch: `feature/cancellation-deposit-policy-20260915`
Version: `6.4.34-cancellation-policy-1`
Policy version: `2026-09-15-v1`

### Approved commercial rule
- More than 48 hours before appointment: deposit normally refundable or transferable.
- Within 48 hours, no-show or no agreed access: Namdar may retain some/all only to cover reasonable direct loss, accounting for savings and whether the slot can be filled.
- No blanket non-refundable term.
- Namdar cancellation with no replacement date: refund payments for the unprovided service.
- Statutory consumer rights remain unaffected.

### Terms and booking evidence
New migration `20260915104500_booking_cancellation_policy.sql`:
- adds booking terms/policy version and acceptance timestamps;
- records express service-start request/acknowledgement for any appointment falling within an applicable statutory cancellation period;
- stores cancellation window and a non-PII policy snapshot;
- publishes Terms & Conditions v2 with 48-hour cancellation/deposit terms, 14-day statutory cancellation wording, access/safety/weather and complaints provisions.

### Customer booking experience
New `account-booking-policy.js` + `booking-policy.css`:
- show policy before appointment submission;
- require Terms/cancellation acceptance;
- require explicit statutory early-service request/acknowledgement;
- show cancellation-policy summary in Manage appointment.

`api/booking-core.js` enforces these acknowledgements server-side, reads the current Terms version, records acceptance evidence and includes the policy link/summary in the booking acknowledgement email.

`api/create-checkout.js` blocks future Stripe checkout if a booking has no policy evidence. Payments remain OFF and no deposit percentage/mode was changed.

Customer privacy export now includes booking policy acceptance metadata.

### Release gate status
Pending:
- open PR;
- exact-head GitHub CI SUCCESS;
- exact-head Vercel preview READY + clean errors-only build;
- production migration apply and schema/Terms v2 verification;
- exact-head merge;
- production health/assets/API verification.

Do not create a real booking, cancellation, deposit, refund or payment as a deployment test.

## Privacy Centre / UK GDPR operations — LIVE
Version `6.4.33-privacy-centre-1`, PR #78.
- Privacy/Cookie v2 live.
- My Namdar Privacy & data and Admin Privacy & GDPR live.
- Controller legal name/public postal address publication postponed by owner.
- ICO fee self-assessment and Supabase Leaked Password Protection remain open manual items.

## Customer booking journey — LIVE
- v6.4.32 coverage-first quote-to-booking flow remains the base journey.
- Guest quote claim requires exact authenticated email match.
- My Namdar progress: Request → Final quote → Decision → Appointment.

## Security Hardening — LIVE
- private server-side rate limits with HMAC-hashed identities;
- secure invitations, no temporary passwords;
- owner-confirmed email changes;
- Admin lifecycle safeguards and inactivity sign-out;
- CAPTCHA + AAL2/TOTP MFA + CSP/security headers.

## Business / operations stable state
- sole-trader-first Business Finance live/private;
- Smart Receipts review-first/private;
- Newsletter Centre consent-aware/resumable;
- Ask Namdar Guided assistant live; provider AI off;
- customer support tickets customer-only/private;
- Stripe infrastructure exists but commercial customer payments remain OFF.

## Open roadmap
- Finish cancellation/deposit policy release gate.
- Later choose commercial deposit amount/payment mode and live Stripe rollout separately.
- Publish controller formal legal name/address when owner is ready.
- Complete ICO fee self-assessment.
- Enable/re-verify Supabase Leaked Password Protection.
- User-driven booking/privacy smoke tests when convenient.
- Google review-request URL.
- Window real-job pricing calibration.
- SMS/legal checks.
- Optional duplicate Supabase include cleanup.
- `url.parse()` deprecation cleanup.
- Address-data pilot remains parked.
