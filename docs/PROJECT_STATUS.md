# Namdar project status

Last updated: 2026-09-16 UTC

## Production baseline
- Repo `pchroonic/pchroonic`, default `main`.
- Live Staff experience: `6.4.40-staff-experience-v2-1`; Staff auth/security base `6.4.31-staff-auth-recovery-1`.
- Admin base `6.4.37-admin-website-crash-fix-1`; modal layout `6.4.38-admin-wide-modal-fix-1`; access roles `6.4.39-access-roles-1`.
- Customer loader `6.4.35-payment-policy-engine-1`.
- Supabase production: `qjigldxjcpnrlyxgmlqq`.
- Window Cleaning only live.
- Privileged Staff/Admin requires CAPTCHA + AAL2/TOTP MFA.
- Customer Stripe remains OFF; no commercial deposit bands are active.
- Ask Namdar provider AI remains disabled.

## Staff app v2 — LIVE
The live Staff app includes the Today progress command centre, smart current/next job, Call/Navigate/Open shortcuts, quick actions, workflow strip, Job brief, photo/note readiness, guarded refresh and refreshed PWA cache. Existing assignment checks, route planner, photos, notes, offline privacy, CAPTCHA, MFA and auth recovery remain intact.

## Staff operations v3 — RELEASE CANDIDATE
Branch `feature/staff-operations-v3-20260916`, version `6.4.41-staff-operations-v3-1`.

Candidate improvements:
- six-step Window Cleaning field quality checklist;
- server-side completion gate requiring the checklist;
- field problem/incident reporting with type, priority, summary/details and evidence photos;
- Admin notifications for incidents;
- Admin booking-modal incident review with resolve/reopen controls and audit logging;
- On My Way ETA capture and expected-arrival storage;
- customer booking banner shows the expected arrival while the team is on the way;
- open-incident badges in the Staff app;
- private server-only quality/incident tables protected from anon/authenticated direct access;
- Staff PWA cache generation moves to `namdar-staff-v6.4.41-staff-operations-v3-1`.

Release state:
- implementation/test/workflow/migration files are being prepared on the feature branch;
- production migration is intentionally not applied until exact-head CI + Vercel preview/build are clean;
- no customer/staff/booking/payment test data is required;
- Stripe remains OFF;
- after release, authenticated phone smoke testing should cover checklist save/completion gate, incident reporting/photo evidence, On My Way ETA, customer ETA display and Admin incident resolution.

## Owner & custom access roles — LIVE
Protected Owner and Administrator system roles plus reusable custom Staff roles remain live. Owner controls custom role definitions and hierarchy-sensitive actions; current-account/last-Owner/last-Administrator protections remain in place.

## Other live systems
- Responsive Admin Edit booking modal.
- Secure Admin logo upload and Website/Legal crash fix.
- Flexible payment/deposit policy engine, with commercial Stripe still OFF.
- Fair cancellation terms and Privacy Centre.
- Security Hardening and Staff auth recovery.
- Business Finance and Smart Receipts.
- Newsletter Centre and guided Ask Namdar.

## Open roadmap
- Finish Staff operations v3 exact-head CI/preview verification, apply the backward-compatible migration, release and production verification.
- Authenticated Staff v3 mobile smoke test.
- Commercial Stripe decision and actual deposit policy.
- ICO data-protection fee self-assessment.
- Supabase Leaked Password Protection.
- Google review-request URL.
- Window real-job pricing calibration.
- SMS/legal checks.
- Node `url.parse()` deprecation cleanup.
- Address-data pilot remains parked.
