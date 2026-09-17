# Namdar AI handoff

Last verified: 2026-09-17 UTC

Read `docs/AI_START.md` first. Use `docs/PROJECT_STATUS.md` for roadmap/status.

## Production baseline
- Repo `pchroonic/pchroonic`, default `main`.
- Current live product merge `41150e6fcfc09a25e7ff62a0d63b94c48273cfc5` from PR #98.
- Customer base loader `6.4.35-payment-policy-engine-1`; Post-job Customer Experience `6.4.42-post-job-experience-1`; Staff operations/ETA `6.4.41-staff-operations-v3-1`.
- Admin base `6.4.37-admin-website-crash-fix-1`; Google Review System extension `6.4.43-google-reviews-1`.
- Supabase production `qjigldxjcpnrlyxgmlqq`.
- Vercel project `prj_4fILo0pCaLGUSUIMWrBIVGzeWVDC`; team `team_8Az8WtWcnfwtYRdhR8vGqC3L`.
- Production deployment `dpl_8i33L4XnUJ2qexNqWdmtxYqLKeF2` READY on `namdar.co.uk`; health HTTP 200 / `ok:true` at `2026-09-17T18:38:41.433Z`.
- Window Cleaning only live. Customer commercial Stripe OFF. Provider AI OFF. Privileged access requires CAPTCHA + AAL2/TOTP.
- Production still has no `site_settings.reviews` row, so public Google review requests and reminders are intentionally inactive until the owner adds the real Google Business Profile review link.

# Stripe live readiness — RELEASE CANDIDATE

PR #100; branch `feature/stripe-live-readiness-20260917`; Admin payment asset candidate `6.4.44-stripe-live-readiness-1`.

## Goal
Harden Namdar's already-built Stripe Checkout/deposit system so test credentials can be used only for non-production validation, while production customer payments can become effective only with recognised LIVE Stripe credentials and a configured webhook.

## Current Stripe account state
The Stripe connector currently exposes one GB account, `acct_1UFAd1Cu9tojH31y`, in test mode only. Stripe reports:
- `charges_enabled=false`;
- `payouts_enabled=false`;
- `details_submitted=false`;
- `business_type=null`.

Current onboarding requirements include business profile product description, support phone, business URL, and owner acceptance of Stripe Terms (`tos_acceptance.date` / IP). Do not invent missing owner/business data and do not accept Stripe Terms on the owner's behalf.

## Payment readiness guard
`lib/payment-policy.js` now exports `stripeKeyMode(secret)` and extends `providerReadiness(env)`.

Secret classification:
- `sk_live_` / `rk_live_` => `live`;
- `sk_test_` / `rk_test_` => `test`;
- empty => `unconfigured`;
- other => `unknown`.

Provider readiness now returns `stripeConfigured`, `webhookConfigured`, `stripeMode`, `production`, `liveReady`, `testReady`, `ready`, and a human-readable `activationBlockReason`.

Rules:
- production (`VERCEL_ENV=production`) requires recognised LIVE Stripe key + webhook for `ready=true`;
- production test keys remain configured but are never ready/effective;
- unknown production key types fail closed;
- preview/test environments may use recognised TEST keys + webhook so sandbox Checkout can still be exercised;
- `loadPaymentPolicy` continues to derive `effectiveActive=policy.active && provider.ready`, so a manually active database policy cannot override the production provider guard.

## Admin payment settings
`api/admin-payment-settings.js` exposes only non-secret readiness metadata: Stripe mode, live/test readiness, production state and activation blocker. It still requires `payments` permission to view and `settings` permission to mutate. POST activation is blocked by the precise provider readiness reason and audit metadata records mode/readiness, never key material.

`admin-payment-settings.js` now displays:
- Stripe secret configured/not connected;
- Stripe mode `LIVE`, `TEST only`, unconfigured or unknown;
- verified webhook configured/not configured;
- production live-ready yes/no;
- customer payments enabled/disabled.

When the current policy is off and provider readiness is incomplete, the activation checkbox is disabled while the owner can still edit/save a disabled future policy draft. Production copy explicitly states that a recognised LIVE key and verified webhook are required.

## Existing payment architecture preserved
No Checkout/payment behavior is replaced. Existing live code still provides:
- hosted Stripe Checkout in GBP;
- Window Cleaning only;
- authenticated customer boundary;
- frozen payment-policy snapshot per booking;
- exact locked deposit amount;
- optional/required deposit or full-payment modes;
- full outstanding balance after completion/due;
- idempotent Checkout session keys;
- verified raw-body Stripe webhook;
- idempotent payment records and refund handling;
- exact processor fee/net accounting from Stripe balance transactions;
- no customer-facing processor-cost leakage;
- no automatic consumer monetary late fee;
- B2B statutory late-payment calculation remains preview/manual only.

## Candidate verification
Dedicated `scripts/stripe-live-readiness.test.mjs` and `.github/workflows/stripe-live-readiness-check.yml` were added. Existing `scripts/stripe-payments.test.mjs` was updated only to recognise the expanded readiness metadata and retain compatibility wording.

Current candidate verification:
- Stripe live-readiness CI passes;
- Stripe payment and flexible payment-policy regressions pass;
- Staff v3 compatibility passes;
- Post-job compatibility passes;
- Google Review compatibility passes;
- exact-head Vercel preview builds cleanly;
- handoff guard required these three docs to be updated in the same PR; this change satisfies that continuity requirement.

## Safety / release boundary
PR #100 does not:
- enable customer payments;
- add LIVE Stripe secrets to source control;
- create a production `site_settings.payments` row;
- accept Stripe Terms;
- create customer, booking or payment records.

After this safety layer is merged, the next Stripe stage is owner-controlled onboarding: complete Stripe business requirements/TOS, configure LIVE production key + live webhook, verify `charges_enabled/payouts_enabled`, then explicitly choose the commercial deposit/balance policy before activation.

# Google Review System — LIVE

Product PR #98: `Add Google review controls, tracking and dashboard`.
Exact tested head: `604ffaf6f4709395d61b1c708cbb7633b99ba1ee`.

## Release evidence
- Handoff/full repository check `35259833381`: SUCCESS.
- Dedicated Google Review System check `35259833492`: SUCCESS.
- Post-job compatibility check `35259833441`: SUCCESS.
- Staff v3 compatibility check `35259833556`: SUCCESS.
- Vercel check: SUCCESS.
- Exact-head preview `dpl_8Q72uN9HS8RtEZoNdjsxtHLx6b3g`: READY; errors-only build log clean.
- Supabase migration `google_review_tracking`: applied successfully after code/preview gates passed.
- Product merge `41150e6fcfc09a25e7ff62a0d63b94c48273cfc5`.
- Production `dpl_8i33L4XnUJ2qexNqWdmtxYqLKeF2`: READY, clean build, `namdar.co.uk` alias active.
- Live `/api/health`: HTTP 200 / `ok:true`.
- Live `admin.js`: HTTP 200 and pins `6.4.43-google-reviews-1`.
- Unauthenticated `/api/admin-review-dashboard?days=90`: HTTP 401 as required.
- Invalid `/api/review-click?token=invalid`: HTTP 400, no redirect/write.
- Production release 5xx scan: no 5xx logs.
- No synthetic customer, booking, feedback, review or payment rows were created.

## Database
Migration `supabase/migrations/20260917182721_google_review_tracking.sql` is live:
- `booking_feedback.public_review_requested_at` timestamptz;
- `booking_feedback.public_review_reminder_sent_at` timestamptz;
- partial index for review-request reporting;
- partial index for pending reminder lookup;
- `review_reminder` added to the existing `booking_notifications.notification_type` check.

Verification after migration:
- both columns exist;
- both indexes exist;
- the notification check contains `review_reminder`;
- RLS remains enabled on `booking_feedback` and `booking_notifications`;
- `booking_feedback` had zero rows, zero request markers and zero reminder markers immediately after migration;
- `site_settings.reviews` row count remained zero.

No new table or direct client grant/policy was created.

## Owner settings
`api/admin-review-settings.js`:
- GET requires `bookings` Staff permission;
- POST requires `settings` permission;
- stores `public_review_url`, `review_requests_enabled`, `review_reminders_enabled`, `review_reminder_delay_days`;
- rejects enabling public review requests without a valid official HTTPS Google-host link;
- accepts only `google.com`/subdomains, `g.page`, or `goo.gl`/subdomains;
- audits settings changes.

`lib/server.js` independently validates the saved Google URL at runtime and respects `review_requests_enabled`, preventing a manually corrupted setting from becoming an arbitrary redirect.

## Tracked review requests
`lib/post-job-followup.js` keeps private feedback available to every completed customer. When public review requests are enabled, the Google button uses a Namdar tracked URL instead of linking straight to Google.

Only after the initial post-job email is successfully delivered:
- `public_review_requested_at` is set if still null;
- one `review_reminder` queue item may be created if reminders are enabled.

`api/review-click.js`:
- accepts only a valid random booking-feedback token;
- loads the Google destination from server settings only;
- records `public_review_clicked_at` once;
- returns HTTP 302 to that configured Google URL;
- does not accept a request-controlled redirect destination.

## One automatic reminder
`lib/review-reminders.js` reuses the existing booking notification queue. It:
- schedules at most one reminder per booking/completion event;
- uses owner-configured delay, default 7 days, bounded 2–30 days (Admin exposes 3/5/7/10/14);
- cancels if review requests/reminders are disabled, the booking is no longer completed, the feedback invite is missing, private feedback has already been submitted, or the Google review link was already clicked;
- sends neutral language welcoming positive, neutral and negative experiences;
- offers private feedback as an alternative;
- explicitly says no review reward is offered and that it is the only automatic Google-review reminder for that job;
- sets `public_review_reminder_sent_at` only after successful delivery.

`api/booking-notifications.js` runs this as an isolated `review_reminders` stage between initial post-job delivery and general booking/business stages so a review reminder failure cannot block operational notifications.

## Admin dashboard
`api/admin-review-dashboard.js` requires `bookings` permission and provides 30/90/365-day reporting:
- completed jobs;
- actual review requests emailed;
- Google review clicks;
- tracked-email click-through rate;
- private feedback submissions/response rate;
- average private rating;
- reminders sent;
- unresolved private feedback needing attention.

It also returns recent completed-job review history with customer/service, feedback, request, click and reminder timestamps.

`admin-post-job-followup.js` now provides owner review settings, message preview, metrics and recent history. `admin-review-dashboard.css` supplies responsive styling. `admin.js` loads both at `6.4.43-google-reviews-1` without changing the older Admin base.

## Fair-review invariants
- Google review availability never depends on a positive private rating.
- Private low ratings continue into the existing support workflow.
- No reward/incentive is offered for reviews.
- Public review requests can be paused without disabling private feedback.
- The one automatic reminder stops after either private-feedback submission or Google-review click.

## Commercial/safety state
- Customer commercial Stripe remains OFF; production has zero `site_settings` rows with key `payments`.
- Do not configure a guessed Google Business review URL.
- Do not manufacture production customers/bookings/reviews just to test this feature.
- Real-world functional review testing should occur with the first genuine completed customer job.

# Existing live product layers
Post-job Customer Experience PR #96 remains live below this release: completed-job panel, private feedback, fair review access, safe repeat quoting and recurring next-clean guidance. Staff operations v3 PR #94 remains live below that with checklist/completion gate, incident reporting and On My Way/customer ETA.

Manual real-world Staff/post-job review smoke tests remain deferred until genuine production jobs exist.
