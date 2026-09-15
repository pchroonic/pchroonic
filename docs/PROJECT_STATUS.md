# Namdar project status

Last updated: 2026-09-15 UTC

## Production baseline
- Repo `pchroonic/pchroonic`, default `main`.
- Current product main: `0027693a4be536752d1a189d42c2622c33d9d9ec` (PR #80).
- Production deployment `dpl_FLKBbTxKKqf6nWW3HrVNPGWpgxKP` is READY on `namdar.co.uk`; build clean and `/api/health` HTTP 200.
- Supabase production: `qjigldxjcpnrlyxgmlqq`.
- Window Cleaning only live.
- Privileged Staff/Admin requires CAPTCHA + AAL2/TOTP MFA.
- Stripe customer payment policy OFF; no commercial deposit amount/mode enabled.
- Ask Namdar provider AI disabled (`aiEnabled:false`).

## Booking cancellation / deposit policy — LIVE
PR #80.
Version: `6.4.34-cancellation-policy-1`.
Policy version: `2026-09-15-v1`.

### Approved customer rule
- More than 48 hours before appointment: deposit normally refundable or transferable.
- Within 48 hours, no-show or no agreed access: Namdar may retain some/all only to cover reasonable direct loss, accounting for savings and whether the slot can be filled.
- No blanket non-refundable term.
- Namdar cancellation with no replacement date: refund payments for the unprovided service.
- Statutory consumer rights remain unaffected.

### Release evidence
- Exact tested head: `a2bd36aac340438373f8b432c758f9f48fcbf8b8`.
- GitHub CI `34959940870`: SUCCESS.
- Exact preview `dpl_67P6wFeT4Ca624QKXgzCS6gVYqoS`: READY, clean errors-only build.
- Production migration `booking_cancellation_policy`: applied successfully.
- Product merge: `0027693a4be536752d1a189d42c2622c33d9d9ec`.
- Production deployment `dpl_FLKBbTxKKqf6nWW3HrVNPGWpgxKP`: READY, clean errors-only build.

### Terms and booking evidence
Migration `20260915104500_booking_cancellation_policy.sql` added booking Terms/policy version, acceptance timestamps, express service-start request/acknowledgement, cancellation window and non-PII policy snapshot.

Terms & Conditions v2 are live and verified with:
- fair 48-hour cancellation/deposit rule;
- reasonable-loss/rebooking language;
- Namdar-cancellation refund wording;
- separate statutory 14-day cancellation section;
- access/safety/weather, scope and complaints provisions.

### Customer booking experience
`account-booking-policy.js` + `booking-policy.css` are live.
- policy shown before appointment request;
- explicit Terms/cancellation acceptance required;
- separate statutory early-service request/acknowledgement required;
- same policy summary shown in cancellation management.

`api/booking-core.js` enforces the acknowledgements and current version server-side and records the evidence on the booking.

`api/create-checkout.js` blocks future Stripe checkout when booking policy evidence is absent. Payments remain OFF and no deposit percentage/minimum/mode was selected in this release.

Customer privacy export includes booking policy acceptance metadata.

### Production verification
- health 200;
- account loader v6.4.34 live;
- policy JS/CSS assets 200;
- Terms endpoint returns version 2;
- safe GET checks on booking/checkout APIs return 405 without mutation;
- deployment testing created no real booking, cancellation, deposit, refund or payment;
- one existing booking remains and zero bookings have new-policy acceptance from release testing;
- payment records remain the existing 4 sandbox rows;
- booking change requests remain 0.

Only the known Node `url.parse()` deprecation warning appeared in the runtime error-level check; cleanup remains tech debt.

## Privacy Centre / UK GDPR operations — LIVE
Version `6.4.33-privacy-centre-1`, PR #78.
- Privacy/Cookie v2 live.
- My Namdar Privacy & data and Admin Privacy & GDPR live.
- Controller legal name/public postal address publication postponed by owner.
- ICO fee self-assessment and Supabase Leaked Password Protection remain open manual items.

## Customer booking journey — LIVE
- v6.4.32 coverage-first quote-to-booking flow remains the base journey under the new v6.4.34 policy layer.
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
- Decide commercial deposit percentage/minimum, whether deposit is required, and whether pay-in-full remains available.
- Configure/verify live Stripe only after that deliberate policy decision.
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
