# Namdar AI fast resume

Last verified: 2026-09-17 UTC

Read this first. Use `docs/AI_HANDOFF.md` for implementation detail and `docs/PROJECT_STATUS.md` for roadmap/status.

## Production source of truth
- Repo `pchroonic/pchroonic`, default `main`.
- Current `main`: `180817d4d6750d15a76bbf1c5ff1aa77e03f9403` (docs PR #97).
- Current live product merge: `e3d6c2ac840e0fe0ac8a757100ade3fb418eeca5` (PR #96 Post-job Customer Experience).
- Customer base loader remains `6.4.35-payment-policy-engine-1`; post-job extension is `6.4.42-post-job-experience-1`; Staff ETA extension remains `6.4.41-staff-operations-v3-1`.
- Staff operations v3 remains `6.4.41-staff-operations-v3-1`; Staff v2 remains `6.4.40-staff-experience-v2-1`.
- Admin base remains `6.4.37-admin-website-crash-fix-1`; modal layout `6.4.38-admin-wide-modal-fix-1`; access roles `6.4.39-access-roles-1`.
- Supabase production project: `qjigldxjcpnrlyxgmlqq`.
- Current production deployment `dpl_Djbqajdyy6mPm6rxkzY3j6App5ED` is READY and aliased to `namdar.co.uk`.
- `/api/health` returned HTTP 200 / `ok:true` at `2026-09-17T18:15:34.571Z`.
- Window Cleaning is the only live/quotable/bookable service.
- Customer Stripe remains OFF; no commercial deposit bands are active.
- Ask Namdar provider AI remains OFF.
- Privileged Staff/Admin access requires CAPTCHA + AAL2/TOTP MFA.

## Google Review System — RELEASE CANDIDATE
Branch: `feature/google-review-system-20260917`.
Candidate Admin token: `6.4.43-google-reviews-1`.

Purpose: turn the live post-job review option into a measurable, owner-controlled review funnel while keeping private feedback available to every customer and never gating Google reviews by rating.

Candidate behavior:
- Admin review settings gain an explicit public-review enable/pause switch;
- Admin can enable at most one automatic Google-review reminder and choose a 3/5/7/10/14-day delay;
- the real Google Business Profile review URL remains owner-configured and Google-host-only;
- initial review emails use a Namdar tracking redirect, which records the click and then redirects only to the configured Google URL;
- the initial review request timestamp is recorded only after the follow-up email actually sends;
- reminder delivery is skipped/cancelled when the customer has already submitted private feedback or clicked the Google review link;
- reminder copy explicitly welcomes positive, neutral and negative experiences and says Namdar does not offer rewards for reviews;
- Admin gets 30/90/365-day metrics for completed jobs, review requests sent, tracked Google clicks/CTR, private feedback/response rate, average private rating, reminders sent and feedback needing attention;
- recent completed-job history shows request/click/reminder/private-feedback state per customer job.

Migration candidate: `supabase/migrations/20260917182721_google_review_tracking.sql` adds `booking_feedback.public_review_requested_at`, `booking_feedback.public_review_reminder_sent_at`, indexes for review tracking, and permits `review_reminder` in the existing private notification queue. It creates no new table and does not change customer-facing RLS access.

New modules:
- `api/admin-review-dashboard.js`
- `api/review-click.js`
- `lib/review-reminders.js`
- `admin-review-dashboard.css`
- `scripts/google-review-system.test.mjs`
- `.github/workflows/google-review-system-check.yml`

Changed modules include `api/admin-review-settings.js`, `lib/server.js`, `lib/post-job-followup.js`, `api/booking-notifications.js`, `admin-post-job-followup.js`, `admin.js`, and the existing post-job regression test.

Release rules:
- run full repository CI + dedicated Google review CI + existing post-job compatibility checks;
- validate exact-head Vercel preview/build before applying the production migration;
- apply the migration only after code/preview checks pass, then verify schema without inserting review/customer data;
- do not configure a made-up Google Business review URL;
- do not create fake production customers, bookings, feedback, reviews or payments for verification;
- commercial Stripe remains OFF.

## Post-job Customer Experience — LIVE
PR #96 / `6.4.42-post-job-experience-1` remains live: completed-job panels, private feedback, fair Google-review access when configured, safe repeat quoting and recurring next-clean guidance. Exact product merge `e3d6c2ac840e0fe0ac8a757100ade3fb418eeca5`; verified product deployment `dpl_2Cusp5Hv9gJkxu6QPi2c2MRgHJLX` was READY/clean before the documentation-only PR #97 deployment.

## Staff operations v3 — LIVE
PR #94 remains the field-operations base: six-step Window Cleaning checklist, server completion gate, incidents/evidence, Admin incident handling, On My Way ETA and customer ETA display. Authenticated phone smoke on a real assigned job remains outstanding; do not manufacture production data for it.

## Existing live systems
Owner/custom roles, Staff v2, responsive booking editor, secure logo upload, Website/Legal crash repair, flexible payment-policy engine, Privacy Centre, Security Hardening, Business Finance, Smart Receipts, Newsletter Centre and guided Ask Namdar remain live/stable. Commercial Stripe remains OFF.

## Open items
- Finish CI/preview/release verification for the Google Review System candidate.
- Configure the real Google Business Profile review-request URL when available; production currently has no `site_settings.reviews` row.
- Real-world post-job/review smoke with a genuine completed customer job.
- Authenticated Staff v3 mobile smoke test with a real assigned job.
- Window real-job pricing calibration after genuine completed jobs accumulate.
- Commercial Stripe decision and actual deposit policy remain separate owner decisions.
- ICO self-assessment, Supabase Leaked Password Protection, SMS/legal checks, Node `url.parse()` cleanup and the parked address-data pilot remain open.
