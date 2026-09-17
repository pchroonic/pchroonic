# Namdar AI fast resume

Last verified: 2026-09-17 UTC

Read this first. Use `docs/AI_HANDOFF.md` for implementation detail and `docs/PROJECT_STATUS.md` for roadmap/status.

## Production source of truth
- Repo `pchroonic/pchroonic`, default `main`.
- Current live product merge: `e3d6c2ac840e0fe0ac8a757100ade3fb418eeca5` (PR #96 Post-job Customer Experience).
- Customer base loader remains `6.4.35-payment-policy-engine-1`; post-job extension is `6.4.42-post-job-experience-1`; Staff ETA extension remains `6.4.41-staff-operations-v3-1`.
- Staff operations v3 remains `6.4.41-staff-operations-v3-1`; Staff v2 remains `6.4.40-staff-experience-v2-1`.
- Admin base remains `6.4.37-admin-website-crash-fix-1`; modal layout `6.4.38-admin-wide-modal-fix-1`; access roles `6.4.39-access-roles-1`.
- Supabase production project: `qjigldxjcpnrlyxgmlqq`.
- Vercel production deployment `dpl_2Cusp5Hv9gJkxu6QPi2c2MRgHJLX` is READY and aliased to `namdar.co.uk`.
- `/api/health` returned HTTP 200 / `ok:true` at `2026-09-17T18:12:16.395Z` after deployment.
- Window Cleaning is the only live/quotable/bookable service.
- Customer Stripe remains OFF; no commercial deposit bands are active.
- Ask Namdar provider AI remains OFF.
- Privileged Staff/Admin access requires CAPTCHA + AAL2/TOTP MFA.

## Post-job Customer Experience — LIVE
Product PR: #96 `Add post-job customer experience and repeat quoting`.
Exact tested head: `e652b25a7dc36c0172b0642971cbe403d955a9c2`.
CI:
- full repository/handoff run `35257058653` SUCCESS;
- dedicated post-job run `35257058714` SUCCESS;
- Staff v3 compatibility run `35257058663` SUCCESS.
Exact-head preview: `dpl_J3863nqQnAt7EqxMPNKKKow6iP8M`, READY; errors-only build log clean.
Merge/main: `e3d6c2ac840e0fe0ac8a757100ade3fb418eeca5`.
Production: `dpl_2Cusp5Hv9gJkxu6QPi2c2MRgHJLX`, READY; clean build; `namdar.co.uk` alias active.

Live behavior:
- completed My Namdar booking cards show a dedicated **Job complete** panel;
- private service feedback can be opened directly from the completed job;
- when `site_settings.reviews.public_review_url` is configured, every completed customer can open the honest Google-review link regardless of rating;
- Google-review clicks are recorded on the existing `booking_feedback` row, with no reward or positive-rating gate;
- **Book again** asks for confirmation and creates a fresh quote through the existing authenticated `/api/quote` path using only sanitised previous Window Cleaning job inputs;
- repeat quotes re-run current postcode coverage, pricing and quote/payment-policy rules and never create a booking automatically;
- previous free-text notes, old price and urgency are not blindly reused; urgency resets to standard and pricing is recalculated;
- recurring 4/8/12-week and legacy monthly/quarterly jobs show an approximate next-clean guide date, explicitly stating that nothing is booked automatically.

Security / release verification:
- `/api/customer-post-job` requires signed-in customer access; unauthenticated GET returned HTTP 401 as expected;
- `account.js` HTTP 200 and loads `6.4.42-post-job-experience-1` JS/CSS;
- `account-post-job.js` HTTP 200/current;
- post-release 5xx scan found no 5xx logs;
- no database migration was required;
- no fake production customer, quote, booking, feedback, review or payment record was created for verification;
- commercial Stripe remains OFF.

## Staff operations v3 — LIVE
PR #94 remains the live field-operations base under the new post-job customer layer. It includes the six-step Window Cleaning quality checklist, server-side completion gate, incident reporting/evidence, Admin incident review, On My Way ETA, customer expected-arrival display and private RLS-protected field tables.

Release evidence:
- exact tested head `370a75d47f6d757179b02ce5db79d7ea6b87c877`;
- full CI `35080584185` SUCCESS;
- Staff v3 CI `35080584357` SUCCESS;
- Staff v2 compatibility CI `35080584294` SUCCESS;
- preview `dpl_5ybJj7duWzrrYqZZbW7CBAVp9UXH` READY / clean;
- merge `784b7c766ed88fe8f53057dd1a657555d57da69d`.

## Existing live systems
- Staff app v2 daily command centre and route workflow.
- Owner + custom Admin roles.
- Responsive Admin booking editor.
- Secure Admin logo upload and Website/Legal crash fix.
- Flexible payment/deposit policy engine with commercial Stripe still OFF.
- Privacy Centre, Security Hardening, Business Finance, Smart Receipts, Newsletter Centre and guided Ask Namdar.

## Open items
- Real-world authenticated smoke of Post-job Customer Experience when the first genuine completed customer job is available; do not create fake production data for this.
- Authenticated Staff v3 mobile smoke test with a real assigned job.
- Configure the real Google Business review-request URL when available; until then the public-review button remains hidden.
- Window real-job pricing calibration after genuine completed jobs accumulate.
- Commercial Stripe decision and actual deposit policy remain separate owner decisions.
- ICO self-assessment, Supabase Leaked Password Protection, SMS/legal checks, Node `url.parse()` cleanup and the parked address-data pilot remain open.
