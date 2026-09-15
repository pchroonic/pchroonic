# Namdar AI handoff

Last verified: 2026-09-15 UTC

Read `docs/AI_START.md` first. Use `docs/PROJECT_STATUS.md` for the broader roadmap.

## Production baseline
- Repo `pchroonic/pchroonic`, default `main`.
- Current main `9bbf0b57e8a1fb5c1031ab6632add14ccb22e042` after the verified Owner/custom-role release documentation.
- Live Admin hierarchy behavior is PR #90; Owner/custom roles are live and verified.
- Admin base JS `6.4.37-admin-website-crash-fix-1`; modal CSS `6.4.38-admin-wide-modal-fix-1`; access roles `6.4.39-access-roles-1`; customer loader `6.4.35-payment-policy-engine-1`.
- Current production Staff app remains `6.4.31-staff-auth-recovery-1` until the Staff v2 candidate is released.
- Supabase production: `qjigldxjcpnrlyxgmlqq`.
- Vercel project: `prj_4fILo0pCaLGUSUIMWrBIVGzeWVDC`; team: `team_8Az8WtWcnfwtYRdhR8vGqC3L`.
- Production deployment `dpl_GFYggUDm33USwygrhPfzLcdDFiqp` is READY on `namdar.co.uk`.
- Health HTTP 200 / `ok:true` at `2026-09-15T14:57:54.408Z`.
- Window Cleaning only live. Customer Stripe OFF. Provider AI OFF. Privileged access requires CAPTCHA + AAL2/TOTP.

# Staff app v2 — RELEASE CANDIDATE

## User request
Improve the existing Namdar Staff app after the Owner/custom-role release.

## Scope decision
Keep the existing secure Staff job engine and add a presentation/field-operations enhancement layer instead of rewriting the working Staff app.

Existing authoritative behavior remains in `staff-original.js`, `api/staff-jobs.js` and `api/staff-job-action.js`:
- assigned jobs only;
- Today / Route / Upcoming / Completed views;
- appointment-safe route planning;
- Call and navigation support;
- On my way → Start → Complete lifecycle;
- before/after photo upload;
- customer-visible and private staff notes;
- direct-cost closeout support where applicable;
- offline read-only snapshot with expiry/privacy filtering;
- PWA install and service-worker support;
- CAPTCHA + AAL2/TOTP MFA and auth recovery.

## Candidate files
### `staff-experience-v2.js`
Loaded after `staff-original.js` with independent cache token `6.4.40-staff-experience-v2-1`.

Adds:
- `Today progress` command centre;
- completion percentage and remaining-job count;
- smart focus-job selection: In progress first, then On my way, then next scheduled, then any unfinished job;
- direct Call / Navigate / Open job actions;
- quick Call / Navigate controls and photo counters on job cards;
- contextual Open / Continue / View job wording;
- four-stage workflow strip inside job detail;
- Job brief from existing quote inputs: property type, floors, access, frequency, size/units, urgency and notes when available;
- readiness chips for before photos, after photos and staff notes;
- safe 3-minute background refresh only while visible, online, authenticated and with no job dialog open.

The extension wraps the existing `renderJobs()` and `openJob()` functions but does not replace the existing job action implementation. It intentionally contains no direct `/api/staff-job-action` call.

### `staff-experience-v2.css`
Provides responsive styling for:
- Today command centre;
- progress ring/track;
- focus-job card;
- quick action chips;
- workflow strip;
- Job brief/readiness sections;
- sticky main action zone with `safe-area-inset-bottom` support;
- <=700px and <=430px mobile layouts.

### `staff.js`
Keeps the existing Staff security/runtime version pins and adds independent Staff v2 JS/CSS loading using `6.4.40-staff-experience-v2-1`.

### `staff-sw.js`
Moves the PWA cache generation to `namdar-staff-v6.4.40-staff-experience-v2-1` and pre-caches the new JS/CSS. Existing API/Supabase/map exclusions and network-first auth-critical behavior remain unchanged.

### Regression coverage
`scripts/staff-experience-v2.test.mjs` verifies:
- loader cache token and assets;
- command centre / quick actions / workflow / Job brief presence;
- wrapper approach around existing job rendering/detail;
- no direct Staff action API bypass;
- 3-minute refresh guards against hidden/offline/open-editor state;
- new PWA cache generation;
- responsive/safe-area CSS.

`.github/workflows/staff-experience-v2-check.yml` runs syntax checks and the dedicated Staff v2 tests for relevant changes.

## Release constraints
- No database migration is required.
- No server/API schema change is required.
- Do not create real or synthetic customer/staff/booking/payment data for release verification.
- Do not activate Stripe or alter payment/deposit policy.
- Do not relax CAPTCHA, MFA, assignment checks, offline privacy or session expiry controls.
- Exact-head CI must pass before merge.
- Exact-head Vercel preview should be READY with clean build logs.
- Visual smoke test should cover `/staff` on a narrow mobile viewport and desktop, confirming the Today command centre, job-card quick actions, job detail workflow strip and no layout overflow.

## Current candidate state
Branch: `feature/staff-app-v2-20260915`.
Files created/changed so far:
- `staff-experience-v2.js`
- `staff-experience-v2.css`
- `staff.js`
- `staff-sw.js`
- `scripts/staff-experience-v2.test.mjs`
- `.github/workflows/staff-experience-v2-check.yml`
- continuity docs.

Next steps: open PR, wait for exact-head CI, verify the exact-head Vercel preview/build logs, then merge only after the candidate is clean. After production deploy, verify `/api/health`, live Staff loader/module/CSS, Staff PWA asset availability and runtime 5xx logs. A visual owner smoke test may remain because Staff pages require authenticated MFA access.

# Owner & custom access roles — LIVE
PR #90 remains live. Owner controls reusable role definitions, Administrator hierarchy management and Owner grants; Administrator keeps full normal operational Admin access. The single active Admin was mapped to Owner safely by migration. System-role protection, role propagation, secure invitations, account-owner email changes, CAPTCHA and AAL2/TOTP remain active.

# Other live systems
PR #88 booking-editor modal fix, PR #86 Website & legal crash repair, PR #84 secure logo upload and PR #82 flexible payment/deposit policy engine remain live. Commercial Stripe remains OFF. Privacy, Security Hardening, Business Finance, Smart Receipts, Newsletter Centre and guided Ask Namdar remain stable.

# Open tech/commercial items
Complete Staff app v2 verification/release. Commercial Stripe policy remains an owner decision. ICO self-assessment, Leaked Password Protection, Google review URL, real-job pricing calibration, SMS/legal checks, Node `url.parse()` cleanup and the parked address-data pilot remain open.
