# Namdar project status

Last updated: 2026-09-17 UTC

## Production baseline
- Repo `pchroonic/pchroonic`, default `main`.
- Current live product merge `41150e6fcfc09a25e7ff62a0d63b94c48273cfc5` (PR #98 Google Review System).
- Customer base loader `6.4.35-payment-policy-engine-1`; post-job extension `6.4.42-post-job-experience-1`; Staff operations/ETA `6.4.41-staff-operations-v3-1`.
- Admin base `6.4.37-admin-website-crash-fix-1`; Google Review System extension `6.4.43-google-reviews-1`.
- Supabase production `qjigldxjcpnrlyxgmlqq`.
- Production deployment `dpl_8i33L4XnUJ2qexNqWdmtxYqLKeF2` is READY and aliased to `namdar.co.uk`; health HTTP 200 / `ok:true` at `2026-09-17T18:38:41.433Z`.
- Window Cleaning only live.
- Privileged Staff/Admin requires CAPTCHA + AAL2/TOTP MFA.
- Customer Stripe remains OFF; production has zero `site_settings.payments` rows.
- Ask Namdar provider AI remains disabled.
- No real Google Business review URL is configured yet, so public review requests/reminders remain off.

## Google Review System — LIVE
PR #98 / Admin extension `6.4.43-google-reviews-1`.

Live improvements:
- owner-controlled Google review enable/pause switch;
- Google-host-only review URL validation at settings-save and runtime boundaries;
- optional single automatic Google-review reminder with 3/5/7/10/14-day Admin choices;
- reminder suppression after private-feedback submission or Google-review click;
- tracked email review URL that records clicks and redirects only to the server-configured Google destination;
- initial request timestamp recorded only after successful follow-up email delivery;
- reminder timestamp recorded only after successful reminder delivery;
- Admin 30/90/365-day review metrics for completed jobs, requests, clicks/CTR, private feedback/response rate, average private rating, reminders and unresolved attention items;
- recent completed-job review history by customer/service;
- customer-message preview;
- isolated review-reminder cron stage;
- no rating-based review gate and no review incentive.

Database migration `google_review_tracking` is live. It adds two audit timestamps to existing `booking_feedback`, two supporting indexes, and `review_reminder` to the existing booking-notification type check. It created no new public table or new client-access policy; RLS remains enabled on both affected tables.

Release evidence:
- exact tested head `604ffaf6f4709395d61b1c708cbb7633b99ba1ee`;
- full/handoff check `35259833381` SUCCESS;
- dedicated Google Review System check `35259833492` SUCCESS;
- Post-job compatibility check `35259833441` SUCCESS;
- Staff v3 compatibility check `35259833556` SUCCESS;
- exact-head preview `dpl_8Q72uN9HS8RtEZoNdjsxtHLx6b3g` READY / clean;
- migration applied and verified with zero feedback/request/reminder records;
- merge `41150e6fcfc09a25e7ff62a0d63b94c48273cfc5`;
- production `dpl_8i33L4XnUJ2qexNqWdmtxYqLKeF2` READY / clean / `namdar.co.uk` alias;
- health HTTP 200;
- live Admin loader pins `6.4.43-google-reviews-1`;
- unauthenticated Admin review dashboard correctly returns 401;
- invalid tracked-review token correctly returns 400 without redirect;
- production 5xx scan found no 5xx logs;
- no synthetic customer, booking, feedback, review or payment data was created.

Owner setup still required: add the real Google Business Profile review-request URL in Admin. Do not use a guessed URL. Keep requests/reminders off until the official URL is available.

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
- Configure the real Google Business Profile review-request URL and choose whether the one-time reminder should be enabled.
- Real-world Google review/post-job smoke with a genuine completed job.
- Authenticated Staff v3 mobile smoke test.
- Window real-job pricing calibration after genuine completed jobs accumulate.
- Commercial Stripe decision and actual deposit policy.
- ICO data-protection fee self-assessment.
- Supabase Leaked Password Protection.
- SMS/legal checks.
- Node `url.parse()` deprecation cleanup.
- Address-data pilot remains parked.
