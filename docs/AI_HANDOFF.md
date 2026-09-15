# Namdar AI handoff

Last verified: 2026-09-15 UTC

Read `docs/AI_START.md` first. Use `docs/PROJECT_STATUS.md` for the broader roadmap.

## Production baseline
- Repo `pchroonic/pchroonic`, default `main`.
- Current live product merge: `3e41cb5837d6394688d1ab5dbef11d9bdf8e5781` (PR #86).
- Current Admin release: `6.4.37-admin-website-crash-fix-1`; customer loader remains `6.4.35-payment-policy-engine-1`.
- Supabase production: `qjigldxjcpnrlyxgmlqq`.
- Vercel project: `prj_4fILo0pCaLGUSUIMWrBIVGzeWVDC`; team: `team_8Az8WtWcnfwtYRdhR8vGqC3L`.
- PR #86 product deployment: `dpl_2GimgSuA1zSDxiLvtA6BGNNPSEjD`, READY and aliased to `namdar.co.uk`.
- `/api/health` returned HTTP 200 / `ok:true` at `2026-09-15T13:39:34.064Z`.
- Window Cleaning is the only live/quotable/bookable service.
- Commercial Stripe customer payments remain OFF; production has `0` `site_settings` rows with key `payments`.
- Ask Namdar provider AI remains OFF (`aiEnabled:false`).
- Privileged Staff/Admin access still requires CAPTCHA + AAL2/TOTP MFA.

# Admin Website & legal crash fix — LIVE

## Incident
After the secure logo-upload release, selecting a logo file from Admin → Website & legal could return the owner to the Admin sign-in card with:
`Two-step verification could not be completed: Cannot set properties of null (setting 'value')`.

The actual MFA flow was not the underlying problem.

## Root cause
Two defects combined:
1. legacy `websiteTools()` writes to `$('#settingReviewUrl').value`, but current `admin.html` did not contain `#settingReviewUrl`;
2. `admin-mfa-guard.js` caught both the MFA gate and later `originalEnter()` dashboard initialization in one `try/catch`, so an ordinary dashboard exception was falsely described as an MFA failure.

## Fix
PR #86 `Fix Admin Website tab crash after logo file selection` changed:
- `admin-brand-assets.js`: adds `ensureReviewUrlField()` and runs it **before** legacy `websiteTools()`. When the expected field is absent, it creates a `Public review URL` input inside Website & legal so the existing review setting remains usable and the null `.value` assignment cannot occur.
- `admin-mfa-guard.js`: separates privileged-session/MFA errors from post-MFA dashboard initialization errors. MFA/session failures keep the MFA message; later dashboard errors now report `Admin dashboard could not be loaded: ...` and are logged separately.
- `admin.js`: Admin loader version is now `6.4.37-admin-website-crash-fix-1` to invalidate cached older modules.
- regression tests: `scripts/brand-logo.test.mjs` covers the missing-control repair, the MFA/dashboard error boundary and the current Admin loader version. Existing release tests that pin the Admin loader version were also updated without weakening their original assertions.

No database migration, environment-variable change or security relaxation was required.

## Release evidence
- exact tested head: `370ec326f5d5d462de34a4140f667d7d25acba81`
- GitHub CI: run `34976265435`, SUCCESS
- exact-head Vercel preview: `dpl_4SaDLWtHnfrmDr7QwoCcjZQXaDrW`, READY; errors-only build log clean
- merge commit: `3e41cb5837d6394688d1ab5dbef11d9bdf8e5781`
- production product deployment: `dpl_2GimgSuA1zSDxiLvtA6BGNNPSEjD`, READY; errors-only build log clean
- production `/api/health`: HTTP 200 / `ok:true` at `2026-09-15T13:39:34.064Z`
- live `/admin.js`: HTTP 200 and `6.4.37-admin-website-crash-fix-1`
- live `/admin-brand-assets.js`: HTTP 200 and contains the pre-load `ensureReviewUrlField()` repair
- live `/admin-mfa-guard.js`: HTTP 200 and contains the separate `Admin dashboard could not be loaded` path
- runtime error/fatal scan for the product deployment: no matching logs.

No real logo, customer, booking, deposit, payment, late-fee or refund data was created for release verification. Commercial Stripe remains OFF and AAL2/TOTP remains required.

## Owner action now
Retry production Admin in this order:
1. open **Website & legal**;
2. click **Choose file** and select a PNG/JPG/WebP/AVIF logo up to 2 MB;
3. confirm the local preview appears and status says it is ready;
4. click **Upload logo**;
5. after upload succeeds, click **Save website settings** to publish the Logo URL.

If a new error occurs, capture the exact message. The prior null `.value` / false MFA error path is fixed live.

# Admin website logo upload — LIVE

PR #84 added the secure upload capability; PR #86 fixed the Website-tab crash discovered during use.

## Secure upload flow
- `admin-brand-assets.js` adds file selection, local preview, upload status and automatic Logo URL fill.
- Accepted client formats: PNG, JPEG, WebP, AVIF; maximum 2 MB.
- `api/admin-brand-logo.js` is POST-only and requires Staff/Admin `settings` permission plus existing AAL2/TOTP authorization.
- `lib/brand-logo.js` validates the actual file signature server-side rather than trusting filename/MIME metadata.
- Uploaded files use dedicated Supabase Storage bucket `brand-assets`, versioned under `logos/...`.
- The bucket is public only for serving website brand images; direct browser write policies are not enabled.
- Upload does not silently publish the brand setting: the owner must still click **Save website settings**.
- Upload is audit logged.

## Original logo-upload release evidence
- PR #84 exact tested head `9995e8e2a199beee24cabe4d24175f82bd293398`
- CI run `34973739008` SUCCESS
- preview `dpl_Dvu9ctLyXRB16qrH1Q1wJXr8c7KF` READY and clean
- merge `f2e7eedb4a795242dfacd350f0704b85e4e67885`
- original production deployment `dpl_DYJtSFFYZeH8xAK1mX4WgNRDULZb` READY and clean
- Supabase migration `20260915130427` / `brand_assets_logo_upload` applied.

# Flexible Payment & Deposit Policy Engine — LIVE

PR #82 remains live under the newer Admin release.

## Commercial invariant
Do not activate customer Stripe payments or infer an approved commercial deposit from code defaults. Production still has `0` `site_settings.payments` rows. Fallback 20% / £10 values are inactive safe defaults only, not an owner-approved commercial decision.

## Live policy capabilities
`lib/payment-policy.js` supports:
- revisioned payment policies;
- optional / deposit-required / full-required modes;
- flat deposits or job-value-tiered percentage/minimum bands;
- contiguous/non-decreasing tier validation;
- frozen booking-specific revision, policy snapshot and exact deposit amount;
- configurable balance due timing after job end (0–168 hours);
- configurable reminder, future-booking hold and recovery-review thresholds;
- exact-money payment enforcement before required-payment confirmation;
- full outstanding balance after completion/due date;
- B2B statutory-interest/recovery preview only, never automatic.

New bookings freeze the terms presented at acceptance. Later Admin edits do not silently rewrite existing bookings. True legacy bookings with no payment snapshot remain legacy and are not retroactively forced into a newer deposit requirement.

Consumer overdue handling is reminders, possible future-booking hold and then manual recovery review. The engine does not automatically add a consumer late fee, compounding charge or interest.

## Payment release evidence
- PR #82 exact tested head `54e480a00e93bb780e687d0f59a0f14a2aa3bc29`
- CI run `34965887792` SUCCESS
- preview `dpl_uUHG5oQaiP6gTiV3sFXoxwRisM3F` READY and clean
- migration `20260915111500_flexible_payment_policy_engine.sql` applied
- merge `ab1d95930816f3116828e410bf07e6208e93216f`
- production deployment `dpl_GvU42X4GGN3mGRojFJTcvRBZfsV4` READY and clean
- Terms v3 live with payment due dates, non-retroactivity and consumer-fairness wording.

# Stable live systems
- Fair 48-hour cancellation/deposit policy is live and incorporated into current Terms.
- Privacy Centre / UK GDPR operations are live; controller legal-name/public-postal-address publication is still postponed by owner.
- Security Hardening and Staff My Jobs auth recovery are live.
- Business Finance and Smart Receipts remain private/sole-trader-first.
- Newsletter Centre remains consent-aware/resumable.
- Ask Namdar guided assistant is live; provider AI remains off.
- Support tickets are customer-only/private.

# Open manual / commercial items
- Owner should retry the fixed Website & legal logo flow on production.
- Commercial Stripe activation and real deposit amounts/bands remain deliberately OFF/unapproved until a separate owner decision.
- Explicit business-customer classification is still required before any automated B2B statutory-debt workflow.
- ICO data-protection fee self-assessment.
- Supabase Leaked Password Protection.
- Google review-request URL.
- Window real-job pricing calibration.
- SMS/legal checks.
- Node `url.parse()` deprecation cleanup.
- Address-data pilot remains parked.
