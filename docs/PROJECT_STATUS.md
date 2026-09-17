# Namdar project status

Last updated: 2026-09-17 UTC

## Production baseline
- Repo `pchroonic/pchroonic`, default `main`.
- Current live product merge `e3d6c2ac840e0fe0ac8a757100ade3fb418eeca5` (PR #96 Post-job Customer Experience).
- Customer base loader `6.4.35-payment-policy-engine-1`; post-job extension `6.4.42-post-job-experience-1`; Staff ETA extension `6.4.41-staff-operations-v3-1`.
- Staff operations v3 `6.4.41-staff-operations-v3-1`; Staff v2 `6.4.40-staff-experience-v2-1`; Staff auth/security base `6.4.31-staff-auth-recovery-1`.
- Admin base `6.4.37-admin-website-crash-fix-1`; modal layout `6.4.38-admin-wide-modal-fix-1`; access roles `6.4.39-access-roles-1`.
- Supabase production `qjigldxjcpnrlyxgmlqq`.
- Production deployment `dpl_2Cusp5Hv9gJkxu6QPi2c2MRgHJLX` is READY and aliased to `namdar.co.uk`.
- Production health HTTP 200 / `ok:true` at `2026-09-17T18:12:16.395Z`.
- Window Cleaning only live.
- Privileged Staff/Admin requires CAPTCHA + AAL2/TOTP MFA.
- Customer Stripe remains OFF; no commercial deposit bands are active.
- Ask Namdar provider AI remains disabled.

## Post-job Customer Experience — LIVE
PR #96 / extension `6.4.42-post-job-experience-1`.

Live improvements:
- completed My Namdar booking cards show a dedicated post-job panel;
- private feedback can be opened directly from the completed job;
- configured Google-review links are offered fairly to every completed customer rather than only positive raters;
- public-review clicks are recorded using the existing `booking_feedback` state;
- Window Cleaning customers can request a fresh repeat quote from sanitised previous job details after explicit confirmation;
- repeat quoting goes through the existing `/api/quote` boundary and recalculates current coverage/pricing rather than copying the old price;
- old free-text notes are not copied and urgency resets to standard;
- recurring customers receive an approximate next-clean guide for 4/8/12-week and legacy monthly/quarterly cadences;
- wording explicitly states that no future job is automatically booked;
- no database migration was required.

Release evidence:
- exact tested head `e652b25a7dc36c0172b0642971cbe403d955a9c2`;
- full CI `35257058653` SUCCESS;
- dedicated Post-job CI `35257058714` SUCCESS;
- Staff v3 compatibility CI `35257058663` SUCCESS;
- exact-head preview `dpl_J3863nqQnAt7EqxMPNKKKow6iP8M` READY / clean build;
- merge `e3d6c2ac840e0fe0ac8a757100ade3fb418eeca5`;
- production `dpl_2Cusp5Hv9gJkxu6QPi2c2MRgHJLX` READY / clean build / `namdar.co.uk` alias;
- health HTTP 200;
- live Account loader and post-job asset verified;
- unauthenticated post-job API correctly returns 401;
- post-release 5xx scan found no 5xx logs;
- no fake customer, quote, booking, feedback, review or payment data was created for verification.

Real-world follow-up: when a genuine completed customer job exists, smoke-test private feedback, the configured Google review link, repeat quote creation and next-clean guidance. Do not manufacture production data solely for this test.

## Staff app v2 — LIVE
Today command centre, smart current/next job, Call/Navigate/Open shortcuts, quick actions, workflow strip, Job brief, photo/note readiness, guarded refresh, route planning and PWA/offline behavior remain live underneath Staff v3.

## Staff operations v3 — LIVE
PR #94 remains the field-operations layer below the new post-job customer journey.

Live improvements:
- six-step Window Cleaning field quality checklist;
- server-side completion gate requiring the checklist;
- problem/incident reporting with optional private evidence photos;
- Admin notifications and booking-modal incident resolution;
- On My Way ETA capture and customer expected-arrival display;
- open-incident badges in Staff;
- private server-only quality/incident tables protected by RLS;
- Staff PWA cache generation `namdar-staff-v6.4.41-staff-operations-v3-1`.

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
- Configure the real Google Business review-request URL if it is not yet set.
- Real-world post-job smoke with a genuine completed job.
- Authenticated Staff v3 mobile smoke test.
- Window real-job pricing calibration after genuine completed jobs accumulate.
- Commercial Stripe decision and actual deposit policy.
- ICO data-protection fee self-assessment.
- Supabase Leaked Password Protection.
- SMS/legal checks.
- Node `url.parse()` deprecation cleanup.
- Address-data pilot remains parked.
