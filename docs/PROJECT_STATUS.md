# Namdar project status

Last updated: 2026-09-17 UTC

## Production baseline
- Repo `pchroonic/pchroonic`, default `main`.
- Current `main` `180817d4d6750d15a76bbf1c5ff1aa77e03f9403`; current live product merge `e3d6c2ac840e0fe0ac8a757100ade3fb418eeca5` (PR #96 Post-job Customer Experience).
- Customer base loader `6.4.35-payment-policy-engine-1`; post-job extension `6.4.42-post-job-experience-1`; Staff operations/ETA `6.4.41-staff-operations-v3-1`.
- Admin base `6.4.37-admin-website-crash-fix-1`; modal layout `6.4.38-admin-wide-modal-fix-1`; access roles `6.4.39-access-roles-1`.
- Supabase production `qjigldxjcpnrlyxgmlqq`.
- Current production deployment `dpl_Djbqajdyy6mPm6rxkzY3j6App5ED` is READY and aliased to `namdar.co.uk`; health HTTP 200 / `ok:true` at `2026-09-17T18:15:34.571Z`.
- Window Cleaning only live.
- Privileged Staff/Admin requires CAPTCHA + AAL2/TOTP MFA.
- Customer Stripe remains OFF; no commercial deposit bands are active.
- Ask Namdar provider AI remains disabled.
- No production Google Business review URL is configured yet.

## Google Review System — RELEASE CANDIDATE
Branch `feature/google-review-system-20260917`, candidate Admin token `6.4.43-google-reviews-1`.

Implemented:
- owner-controlled Google review enable/pause switch;
- Google-host-only URL validation at both settings-save and runtime boundaries;
- optional single automatic review reminder with owner-selectable delay;
- reminder suppression after either private-feedback submission or Google-review click;
- tracked email review link that records the click before a server-controlled redirect to Google;
- request timestamp recorded only after the first post-job email actually sends;
- reminder sent timestamp recorded only after successful reminder delivery;
- Admin 30/90/365-day review metrics: completed jobs, requests, clicks/CTR, private feedback/response rate, average rating, reminders and unresolved attention items;
- recent completed-job review history per customer/service;
- customer-message preview in Admin;
- review reminder isolated as its own notification-cron stage;
- no positive-rating review gate and no review incentive.

Migration candidate `supabase/migrations/20260917182721_google_review_tracking.sql` adds two audit timestamps to existing `booking_feedback`, two supporting indexes, and `review_reminder` to the existing booking-notification type check. It creates no new public table or new client-access policy.

Release rules:
- full CI + dedicated Google Review System CI + post-job compatibility tests;
- exact-head Vercel preview/build validation before database migration;
- apply production migration only after the candidate is code-clean;
- verify schema without inserting synthetic customer/review data;
- do not guess or fabricate a Google Business review URL;
- customer commercial Stripe remains OFF.

Pending:
- CI and exact-head preview;
- production migration if checks pass;
- merge/release and live health/security/runtime verification;
- configure the real Google Business Profile review URL later when supplied/available.

## Post-job Customer Experience — LIVE
PR #96 / `6.4.42-post-job-experience-1`: completed-job panel, private feedback, fair Google review access when configured, safe repeat quoting and recurring next-clean guidance remain live. Real-world authenticated smoke should use a genuine completed job only.

## Staff operations v3 — LIVE
PR #94 remains the field-operations layer: six-step Window Cleaning quality checklist, server completion gate, incidents/evidence, Admin incident handling, On My Way ETA and customer ETA. Authenticated mobile smoke using a real assigned job remains outstanding.

## Owner & custom access roles — LIVE
Protected Owner/Administrator system roles and reusable custom Staff roles remain live with hierarchy-sensitive safeguards.

## Other live systems
- Responsive Admin booking editor.
- Secure Admin logo upload and Website/Legal crash fix.
- Flexible payment/deposit policy engine, commercial Stripe OFF.
- Fair cancellation terms and Privacy Centre.
- Security Hardening and Staff auth recovery.
- Business Finance and Smart Receipts.
- Newsletter Centre and guided Ask Namdar.

## Open roadmap
- Finish and release the Google Review System candidate.
- Configure the real Google Business review-request URL.
- Real-world post-job/review smoke with a genuine completed job.
- Authenticated Staff v3 mobile smoke test.
- Window real-job pricing calibration after genuine completed jobs accumulate.
- Commercial Stripe decision and actual deposit policy.
- ICO data-protection fee self-assessment.
- Supabase Leaked Password Protection.
- SMS/legal checks.
- Node `url.parse()` deprecation cleanup.
- Address-data pilot remains parked.
