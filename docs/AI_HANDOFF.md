# Namdar AI handoff

Last verified: 2026-09-15 UTC

Read `docs/AI_START.md` first. Use `docs/PROJECT_STATUS.md` for the broader roadmap.

## Production baseline
- Repo `pchroonic/pchroonic`, default `main`.
- Current live product merge: `6c2ec57473d0d2f581c4eb70e76fe30d0add07dc` (PR #88).
- Current Admin JavaScript release: `6.4.37-admin-website-crash-fix-1`; Admin modal-layout CSS is independently cache-pinned as `6.4.38-admin-wide-modal-fix-1`.
- Customer loader remains `6.4.35-payment-policy-engine-1`.
- Supabase production: `qjigldxjcpnrlyxgmlqq`.
- Vercel project: `prj_4fILo0pCaLGUSUIMWrBIVGzeWVDC`; team: `team_8Az8WtWcnfwtYRdhR8vGqC3L`.
- Current production deployment: `dpl_HfwhiUCgHa3KCuJPg8nZ8bDade2e`, READY and aliased to `namdar.co.uk`.
- `/api/health` returned HTTP 200 / `ok:true` at `2026-09-15T14:30:31.829Z`.
- Window Cleaning is the only live/quotable/bookable service.
- Commercial Stripe customer payments remain OFF; production has `0` `site_settings` rows with key `payments`.
- Ask Namdar provider AI remains OFF (`aiEnabled:false`).
- Privileged Staff/Admin access still requires CAPTCHA + AAL2/TOTP MFA.

# Admin Edit booking horizontal overflow — LIVE

## Incident
The owner supplied a production screenshot of Admin → Quotes → **Edit booking**. The booking form had an internal horizontal scrollbar, the right side of the two-column form was clipped, and the dialog content extended beyond its visible right edge.

This was a presentation-only defect. No booking record or booking API failure was involved.

## Root cause
The shared stylesheet had three interacting rules:
1. normal `.modal` dialogs are capped at `max-width:520px` for smaller UI such as authentication/confirmation;
2. `#bookingEditor` contains `.modal-card.wide` for the large two-column booking editor;
3. the existing `dialog.modal:has(.wide)` rule changed the width but did not override the base `max-width:520px`.

The outer dialog therefore stayed narrow while its child card tried to render much wider, producing horizontal overflow and clipping.

## Live fix
PR #88 `Fix Admin booking editor horizontal overflow` introduced:
- `admin-modal-layout.css`, an Admin-only override so the shared public-site modal styling is not widened globally;
- `dialog.modal:has(> .modal-card.wide)` can now grow responsively to 980px, explicitly overrides the old maximum, stays inside the viewport and uses vertical rather than horizontal overflow when space is tight;
- the direct `.modal-card.wide` is constrained with `width:100%`, `max-width:100%`, `min-width:0`;
- `.admin-form-grid` children and inputs/selects/textareas get `min-width:0` so grid tracks can shrink safely;
- long booking context text gets `overflow-wrap:anywhere`;
- <=700px wide Admin forms collapse to one column;
- `admin.js` loads `/admin-modal-layout.css?v=6.4.38-admin-wide-modal-fix-1` while retaining JavaScript module pin `6.4.37-admin-website-crash-fix-1`;
- `scripts/booking-operations.test.mjs` regression coverage verifies the loader, layout guard and `#bookingEditor` wide-card structure.

No database migration, environment-variable change, booking mutation, API behavior, payment setting or security control was changed.

## Release evidence
- exact tested PR head: `00fe836c22cadb26391c92ff0f53cfd75b2fd77f`;
- final GitHub CI: run `34981891259`, SUCCESS;
- exact-final-head Vercel preview: `dpl_DVMCKoGbxWdwu2vDn8AfCb8uJut2`, READY; errors-only build log clean;
- merge commit: `6c2ec57473d0d2f581c4eb70e76fe30d0add07dc`;
- production deployment: `dpl_HfwhiUCgHa3KCuJPg8nZ8bDade2e`, READY and aliased to `namdar.co.uk`; errors-only build log clean;
- production `/api/health`: HTTP 200 / `ok:true` at `2026-09-15T14:30:31.829Z`;
- live `/admin.js`: HTTP 200 and includes `modalLayoutV='6.4.38-admin-wide-modal-fix-1'` plus `/admin-modal-layout.css`;
- live `/admin-modal-layout.css`: HTTP 200 and includes the 980px responsive maximum, `overflow-x:hidden`, card width constraints and mobile one-column rule;
- runtime error/fatal scan showed no new application exception from the release; the known Node `url.parse()` deprecation warning remains open tech debt.

## Owner verification now
Hard-refresh the Admin page, reopen the same **Edit booking** dialog and confirm:
- no horizontal scrollbar appears at the bottom of the dialog;
- Date / Start time and Assigned team member / Status columns are both fully visible on desktop;
- the right edge and close button are visible;
- on narrower screens the form becomes one column instead of overflowing.

# Admin Website & legal crash fix — LIVE
PR #86 fixed the prior Website & legal null-field crash and false MFA error boundary. `admin-brand-assets.js` now creates the missing **Public review URL** control before legacy settings load, and `admin-mfa-guard.js` separates real MFA/session failures from later dashboard-load failures. Admin JavaScript release remains `6.4.37-admin-website-crash-fix-1` and AAL2/TOTP remains required.

Release evidence: exact head `370ec326f5d5d462de34a4140f667d7d25acba81`, CI `34976265435` SUCCESS, preview `dpl_4SaDLWtHnfrmDr7QwoCcjZQXaDrW` READY/clean, merge `3e41cb5837d6394688d1ab5dbef11d9bdf8e5781`.

# Admin website logo upload — LIVE
PR #84 added secure upload. Accepted client formats are PNG/JPEG/WebP/AVIF up to 2 MB. The POST-only server route requires Staff/Admin `settings` permission plus AAL2/TOTP, validates real file signatures, writes only through the server credential to dedicated public `brand-assets` Storage, audit logs the upload and still requires **Save website settings** to publish.

# Flexible Payment & Deposit Policy Engine — LIVE
PR #82 remains live. It supports revisioned flat/tiered deposits, frozen booking-specific terms, configurable balance timing and operational overdue escalation. True legacy bookings remain non-retroactive. No automatic consumer late fee, compounding charge or interest is generated. B2B statutory interest/recovery remains preview/manual only.

Commercial invariant: do not activate customer Stripe payments or infer an approved commercial deposit from fallback code defaults. Production still has `0` `site_settings.payments` rows; fallback 20% / £10 values are inactive safe defaults only.

# Stable live systems
- Fair 48-hour cancellation/deposit policy is live and incorporated into current Terms.
- Privacy Centre / UK GDPR operations are live; controller legal-name/public-postal-address publication is still postponed by owner.
- Security Hardening and Staff My Jobs auth recovery are live.
- Business Finance and Smart Receipts remain private/sole-trader-first.
- Newsletter Centre remains consent-aware/resumable.
- Ask Namdar guided assistant is live; provider AI remains off.
- Support tickets are customer-only/private.

# Open manual / commercial items
- Owner should hard-refresh and visually confirm the live **Edit booking** modal no longer overflows horizontally.
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
