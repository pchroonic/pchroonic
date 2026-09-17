# Namdar AI handoff

Last verified: 2026-09-17 UTC

Read `docs/AI_START.md` first. Use `docs/PROJECT_STATUS.md` for roadmap/status.

## Production baseline
- Repo `pchroonic/pchroonic`, default `main`.
- Current live product merge `e3d6c2ac840e0fe0ac8a757100ade3fb418eeca5` from PR #96.
- Customer base loader remains `6.4.35-payment-policy-engine-1`; Post-job Customer Experience extension is `6.4.42-post-job-experience-1`; Staff ETA extension remains `6.4.41-staff-operations-v3-1`.
- Staff operations v3 token `6.4.41-staff-operations-v3-1`; Staff v2 token `6.4.40-staff-experience-v2-1`; Staff auth/security base `6.4.31-staff-auth-recovery-1`.
- Admin base `6.4.37-admin-website-crash-fix-1`; modal layout `6.4.38-admin-wide-modal-fix-1`; access roles `6.4.39-access-roles-1`.
- Supabase production: `qjigldxjcpnrlyxgmlqq`.
- Vercel project `prj_4fILo0pCaLGUSUIMWrBIVGzeWVDC`; team `team_8Az8WtWcnfwtYRdhR8vGqC3L`.
- Production deployment `dpl_2Cusp5Hv9gJkxu6QPi2c2MRgHJLX` is READY and aliased to `namdar.co.uk`.
- Health HTTP 200 / `ok:true` at `2026-09-17T18:12:16.395Z`.
- Window Cleaning only live. Customer Stripe OFF. Provider AI OFF. Privileged access requires CAPTCHA + AAL2/TOTP.

# Post-job Customer Experience — LIVE

Product PR #96: `Add post-job customer experience and repeat quoting`.
Exact tested head: `e652b25a7dc36c0172b0642971cbe403d955a9c2`.
Full repository/handoff CI `35257058653`: SUCCESS.
Dedicated Post-job CI `35257058714`: SUCCESS.
Staff v3 compatibility CI `35257058663`: SUCCESS.
Exact-head Vercel preview `dpl_J3863nqQnAt7EqxMPNKKKow6iP8M`: READY with clean errors-only build logs.
Merge/main: `e3d6c2ac840e0fe0ac8a757100ade3fb418eeca5`.
Production deployment `dpl_2Cusp5Hv9gJkxu6QPi2c2MRgHJLX`: READY, clean build, `namdar.co.uk` alias active.

## Goal
Close the customer lifecycle after Staff marks a Window Cleaning job complete: completed-job clarity, private feedback, honest Google reviews, simple repeat quoting and recurring-clean guidance, while keeping the existing quote/booking/payment boundaries authoritative.

## Existing foundations reused
- `lib/post-job-followup.js` continues to email every completed customer and offers private feedback plus an honest Google review when configured.
- `api/feedback.js` remains the public feedback form boundary and does not gate public review access behind a positive rating.
- `booking_feedback` remains the one feedback/review state per booking.
- `site_settings.reviews.public_review_url` remains the source for the Google Business review URL.
- `api/customer-jobs.js` / `account-original.js` continue to provide completed-job photos, timeline, price and billing status.
- `/api/quote` remains the quote-creation boundary for repeat work, so current coverage/pricing/payment-policy logic is recalculated.

## Authenticated post-job API
`api/customer-post-job.js`:
- requires `requireCustomer(req)` for every request;
- scopes booking actions to the signed-in customer's own booking;
- refuses post-job actions unless the booking is completed;
- GET returns review availability and feedback status for the signed-in customer's completed bookings without returning feedback tokens;
- POST `feedback_link` uses `ensureBookingFeedbackInvite` and returns the existing private feedback path;
- POST `public_review_click` loads the configured public review URL, ensures a booking-feedback row exists, records `public_review_clicked_at`, and returns the URL;
- public-review availability is not conditional on a high rating.

Production unauthenticated GET `/api/customer-post-job` returned HTTP 401 `Please sign in to your Namdar account.` as expected. This security verification did not create data.

## Safe repeat quoting
`api/customer-jobs.js` exposes a sanitised repeat template only for completed Window Cleaning jobs. Allowed repeat fields are bounded/revalidated units, detail factor, extra-work factor, floors, access, property type and recurring frequency.

Safeguards:
- old free-text notes are not copied;
- urgency resets to `standard`;
- the old quote/final price is not used as the new price;
- only completed Window Cleaning jobs receive a repeat template;
- `Book again` asks for confirmation and POSTs to the normal `/api/quote` endpoint;
- current coverage, pricing and payment-policy allowance are recalculated;
- the action creates a new quote request only, never a booking or Stripe checkout.

The same customer-jobs response derives recurring intervals for 4/8/12-week and legacy monthly/quarterly frequency values.

## My Namdar UI
`account-post-job.js` wraps the existing booking renderer instead of replacing it. Completed booking cards now gain:
- `Job complete ✓` customer summary;
- private feedback action;
- Google-review action only when the configured public-review URL exists;
- `Book again` when a safe repeat template exists;
- an approximate next-clean guide for recurring jobs, explicitly saying nothing is booked automatically.

`account-post-job.css` gives the extension responsive mobile actions. `account.js` keeps the base customer token unchanged and separately loads JS/CSS with token `6.4.42-post-job-experience-1`.

## Production verification
- `/api/health`: HTTP 200 / `ok:true`.
- `/account.js`: HTTP 200 and loads `account-post-job.css` + `account-post-job.js` at `6.4.42-post-job-experience-1`.
- `/account-post-job.js`: HTTP 200/current.
- `/api/customer-post-job`: unauthenticated GET returns 401 as required.
- Production 5xx scan for `dpl_2Cusp5Hv9gJkxu6QPi2c2MRgHJLX`: no 5xx logs found.
- Errors-only deployment build log was clean.
- No migration was required.
- No fake production customer, quote, booking, feedback, review or payment record was created during verification.
- Customer commercial Stripe remains OFF.

The next functional smoke should occur with a genuine completed customer job so the private-feedback/review/repeat-quote experience can be exercised without manufacturing production data.

# Staff operations v3 — LIVE
PR #94 remains the field-operations layer underneath this release. It includes the six-step Window Cleaning quality checklist, server-side completion gate, incident reporting/evidence, Admin incident review, On My Way ETA, customer ETA display and private RLS-protected field tables.

Release evidence:
- exact tested head `370a75d47f6d757179b02ce5db79d7ea6b87c877`;
- full CI `35080584185` SUCCESS;
- Staff v3 CI `35080584357` SUCCESS;
- Staff v2 compatibility CI `35080584294` SUCCESS;
- exact-head preview `dpl_5ybJj7duWzrrYqZZbW7CBAVp9UXH` READY / clean;
- merge `784b7c766ed88fe8f53057dd1a657555d57da69d`.

## Manual Staff follow-up
Authenticated phone smoke test using a real assigned job: checklist save/gate, incident report/evidence, On My Way ETA, customer ETA display and Admin incident resolution. Do not create fake production customer/job/payment data just for this check.

# Other live systems
Owner/custom roles, Staff v2, responsive booking editor, secure logo upload, Website/Legal crash repair, Privacy Centre, Security Hardening, Business Finance, Smart Receipts, Newsletter Centre, guided Ask Namdar and the flexible payment-policy engine remain live/stable. Commercial Stripe remains OFF.
