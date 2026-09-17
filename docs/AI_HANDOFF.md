# Namdar AI handoff

Last verified: 2026-09-17 UTC

Read `docs/AI_START.md` first. Use `docs/PROJECT_STATUS.md` for roadmap/status.

## Production baseline
- Repo `pchroonic/pchroonic`, default `main`.
- Current `main` is `74e9d6740cd06d7a348a995185e1f623b3461ff8` (docs PR #95 on top of PR #94).
- Current live product merge `784b7c766ed88fe8f53057dd1a657555d57da69d` from PR #94.
- Staff operations v3 token `6.4.41-staff-operations-v3-1`; Staff v2 token `6.4.40-staff-experience-v2-1`; Staff auth/security base `6.4.31-staff-auth-recovery-1`.
- Admin base `6.4.37-admin-website-crash-fix-1`; modal layout `6.4.38-admin-wide-modal-fix-1`; access roles `6.4.39-access-roles-1`.
- Customer base loader `6.4.35-payment-policy-engine-1` with a separate v3 ETA extension.
- Supabase production: `qjigldxjcpnrlyxgmlqq`.
- Vercel project `prj_4fILo0pCaLGUSUIMWrBIVGzeWVDC`; team `team_8Az8WtWcnfwtYRdhR8vGqC3L`.
- Production deployment `dpl_BvETZL2tzcUvfx9Nivaid1RATUrJ` is READY on `namdar.co.uk`.
- Window Cleaning only live. Customer Stripe OFF. Provider AI OFF. Privileged access requires CAPTCHA + AAL2/TOTP.

# Post-job Customer Experience — RELEASE CANDIDATE

Branch: `feature/post-job-customer-experience-20260917`.
Candidate token: `6.4.42-post-job-experience-1`.

## Goal
Close the customer lifecycle after Staff marks a Window Cleaning job complete: completed-job clarity, private feedback, honest Google reviews, simple repeat quoting and recurring-clean guidance. This extends existing live systems rather than creating a parallel booking/review stack.

## Existing foundations reused
- `lib/post-job-followup.js` already emails every completed customer and offers private feedback plus an honest Google review when configured.
- `api/feedback.js` already routes low/private feedback to support and records public-review clicks without rewarding or gating reviews behind positivity.
- `booking_feedback` already stores one feedback/review state per booking.
- `site_settings.reviews.public_review_url` is the existing source for the public Google-review URL.
- `api/customer-jobs.js` / `account-original.js` already show completed job photos, timeline, price and billing status.
- `/api/quote` remains the only repeat-quote creation path used by this feature, so current coverage/pricing/payment-policy rules are recalculated.

## New authenticated post-job API
`api/customer-post-job.js`:
- requires `requireCustomer(req)` for every request;
- scopes every booking action to `bookings.customer_id = signed-in user`;
- refuses post-job mutations unless the booking is completed;
- GET returns only review availability and existing feedback status for the signed-in customer's completed bookings;
- POST `feedback_link` calls the existing `ensureBookingFeedbackInvite` helper and returns the private `/feedback?token=...` path;
- POST `public_review_click` loads the existing configured review URL, ensures the booking feedback row exists, records `public_review_clicked_at`, and returns the URL;
- review availability is not conditional on a high rating.

No new public endpoint exposes feedback tokens without customer authentication.

## Safe repeat-quote template
`api/customer-jobs.js` now selects quote `inputs` server-side but exposes only a sanitised repeat template for completed Window Cleaning jobs:
- units;
- detail factor;
- extra-work factor;
- floors;
- access;
- property type;
- recurring frequency.

Safeguards:
- no old free-text notes are returned in the repeat template;
- urgency is reset to `standard`;
- bounds/enums are revalidated before returning the template;
- old quote/final price is not reused as the new price;
- only completed Window Cleaning jobs receive a repeat template because Window Cleaning is the only live service.

The same response derives `recurringWeeks` for `4_weekly`, `8_weekly`, `12_weekly`, and legacy `monthly`/`quarterly` values.

## My Namdar UI extension
`account-post-job.js` wraps the existing `renderBookings` renderer after `account-original.js` instead of replacing it. For every completed job it adds:
- `Job complete ✓` customer summary;
- private feedback action;
- Google-review action only when the configured public-review URL exists;
- `Book again` only when a safe repeat template exists;
- approximate next-clean guide date for recurring jobs with explicit wording that nothing is automatically booked.

The repeat action asks for confirmation, then POSTs the sanitised prior physical job inputs to `/api/quote` with the signed-in customer's current profile/contact context. The normal quote endpoint rechecks current postcode coverage, pricing, promotions/rewards rules, payment-policy allowance and staff notification/email workflow. A repeat click therefore creates a **new quote request only**, never a booking or checkout.

`account-post-job.css` styles the panel and collapses actions to full-width mobile controls at narrow widths.

`account.js` keeps the base customer token unchanged and loads this feature separately with `6.4.42-post-job-experience-1`.

## Tests / CI
`scripts/post-job-customer-experience.test.mjs` verifies:
- authenticated completed-booking ownership boundary;
- reuse of existing private-feedback/public-review infrastructure;
- no positive-rating gate on public review availability;
- repeat quote uses `/api/quote` and does not call booking/checkout endpoints;
- safe repeat fields and next-clean guidance;
- account loader pins the new module/style token.

Dedicated CI: `.github/workflows/post-job-customer-experience-check.yml` syntax-checks the new customer JS/API and runs the regression suite. The normal repository handoff CI also runs and requires all three continuity files to move with product code.

## Database / commercial impact
No migration is required. Existing `booking_feedback`, `site_settings.reviews`, quotes/bookings and customer job data are reused.

Release verification must not create fake production customers, quotes, bookings, feedback, reviews or payments. Use CI, preview/build checks and unauthenticated endpoint behavior only; authenticated real-customer testing should happen naturally with a real completed job. Commercial Stripe remains OFF.

# Staff operations v3 — LIVE
PR #94 remains the live field-operations release. It adds the six-step Window Cleaning quality checklist, server-side completion gate, incident reporting/evidence, Admin incident review, On My Way ETA, customer ETA display and private RLS-protected field tables without replacing the existing Staff lifecycle.

Release evidence:
- exact tested head `370a75d47f6d757179b02ce5db79d7ea6b87c877`;
- full CI `35080584185` SUCCESS;
- Staff v3 CI `35080584357` SUCCESS;
- Staff v2 compatibility CI `35080584294` SUCCESS;
- exact-head preview `dpl_5ybJj7duWzrrYqZZbW7CBAVp9UXH` READY / clean;
- merge `784b7c766ed88fe8f53057dd1a657555d57da69d`;
- production `dpl_BvETZL2tzcUvfx9Nivaid1RATUrJ` READY / clean / aliased to `namdar.co.uk`.

## Manual Staff follow-up
Authenticated phone smoke test using a real assigned job: checklist save/gate, incident report/evidence, On My Way ETA, customer ETA display and Admin incident resolution. Do not create fake production customer/job/payment data just for this check.

# Other live systems
Owner/custom roles, Staff v2, responsive booking editor, secure logo upload, Website/Legal crash repair, Privacy Centre, Security Hardening, Business Finance, Smart Receipts, Newsletter Centre, guided Ask Namdar and the flexible payment-policy engine remain live/stable. Commercial Stripe remains OFF.
