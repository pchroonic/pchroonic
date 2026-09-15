# Namdar project status

Last updated: 2026-09-15 UTC

## Production baseline
- Repo `pchroonic/pchroonic`, default `main`.
- Current live product merge `ab218cdc0aceec0cb68b346a73c56d13393132c9` (PR #92 Staff app v2).
- Admin base JS v`6.4.37-admin-website-crash-fix-1`; modal CSS v`6.4.38-admin-wide-modal-fix-1`; access-role extension v`6.4.39-access-roles-1`; customer loader v`6.4.35-payment-policy-engine-1`.
- Staff experience v`6.4.40-staff-experience-v2-1`; auth/security modules remain v`6.4.31-staff-auth-recovery-1`.
- Production deployment `dpl_5ZryWTBFm95WeXNxJvUrc26eiFnU` is READY and aliased to `namdar.co.uk`.
- Production health HTTP 200 / `ok:true` at `2026-09-15T15:26:16.537Z`.
- Supabase production: `qjigldxjcpnrlyxgmlqq`.
- Window Cleaning only live.
- Privileged Staff/Admin requires CAPTCHA + AAL2/TOTP MFA.
- Customer Stripe remains OFF; no commercial deposit bands were activated.
- Ask Namdar provider AI disabled.

## Staff app v2 — LIVE
PR #92 improves the field-team experience without replacing the secure job action engine.

Live UX:
- Today progress command centre with completed/remaining jobs and visual progress;
- smart current/next-job focus card;
- Call, Navigate and Open job shortcuts;
- quick Call/Navigate actions and before/after photo counts on job cards;
- contextual Open / Continue / View job labels;
- four-stage Assigned → On the way → In progress → Complete workflow strip;
- Job brief from existing quote inputs/notes;
- photo/note readiness summary;
- sticky mobile job actions with safe-area handling;
- guarded 3-minute online refresh that pauses while the job dialog is open;
- separate Staff v2 JS/CSS version plus refreshed PWA cache generation.

Compatibility/security:
- existing `staff-original.js` remains authoritative for job updates;
- no direct action-API bypass was added;
- assignment checks, route planner, photos, notes, offline privacy, PWA install, CAPTCHA, MFA and auth recovery remain intact;
- no database migration or API schema change was required;
- no customer/staff/booking/payment test data was created;
- Stripe remains OFF.

Release evidence:
- exact head `83ae22b232009927baa7e33055d775b34a4a362f`;
- full CI `34988278569` SUCCESS;
- dedicated Staff v2 CI `34988278242` SUCCESS;
- preview `dpl_BvGbxPz4QAcGseoxc7DiVbvrNoma` READY / clean build;
- merge `ab218cdc0aceec0cb68b346a73c56d13393132c9`;
- production `dpl_5ZryWTBFm95WeXNxJvUrc26eiFnU` READY / clean build / aliased to `namdar.co.uk`;
- live `/staff`, Staff loader, Staff v2 JS/CSS and service worker all HTTP 200 with the new version/cache token;
- post-release health HTTP 200 and runtime scan found no 5xx logs.

Manual follow-up: authenticated phone smoke-test of the Today overview, quick actions and workflow strip with a real assigned job.

## Owner & custom access roles — LIVE
PR #90 is live with protected Owner and Administrator system roles plus reusable custom Staff roles. Owner can create/edit/delete custom roles, manage Administrator accounts and grant Owner access. Administrator keeps full normal operational Admin access. Assigned custom roles are protected from deletion and permission edits propagate to assigned Staff. Current-account, last-Owner and last-Administrator safeguards prevent lockout.

## Other live product systems
- PR #88 responsive Admin Edit booking modal fix.
- PR #86 Website & legal crash/MFA-boundary fix.
- PR #84 secure logo upload.
- PR #82 flexible payment/deposit policy engine; commercial Stripe activation remains OFF.
- Fair cancellation terms, Privacy Centre, Security Hardening, Staff auth recovery, Business Finance, Smart Receipts, Newsletter Centre and guided Ask Namdar remain live/stable.

## Open roadmap
- Owner visual smoke-test of Staff app v2.
- Commercial Stripe decision and actual deposit policy.
- ICO data-protection fee self-assessment.
- Supabase Leaked Password Protection.
- Google review-request URL.
- Window real-job pricing calibration.
- SMS/legal checks.
- Node `url.parse()` deprecation cleanup.
- Address-data pilot remains parked.
