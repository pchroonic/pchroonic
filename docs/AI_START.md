# Namdar AI fast resume

Last verified: 2026-09-16 UTC

Read this first. Use `docs/AI_HANDOFF.md` for implementation detail and `docs/PROJECT_STATUS.md` for roadmap/status.

## Production source of truth
- Repo `pchroonic/pchroonic`, default `main`.
- Current live product merge: `784b7c766ed88fe8f53057dd1a657555d57da69d` (PR #94 Staff operations v3).
- Staff operations version/cache token: `6.4.41-staff-operations-v3-1`; Staff v2 remains loaded underneath as `6.4.40-staff-experience-v2-1`; auth/security modules remain `6.4.31-staff-auth-recovery-1`.
- Admin base JavaScript remains `6.4.37-admin-website-crash-fix-1`; modal CSS `6.4.38-admin-wide-modal-fix-1`; access roles `6.4.39-access-roles-1`.
- Customer base loader remains `6.4.35-payment-policy-engine-1`, with the Staff-v3 ETA extension loaded separately.
- Supabase production project: `qjigldxjcpnrlyxgmlqq`.
- Vercel production deployment `dpl_BvETZL2tzcUvfx9Nivaid1RATUrJ` is READY and aliased to `namdar.co.uk`.
- `/api/health` returned HTTP 200 / `ok:true` at `2026-09-16T09:40:33.475Z`.
- Window Cleaning is the only live/quotable/bookable service.
- Customer Stripe remains OFF; no commercial deposit bands are active.
- Ask Namdar provider AI remains OFF.
- Privileged Staff/Admin access requires CAPTCHA + AAL2/TOTP MFA.

## Staff operations v3 — LIVE
PR #94 adds field-quality and incident operations without replacing the existing secure Staff lifecycle.

Live capabilities:
- six-step Window Cleaning quality checklist;
- server-side checklist gate before a Window Cleaning job can be completed;
- field problem/incident reporting for no access, safety, weather, equipment, damage, complaints, extra work and other issues;
- `info`, `attention` and `urgent` incident priorities plus optional private evidence photos;
- Admin notifications for new incidents;
- Admin booking-editor incident review with resolve/reopen controls and audit logging;
- improved **On my way** flow with bounded ETA and expected-arrival time;
- customer booking tracking shows the expected arrival while the team is on the way;
- open-incident badges in Staff;
- private `booking_field_quality` and `booking_field_incidents` stores with RLS and no direct anon/authenticated access;
- refreshed Staff PWA cache generation `namdar-staff-v6.4.41-staff-operations-v3-1`.

Security/compatibility:
- `staff-original.js` remains authoritative for existing lifecycle, routing, photos, notes and offline behavior;
- `api/staff-job-action.js` remains the assigned-job mutation boundary and requires `bookings` permission + AAL2 via `requireStaff`;
- customer jobs expose ETA only, not private quality or incident records;
- CAPTCHA, MFA, assignment checks, offline privacy and current role protections remain intact;
- no real/synthetic customer, staff, booking or payment data was created during release verification;
- Stripe remains OFF.

Release evidence:
- exact tested head `370a75d47f6d757179b02ce5db79d7ea6b87c877`;
- full CI `35080584185` SUCCESS;
- Staff v3 CI `35080584357` SUCCESS;
- Staff v2 compatibility CI `35080584294` SUCCESS;
- exact-head preview `dpl_5ybJj7duWzrrYqZZbW7CBAVp9UXH` READY with clean errors-only build logs;
- migration `staff_field_quality_and_incidents` applied only after CI/preview passed; both new tables were empty immediately after migration, ETA columns existed, and RLS was enabled;
- merge `784b7c766ed88fe8f53057dd1a657555d57da69d`;
- production `dpl_BvETZL2tzcUvfx9Nivaid1RATUrJ` READY, clean build, aliased to `namdar.co.uk`;
- live Staff v3 loader/module/service worker, customer ETA loader and Admin incident loader are serving the new token;
- post-release 5xx runtime scan found no 5xx logs.

## Existing live systems
- Staff app v2 daily command centre and route workflow.
- Owner + custom Admin roles.
- Responsive Admin booking editor.
- Secure Admin logo upload and Website/Legal crash fix.
- Flexible payment/deposit policy engine with commercial Stripe still OFF.
- Privacy Centre, Security Hardening, Business Finance, Smart Receipts, Newsletter Centre and guided Ask Namdar.

## Open items
- Authenticated mobile smoke test with a real assigned job: checklist save/completion gate, incident report/photo, On My Way ETA, customer ETA display and Admin incident resolution.
- Commercial Stripe decision and actual deposit policy remain separate owner decisions.
- ICO self-assessment, Supabase Leaked Password Protection, Google review URL, real-job pricing calibration, SMS/legal checks, Node `url.parse()` cleanup and the parked address-data pilot remain open.
