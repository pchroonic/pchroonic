# Namdar project status

Last updated: 2026-09-15 UTC

## Production baseline
- Repo `pchroonic/pchroonic`, default `main`.
- Current main `9bbf0b57e8a1fb5c1031ab6632add14ccb22e042` after PR #91 documentation; live product behavior includes PR #90 Owner/custom access roles.
- Admin base JS v`6.4.37-admin-website-crash-fix-1`; modal CSS v`6.4.38-admin-wide-modal-fix-1`; access-role extension v`6.4.39-access-roles-1`; customer loader v`6.4.35-payment-policy-engine-1`.
- Current production Staff app is still v`6.4.31-staff-auth-recovery-1` until the Staff v2 candidate is released.
- Production deployment `dpl_GFYggUDm33USwygrhPfzLcdDFiqp` is READY and aliased to `namdar.co.uk`.
- Production health HTTP 200 / `ok:true` at `2026-09-15T14:57:54.408Z`.
- Supabase production: `qjigldxjcpnrlyxgmlqq`.
- Window Cleaning only live.
- Privileged Staff/Admin requires CAPTCHA + AAL2/TOTP MFA.
- Customer Stripe remains OFF; no commercial deposit bands were activated.
- Ask Namdar provider AI disabled.

## Staff app v2 — RELEASE CANDIDATE
Branch `feature/staff-app-v2-20260915`, cache token `6.4.40-staff-experience-v2-1`.

Candidate UX improvements:
- Today progress command centre with completed/remaining jobs and visual progress;
- smart current/next job focus card;
- Call, Navigate and Open job shortcuts;
- quick actions and before/after photo counts on job cards;
- contextual Open / Continue / View job labels;
- four-stage Assigned → On the way → In progress → Complete workflow strip;
- Job brief from existing quote inputs/notes;
- photo/note readiness summary;
- sticky mobile job action zone with safe-area handling;
- guarded 3-minute online refresh that pauses while the job dialog is open;
- separate JS/CSS cache version plus new PWA cache generation.

Compatibility/security:
- existing `staff-original.js` remains authoritative for job updates;
- no direct action API bypass was added;
- existing assignment checks, route planner, photos, notes, offline privacy, PWA install, CAPTCHA, MFA and auth recovery remain intact;
- no database migration or API schema change is required;
- no test customer/staff/booking/payment data is needed;
- Stripe remains OFF.

Files:
- `staff-experience-v2.js`
- `staff-experience-v2.css`
- `staff.js`
- `staff-sw.js`
- `scripts/staff-experience-v2.test.mjs`
- `.github/workflows/staff-experience-v2-check.yml`
- continuity docs.

Release status: implementation is on the feature branch. Exact-head GitHub CI, Vercel preview/build verification, merge and production verification still need to complete before marking LIVE. Visual owner smoke testing should confirm `/staff` on mobile and desktop after preview/production because the full job UI is authenticated.

## Owner & custom access roles — LIVE
PR #90 is live with protected Owner and Administrator system roles plus reusable custom Staff roles. Owner can create/edit/delete custom roles, manage Administrator accounts and grant Owner access. Administrator keeps full normal operational Admin access. Assigned custom roles are protected from deletion and permission edits propagate to assigned Staff. Current-account, last-Owner and last-Administrator safeguards prevent lockout.

## Other live product systems
- PR #88 responsive Admin Edit booking modal fix.
- PR #86 Website & legal crash/MFA-boundary fix.
- PR #84 secure logo upload.
- PR #82 flexible payment/deposit policy engine; commercial Stripe activation remains OFF.
- Fair cancellation terms, Privacy Centre, Security Hardening, Staff auth recovery, Business Finance, Smart Receipts, Newsletter Centre and guided Ask Namdar remain live/stable.

## Open roadmap
- Finish and verify Staff app v2 release.
- Commercial Stripe decision and actual deposit policy.
- ICO data-protection fee self-assessment.
- Supabase Leaked Password Protection.
- Google review-request URL.
- Window real-job pricing calibration.
- SMS/legal checks.
- Node `url.parse()` deprecation cleanup.
- Address-data pilot remains parked.
