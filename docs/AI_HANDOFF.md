# Namdar AI handoff

Last verified: 2026-09-16 UTC

Read `docs/AI_START.md` first. Use `docs/PROJECT_STATUS.md` for roadmap/status.

## Production baseline
- Repo: `pchroonic/pchroonic`, default `main`.
- Current live Staff experience: v2 `6.4.40-staff-experience-v2-1`; auth/security base `6.4.31-staff-auth-recovery-1`.
- Admin base `6.4.37-admin-website-crash-fix-1`; modal layout `6.4.38-admin-wide-modal-fix-1`; access roles `6.4.39-access-roles-1`.
- Customer loader `6.4.35-payment-policy-engine-1`.
- Supabase production: `qjigldxjcpnrlyxgmlqq`.
- Vercel project: `prj_4fILo0pCaLGUSUIMWrBIVGzeWVDC`; team `team_8Az8WtWcnfwtYRdhR8vGqC3L`.
- Window Cleaning only live. Customer Stripe OFF. Provider AI OFF. Privileged access requires CAPTCHA + AAL2/TOTP.

# Staff operations v3 — RELEASE CANDIDATE

## User request
After Staff v2 went live, improve the field app further with quality control, problem/incident reporting and a better On My Way/customer ETA flow.

Branch: `feature/staff-operations-v3-20260916`.
Version/cache token: `6.4.41-staff-operations-v3-1`.

## Architecture decision
Keep `staff-original.js` and the existing Staff v2 UX intact. Add a v3 extension layer for new field operations, and extend the existing server-side assigned-job mutation boundary rather than creating an insecure browser-only state path.

### Database migration
`supabase/migrations/20260916103000_staff_field_quality_and_incidents.sql` is backward-compatible and adds:
- `bookings.on_my_way_eta_minutes` (5–120 minutes or null);
- `bookings.estimated_arrival_at`;
- private `booking_field_quality` keyed by booking;
- private `booking_field_incidents` with type, priority, details, evidence paths, status and resolution fields;
- indexes for booking/recent and open incidents;
- RLS enabled and anon/authenticated access revoked from both new private tables.

Do **not** apply the migration to production until exact-head branch CI and preview/build verification are clean.

### `api/staff-job-action.js`
Still requires `requireStaff(req,'bookings')` and verifies the booking is assigned to the signed-in staff user before any job mutation.

New actions:
- `checklist`: Window Cleaning only; sanitises the six supported boolean steps and upserts the private quality record with audit log;
- `incident`: validates type/priority/summary/details, inserts a private incident, sends an Admin `staff_notification`, and audits it;
- `incident_photo`: validates a booking/customer/incident-scoped private storage path before attaching up to ten evidence paths.

Lifecycle updates:
- `on_my_way` accepts a bounded ETA, stores ETA minutes + expected arrival time, and keeps the existing customer On My Way notification flow;
- `completed` performs a server-side Window Cleaning checklist gate before marking the job complete.

Existing notes, before/after photos, economics, start/completion notifications, follow-up and audit behavior are retained.

### `api/staff-jobs.js`
Returns private field quality and incident summaries only to assigned authenticated Staff, plus ETA fields. Customer-facing data is not mixed into these private tables.

### `staff-operations-v3.js` / `.css`
Loaded after Staff v2. It wraps the current `openJob`, `renderJobs` and `runAction` functions rather than replacing the base engine.

Adds:
- six-step Window Cleaning quality checklist with progress and explicit save;
- client completion guard backed by the server-side gate;
- problem/incident section showing recent/open issues;
- problem-report dialog with type, priority, summary, details and up to five evidence photos per report attempt;
- Admin-office alert acknowledgement after save;
- improved On My Way dialog with suggested/default ETA and expected-arrival preview;
- ETA display inside the active job;
- open-incident badge on Staff job cards;
- responsive mobile styling.

### Admin incident handling
`api/admin-booking-incidents.js` requires `bookings` permission. GET lists incidents for one booking; PATCH resolves/reopens them and writes an audit record.

`admin-field-incidents.js` wraps `openBookingEditor` so the booking modal shows field incidents and resolve/reopen controls. `admin-field-incidents.css` keeps the display compact and priority-aware.

### Customer ETA
`api/customer-jobs.js` now returns only `onMyWayEtaMinutes` and `estimatedArrivalAt` in addition to the existing booking tracking fields. It does **not** expose quality checklists or incident records.

`account-field-eta.js` wraps `renderBookings` and upgrades the existing On My Way banner to show the expected arrival time/approximate minutes.

### PWA/cache
- `staff.html` points to `staff.js?v=6.4.41-staff-operations-v3-1`.
- `staff.js` retains Staff v2 and auth/security pins and loads v3 JS/CSS separately.
- `staff-sw.js` uses cache generation `namdar-staff-v6.4.41-staff-operations-v3-1` and pre-caches the v3 assets while preserving network-first handling for auth-critical files.

## Verification plan
1. Open PR and wait for both full `AI handoff and JavaScript checks` and dedicated `Staff operations v3 checks` on the exact head.
2. Verify exact-head Vercel preview is READY and errors-only build logs are clean.
3. Apply the migration to production only after steps 1–2 pass, then verify schema and no existing row mutations.
4. Merge exact tested head.
5. Verify production deployment, `/api/health`, live Staff/Admin/Account loader assets, new API auth behavior and runtime 5xx logs.
6. Owner performs an authenticated mobile smoke test with a real assigned job: checklist save/gate, incident report, On My Way ETA, customer ETA display, Admin incident review.

## Release constraints
- No real/synthetic customer, staff, booking or payment data should be created during automated verification.
- Do not activate Stripe or alter payment policy.
- Do not relax CAPTCHA, MFA, assignment checks, offline privacy or current role protections.

# Existing live systems
Owner/custom roles, Staff v2, responsive booking editor, secure logo upload, Website/Legal crash repair, Privacy Centre, Security Hardening, Business Finance, Smart Receipts, Newsletter Centre, guided Ask Namdar, and the flexible payment-policy engine remain live/stable. Commercial Stripe remains OFF.
