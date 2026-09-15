# Namdar AI fast resume

Last verified: 2026-09-15 UTC

Read this first. Use `docs/AI_HANDOFF.md` for implementation detail and `docs/PROJECT_STATUS.md` for roadmap/status.

## Production source of truth
- Repo `pchroonic/pchroonic`, default `main`.
- Current main/product release: `9bbf0b57e8a1fb5c1031ab6632add14ccb22e042` after PR #91 release documentation; live product behavior includes PR #90 Owner/custom access roles.
- Admin base JavaScript remains v`6.4.37-admin-website-crash-fix-1`; modal CSS v`6.4.38-admin-wide-modal-fix-1`; access-role extension v`6.4.39-access-roles-1`.
- Customer loader remains v`6.4.35-payment-policy-engine-1`.
- Current Staff app base remains v`6.4.31-staff-auth-recovery-1` until the Staff v2 candidate below is released.
- Production deployment `dpl_GFYggUDm33USwygrhPfzLcdDFiqp` is READY and aliased to `namdar.co.uk`.
- `/api/health` was HTTP 200 / `ok:true` at `2026-09-15T14:57:54.408Z`.
- Window Cleaning is the only live/quotable/bookable service.
- Customer Stripe payment policy remains OFF; no commercial deposit policy has been activated.
- Ask Namdar provider AI remains OFF.
- Privileged Staff/Admin access requires CAPTCHA + AAL2/TOTP MFA.

## Staff app v2 — RELEASE CANDIDATE
Branch: `feature/staff-app-v2-20260915`.
Experience cache token: `6.4.40-staff-experience-v2-1`.
No database migration or server/API schema change is required.

Goal: make the Staff PWA faster and clearer for field work without replacing the existing secure job lifecycle, offline protections, routing or photo/notes workflow.

Candidate improvements:
- new **Today progress** command centre above the job list;
- completed/remaining count with visual progress indicator;
- smart **current / next job** card, prioritising In progress, On my way, then the next scheduled job;
- direct Call, Navigate and Open job shortcuts from the command centre;
- job cards gain quick Call/Navigate controls plus before/after photo counts;
- the main job button changes contextually to Open job, Continue job or View job;
- job detail gains a four-stage workflow indicator: Assigned → On the way → In progress → Complete;
- quote/job details such as property type, floors, access, frequency, size/units and customer notes are surfaced in a Job brief when available;
- photo/note readiness summary is shown before the main job action;
- the main job-action area remains reachable near the bottom of the screen with safe-area handling;
- online background refresh runs every 3 minutes only while the app is visible and no job editor is open, so unsaved notes are not overwritten;
- existing offline snapshot remains read-only and continues to omit photos, notes, prices and payment details;
- new Staff v2 JS/CSS are separately cache-versioned and included in a new PWA cache generation.

Safety/compatibility:
- the existing `staff-original.js` action logic remains authoritative;
- Staff v2 does not call `/api/staff-job-action` directly and does not bypass assignment checks;
- CAPTCHA, AAL2/TOTP MFA, secure session recovery, offline expiry and service-worker navigation behavior remain in place;
- no customer, staff, booking or payment test data should be created for this UI release;
- Stripe must remain OFF.

Release state:
- code, dedicated regression tests and a Staff-v2-specific GitHub workflow are being prepared on the feature branch;
- do not merge until exact-head CI and Vercel preview/build verification are clean;
- visual smoke test should confirm mobile/desktop Today overview, quick actions, job workflow strip and no regressions in offline/install/login behavior.

## Owner & custom access roles — LIVE
PR #90 is live. Owner is the highest access role; Administrator retains full normal Admin operations but cannot control Owner-only hierarchy functions. Owner can create reusable custom Staff roles and assign dashboard permissions. The single active Admin was safely mapped to Owner without hard-coded identity. System role definitions and last-Owner/last-Administrator lockout protections remain active.

## Other live systems
- PR #88 Admin Edit booking responsive modal fix.
- PR #86 Website & legal crash fix.
- PR #84 secure Admin logo upload.
- PR #82 flexible payment/deposit policy engine remains live while commercial Stripe remains OFF.
- Fair cancellation terms, Privacy Centre, Security Hardening, Staff auth recovery, Business Finance, Smart Receipts, Newsletter Centre and guided Ask Namdar remain live/stable.

## Open manual/commercial items
- Complete Staff app v2 candidate verification before release.
- Commercial Stripe activation and actual deposit bands remain OFF/unapproved until a separate owner decision.
- ICO data-protection fee self-assessment, Supabase Leaked Password Protection, Google review URL, real-job pricing calibration, SMS/legal checks and Node `url.parse()` cleanup remain open.
