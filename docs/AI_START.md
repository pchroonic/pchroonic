# Namdar AI fast resume

Last verified: 2026-09-17 UTC

Read this first. Use `docs/AI_HANDOFF.md` for implementation detail and `docs/PROJECT_STATUS.md` for roadmap/status.

## Production source of truth
- Repo `pchroonic/pchroonic`, default `main`.
- Current live product merge: `41150e6fcfc09a25e7ff62a0d63b94c48273cfc5` (PR #98 Google Review System).
- Customer base loader remains `6.4.35-payment-policy-engine-1`; post-job extension `6.4.42-post-job-experience-1`; Staff operations/ETA `6.4.41-staff-operations-v3-1`.
- Admin base remains `6.4.37-admin-website-crash-fix-1`; Google Review System extension is `6.4.43-google-reviews-1`.
- Supabase production project: `qjigldxjcpnrlyxgmlqq`.
- Production deployment `dpl_8i33L4XnUJ2qexNqWdmtxYqLKeF2` is READY and aliased to `namdar.co.uk`.
- `/api/health` returned HTTP 200 / `ok:true` at `2026-09-17T18:38:41.433Z`.
- Window Cleaning is the only live/quotable/bookable service.
- Customer Stripe remains OFF: production still has zero `site_settings` rows with key `payments`.
- Ask Namdar provider AI remains OFF.
- Privileged Staff/Admin access requires CAPTCHA + AAL2/TOTP MFA.
- No real Google Business review URL is configured yet: production has zero `site_settings.reviews` rows, so public Google review requests/reminders remain off until the owner adds the real link.

## Stripe live readiness — RELEASE CANDIDATE
PR #100 / branch `feature/stripe-live-readiness-20260917`; Admin payment asset candidate `6.4.44-stripe-live-readiness-1`.

Purpose: allow Stripe TEST mode on previews while making it impossible to activate production customer payments with a test or unrecognised Stripe key.

Candidate behavior:
- `lib/payment-policy.js` classifies Stripe secret keys as `live`, `test`, `unconfigured` or `unknown` without exposing the secret;
- production `providerReadiness` now requires a recognised LIVE Stripe secret plus configured webhook before `effectiveActive` can become true;
- preview/test environments can still exercise recognised TEST Stripe keys with a webhook;
- Admin Payment & deposit policy shows Stripe mode, webhook status, production live-readiness and the precise activation blocker;
- when payments are currently off and production is not provider-ready, Admin cannot switch the activation checkbox on, but can still prepare/edit a disabled policy draft;
- no payment policy row, customer, booking or payment is created by this candidate.

Current Stripe account connected through the Stripe integration is a GB test-mode account (`acct_1UFAd1Cu9tojH31y`) and is not live-money ready: `charges_enabled=false`, `payouts_enabled=false`, `details_submitted=false`. Stripe still requires business profile completion and owner acceptance of Stripe Terms. Do not accept Stripe Terms on the owner's behalf and do not fabricate missing business details.

Validation so far on current head:
- dedicated Stripe live-readiness checks pass;
- existing Stripe payment/policy tests pass;
- Staff v3, Post-job and Google Review compatibility checks pass;
- Vercel preview builds cleanly;
- continuity docs are being updated in this same PR before merge.

Do not enable commercial production payments until the owner completes Stripe onboarding/TOS, LIVE credentials and a verified live webhook are configured, and the owner explicitly chooses the production deposit/balance policy.

## Google Review System — LIVE
Product PR #98: `Add Google review controls, tracking and dashboard`.
Exact tested head: `604ffaf6f4709395d61b1c708cbb7633b99ba1ee`.
Checks on that head all succeeded: handoff/full regression run `35259833381`, dedicated Google Review System run `35259833492`, Post-job compatibility run `35259833441`, Staff v3 compatibility run `35259833556`, plus Vercel success.
Exact-head preview `dpl_8Q72uN9HS8RtEZoNdjsxtHLx6b3g` was READY with a clean errors-only build log.
Migration `google_review_tracking` was applied only after those checks. Verification confirmed the two new feedback audit timestamps, both supporting indexes, `review_reminder` in the notification-type constraint, and RLS still enabled on both `booking_feedback` and `booking_notifications`. Production contained zero feedback rows/markers after migration.
Merge/main: `41150e6fcfc09a25e7ff62a0d63b94c48273cfc5`.
Production: `dpl_8i33L4XnUJ2qexNqWdmtxYqLKeF2`, READY, clean build, `namdar.co.uk` alias active.

Live behavior:
- Admin can add the official Google Business Profile review URL and independently enable/pause public review requests;
- URL validation is Google-host-only at save time and again at runtime;
- Admin can optionally enable one automatic reminder after 3/5/7/10/14 days;
- the reminder is cancelled if the customer has already submitted private feedback or clicked the Google review link;
- review links in follow-up emails pass through a Namdar tracking redirect, record the click once, then redirect only to the server-configured Google URL;
- review-request timestamps are recorded only after successful initial email delivery; reminder timestamps only after successful reminder delivery;
- Admin has 30/90/365-day metrics for completed jobs, review requests, tracked Google clicks/CTR, private feedback/response rate, average private rating, reminders sent and unresolved feedback needing attention;
- Admin also sees recent completed-job review history by customer/service;
- public Google review access never depends on a positive private rating and no reward/incentive is offered for reviews;
- review reminders run as an isolated notification-cron stage so review failures do not block operational notifications.

Live verification:
- `admin.js` HTTP 200 and loads `6.4.43-google-reviews-1` assets;
- unauthenticated `/api/admin-review-dashboard?days=90` returns HTTP 401;
- invalid `/api/review-click?token=invalid` returns HTTP 400 and does not redirect;
- production 5xx scan for the release deployment found no 5xx logs;
- no synthetic customer, booking, feedback, review or payment data was created.

## Existing live layers
Post-job Customer Experience PR #96 remains live below this release: completed-job panels, private feedback, safe repeat quoting and next-clean guidance. Staff operations v3 PR #94 remains live below that with field checklist/completion gate, incidents/evidence, Admin incident handling and On My Way/customer ETA.

## Open items
- Finish/merge Stripe live-readiness PR #100 after all exact-head checks pass.
- Owner to complete Stripe business onboarding/TOS before any LIVE activation; then connect LIVE secret + verified live webhook.
- Owner to choose exact commercial deposit/balance policy before customer payments are enabled.
- Configure the real Google Business Profile review-request URL in Admin when available; keep review requests/reminders off until then.
- Real-world authenticated review/post-job smoke with the first genuine completed customer job.
- Authenticated Staff v3 mobile smoke test with a real assigned job.
- Window real-job pricing calibration after genuine completed jobs accumulate.
- ICO self-assessment, Supabase Leaked Password Protection, SMS/legal checks, Node `url.parse()` cleanup and the parked address-data pilot remain open.
