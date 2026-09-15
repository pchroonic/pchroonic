# Namdar AI fast resume

Last verified: 2026-09-15 UTC

Read this first. Use `docs/AI_HANDOFF.md` for implementation detail and `docs/PROJECT_STATUS.md` for roadmap/status.

## Production source of truth
- Repo `pchroonic/pchroonic`, default `main`.
- Current live product merge: `6c2ec57473d0d2f581c4eb70e76fe30d0add07dc` (PR #88, Admin booking editor overflow fix).
- Current Admin JavaScript release remains v`6.4.37-admin-website-crash-fix-1`; the Admin modal-layout stylesheet is cache-pinned separately as `6.4.38-admin-wide-modal-fix-1`.
- Customer loader remains v`6.4.35-payment-policy-engine-1`.
- Current production deployment: `dpl_HfwhiUCgHa3KCuJPg8nZ8bDade2e`, READY and aliased to `namdar.co.uk`.
- `/api/health` returned HTTP 200 / `ok:true` at `2026-09-15T14:30:31.829Z`.
- Window Cleaning is the only live/quotable/bookable service.
- Stripe commercial customer payment policy is OFF. Production has `0` `site_settings` rows with key `payments`. Do not infer a commercially approved deposit amount from fallback code values.
- Ask Namdar provider AI remains disabled (`aiEnabled:false`).
- Privileged Staff/Admin requires CAPTCHA + AAL2/TOTP MFA.

## Admin Edit booking modal overflow — LIVE
Product PR: #88 `Fix Admin booking editor horizontal overflow`.
Exact tested head: `00fe836c22cadb26391c92ff0f53cfd75b2fd77f`.
Final CI: GitHub run `34981891259` SUCCESS.
Exact-final-head preview: `dpl_DVMCKoGbxWdwu2vDn8AfCb8uJut2`, READY; errors-only build log clean.
Merge/main: `6c2ec57473d0d2f581c4eb70e76fe30d0add07dc`.
Production deployment: `dpl_HfwhiUCgHa3KCuJPg8nZ8bDade2e`, READY, aliased to `namdar.co.uk`; errors-only build log clean.

The owner supplied a production screenshot showing **Admin → Edit booking** with a horizontal scrollbar, clipped right-hand fields and a hidden/off-screen right edge.

Root cause:
- the shared base `.modal` style capped dialogs at `max-width:520px`;
- `#bookingEditor` contains `.modal-card.wide` for the two-column editor;
- the old wide-dialog rule changed width but did not override the inherited 520px maximum, so the card overflowed the dialog.

Live fix:
- `admin-modal-layout.css` gives dialogs containing a direct `.modal-card.wide` a responsive width up to 980px while keeping them inside the viewport;
- the wide card is constrained to `width:100%`, `max-width:100%`, `min-width:0`;
- Admin form controls can shrink safely, long booking context text wraps, and <=700px views collapse the wide form to one column;
- `admin.js` loads `/admin-modal-layout.css?v=6.4.38-admin-wide-modal-fix-1` without changing the existing JavaScript module pin;
- `scripts/booking-operations.test.mjs` contains regression coverage for the booking-editor structure and overflow guard.

### Production verification
- live `/admin.js` HTTP 200 and loads `admin-modal-layout.css` with cache token `6.4.38-admin-wide-modal-fix-1`;
- live `/admin-modal-layout.css` HTTP 200 and contains the 980px max-width override, `overflow-x:hidden`, constrained wide card and mobile one-column rule;
- `/api/health` HTTP 200 / `ok:true` at `2026-09-15T14:30:31.829Z`;
- production runtime scan found no new application exception from this release; the known Node `url.parse()` deprecation warning remains open tech debt;
- no database migration, environment-variable change, booking mutation, payment activation or security relaxation occurred.

Owner verification step: hard-refresh the Admin page, reopen **Edit booking**, and confirm the dialog fits the viewport with no horizontal scrollbar or clipped right side.

## Admin Website & legal crash fix — LIVE
Product PR: #86 `Fix Admin Website tab crash after logo file selection`.
Exact tested head: `370ec326f5d5d462de34a4140f667d7d25acba81`.
CI: GitHub run `34976265435` SUCCESS.
Exact-head preview: `dpl_4SaDLWtHnfrmDr7QwoCcjZQXaDrW`, READY; errors-only build log clean.
Merge/main: `3e41cb5837d6394688d1ab5dbef11d9bdf8e5781`.

Live fix:
- `admin-brand-assets.js` ensures a **Public review URL** control exists before legacy website settings load, preventing the prior null `.value` crash;
- `admin-mfa-guard.js` separates real privileged-session/MFA failures from later dashboard initialization errors;
- Admin JavaScript cache version remains `6.4.37-admin-website-crash-fix-1`;
- regression coverage protects the missing-control and error-boundary fixes.

## Admin logo upload — LIVE
PR #84 added secure Admin logo upload. Website & legal supports PNG/JPG/WebP/AVIF up to 2 MB, server-side signature validation, dedicated `brand-assets` Storage, audit logging, and an explicit **Save website settings** publish step. Upload remains protected by Staff/Admin `settings` permission plus AAL2/TOTP MFA.

## Flexible Payment & Deposit Policy Engine — LIVE
PR #82 remains live. It supports revisioned flat/tiered deposits, frozen booking-specific payment terms, configurable balance timing and overdue operational escalation, with no automatic consumer late-payment fee/interest. B2B statutory recovery remains preview/manual only.

Commercial invariant: customer Stripe payments remain OFF; production has `0` `site_settings` rows with key `payments`. Fallback 20% / £10 values are inactive code defaults only, not an approved commercial policy.

## Stable live systems
- Fair 48-hour cancellation/deposit policy remains live and is incorporated into current Terms.
- Privacy Centre / UK GDPR operations remain live; controller legal name/public postal address publication is still postponed by owner.
- Security Hardening and Staff My Jobs auth recovery remain live.
- Business Finance and Smart Receipts remain private/sole-trader-first.
- Newsletter Centre remains consent-aware/resumable.
- Ask Namdar guided assistant remains live; provider AI remains off.
- Support tickets remain customer-only/private.

## Open manual/commercial items
- Owner should hard-refresh Admin and verify the live **Edit booking** dialog has no horizontal overflow/clipping.
- Owner can retry Admin → Website & legal → **Choose file** → **Upload logo** → **Save website settings**.
- Commercial Stripe activation and actual deposit amounts/bands remain deliberately OFF/unapproved until a separate owner decision.
- B2B customer classification and automatic commercial-debt enforcement are not implemented.
- ICO data-protection fee self-assessment.
- Supabase Leaked Password Protection.
- Google review-request URL, Window real-job pricing calibration, SMS/legal checks, `url.parse()` cleanup.
