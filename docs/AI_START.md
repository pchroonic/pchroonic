# Namdar AI fast resume

Last verified: 2026-09-15 UTC

Read this first. Use `docs/AI_HANDOFF.md` for implementation detail and `docs/PROJECT_STATUS.md` for roadmap/status.

## Production source of truth
- Repo `pchroonic/pchroonic`, default `main`.
- Current live product merge: `ab218cdc0aceec0cb68b346a73c56d13393132c9` (PR #92, Staff app v2 daily field workflow).
- Admin base JavaScript remains v`6.4.37-admin-website-crash-fix-1`; modal CSS v`6.4.38-admin-wide-modal-fix-1`; access-role extension v`6.4.39-access-roles-1`.
- Customer loader remains v`6.4.35-payment-policy-engine-1`.
- Staff app experience is v`6.4.40-staff-experience-v2-1`; existing Staff auth/security modules remain pinned to v`6.4.31-staff-auth-recovery-1`.
- Production deployment `dpl_5ZryWTBFm95WeXNxJvUrc26eiFnU` is READY and aliased to `namdar.co.uk`.
- `/api/health` returned HTTP 200 / `ok:true` at `2026-09-15T15:26:16.537Z`.
- Window Cleaning is the only live/quotable/bookable service.
- Customer Stripe payment policy remains OFF; no commercial deposit policy has been activated.
- Ask Namdar provider AI remains OFF.
- Privileged Staff/Admin access requires CAPTCHA + AAL2/TOTP MFA.

## Staff app v2 — LIVE
PR #92 `Improve Staff app daily field workflow` is live.

The Staff PWA now adds:
- a **Today progress** command centre above the job list;
- completed/remaining count with visual progress;
- a smart **current / next job** card prioritising In progress, On my way, then the next scheduled job;
- direct Call, Navigate and Open job shortcuts;
- quick Call/Navigate controls and before/after photo counts on job cards;
- contextual Open job / Continue job / View job actions;
- a four-stage workflow indicator: Assigned → On the way → In progress → Complete;
- a Job brief exposing relevant quote details such as property type, floors, access, frequency, size/units, urgency and customer notes when available;
- photo/note readiness information before the main job action;
- safe-area-aware sticky job actions on mobile;
- guarded background refresh every 3 minutes only when visible, online and no job editor is open;
- a separately versioned PWA cache containing the new Staff v2 assets.

Security/compatibility remain unchanged:
- `staff-original.js` remains authoritative for job mutations;
- Staff v2 does not call `/api/staff-job-action` directly or bypass assignment checks;
- CAPTCHA, AAL2/TOTP MFA, auth recovery, route planning, offline read-only privacy and photo/note workflow remain in place;
- no database migration or API schema change was required;
- no customer/staff/booking/payment test data was created;
- Stripe remains OFF.

Release evidence:
- exact tested PR head: `83ae22b232009927baa7e33055d775b34a4a362f`;
- GitHub `AI handoff and JavaScript checks` run `34988278569`: SUCCESS;
- dedicated `Staff app v2 checks` run `34988278242`: SUCCESS;
- exact-head preview `dpl_BvGbxPz4QAcGseoxc7DiVbvrNoma`: READY, errors-only build log clean;
- merge/main: `ab218cdc0aceec0cb68b346a73c56d13393132c9`;
- production `dpl_5ZryWTBFm95WeXNxJvUrc26eiFnU`: READY, aliased to `namdar.co.uk`, errors-only build log clean;
- live `/staff` serves `staff.js?v=6.4.40-staff-experience-v2-1`;
- live `/staff.js`, `/staff-experience-v2.js`, `/staff-experience-v2.css` and `/staff-sw.js` all return HTTP 200 with the new version/cache generation;
- production runtime scan for this deployment found no 5xx logs;
- `/api/health` HTTP 200 / `ok:true` after release.

Owner verification still useful: hard-refresh `/staff` on a signed-in phone and confirm the Today overview, quick actions and job workflow strip look good with real assigned work. Full visual verification requires an authenticated Staff/MFA session.

## Owner & custom access roles — LIVE
PR #90 remains live. Owner is the highest access role; Administrator retains full normal Admin operations but cannot control Owner-only hierarchy functions. Owner can create reusable custom Staff roles and assign dashboard permissions. The single active Admin was safely mapped to Owner without hard-coded identity. System role definitions and last-Owner/last-Administrator lockout protections remain active.

## Other live systems
- PR #88 Admin Edit booking responsive modal fix.
- PR #86 Website & legal crash fix.
- PR #84 secure Admin logo upload.
- PR #82 flexible payment/deposit policy engine remains live while commercial Stripe remains OFF.
- Fair cancellation terms, Privacy Centre, Security Hardening, Staff auth recovery, Business Finance, Smart Receipts, Newsletter Centre and guided Ask Namdar remain live/stable.

## Open manual/commercial items
- Owner visual smoke-test of the live Staff v2 authenticated UI.
- Commercial Stripe activation and actual deposit bands remain OFF/unapproved until a separate owner decision.
- ICO data-protection fee self-assessment, Supabase Leaked Password Protection, Google review URL, real-job pricing calibration, SMS/legal checks and Node `url.parse()` cleanup remain open.
