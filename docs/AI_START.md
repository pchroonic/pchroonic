# Namdar AI fast resume

Last verified: 2026-09-16 UTC

Read this first. Use `docs/AI_HANDOFF.md` for implementation detail and `docs/PROJECT_STATUS.md` for roadmap/status.

## Production source of truth
- Repo `pchroonic/pchroonic`, default `main`.
- Current live product behavior remains PR #92 Staff app v2 (`6.4.40-staff-experience-v2-1`) plus the previously verified Owner/custom-role release.
- Staff auth/security modules remain `6.4.31-staff-auth-recovery-1`.
- Admin base JavaScript remains `6.4.37-admin-website-crash-fix-1`; modal CSS `6.4.38-admin-wide-modal-fix-1`; access roles `6.4.39-access-roles-1`.
- Customer loader remains `6.4.35-payment-policy-engine-1`.
- Production Supabase project: `qjigldxjcpnrlyxgmlqq`.
- Vercel project: `prj_4fILo0pCaLGUSUIMWrBIVGzeWVDC`; team `team_8Az8WtWcnfwtYRdhR8vGqC3L`.
- Window Cleaning is the only live/quotable/bookable service.
- Customer Stripe remains OFF; no commercial deposit bands are active.
- Ask Namdar provider AI remains OFF.
- Privileged Staff/Admin access requires CAPTCHA + AAL2/TOTP MFA.

## Staff operations v3 — RELEASE CANDIDATE
Branch: `feature/staff-operations-v3-20260916`.
Version/cache token: `6.4.41-staff-operations-v3-1`.

Goal: improve real field operations on top of Staff v2 without replacing the existing secure job engine.

Candidate scope:
- Window Cleaning field-quality checklist with six required completion steps;
- server-side completion gate so the checklist cannot be bypassed in the browser;
- problem/incident reporting for no access, safety, weather, equipment, damage, complaints, extra work or other issues;
- incident priority (`info`, `attention`, `urgent`) and optional evidence-photo upload;
- office notification for every new incident;
- Admin booking incident review with resolve/reopen actions and audit logging;
- improved **On my way** flow that records a realistic ETA and keeps the existing customer arrival notification;
- customer booking tracking shows the ETA while the team is on the way;
- open-incident badges on Staff job cards;
- private server-only field-quality and incident tables protected by RLS/revoked customer access;
- refreshed Staff PWA cache generation containing the new v3 assets.

Architecture/safety:
- `staff-original.js` remains authoritative for the existing lifecycle, routing, photos, notes and offline behavior;
- `api/staff-job-action.js` remains the single assigned-job mutation boundary and still requires `bookings` permission + AAL2 through `requireStaff`;
- the new checklist and incident tables are never returned by the customer jobs API;
- incident photos use the existing private customer-project-files storage path pattern;
- no real customer/staff/booking/payment test data is required for release verification;
- Stripe must remain OFF;
- do not apply the production database migration until exact-head CI and Vercel preview/build verification are clean.

Candidate files include:
- `staff-operations-v3.js` / `staff-operations-v3.css`;
- `api/staff-job-action.js`, `api/staff-jobs.js`, `api/customer-jobs.js`;
- `api/admin-booking-incidents.js`;
- `admin-field-incidents.js` / `.css`;
- `account-field-eta.js`;
- `supabase/migrations/20260916103000_staff_field_quality_and_incidents.sql`;
- Staff v3 regression tests/workflow plus continuity docs.

## Existing live systems
- Staff app v2 daily command centre and route workflow.
- Owner + custom Admin roles.
- Responsive Admin booking editor.
- Secure Admin logo upload and Website/Legal crash fix.
- Flexible payment/deposit policy engine with commercial Stripe still OFF.
- Privacy Centre, Security Hardening, Business Finance, Smart Receipts, Newsletter Centre and guided Ask Namdar.

## Open items
- Complete Staff v3 exact-head CI and preview verification, then apply its backward-compatible migration, merge and verify production before marking LIVE.
- Authenticated phone smoke test remains important after release.
- ICO self-assessment, Supabase Leaked Password Protection, Google review URL, real-job pricing calibration, SMS/legal checks, Node `url.parse()` cleanup and the parked address-data pilot remain open.
