# Namdar AI fast resume

Last verified: 2026-09-15 UTC

Read this first. Use `docs/AI_HANDOFF.md` for implementation detail and `docs/PROJECT_STATUS.md` for roadmap/status.

## Production source of truth
- Repo `pchroonic/pchroonic`, default `main`.
- Current live product merge: `3e41cb5837d6394688d1ab5dbef11d9bdf8e5781` (PR #86, Admin Website crash fix).
- Current Admin release: v`6.4.37-admin-website-crash-fix-1`; customer loader remains v`6.4.35-payment-policy-engine-1`.
- PR #86 product production deployment: `dpl_2GimgSuA1zSDxiLvtA6BGNNPSEjD`, READY and aliased to `namdar.co.uk`.
- `/api/health` returned HTTP 200 / `ok:true` at `2026-09-15T13:39:34.064Z` on that product deployment.
- Window Cleaning is the only live/quotable/bookable service.
- Stripe commercial customer payment policy is OFF. Production has `0` `site_settings` rows with key `payments`. Do not infer a commercially approved deposit amount from fallback code values.
- Ask Namdar provider AI remains disabled (`aiEnabled:false`).
- Privileged Staff/Admin requires CAPTCHA + AAL2/TOTP MFA.

## Admin Website & legal crash fix — LIVE
Product PR: #86 `Fix Admin Website tab crash after logo file selection`.
Exact tested head: `370ec326f5d5d462de34a4140f667d7d25acba81`.
CI: GitHub run `34976265435` SUCCESS.
Exact-head preview: `dpl_4SaDLWtHnfrmDr7QwoCcjZQXaDrW`, READY; errors-only build log clean.
Merge/main: `3e41cb5837d6394688d1ab5dbef11d9bdf8e5781`.
Production product deployment: `dpl_2GimgSuA1zSDxiLvtA6BGNNPSEjD`, READY; errors-only build log clean.

Root cause:
- legacy `websiteTools()` writes to `#settingReviewUrl`, but current `admin.html` did not contain that control, causing `Cannot set properties of null (setting 'value')`;
- `admin-mfa-guard.js` caught the later dashboard exception in the same catch as the MFA gate, so the dashboard failure was incorrectly shown as `Two-step verification could not be completed`.

Live fix:
- `admin-brand-assets.js` ensures a **Public review URL** control exists before legacy website settings load, preserving the existing review-setting workflow and preventing the null `.value` crash;
- `admin-mfa-guard.js` now keeps real privileged-session/MFA failures under the MFA message while reporting later dashboard initialization errors separately as `Admin dashboard could not be loaded`;
- `admin.js` cache version is `6.4.37-admin-website-crash-fix-1` so browsers fetch the corrected modules;
- regression coverage verifies the missing-control repair, MFA/dashboard error boundary and current loader version.

### Production verification
- live `admin.js` HTTP 200 and serves `6.4.37-admin-website-crash-fix-1`;
- live `admin-brand-assets.js` HTTP 200 and contains `ensureReviewUrlField()` before the legacy Website settings loader;
- live `admin-mfa-guard.js` HTTP 200 and contains the separate `Admin dashboard could not be loaded` path;
- `/api/health` HTTP 200 / `ok:true` at `2026-09-15T13:39:34.064Z`;
- production error/fatal runtime scan for `dpl_2GimgSuA1zSDxiLvtA6BGNNPSEjD` returned no matching logs;
- no database migration or environment-variable change was needed;
- no logo, customer, booking, deposit, payment, late-fee or refund test data was created;
- commercial Stripe activation remains OFF and AAL2/TOTP remains required.

## Admin logo upload — LIVE
Product PR: #84 `Add secure Admin logo upload`.
Exact tested head: `9995e8e2a199beee24cabe4d24175f82bd293398`.
CI: GitHub run `34973739008` SUCCESS.
Exact-head preview: `dpl_Dvu9ctLyXRB16qrH1Q1wJXr8c7KF`, READY; errors-only build log clean.
Merge/main: `f2e7eedb4a795242dfacd350f0704b85e4e67885`.
Production product deployment: `dpl_DYJtSFFYZeH8xAK1mX4WgNRDULZb`, READY; later releases supersede it.

The Website & legal Admin tab keeps the existing Logo URL field and also provides a secure file-upload option:
- `admin-brand-assets.js` adds PNG/JPG/WebP/AVIF selection, a 2 MB client limit, local preview, upload status and automatic Logo URL fill;
- `api/admin-brand-logo.js` requires Staff/Admin `settings` permission plus the existing AAL2/TOTP gate before upload;
- `lib/brand-logo.js` verifies the actual file signature server-side instead of trusting the browser MIME type or filename;
- uploaded logos go to the dedicated public Supabase Storage bucket `brand-assets` under versioned `logos/...` paths;
- there is no direct browser Storage write policy for this bucket; the protected server endpoint performs the upload with the server credential only after authorization;
- upload does not silently publish the new brand image: Admin still clicks **Save website settings**, preserving the existing explicit settings workflow;
- upload is audit logged;
- CI syntax-checks the new files and runs `scripts/brand-logo.test.mjs`.

Supabase production migration `20260915130427` / `brand_assets_logo_upload` is applied. The `brand-assets` bucket is public only for serving website brand images, is capped at 2 MB, and allows JPEG/PNG/WebP/AVIF. Production verification confirmed `0` direct Storage policies referencing this bucket.

### Logo upload production state
- current live Admin loader is now v`6.4.37-admin-website-crash-fix-1`, which includes the PR #86 Website-tab repair while retaining `admin-brand-assets.js`;
- unauthenticated GET `/api/admin-brand-logo` returns HTTP 405 `Method not allowed`; uploads require POST through authenticated Admin;
- no logo was uploaded as release test data and the existing saved brand setting was not changed during release verification;
- commercial Stripe activation remains OFF.

## Flexible Payment & Deposit Policy Engine — LIVE
Product PR: #82 `Add flexible payment and deposit policy engine`.
Exact tested head: `54e480a00e93bb780e687d0f59a0f14a2aa3bc29`.
CI: GitHub run `34965887792` SUCCESS.
Exact-head preview: `dpl_uUHG5oQaiP6gTiV3sFXoxwRisM3F`, READY; errors-only build log clean.
Production migration: `flexible_payment_policy_engine` / repo file `20260915111500_flexible_payment_policy_engine.sql`, applied successfully to Supabase production `qjigldxjcpnrlyxgmlqq` before merge.
Merge/main: `ab1d95930816f3116828e410bf07e6208e93216f`.
Production product deployment: `dpl_GvU42X4GGN3mGRojFJTcvRBZfsV4`, READY; later releases are now current production.

### What is live
`lib/payment-policy.js` supports:
- revisioned policy settings;
- flat deposit % + minimum OR job-value-tiered bands;
- continuous-band validation and non-decreasing protection;
- configurable balance due timing from job end (0–168 hours);
- configurable overdue reminder days, booking-hold day and recovery-review day;
- frozen booking snapshots and exact locked deposit amounts;
- exact-money deposit enforcement;
- full outstanding-balance checkout after completion/due date;
- B2B statutory-interest/recovery preview only (`automatic:false`, `reviewRequired:true`).

Customer/Admin flow:
- accepted quotes expose the exact current payment commitment;
- My Namdar shows that commitment before appointment request and sends the policy revision;
- new bookings freeze the revision, policy snapshot and deposit shown at acceptance;
- Admin-created new Window appointments also freeze the current policy before later confirmation;
- true legacy bookings without a payment snapshot remain legacy and are not retroactively forced into a later deposit rule;
- checkout, invoice due timing and Admin confirmation use the frozen booking terms rather than a later Admin setting;
- actual money paid must satisfy the locked requirement before a required-payment booking can be confirmed;
- materially overdue prior balances can pause a new appointment only under that prior invoice's own recorded active policy.

### Consumer/B2B safeguards
- No automatic consumer late-payment penalty, compounding fee or interest is generated by this engine.
- Overdue consumer handling is reminders, possible future-booking hold, then manual recovery review.
- B2B statutory commercial interest/recovery remains preview/manual only and is not posted automatically.
- Commercial Stripe activation remains a separate owner decision.

### Database / Terms verification
Production now has the new booking columns:
- `payment_policy_revision`
- `payment_policy_locked_at`
- `payment_policy_snapshot`
- `deposit_required`

Production invoices have:
- `payment_policy_revision`
- `payment_policy_snapshot`
- `deposit_required`
- `balance_due_hours`
- `overdue_booking_hold_days`
- `overdue_final_review_days`

Published Terms are v3 and include `Payment due dates and overdue balances`, including non-retroactivity and no automatic consumer monetary penalty wording.
Production still has `0` `site_settings` rows with key `payments`, so commercial payments remain OFF.

### Payment release verification
- `account.js` HTTP 200 and loads v`6.4.35-payment-policy-engine-1`.
- `admin-payment-settings.js` HTTP 200/current and remains loaded by the newer Admin loader.
- `account-booking-policy.js` HTTP 200/current.
- `/api/legal?slug=terms` HTTP 200, Terms v3 with the new payment section.
- No real booking, deposit, payment, late fee or refund was created for release verification.
- the known Node `url.parse()` deprecation warning remains open tech debt from earlier runtime scans.

Fallback values remain only inactive defaults while no payments row exists: 20% / £10, optional, inactive. They are not a commercial decision.

## Stable live systems
- Fair 48-hour cancellation/deposit policy remains live and is incorporated into current Terms.
- Privacy Centre / UK GDPR operations remain live; controller legal name/public postal address publication is still postponed by owner.
- Security Hardening and Staff My Jobs auth recovery remain live.
- Business Finance and Smart Receipts remain private/sole-trader-first.
- Newsletter Centre remains consent-aware/resumable.
- Ask Namdar guided assistant remains live; provider AI remains off.

## Open manual/commercial items
- Owner can now retry Admin → Website & legal → **Choose file** → **Upload logo** → **Save website settings** on production.
- Commercial Stripe activation and actual deposit amounts/bands remain deliberately OFF/unapproved until a separate owner decision.
- B2B customer classification and automatic commercial-debt enforcement are not implemented.
- ICO data-protection fee self-assessment.
- Supabase Leaked Password Protection.
- Google review-request URL, Window real-job pricing calibration, SMS/legal checks, `url.parse()` cleanup.
