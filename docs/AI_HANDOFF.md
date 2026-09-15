# Namdar AI handoff

Last verified: 2026-09-15 UTC

Read `docs/AI_START.md` first. Use `docs/PROJECT_STATUS.md` for the broader roadmap.

## Production baseline
- Repo `pchroonic/pchroonic`, default `main`.
- Current live product merge: `ab218cdc0aceec0cb68b346a73c56d13393132c9` (PR #92 Staff app v2).
- Live Admin hierarchy behavior is PR #90; Owner/custom roles are live and verified.
- Admin base JS `6.4.37-admin-website-crash-fix-1`; modal CSS `6.4.38-admin-wide-modal-fix-1`; access roles `6.4.39-access-roles-1`; customer loader `6.4.35-payment-policy-engine-1`.
- Staff experience `6.4.40-staff-experience-v2-1`; Staff auth/security modules remain `6.4.31-staff-auth-recovery-1`.
- Supabase production: `qjigldxjcpnrlyxgmlqq`.
- Vercel project: `prj_4fILo0pCaLGUSUIMWrBIVGzeWVDC`; team: `team_8Az8WtWcnfwtYRdhR8vGqC3L`.
- Production deployment `dpl_5ZryWTBFm95WeXNxJvUrc26eiFnU` is READY and aliased to `namdar.co.uk`.
- Health HTTP 200 / `ok:true` at `2026-09-15T15:26:16.537Z`.
- Window Cleaning only live. Customer Stripe OFF. Provider AI OFF. Privileged access requires CAPTCHA + AAL2/TOTP.

# Staff app v2 — LIVE

## User request
Improve the Namdar Staff app after the Owner/custom-role release.

## Architecture decision
The existing Staff job engine was already secure and operational, so PR #92 added a field-work UX layer instead of rewriting mutation/auth logic.

Authoritative behavior remains in `staff-original.js`, `api/staff-jobs.js` and `api/staff-job-action.js`:
- assigned jobs only;
- Today / Route / Upcoming / Completed views;
- appointment-safe route planning;
- Call and navigation support;
- On my way → Start → Complete lifecycle;
- before/after photo upload;
- customer-visible and private staff notes;
- direct-cost closeout support where applicable;
- offline read-only snapshot with expiry/privacy filtering;
- PWA install/service worker;
- CAPTCHA + AAL2/TOTP MFA and auth recovery.

## Live implementation
### `staff-experience-v2.js`
Loaded after `staff-original.js` with cache token `6.4.40-staff-experience-v2-1`.

Adds:
- Today progress command centre;
- completion percentage and remaining-job count;
- smart focus-job selection: In progress first, then On my way, then next scheduled, then any unfinished job;
- direct Call / Navigate / Open job actions;
- quick actions and photo counters on job cards;
- contextual Open / Continue / View job wording;
- four-stage Assigned / On the way / In progress / Complete workflow strip;
- Job brief from existing quote inputs including property type, floors, access, frequency, size/units, urgency and notes when available;
- readiness chips for before photos, after photos and staff notes;
- 3-minute background refresh only while visible, online, authenticated and with no job dialog open.

The extension wraps existing `renderJobs()` and `openJob()` functions. It contains no direct `/api/staff-job-action` call and therefore does not create a second mutation path.

### `staff-experience-v2.css`
Provides responsive/mobile-first styling for Today progress, focus job, quick actions, workflow strip, Job brief/readiness and sticky safe-area-aware job actions.

### `staff.js` / `staff.html`
- `staff.html` cache-busts the Staff loader with `staff.js?v=6.4.40-staff-experience-v2-1`;
- `staff.js` loads the separate Staff v2 JS/CSS while retaining the existing auth/security module pin `6.4.31-staff-auth-recovery-1`.

### `staff-sw.js`
PWA cache generation is `namdar-staff-v6.4.40-staff-experience-v2-1` and includes the new JS/CSS. API/Supabase/map exclusions and network-first behavior for auth-critical files remain unchanged.

### Regression coverage
- `scripts/staff-experience-v2.test.mjs` covers loader/versioning, command centre, quick actions, workflow, Job brief, wrapper architecture, no action-API bypass, refresh guards, PWA cache and responsive CSS.
- `scripts/staff-auth-readiness.test.mjs` was updated for the new Staff cache generation while retaining its auth-critical network-first assertions.
- `.github/workflows/staff-experience-v2-check.yml` adds dedicated Staff v2 syntax/regression checks.

## Release evidence
- PR: #92 `Improve Staff app daily field workflow`.
- exact tested head: `83ae22b232009927baa7e33055d775b34a4a362f`.
- main CI run `34988278569`: SUCCESS.
- dedicated Staff v2 CI run `34988278242`: SUCCESS.
- exact-head Vercel preview `dpl_BvGbxPz4QAcGseoxc7DiVbvrNoma`: READY; errors-only build log clean.
- merge commit: `ab218cdc0aceec0cb68b346a73c56d13393132c9`.
- production deployment: `dpl_5ZryWTBFm95WeXNxJvUrc26eiFnU`, READY and aliased to `namdar.co.uk`; errors-only build log clean.
- production `/api/health`: HTTP 200 / `ok:true` at `2026-09-15T15:26:16.537Z`.
- live `/staff`: HTTP 200 and references `staff.js?v=6.4.40-staff-experience-v2-1`.
- live `/staff.js`: HTTP 200 and loads `staff-experience-v2.js` + `.css` with the same token.
- live `/staff-experience-v2.js` and `/staff-experience-v2.css`: HTTP 200.
- live `/staff-sw.js`: HTTP 200 and serves the new PWA cache generation while preserving `AUTH_CRITICAL` network-first code.
- production deployment runtime scan: no 5xx entries.

No database migration, API schema change, customer/staff/booking/payment test data, payment activation or security relaxation occurred.

## Remaining manual check
Because the full job UI requires authenticated Staff + MFA access, the owner should hard-refresh `/staff` on a phone and visually confirm the Today command centre, job-card quick actions and workflow strip with a real assigned job. If the Staff app is already installed, opening it online should allow the new service worker generation to replace the old cache.

# Owner & custom access roles — LIVE
PR #90 remains live. Owner controls reusable role definitions, Administrator hierarchy management and Owner grants; Administrator keeps full normal operational Admin access. System-role protection, role propagation, secure invitations, account-owner email changes, CAPTCHA and AAL2/TOTP remain active.

# Other live systems
PR #88 booking-editor modal fix, PR #86 Website & legal crash repair, PR #84 secure logo upload and PR #82 flexible payment/deposit policy engine remain live. Commercial Stripe remains OFF. Privacy, Security Hardening, Business Finance, Smart Receipts, Newsletter Centre and guided Ask Namdar remain stable.

# Open tech/commercial items
Owner visual Staff v2 smoke test; commercial Stripe/deposit policy decision; ICO self-assessment; Leaked Password Protection; Google review URL; real-job pricing calibration; SMS/legal checks; Node `url.parse()` cleanup; parked address-data pilot.
