# Namdar AI fast resume

Last verified: 2026-09-17 UTC

Read this first. Use `docs/AI_HANDOFF.md` for implementation detail and `docs/PROJECT_STATUS.md` for roadmap/status.

## Production source of truth
- Repo `pchroonic/pchroonic`, default `main`.
- Current `main`: `74e9d6740cd06d7a348a995185e1f623b3461ff8` (docs PR #95 on top of Staff operations v3).
- Current live product merge: `784b7c766ed88fe8f53057dd1a657555d57da69d` (PR #94 Staff operations v3).
- Staff operations version/cache token: `6.4.41-staff-operations-v3-1`; Staff v2 remains loaded underneath as `6.4.40-staff-experience-v2-1`; auth/security modules remain `6.4.31-staff-auth-recovery-1`.
- Admin base JavaScript remains `6.4.37-admin-website-crash-fix-1`; modal CSS `6.4.38-admin-wide-modal-fix-1`; access roles `6.4.39-access-roles-1`.
- Customer base loader remains `6.4.35-payment-policy-engine-1`, with the Staff-v3 ETA extension loaded separately.
- Supabase production project: `qjigldxjcpnrlyxgmlqq`.
- Vercel production deployment `dpl_BvETZL2tzcUvfx9Nivaid1RATUrJ` is READY and aliased to `namdar.co.uk`.
- Window Cleaning is the only live/quotable/bookable service.
- Customer Stripe remains OFF; no commercial deposit bands are active.
- Ask Namdar provider AI remains OFF.
- Privileged Staff/Admin access requires CAPTCHA + AAL2/TOTP MFA.

## Post-job Customer Experience — RELEASE CANDIDATE
Branch: `feature/post-job-customer-experience-20260917`.
Candidate extension token: `6.4.42-post-job-experience-1`.

Purpose: turn a completed Window Cleaning job into a clean customer loop inside My Namdar without weakening the existing quote, booking, feedback or payment boundaries.

Candidate behavior:
- completed booking cards gain a clear **Job complete** panel;
- customers can open private service feedback directly from the completed job;
- when `site_settings.reviews.public_review_url` is configured, every completed customer can open the honest Google-review link regardless of rating;
- Google-review clicks are recorded on the existing `booking_feedback` row, with no reward or positive-rating gate;
- **Book again** asks for confirmation and then creates a fresh quote through the existing authenticated `/api/quote` path using only sanitised previous Window Cleaning job inputs;
- repeat quotes re-run current postcode coverage, pricing, payment-policy and quote rules and do not create a booking automatically;
- previous free-text notes, old price and urgency are not blindly reused; urgency resets to standard and pricing is recalculated;
- recurring 4/8/12-week (and legacy monthly/quarterly) jobs show an approximate next-clean guide date, explicitly stating that nothing is booked automatically.

New files:
- `account-post-job.js`
- `account-post-job.css`
- `api/customer-post-job.js`
- `scripts/post-job-customer-experience.test.mjs`
- `.github/workflows/post-job-customer-experience-check.yml`

Changed:
- `account.js` loads the isolated post-job JS/CSS extension;
- `api/customer-jobs.js` exposes only a sanitised Window repeat-quote template and recurring interval for completed jobs.

No database migration is required. The feature reuses the existing `booking_feedback` and review settings infrastructure. No customer, quote, booking or payment test data should be created for release verification. Commercial Stripe remains OFF.

## Staff operations v3 — LIVE
PR #94 adds field-quality and incident operations without replacing the existing secure Staff lifecycle.

Live capabilities include the six-step Window Cleaning quality checklist, server-side completion gate, incident reporting/evidence, Admin incident review, On My Way ETA, customer expected-arrival display, private RLS-protected field tables, and the Staff PWA cache generation `namdar-staff-v6.4.41-staff-operations-v3-1`.

Release evidence:
- exact tested head `370a75d47f6d757179b02ce5db79d7ea6b87c877`;
- full CI `35080584185` SUCCESS;
- Staff v3 CI `35080584357` SUCCESS;
- Staff v2 compatibility CI `35080584294` SUCCESS;
- preview `dpl_5ybJj7duWzrrYqZZbW7CBAVp9UXH` READY / clean;
- merge `784b7c766ed88fe8f53057dd1a657555d57da69d`;
- production `dpl_BvETZL2tzcUvfx9Nivaid1RATUrJ` READY / clean / `namdar.co.uk` alias.

## Existing live systems
- Staff app v2 daily command centre and route workflow.
- Owner + custom Admin roles.
- Responsive Admin booking editor.
- Secure Admin logo upload and Website/Legal crash fix.
- Flexible payment/deposit policy engine with commercial Stripe still OFF.
- Privacy Centre, Security Hardening, Business Finance, Smart Receipts, Newsletter Centre and guided Ask Namdar.

## Open items
- Finish CI/preview/release verification for the Post-job Customer Experience candidate.
- Authenticated Staff v3 mobile smoke test with a real assigned job.
- Configure the real Google Business review-request URL when available; until then the public-review button remains hidden.
- Commercial Stripe decision and actual deposit policy remain separate owner decisions.
- ICO self-assessment, Supabase Leaked Password Protection, real-job pricing calibration, SMS/legal checks, Node `url.parse()` cleanup and the parked address-data pilot remain open.
