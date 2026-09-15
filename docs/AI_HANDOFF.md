# Namdar AI handoff

Last verified: 2026-09-15 UTC

Read `docs/AI_START.md` first.

## Production baseline
- Repo `pchroonic/pchroonic`, default `main`.
- Current product main: `0027693a4be536752d1a189d42c2622c33d9d9ec` (PR #80).
- Supabase production `qjigldxjcpnrlyxgmlqq`.
- Vercel project `prj_4fILo0pCaLGUSUIMWrBIVGzeWVDC`, team `team_8Az8WtWcnfwtYRdhR8vGqC3L`.
- Window Cleaning only live.
- Stripe commercial customer payment policy OFF. No commercial deposit percentage/minimum/payment mode is enabled.
- Ask Namdar provider AI OFF (`aiEnabled:false`).
- Privileged Staff/Admin requires CAPTCHA + AAL2/TOTP MFA.

# Booking cancellation / deposit policy — LIVE

PR #80 `Add fair 48-hour cancellation and deposit policy`.
Version: `6.4.34-cancellation-policy-1`.
Policy version: `2026-09-15-v1`.
Cancellation window: 48 hours.

## Release evidence
- Exact tested PR head: `a2bd36aac340438373f8b432c758f9f48fcbf8b8`.
- GitHub CI run `34959940870`: SUCCESS.
- Exact Vercel preview: `dpl_67P6wFeT4Ca624QKXgzCS6gVYqoS`, READY, clean errors-only build.
- Production migration `booking_cancellation_policy` applied successfully before merge.
- Product merge/main: `0027693a4be536752d1a189d42c2622c33d9d9ec`.
- Production deployment: `dpl_FLKBbTxKKqf6nWW3HrVNPGWpgxKP`, READY on `namdar.co.uk`, clean errors-only build.
- Production `/api/health`: HTTP 200 after release.

## Owner-approved policy model
- >48 hours before appointment: booking deposit normally refunded or transferred to a replacement appointment.
- Within 48 hours, no-show or failure to provide agreed access: Namdar may retain some/all only to cover reasonable direct loss caused by the cancellation, after considering savings and whether the appointment can be refilled.
- No blanket “non-refundable in all circumstances” term.
- If Namdar cancels and no replacement date is agreed, payments for the unprovided service are refunded.
- Statutory consumer rights remain unaffected.

The policy intentionally separates the contractual 48-hour rule from statutory cancellation rights for qualifying distance/off-premises service contracts.

## Production database / Terms
Migration repo file:
- `supabase/migrations/20260915104500_booking_cancellation_policy.sql`

Production migration name:
- `booking_cancellation_policy`

Safe additive fields now on `bookings`:
- `terms_version integer`
- `booking_policy_version text`
- `booking_policy_accepted_at timestamptz`
- `early_service_requested_at timestamptz`
- `early_service_acknowledged boolean not null default false`
- `cancellation_window_hours integer`
- `booking_policy_snapshot jsonb`

The snapshot contains policy metadata, not additional customer PII.

Production Terms & Conditions are version 2, published, and were verified to contain:
- guide estimate vs final quote;
- quote acceptance vs appointment request/confirmation;
- deposit/payment wording;
- fair 48-hour customer cancellation rule;
- no-show/no-access treatment under the same reasonable-loss test;
- Namdar cancellation/refund;
- 14-day statutory cancellation section for qualifying online/off-premises services;
- express service-start request / full-performance consequence wording;
- cancellation method/example statement;
- access, safety and weather;
- scope changes;
- reasonable care and skill / complaints;
- booking-specific terms versioning.

## Customer UI
`account.js` now loads `account-booking-policy.js` at v`6.4.34-cancellation-policy-1`; Supabase JS remains pinned to `2.116.0`.

`account-booking-policy.js` + `booking-policy.css`:
- shows concise 48-hour policy before appointment request submission;
- links `/terms`;
- requires explicit Terms/cancellation/deposit acceptance;
- separately records an express request/acknowledgement for service on the agreed date if it falls within an applicable statutory cancellation period;
- augments the existing cancellation panel with the same policy summary;
- does not auto-forfeit or auto-refund money.

## Booking API enforcement
`api/booking-core.js`:
- requires explicit boolean policy acceptance;
- requires explicit boolean early-service request/acknowledgement;
- rejects stale policy versions;
- reads the current published Terms version server-side rather than trusting the browser;
- stores Terms version, policy version, timestamps, 48-hour value and non-PII snapshot;
- includes the policy link/summary in the booking-request acknowledgement email.

Direct API callers therefore cannot bypass the browser checkboxes.

## Future online-payment safeguard
`api/create-checkout.js` rejects checkout unless the booking has:
- `booking_policy_accepted_at`;
- `booking_policy_version`;
- `early_service_acknowledged=true`.

This is readiness only. Commercial Stripe payments remain OFF, and this release did not select or change a deposit percentage, minimum deposit, payment mode, or live Stripe credentials.

## Privacy / export
`api/customer-data-export.js` includes booking policy acceptance metadata/snapshot in the signed-in customer's self-service account data copy.

## Regression / deployment verification
`scripts/booking-cancellation-policy.test.mjs` verifies Terms wording, schema fields, UI acknowledgements, server-side enforcement/versioning, payment gate and loader version.

Two initial CI failures were only stale regression expectations for the account loader version in existing customer-booking/privacy tests. They were updated while preserving their original behavioral assertions. Final exact-head CI passed.

Live checks after merge:
- `/api/health` 200;
- `/account.js` v6.4.34 + `account-booking-policy.js`;
- `/account-booking-policy.js` 200;
- `/booking-policy.css` 200;
- `/api/legal?slug=terms` version 2 with 48-hour and statutory sections;
- unauthenticated GET `/api/booking` -> 405;
- unauthenticated GET `/api/create-checkout` -> 405;
- no mutation from these checks;
- booking count remains 1 existing record and `bookings_with_new_policy=0` after deployment testing;
- payment records remain the pre-existing 4 sandbox rows;
- booking change requests remain 0.

No real booking, cancellation, deposit, refund or payment was created during release verification.

Runtime error-level query showed only the known Node `url.parse()` deprecation warning on `/api/legal`; this remains tech debt and is not a new release failure.

# Privacy Centre / UK GDPR — LIVE
PR #78 / version `6.4.33-privacy-centre-1` remains live. Owner postponed publication of the sole-trader/controller legal name and postal address. ICO data-protection fee self-assessment and Supabase Leaked Password Protection remain open manual work.

## Stable systems / next step
- Customer booking journey v6.4.32 remains the base beneath v6.4.34.
- Staff My Jobs auth recovery remains live and user-confirmed.
- Security Hardening remains live.
- Window Cleaning only live.
- Business Finance/Smart Receipts private and sole-trader-first.
- Stripe customer payment policy OFF.
- Next commercial payment step must be a separate deliberate decision: choose deposit percentage/minimum, required-vs-optional policy and pay-in-full availability, then configure/verify live Stripe. Do not infer those choices from this policy release.
