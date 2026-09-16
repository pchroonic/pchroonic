# Namdar AI handoff

Last verified: 2026-09-16 UTC

Read `docs/AI_START.md` first. Use `docs/PROJECT_STATUS.md` for roadmap/status.

## Production baseline
- Repo `pchroonic/pchroonic`, default `main`.
- Current live merge `784b7c766ed88fe8f53057dd1a657555d57da69d` from PR #94.
- Staff operations v3 token `6.4.41-staff-operations-v3-1`; Staff v2 token `6.4.40-staff-experience-v2-1`; Staff auth/security base `6.4.31-staff-auth-recovery-1`.
- Admin base `6.4.37-admin-website-crash-fix-1`; modal layout `6.4.38-admin-wide-modal-fix-1`; access roles `6.4.39-access-roles-1`.
- Customer base loader `6.4.35-payment-policy-engine-1` with a separate v3 ETA extension.
- Supabase production: `qjigldxjcpnrlyxgmlqq`.
- Vercel project `prj_4fILo0pCaLGUSUIMWrBIVGzeWVDC`; team `team_8Az8WtWcnfwtYRdhR8vGqC3L`.
- Production deployment `dpl_BvETZL2tzcUvfx9Nivaid1RATUrJ` is READY on `namdar.co.uk`.
- Health HTTP 200 / `ok:true` at `2026-09-16T09:40:33.475Z`.
- Window Cleaning only live. Customer Stripe OFF. Provider AI OFF. Privileged access requires CAPTCHA + AAL2/TOTP.

# Staff operations v3 — LIVE

## Purpose
Improve real field operations after Staff v2 by adding quality control, problem/incident reporting and a clearer On My Way/customer ETA flow, while retaining the existing secure Staff lifecycle.

## Database
Migration: `supabase/migrations/20260916103000_staff_field_quality_and_incidents.sql`.

Production migration `staff_field_quality_and_incidents` is applied and adds:
- `bookings.on_my_way_eta_minutes` with a 5–120 minute bound;
- `bookings.estimated_arrival_at`;
- private `booking_field_quality` keyed by booking;
- private `booking_field_incidents` with type, priority, details, evidence paths, status and resolution fields;
- indexes for booking/recent and open incidents;
- RLS on both new tables with direct `anon` / `authenticated` access revoked.

Post-migration verification showed both new tables contained zero rows immediately after migration, both ETA columns existed, and RLS was enabled. No customer/staff/booking/payment test rows were created.

## Server boundary
`api/staff-job-action.js` remains the only field mutation boundary. It still requires `requireStaff(req,'bookings')` and checks the booking is assigned to the signed-in Staff account before any mutation.

New actions:
- `checklist`: Window Cleaning only; sanitises six supported checklist booleans, upserts the private quality record and audit-logs the change;
- `incident`: validates type/severity/summary/details, inserts a private incident, creates an Admin staff notification and audits it;
- `incident_photo`: validates a customer/booking/incident-scoped private storage path before attaching evidence.

Lifecycle changes:
- `on_my_way` accepts a bounded ETA and stores ETA minutes + expected-arrival time while retaining the existing customer On My Way notification path;
- `completed` performs a server-side Window Cleaning checklist gate before marking the job complete.

Existing notes, before/after photos, direct-cost closeout, start/completion notifications, follow-up and audit behavior remain intact.

## Staff UI
`staff-operations-v3.js` / `staff-operations-v3.css` load after Staff v2 and wrap existing `openJob`, `renderJobs` and `runAction` rather than replacing the base engine.

Live UI adds:
- six-step Window Cleaning quality checklist and progress;
- client completion guard backed by the server-side gate;
- Problems & incidents section with recent/open issues;
- report dialog for no access, safety, weather, equipment, damage, complaint, extra work or other;
- `info`, `attention`, `urgent` priorities;
- up to five evidence photos per report attempt, stored in the existing private job-photo bucket path;
- improved On My Way dialog with approximate ETA options and expected-arrival preview;
- ETA display in the active Staff job;
- open-incident badges on Staff job cards;
- mobile responsive styling.

If Staff has already explicitly shared route location, the ETA dialog can use the existing route estimate as a suggestion; otherwise it uses a safe default. It does not silently request location.

## Admin incident handling
`api/admin-booking-incidents.js` requires `bookings` permission. GET lists incidents for one booking; PATCH resolves/reopens an incident and audit-logs the action.

`admin-field-incidents.js` wraps `openBookingEditor`; the booking editor now shows field incidents and resolve/reopen controls. `admin-field-incidents.css` provides priority-aware styling.

## Customer ETA
`api/customer-jobs.js` exposes only `onMyWayEtaMinutes` and `estimatedArrivalAt` in addition to the existing booking tracking fields. It does not expose field checklist or incident records.

`account-field-eta.js` wraps the existing booking renderer and upgrades the On My Way banner with the expected-arrival time / approximate minutes.

## PWA/cache
- `staff.html` points to `staff.js?v=6.4.41-staff-operations-v3-1`.
- `staff.js` keeps v2 and auth/security pins and separately loads v3 JS/CSS.
- `staff-sw.js` cache generation is `namdar-staff-v6.4.41-staff-operations-v3-1`, includes v3 assets, and retains network-first auth-critical handling.

## Release evidence
- PR #94 exact tested head: `370a75d47f6d757179b02ce5db79d7ea6b87c877`.
- Full CI `35080584185`: SUCCESS.
- Dedicated Staff v3 CI `35080584357`: SUCCESS.
- Staff v2 compatibility CI `35080584294`: SUCCESS.
- Exact-head preview `dpl_5ybJj7duWzrrYqZZbW7CBAVp9UXH`: READY, clean errors-only build logs.
- Migration applied only after CI + preview passed; schema verification clean and zero new field rows.
- Merge: `784b7c766ed88fe8f53057dd1a657555d57da69d`.
- Production `dpl_BvETZL2tzcUvfx9Nivaid1RATUrJ`: READY, clean build, `namdar.co.uk` alias active.
- `/api/health`: HTTP 200 / `ok:true`.
- Live Staff loader, v3 JS, Staff service worker, Account ETA loader and Admin incident loader all serve the v3 token.
- Unauthenticated Admin incident API request correctly returned 401.
- Post-release production scan found no 5xx runtime logs.

## Manual follow-up
The remaining check is an authenticated phone smoke test using a real assigned job: checklist save/gate, incident report/evidence, On My Way ETA, customer ETA display and Admin incident resolution. Do not create fake production customer/job/payment data just for this check.

# Other live systems
Owner/custom roles, Staff v2, responsive booking editor, secure logo upload, Website/Legal crash repair, Privacy Centre, Security Hardening, Business Finance, Smart Receipts, Newsletter Centre, guided Ask Namdar and the flexible payment-policy engine remain live/stable. Commercial Stripe remains OFF.
