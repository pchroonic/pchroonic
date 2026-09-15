# Namdar AI handoff

Last verified: 2026-09-15 UTC

Read `docs/AI_START.md` first. Use `docs/PROJECT_STATUS.md` for the broader roadmap.

## Production baseline
- Repo `pchroonic/pchroonic`, default `main`.
- Current main HEAD before PR #88: `db3715d38e356de8232a92be6909d9781a734ef8` (PR #87, docs-only release record).
- Current live product merge: `3e41cb5837d6394688d1ab5dbef11d9bdf8e5781` (PR #86).
- Current Admin JavaScript release: `6.4.37-admin-website-crash-fix-1`; customer loader remains `6.4.35-payment-policy-engine-1`.
- Supabase production: `qjigldxjcpnrlyxgmlqq`.
- Vercel project: `prj_4fILo0pCaLGUSUIMWrBIVGzeWVDC`; team: `team_8Az8WtWcnfwtYRdhR8vGqC3L`.
- Current production deployment: `dpl_9sHrCSpkN8TWtVPjw3pz5cFd27zH`, READY and aliased to `namdar.co.uk`.
- `/api/health` returned HTTP 200 / `ok:true` at `2026-09-15T13:44:22.349Z`.
- Window Cleaning is the only live/quotable/bookable service.
- Commercial Stripe customer payments remain OFF; production has `0` `site_settings` rows with key `payments`.
- Ask Namdar provider AI remains OFF (`aiEnabled:false`).
- Privileged Staff/Admin access still requires CAPTCHA + AAL2/TOTP MFA.

# Admin Edit booking horizontal overflow — PR #88 IN RELEASE CHECKS

## Incident
The owner supplied a production screenshot of Admin → Quotes → **Edit booking**. The booking form had an internal horizontal scrollbar, the right side of the two-column form was clipped, and the close/right-edge controls were pushed outside the visible dialog.

This is a layout-only defect. No booking record or API failure is implicated.

## Root cause
The shared stylesheet defines the normal dialog as:
- `.modal` with `max-width:520px` for small dialogs such as authentication/confirmation;
- `.modal-card.wide` with a substantially larger intended width for large Admin editors;
- an existing `dialog.modal:has(.wide)` width rule did not override the base `max-width:520px`.

`#bookingEditor` is a `.modal` containing a direct `.modal-card.wide`, so the dialog remained capped at 520px while the child card tried to render much wider. The child therefore overflowed horizontally and produced the screenshot behavior.

## Fix in PR #88
Branch: `fix/admin-booking-modal-overflow-20260915`.
PR: #88 `Fix Admin booking editor horizontal overflow`.

Product changes:
- new `admin-modal-layout.css` is an Admin-only layout guard rather than changing the shared public-site modal behavior;
- `dialog.modal:has(> .modal-card.wide)` now uses a responsive width up to 980px, explicitly overrides the inherited maximum width, remains within `100vw`, and scrolls vertically rather than horizontally when needed;
- the direct `.modal-card.wide` is forced to `width:100%`, `max-width:100%`, `min-width:0`;
- `.admin-form-grid` children, inputs, selects and textareas get `min-width:0` so grid tracks can shrink instead of forcing overflow;
- long booking context text can wrap with `overflow-wrap:anywhere`;
- at <=700px wide Admin forms collapse to one column and the wide dialog stays within the mobile viewport;
- `admin.js` loads `/admin-modal-layout.css` using independent cache token `6.4.38-admin-wide-modal-fix-1`. Existing JavaScript module cache/version `6.4.37-admin-website-crash-fix-1` is retained so unrelated release-pin tests and module semantics are untouched;
- `scripts/booking-operations.test.mjs` asserts the CSS is loaded, the 980px max override exists, horizontal overflow is suppressed, the wide card is constrained, and `#bookingEditor` retains its expected `.modal-card.wide` structure.

No database migration, environment-variable change, booking mutation, API behavior, payment setting or security control changes.

## Release candidate evidence
- source head before mandatory continuity-document commits: `90a8616daf01af50a1006e8ccd5e0a3ebf104e31`;
- exact-head Vercel preview: `dpl_AdsizaFDw3xf8piEd5UerSaHbXJ2`, READY;
- first GitHub CI run: `34981520203`;
- CI `Check critical JavaScript syntax` step: SUCCESS, including the new booking-modal regression test (8/8 booking-operations tests passed);
- CI failed only `Require current AI handoff documentation` because product-source changes require `docs/AI_START.md`, `docs/AI_HANDOFF.md` and `docs/PROJECT_STATUS.md` in the same PR;
- those three continuity files are now being updated on the same branch.

## Required release sequence
Do not call this live until all are complete:
1. confirm the final PR #88 head after continuity updates;
2. wait for GitHub CI on that final head and require SUCCESS;
3. verify the exact-final-head Vercel preview is READY and inspect errors-only build logs;
4. inspect PR #88 changed files/diff for only intended layout, loader, test and continuity changes;
5. merge using the expected final head SHA;
6. verify the resulting production Vercel deployment is READY and aliased to `namdar.co.uk`;
7. check production `/api/health` for HTTP 200 / `ok:true`;
8. fetch live `/admin.js` and `/admin-modal-layout.css` to prove the CSS cache token and layout guard are served;
9. scan production runtime error/fatal logs;
10. then have the owner hard-refresh Admin and reopen **Edit booking** to confirm the horizontal scrollbar/clipping is gone.

# Admin Website & legal crash fix — LIVE

## Incident / root cause
After the secure logo-upload release, selecting a logo file from Admin → Website & legal could return the owner to the sign-in card with `Two-step verification could not be completed: Cannot set properties of null (setting 'value')`.

Two defects combined:
1. legacy `websiteTools()` wrote to `#settingReviewUrl`, but current `admin.html` did not contain that control;
2. `admin-mfa-guard.js` caught both the MFA gate and later dashboard initialization in one catch, so the dashboard exception was falsely described as an MFA failure.

## Live fix
PR #86 changed:
- `admin-brand-assets.js`: `ensureReviewUrlField()` runs before legacy `websiteTools()` and creates the missing **Public review URL** input when required;
- `admin-mfa-guard.js`: MFA/session failures and later dashboard-load failures are now handled separately;
- `admin.js`: JavaScript cache version `6.4.37-admin-website-crash-fix-1`;
- regression tests cover the missing field and error boundary.

Release evidence:
- exact tested head `370ec326f5d5d462de34a4140f667d7d25acba81`;
- GitHub CI `34976265435` SUCCESS;
- preview `dpl_4SaDLWtHnfrmDr7QwoCcjZQXaDrW` READY/clean;
- merge `3e41cb5837d6394688d1ab5dbef11d9bdf8e5781`;
- product deployment `dpl_2GimgSuA1zSDxiLvtA6BGNNPSEjD` READY/clean;
- live source and production health verified;
- runtime error/fatal scan returned no matching logs.

No database/environment changes or security relaxation. Commercial Stripe stayed OFF and no real test customer/booking/payment/logo data was created.

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

Original release evidence:
- PR #84 exact tested head `9995e8e2a199beee24cabe4d24175f82bd293398`;
- CI `34973739008` SUCCESS;
- preview `dpl_Dvu9ctLyXRB16qrH1Q1wJXr8c7KF` READY/clean;
- Supabase migration `20260915130427` / `brand_assets_logo_upload` applied.

# Flexible Payment & Deposit Policy Engine — LIVE

PR #82 remains live under the newer Admin release.

## Commercial invariant
Do not activate customer Stripe payments or infer an approved commercial deposit from code defaults. Production still has `0` `site_settings.payments` rows. Fallback 20% / £10 values are inactive safe defaults only, not an owner-approved commercial decision.

## Live policy capabilities
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

Release evidence:
- exact tested head `54e480a00e93bb780e687d0f59a0f14a2aa3bc29`;
- CI `34965887792` SUCCESS;
- preview `dpl_uUHG5oQaiP6gTiV3sFXoxwRisM3F` READY/clean;
- migration `20260915111500_flexible_payment_policy_engine.sql` applied;
- merge `ab1d95930816f3116828e410bf07e6208e93216f`;
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
- Finish PR #88 release checks, merge, verify production, then owner hard-refreshes and retests **Edit booking**.
- Owner can retry the fixed Website & legal logo flow on production.
- Commercial Stripe activation and real deposit amounts/bands remain deliberately OFF/unapproved until a separate owner decision.
- Explicit business-customer classification is still required before any automated B2B statutory-debt workflow.
- ICO data-protection fee self-assessment.
- Supabase Leaked Password Protection.
- Google review-request URL.
- Window real-job pricing calibration.
- SMS/legal checks.
- Node `url.parse()` deprecation cleanup.
- Address-data pilot remains parked.
