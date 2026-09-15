# Namdar AI fast resume

Last verified: 2026-09-15 UTC

Read this first. Use `docs/AI_HANDOFF.md` for implementation detail and `docs/PROJECT_STATUS.md` for roadmap/status.

## Production source of truth
- Repo `pchroonic/pchroonic`, default `main`.
- Current main HEAD before PR #88: `db3715d38e356de8232a92be6909d9781a734ef8` (PR #87, documentation-only release record).
- Current live product merge: `3e41cb5837d6394688d1ab5dbef11d9bdf8e5781` (PR #86, Admin Website crash fix).
- Current Admin release: v`6.4.37-admin-website-crash-fix-1`; customer loader remains v`6.4.35-payment-policy-engine-1`.
- Current production deployment: `dpl_9sHrCSpkN8TWtVPjw3pz5cFd27zH`, READY on current `main` and aliased to `namdar.co.uk`.
- `/api/health` returned HTTP 200 / `ok:true` at `2026-09-15T13:44:22.349Z` on the current production deployment.
- Window Cleaning is the only live/quotable/bookable service.
- Stripe commercial customer payment policy is OFF. Production has `0` `site_settings` rows with key `payments`. Do not infer a commercially approved deposit amount from fallback code values.
- Ask Namdar provider AI remains disabled (`aiEnabled:false`).
- Privileged Staff/Admin requires CAPTCHA + AAL2/TOTP MFA.

## Admin Edit booking modal overflow — PR #88 IN RELEASE CHECKS
The owner supplied a production screenshot showing **Admin → Edit booking** with a horizontal scrollbar, clipped right-hand fields and a hidden/off-screen close area.

Root cause:
- the shared base `.modal` style caps dialogs at `max-width:520px`;
- `#bookingEditor` contains `.modal-card.wide`, which is intentionally much wider;
- the existing wide-dialog rule changed `width` but did not override the inherited 520px `max-width`, so the wide card overflowed the narrow dialog.

PR #88 `Fix Admin booking editor horizontal overflow` fixes the layout without changing booking data or server behavior:
- new `admin-modal-layout.css` gives dialogs containing a direct `.modal-card.wide` a responsive width up to 980px while keeping them inside the viewport;
- the wide card is forced to `width:100%`, `max-width:100%` and `min-width:0` so it cannot exceed the dialog;
- Admin form controls are allowed to shrink, long booking context text wraps, and small-screen wide dialogs collapse to one column;
- `admin.js` loads the new stylesheet with independent cache token `6.4.38-admin-wide-modal-fix-1`, while the existing Admin JavaScript release pin remains `6.4.37-admin-website-crash-fix-1`;
- `scripts/booking-operations.test.mjs` now asserts the booking editor uses the wide-card structure and that the responsive overflow guard is loaded.

Current PR #88 head before continuity updates: `90a8616daf01af50a1006e8ccd5e0a3ebf104e31`. The exact-head Vercel preview `dpl_AdsizaFDw3xf8piEd5UerSaHbXJ2` is READY. The first CI run `34981520203` passed all JavaScript syntax/tests, including the new booking-modal regression test, and failed only because this repository requires `AI_START`, `AI_HANDOFF` and `PROJECT_STATUS` to be updated with every product-source change. These continuity updates are the follow-up.

No database migration, environment-variable change, payment activation, security relaxation, or real customer/booking/payment data is required. Do not mark PR #88 production-live until final-head CI and exact-head Vercel preview/build logs pass, the PR is merged, and production health/live source/runtime logs are verified.

## Admin Website & legal crash fix — LIVE
Product PR: #86 `Fix Admin Website tab crash after logo file selection`.
Exact tested head: `370ec326f5d5d462de34a4140f667d7d25acba81`.
CI: GitHub run `34976265435` SUCCESS.
Exact-head preview: `dpl_4SaDLWtHnfrmDr7QwoCcjZQXaDrW`, READY; errors-only build log clean.
Merge/main: `3e41cb5837d6394688d1ab5dbef11d9bdf8e5781`.
Production product deployment: `dpl_2GimgSuA1zSDxiLvtA6BGNNPSEjD`, READY; errors-only build log clean. Later docs-only production deploys supersede it without changing product code.

Root cause:
- legacy `websiteTools()` writes to `#settingReviewUrl`, but current `admin.html` did not contain that control, causing `Cannot set properties of null (setting 'value')`;
- `admin-mfa-guard.js` caught the later dashboard exception in the same catch as the MFA gate, so the dashboard failure was incorrectly shown as `Two-step verification could not be completed`.

Live fix:
- `admin-brand-assets.js` ensures a **Public review URL** control exists before legacy website settings load, preserving the existing review-setting workflow and preventing the null `.value` crash;
- `admin-mfa-guard.js` now keeps real privileged-session/MFA failures under the MFA message while reporting later dashboard initialization errors separately as `Admin dashboard could not be loaded`;
- `admin.js` JavaScript cache version remains `6.4.37-admin-website-crash-fix-1`;
- regression coverage verifies the missing-control repair, MFA/dashboard error boundary and current loader version.

### Production verification
- live `admin.js` HTTP 200 and serves `6.4.37-admin-website-crash-fix-1`;
- live `admin-brand-assets.js` HTTP 200 and contains `ensureReviewUrlField()` before the legacy Website settings loader;
- live `admin-mfa-guard.js` HTTP 200 and contains the separate `Admin dashboard could not be loaded` path;
- production health remains HTTP 200 / `ok:true`;
- production error/fatal runtime scans for the release deployments returned no matching logs;
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
- upload does not silently publish the new brand image: Admin still clicks **Save website settings**;
- upload is audit logged.

Supabase production migration `20260915130427` / `brand_assets_logo_upload` is applied. The `brand-assets` bucket is public only for serving website brand images, is capped at 2 MB, and allows JPEG/PNG/WebP/AVIF.

## Flexible Payment & Deposit Policy Engine — LIVE
Product PR: #82 `Add flexible payment and deposit policy engine`.
Exact tested head: `54e480a00e93bb780e687d0f59a0f14a2aa3bc29`.
CI: GitHub run `34965887792` SUCCESS.
Exact-head preview: `dpl_uUHG5oQaiP6gTiV3sFXoxwRisM3F`, READY; errors-only build log clean.
Production migration: `flexible_payment_policy_engine` / repo file `20260915111500_flexible_payment_policy_engine.sql`, applied successfully to Supabase production `qjigldxjcpnrlyxgmlqq` before merge.
Merge/main: `ab1d95930816f3116828e410bf07e6208e93216f`.

### What is live
- revisioned flat or job-value-tiered deposit policies;
- continuous/non-decreasing tier validation;
- frozen booking-specific revision, policy snapshot and exact deposit amount;
- configurable balance due timing after job end (0–168 hours);
- configurable reminder, future-booking hold and recovery-review thresholds;
- exact-money payment enforcement before required-payment confirmation;
- full outstanding balance after completion/due date;
- B2B statutory-interest/recovery preview only, never automatic.

New bookings freeze the terms presented at acceptance. Later Admin edits do not silently rewrite existing bookings. True legacy bookings with no payment snapshot remain legacy and are not retroactively forced into a newer deposit requirement.

### Consumer/B2B safeguards
- No automatic consumer late-payment penalty, compounding fee or interest is generated by this engine.
- Overdue consumer handling is reminders, possible future-booking hold, then manual recovery review.
- B2B statutory commercial interest/recovery remains preview/manual only and is not posted automatically.
- Commercial Stripe activation remains a separate owner decision.

Production still has `0` `site_settings` rows with key `payments`, so commercial payments remain OFF. Fallback 20% / £10 values are inactive code defaults only, not a commercial decision.

## Stable live systems
- Fair 48-hour cancellation/deposit policy remains live and is incorporated into current Terms.
- Privacy Centre / UK GDPR operations remain live; controller legal name/public postal address publication is still postponed by owner.
- Security Hardening and Staff My Jobs auth recovery remain live.
- Business Finance and Smart Receipts remain private/sole-trader-first.
- Newsletter Centre remains consent-aware/resumable.
- Ask Namdar guided assistant remains live; provider AI remains off.
- Support tickets remain customer-only/private.

## Open manual/commercial items
- Finish PR #88 release checks, merge it, verify production, then have the owner hard-refresh Admin and reopen **Edit booking** to confirm there is no horizontal scrollbar or clipped right side.
- Owner can retry Admin → Website & legal → **Choose file** → **Upload logo** → **Save website settings**.
- Commercial Stripe activation and actual deposit amounts/bands remain deliberately OFF/unapproved until a separate owner decision.
- B2B customer classification and automatic commercial-debt enforcement are not implemented.
- ICO data-protection fee self-assessment.
- Supabase Leaked Password Protection.
- Google review-request URL, Window real-job pricing calibration, SMS/legal checks, `url.parse()` cleanup.
