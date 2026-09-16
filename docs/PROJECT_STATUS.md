# Namdar project status

Last updated: 2026-09-16 UTC

## Production baseline
- Repo `pchroonic/pchroonic`, default `main`.
- Current live merge `784b7c766ed88fe8f53057dd1a657555d57da69d` (PR #94 Staff operations v3).
- Staff operations v3 `6.4.41-staff-operations-v3-1`; Staff v2 `6.4.40-staff-experience-v2-1`; Staff auth/security base `6.4.31-staff-auth-recovery-1`.
- Admin base `6.4.37-admin-website-crash-fix-1`; modal layout `6.4.38-admin-wide-modal-fix-1`; access roles `6.4.39-access-roles-1`.
- Customer base loader `6.4.35-payment-policy-engine-1` plus Staff-v3 ETA extension.
- Supabase production `qjigldxjcpnrlyxgmlqq`.
- Production deployment `dpl_BvETZL2tzcUvfx9Nivaid1RATUrJ` is READY and aliased to `namdar.co.uk`.
- Production health HTTP 200 / `ok:true` at `2026-09-16T09:40:33.475Z`.
- Window Cleaning only live.
- Privileged Staff/Admin requires CAPTCHA + AAL2/TOTP MFA.
- Customer Stripe remains OFF; no commercial deposit bands are active.
- Ask Namdar provider AI remains disabled.

## Staff app v2 — LIVE
Today progress command centre, smart current/next job, Call/Navigate/Open shortcuts, quick actions, workflow strip, Job brief, photo/note readiness, guarded refresh, route planning and PWA/offline behavior remain live underneath Staff v3.

## Staff operations v3 — LIVE
PR #94 adds real field-operation controls without replacing the secure existing lifecycle.

Live improvements:
- six-step Window Cleaning field quality checklist;
- server-side completion gate requiring the checklist;
- problem/incident reporting with type, priority, summary/details and optional private evidence photos;
- Admin notifications for incidents;
- Admin booking-modal incident review with resolve/reopen controls and audit logging;
- On My Way ETA capture and expected-arrival storage;
- customer booking banner shows expected arrival while the team is on the way;
- open-incident badges in Staff;
- private server-only quality/incident tables protected by RLS and revoked direct anon/authenticated access;
- Staff PWA cache generation `namdar-staff-v6.4.41-staff-operations-v3-1`.

Release evidence:
- exact tested head `370a75d47f6d757179b02ce5db79d7ea6b87c877`;
- full CI `35080584185` SUCCESS;
- Staff v3 CI `35080584357` SUCCESS;
- Staff v2 compatibility CI `35080584294` SUCCESS;
- preview `dpl_5ybJj7duWzrrYqZZbW7CBAVp9UXH` READY / clean build;
- migration applied after CI/preview passed; zero quality/incident rows existed immediately afterwards, ETA columns existed, and RLS was enabled;
- merge `784b7c766ed88fe8f53057dd1a657555d57da69d`;
- production `dpl_BvETZL2tzcUvfx9Nivaid1RATUrJ` READY / clean build / `namdar.co.uk` alias;
- health HTTP 200 and live v3 Staff/Admin/Customer assets verified;
- unauthenticated Admin incident endpoint correctly returns 401;
- post-release 5xx scan found no 5xx runtime logs.

Manual follow-up: authenticated mobile smoke test on a real assigned job covering checklist save/completion gate, incident report/photo, On My Way ETA, customer ETA display and Admin incident resolution. Do not create fake production job/payment data for this.

## Owner & custom access roles — LIVE
Protected Owner and Administrator system roles plus reusable custom Staff roles remain live. Owner controls custom role definitions and hierarchy-sensitive actions; current-account, last-Owner and last-Administrator protections remain in place.

## Other live systems
- Responsive Admin Edit booking modal.
- Secure Admin logo upload and Website/Legal crash fix.
- Flexible payment/deposit policy engine, commercial Stripe still OFF.
- Fair cancellation terms and Privacy Centre.
- Security Hardening and Staff auth recovery.
- Business Finance and Smart Receipts.
- Newsletter Centre and guided Ask Namdar.

## Open roadmap
- Authenticated Staff v3 mobile smoke test.
- Commercial Stripe decision and actual deposit policy.
- ICO data-protection fee self-assessment.
- Supabase Leaked Password Protection.
- Google review-request URL.
- Window real-job pricing calibration.
- SMS/legal checks.
- Node `url.parse()` deprecation cleanup.
- Address-data pilot remains parked.
