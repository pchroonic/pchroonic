# Namdar project status

Last updated: 2026-09-15 UTC

## Production baseline
- Repo `pchroonic/pchroonic`, default `main`.
- Current live product merge: `3e41cb5837d6394688d1ab5dbef11d9bdf8e5781` (PR #86).
- Current Admin release: v`6.4.37-admin-website-crash-fix-1`; customer loader remains v`6.4.35-payment-policy-engine-1`.
- PR #86 product production deployment `dpl_2GimgSuA1zSDxiLvtA6BGNNPSEjD`, READY and aliased to `namdar.co.uk`.
- Production health HTTP 200 / `ok:true` verified at `2026-09-15T13:39:34.064Z`.
- Supabase production: `qjigldxjcpnrlyxgmlqq`.
- Window Cleaning only live.
- Privileged Staff/Admin requires CAPTCHA + AAL2/TOTP MFA.
- Stripe customer payment policy OFF; production has `0` `site_settings.payments` rows and no commercial deposit bands have been approved/enabled.
- Ask Namdar provider AI disabled (`aiEnabled:false`).

## Admin Website & legal crash fix — LIVE
The Admin logo-upload release exposed a Website & legal regression. Legacy `websiteTools()` wrote to `#settingReviewUrl`, but current `admin.html` did not contain that field, causing `Cannot set properties of null (setting 'value')`. The MFA wrapper also caught that later dashboard exception and misleadingly labeled it as a two-step-verification failure.

PR #86 fixed both failure boundaries:
- `admin-brand-assets.js` creates the missing **Public review URL** control before legacy website settings load, preserving the existing review-setting save path;
- `admin-mfa-guard.js` separates MFA/session failures from ordinary post-MFA dashboard initialization failures;
- `admin.js` is v`6.4.37-admin-website-crash-fix-1` for cache invalidation;
- `scripts/brand-logo.test.mjs` covers the missing-control and error-label regressions.

Release evidence:
- exact tested head `370ec326f5d5d462de34a4140f667d7d25acba81`
- CI run `34976265435` SUCCESS
- exact preview `dpl_4SaDLWtHnfrmDr7QwoCcjZQXaDrW` READY and clean
- merge/main `3e41cb5837d6394688d1ab5dbef11d9bdf8e5781`
- production product deployment `dpl_2GimgSuA1zSDxiLvtA6BGNNPSEjD` READY and clean
- `/api/health` HTTP 200 / `ok:true` at `2026-09-15T13:39:34.064Z`
- live `admin.js` serves `6.4.37-admin-website-crash-fix-1`
- live `admin-brand-assets.js` includes the pre-load `ensureReviewUrlField()` repair
- live `admin-mfa-guard.js` includes the separate dashboard-load failure message
- release-deployment error/fatal runtime scan returned no matching logs.

There was no database migration or environment-variable change. MFA remains required. Stripe remains OFF. No real logo/customer/booking/payment data was created for verification.

## Admin logo upload — LIVE
PR #84 introduced the secure upload capability; PR #86 fixes the Website-tab crash discovered during use. Current Admin is v`6.4.37-admin-website-crash-fix-1`.

Original logo-upload release evidence:
- exact tested head `9995e8e2a199beee24cabe4d24175f82bd293398`
- CI run `34973739008` SUCCESS
- exact preview `dpl_Dvu9ctLyXRB16qrH1Q1wJXr8c7KF` READY and clean
- Supabase migration `20260915130427` / `brand_assets_logo_upload` applied successfully
- original merge/main `f2e7eedb4a795242dfacd350f0704b85e4e67885`
- original product production deployment `dpl_DYJtSFFYZeH8xAK1mX4WgNRDULZb` READY and clean; later releases supersede it
- GET `/api/admin-brand-logo` fails closed with HTTP 405; real upload is POST-only and Staff/Admin protected
- no logo was uploaded as release test data and no customer/payment data was created.

Live behavior:
- Website & legal keeps the existing Logo URL field and has **Upload logo**;
- Admin can select PNG/JPG/WebP/AVIF up to 2 MB and preview it before upload;
- a successful upload automatically fills the Logo URL field with the permanent public Storage URL;
- **Save website settings** remains the explicit publish step, so upload alone does not silently change the public brand setting;
- server upload requires `settings` permission and AAL2/TOTP MFA;
- actual file signatures are validated server-side, so renamed HTML/SVG/arbitrary files are rejected;
- upload is audit logged;
- brand files use a dedicated public `brand-assets` Supabase Storage bucket instead of widening existing job/customer file permissions;
- the bucket is capped at 2 MB and accepts JPEG/PNG/WebP/AVIF only;
- no direct browser Storage upload policy exists; the server endpoint performs the write only after authorization;
- the Website settings loader now self-heals the previously missing Public review URL control before reading settings.

This feature did not activate Stripe. Production still has `0` `site_settings` rows with key `payments`.

## Flexible Payment & Deposit Policy Engine — LIVE
PR #82 / customer v`6.4.35-payment-policy-engine-1`; its modules remain loaded under the newer Admin release.

Release evidence:
- exact tested head `54e480a00e93bb780e687d0f59a0f14a2aa3bc29`
- CI run `34965887792` SUCCESS
- exact preview `dpl_uUHG5oQaiP6gTiV3sFXoxwRisM3F` READY and clean
- migration `flexible_payment_policy_engine` applied successfully
- merge/main `ab1d95930816f3116828e410bf07e6208e93216f`
- product production deployment `dpl_GvU42X4GGN3mGRojFJTcvRBZfsV4` READY and clean
- account/admin payment-policy modules verified live
- Terms v3 verified live
- no real booking/deposit/payment/late fee/refund created for release verification.

### Live capabilities
- Revisioned flat or job-value-tiered deposit policies.
- Higher-value jobs can be configured for higher percentage/minimum deposits.
- Continuous/non-decreasing tier validation.
- Frozen booking-specific payment policy revision, snapshot and deposit amount.
- Future Admin policy changes do not rewrite an earlier booking’s terms.
- Configurable balance due timing after job end (0–168 hours).
- Configurable overdue reminders, future-booking hold and recovery-review thresholds.
- Exact-money deposit/full-payment check before a required-payment booking can be confirmed.
- Completed/due invoices can request the full outstanding balance.
- Customer billing surfaces show frozen terms and overdue state without exposing processor-private fields.
- Customer data export contains safe payment-policy evidence.

### Legacy/non-retroactivity protection
New Admin-created Window appointments snapshot the current policy at creation. True legacy bookings with no payment-policy snapshot are not later forced into a newly enabled deposit requirement merely because Admin confirms them after the policy changes.

### Consumer / B2B safeguards
- Consumer invoice amounts are never automatically increased for lateness by this engine.
- No automatic consumer penalty, compounding fee or interest.
- Consumer escalation is reminders, possible new-booking hold, then manual recovery review.
- B2B statutory interest/recovery calculation is preview/manual only and is never automatically posted.
- Explicit business-customer classification is still required before any future automated commercial-debt workflow.

### Production database / Terms
Migration `20260915111500_flexible_payment_policy_engine.sql` is applied.

Bookings now have:
- payment policy revision
- lock timestamp
- payment-policy snapshot
- frozen deposit amount.

Invoices now have:
- payment policy revision/snapshot
- frozen deposit amount
- balance-due hours
- overdue booking-hold days
- overdue final-review days.

Published Terms are v3 and include `Payment due dates and overdue balances`, preserving non-retroactivity and consumer fairness.

### Commercial invariants
- Customer Stripe payments remain OFF.
- Production has `0` `site_settings` rows with key `payments`.
- Fallback 20% / £10 values are inactive code defaults only, not an approved commercial policy.
- Window Cleaning remains the only live payment-capable service.

## Booking cancellation / deposit policy — LIVE
The earlier fair 48-hour policy remains live and is incorporated into the current v3 Terms:
- >48h deposit normally refundable/transferable;
- <48h, no-show/no access: retention only for reasonable direct loss after savings/rebooking are considered;
- Namdar cancellation/no replacement: refund unprovided service payments;
- statutory consumer rights unaffected;
- booking acceptance evidence recorded.

## Privacy Centre / UK GDPR — LIVE
- Privacy/Cookie and My Namdar/Admin privacy centres live.
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

## Known technical debt / open roadmap
- Owner can now retry Admin → Website & legal → **Choose file** → **Upload logo** → **Save website settings**.
- Owner later chooses actual commercial deposit bands/amounts and whether/when to activate Stripe.
- Build explicit business-customer classification before any automated B2B statutory-debt workflow.
- ICO data-protection fee self-assessment.
- Supabase Leaked Password Protection.
- Google review-request URL.
- Window real-job pricing calibration.
- SMS/legal checks.
- Node `url.parse()` deprecation cleanup.
- Address-data pilot remains parked.
