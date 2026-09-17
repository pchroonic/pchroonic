# Namdar project status

Last updated: 2026-09-17 UTC

## Production baseline
- Repo `pchroonic/pchroonic`, default `main`.
- Current `main` `74e9d6740cd06d7a348a995185e1f623b3461ff8` (docs PR #95 on top of Staff operations v3).
- Current live product merge `784b7c766ed88fe8f53057dd1a657555d57da69d` (PR #94 Staff operations v3).
- Staff operations v3 `6.4.41-staff-operations-v3-1`; Staff v2 `6.4.40-staff-experience-v2-1`; Staff auth/security base `6.4.31-staff-auth-recovery-1`.
- Admin base `6.4.37-admin-website-crash-fix-1`; modal layout `6.4.38-admin-wide-modal-fix-1`; access roles `6.4.39-access-roles-1`.
- Customer base loader `6.4.35-payment-policy-engine-1` plus Staff-v3 ETA extension.
- Supabase production `qjigldxjcpnrlyxgmlqq`.
- Production deployment `dpl_BvETZL2tzcUvfx9Nivaid1RATUrJ` is READY and aliased to `namdar.co.uk`.
- Window Cleaning only live.
- Privileged Staff/Admin requires CAPTCHA + AAL2/TOTP MFA.
- Customer Stripe remains OFF; no commercial deposit bands are active.
- Ask Namdar provider AI remains disabled.

## Post-job Customer Experience — RELEASE CANDIDATE
Branch `feature/post-job-customer-experience-20260917`, candidate extension `6.4.42-post-job-experience-1`.

Implemented:
- completed My Namdar booking cards gain a dedicated post-job panel;
- customers can open private service feedback from the completed job;
- configured Google-review links are available to every completed customer, not only positive raters;
- review clicks reuse the existing `booking_feedback` audit field;
- Window Cleaning customers can request a fresh quote using sanitised previous job inputs after explicit confirmation;
- repeat quote requests go through the normal `/api/quote` boundary and therefore recalculate current coverage/pricing rather than copying the old price;
- old free-text notes and urgency are not blindly reused;
- recurring jobs display an approximate next-clean guide for 4/8/12-week and legacy monthly/quarterly cadences;
- wording explicitly states that no future job is booked automatically;
- no database migration is required;
- dedicated regression CI was added.

Release rules:
- do not create fake production customer/quote/booking/feedback/review/payment data;
- verify through CI, Vercel preview/build, code-level endpoint boundaries and post-merge health/runtime checks;
- Google review button remains hidden until the real `site_settings.reviews.public_review_url` is configured;
- commercial Stripe remains OFF.

Pending:
- PR CI + Vercel preview validation;
- merge/release if clean;
- post-release live loader/API checks without creating customer data.

## Staff app v2 — LIVE
Today command centre, smart current/next job, Call/Navigate/Open shortcuts, quick actions, workflow strip, Job brief, photo/note readiness, guarded refresh, route planning and PWA/offline behavior remain live underneath Staff v3.

## Staff operations v3 — LIVE
PR #94 adds real field-operation controls without replacing the secure existing lifecycle.

Live improvements:
- six-step Window Cleaning field quality checklist;
- server-side completion gate requiring the checklist;
- problem/incident reporting with optional private evidence photos;
- Admin notifications and booking-modal incident resolution;
- On My Way ETA capture and customer expected-arrival display;
- open-incident badges in Staff;
- private server-only quality/incident tables protected by RLS;
- Staff PWA cache generation `namdar-staff-v6.4.41-staff-operations-v3-1`.

Release evidence:
- exact tested head `370a75d47f6d757179b02ce5db79d7ea6b87c877`;
- full CI `35080584185` SUCCESS;
- Staff v3 CI `35080584357` SUCCESS;
- Staff v2 compatibility CI `35080584294` SUCCESS;
- preview `dpl_5ybJj7duWzrrYqZZbW7CBAVp9UXH` READY / clean;
- merge `784b7c766ed88fe8f53057dd1a657555d57da69d`;
- production `dpl_BvETZL2tzcUvfx9Nivaid1RATUrJ` READY / clean / `namdar.co.uk` alias.

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
- Finish and release the Post-job Customer Experience candidate.
- Authenticated Staff v3 mobile smoke test.
- Configure the real Google Business review-request URL.
- Window real-job pricing calibration after genuine completed jobs accumulate.
- Commercial Stripe decision and actual deposit policy.
- ICO data-protection fee self-assessment.
- Supabase Leaked Password Protection.
- SMS/legal checks.
- Node `url.parse()` deprecation cleanup.
- Address-data pilot remains parked.
