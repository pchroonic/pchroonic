# Namdar AI handoff

Last verified: 2026-09-15 UTC

Read `docs/AI_START.md` first.

## Production baseline
- Repo `pchroonic/pchroonic`, default `main`.
- Current live product merge: `f2e7eedb4a795242dfacd350f0704b85e4e67885` (PR #84).
- Current Admin release version: `6.4.36-admin-logo-upload-1`; customer loader remains `6.4.35-payment-policy-engine-1`.
- Supabase production `qjigldxjcpnrlyxgmlqq`.
- Vercel project `prj_4fILo0pCaLGUSUIMWrBIVGzeWVDC`, team `team_8Az8WtWcnfwtYRdhR8vGqC3L`.
- Current production deployment `dpl_DYJtSFFYZeH8xAK1mX4WgNRDULZb`, READY.
- Window Cleaning only live.
- Stripe commercial customer payment policy OFF. Production has `0` `site_settings.payments` rows.
- Ask Namdar provider AI OFF (`aiEnabled:false`).
- Privileged Staff/Admin requires CAPTCHA + AAL2/TOTP MFA.

# Admin website logo upload — LIVE

Product PR #84: `Add secure Admin logo upload`.
Exact tested head: `9995e8e2a199beee24cabe4d24175f82bd293398`.
GitHub CI run `34973739008`: SUCCESS.
Exact-head Vercel preview `dpl_Dvu9ctLyXRB16qrH1Q1wJXr8c7KF`: READY, errors-only build log clean.
Product merge/main: `f2e7eedb4a795242dfacd350f0704b85e4e67885`.
Production deployment `dpl_DYJtSFFYZeH8xAK1mX4WgNRDULZb`: READY, errors-only build log clean.
Production `/api/health`: HTTP 200 / `ok:true` at `2026-09-15T13:15:44.843Z`.

## Owner request
The owner asked for the existing Website & legal → Logo URL setting to also support uploading a logo directly from the Admin dashboard instead of requiring a manually hosted URL.

## Admin UI
`admin-brand-assets.js` augments the existing Logo URL label without rewriting the large legacy Admin bundle:
- adds a local file picker and **Upload logo** button;
- accepts PNG, JPG, WebP and AVIF only;
- enforces a 2 MB client-side limit;
- previews the selected local image before upload;
- uploads through `/api/admin-brand-logo`;
- on success, replaces the Logo URL input with the returned permanent public Storage URL;
- preserves the existing explicit **Save website settings** step, so upload alone does not silently change the published brand setting;
- shows a preview for the saved/current URL when Website & legal is opened.

`admin.js` loads the feature after `admin-original.js` and uses Admin loader version `6.4.36-admin-logo-upload-1`.

## Secure upload endpoint
`api/admin-brand-logo.js`:
- accepts POST only;
- calls `requireStaff(req, 'settings')`, inheriting active-account checks, settings permission checks and the AAL2/TOTP requirement from `lib/server.js`;
- decodes the image server-side using `lib/brand-logo.js`;
- does not trust the filename or browser MIME type;
- uploads with the existing Supabase service credential only after authorization succeeds;
- writes to `brand-assets/logos/` using a random/versioned object name;
- returns the conventional public Storage URL;
- audit logs `website.logo_upload` with bucket/path/type/size metadata.

An unauthenticated GET to the live route returns HTTP 405 `Method not allowed`; the upload path is POST-only and the real POST remains protected by Staff/Admin authorization and MFA.

## Image validation
`lib/brand-logo.js`:
- maximum 2 MB decoded bytes;
- validates base64 structure before decoding;
- checks real file signatures for PNG, JPEG, WebP and AVIF;
- rejects SVG/HTML/arbitrary files even if a browser-supplied MIME type claims they are images;
- is covered by `scripts/brand-logo.test.mjs`.

## Storage design
Dedicated Supabase bucket: `brand-assets`.

Production migration:
- database migration version: `20260915130427`
- name: `brand_assets_logo_upload`
- repo migration: `supabase/migrations/20260915130427_brand_assets_logo_upload.sql`
- public serving enabled intentionally because the website logo must be accessible to anonymous visitors;
- 2 MB bucket limit;
- allowed MIME types: JPEG, PNG, WebP, AVIF;
- no direct browser upload policy exists for this bucket; uploading is performed by the authenticated server endpoint after Staff/Admin permission and MFA checks.

This avoids widening the existing `job-images` permissions and keeps brand assets separate from customer/job files.

## CI coverage
`.github/workflows/ai-handoff-check.yml` checks:
- `admin-brand-assets.js`
- `api/admin-brand-logo.js`
- `lib/brand-logo.js`
- `scripts/brand-logo.test.mjs`

During release preparation, older regression tests that intentionally pin the Admin loader version were updated to the new `6.4.36-admin-logo-upload-1` value while preserving their original protected-module assertions. The final full CI run passed.

## Live release verification
- `admin.js` HTTP 200 and serves `6.4.36-admin-logo-upload-1`.
- `admin.js` loads `admin-brand-assets.js` while retaining payment settings, finance, health, newsletter, privacy and security modules.
- `admin-brand-assets.js` HTTP 200/current.
- `/api/health` HTTP 200 / healthy.
- release deployment runtime error/fatal scan found no logs for the new deployment.
- Supabase `brand-assets` bucket remains public for reads, capped at 2 MB and limited to JPEG/PNG/WebP/AVIF.
- production still has `0` `site_settings` rows with key `payments`.
- no logo was uploaded as release test data, so the saved production brand was not changed during verification.
- no real customer, booking, deposit, payment, late fee or refund data was created.
- commercial Stripe activation remains OFF.

# Flexible Payment & Deposit Policy Engine — LIVE

Product PR #82: `Add flexible payment and deposit policy engine`.
Exact tested head: `54e480a00e93bb780e687d0f59a0f14a2aa3bc29`.
GitHub CI run `34965887792`: SUCCESS.
Exact-head Vercel preview `dpl_uUHG5oQaiP6gTiV3sFXoxwRisM3F`: READY, errors-only build log clean.
Product merge/main: `ab1d95930816f3116828e410bf07e6208e93216f`.
Product production deployment `dpl_GvU42X4GGN3mGRojFJTcvRBZfsV4`: READY, build clean. Later releases are now current production.
Production `/api/health`: HTTP 200 / `ok:true` verified after deployment.

## Owner-approved design intent
The owner asked for a system that can change as real trading experience develops rather than a permanent fixed deposit:
- Admin can change deposit policy for future bookings;
- larger final quote values can require larger deposit percentages/minimums;
- every new booking freezes the payment policy presented at appointment request time;
- later policy edits cannot silently increase an existing booking’s deposit;
- remaining balance can be due at completion or a configured number of hours after the job;
- overdue balances can escalate through reminders, future-booking hold and recovery review;
- no automatically increasing or compounding consumer monetary penalty is generated by this engine;
- B2B statutory interest/recovery remains separate/manual until explicit business-customer classification and commercial controls exist.

## Payment policy engine
`lib/payment-policy.js` fields:
- `revision`
- `active`
- `mode`: optional / deposit_required / full_required
- `depositStrategy`: flat / tiered
- flat `depositPercent`, `minimumDeposit`
- `depositBands[]`: minAmount, maxAmount, percent, minimumDeposit
- `allowFullPayment`
- `balanceDueHours` (0–168)
- overdue reminder days
- overdue booking-hold day
- overdue final-review day
- consumer monetary late fees forced false
- commercial recovery mode manual review
- existing headline allowance fields unchanged.

Helpers:
- `validateDepositBands`: £0 start, contiguous bands, open-ended final band, non-decreasing protection.
- `resolveDepositRule`: resolves the job-value rule.
- `snapshotPaymentPolicy`: freezes exact customer-facing rules and deposit amount.
- `paymentPolicyFromSnapshot`: restores contract rules without inheriting later Admin changes.
- `paymentRequirementMet`: checks actual net money received against the locked deposit/full requirement.
- `checkoutPlan(...forceBalance)`: completed/due invoices request the full outstanding balance.
- `balanceDueAt`, `overdueStage`: due/hold/recovery calculations.
- `commercialLatePaymentPreview`: 8% + supplied Bank base rate and £40/£70/£100 recovery bands, always `automatic:false`, `reviewRequired:true`.

The code fallback remains inactive/optional 20% / £10 only as a safe default. There is no production payments settings row and these values are not commercially approved.

## Admin policy editor
`admin-payment-settings.js` + `api/admin-payment-settings.js` support:
- flat or job-value-tiered deposits;
- dynamic add/remove bands;
- balance-due timing;
- reminder days;
- booking hold day;
- recovery review day;
- policy revision display;
- full-pay option and existing headline-price allowance.

Every Admin save increments `policy_revision` and is audit logged. Invalid tiers cannot be activated. Stripe activation remains blocked unless secret + verified webhook are configured. Saving an inactive draft policy is allowed without enabling customer payment.

## Customer booking commitment and frozen terms
`api/customer-quote-action.js` returns a safe `paymentCommitment` for an accepted quote.

`account-booking-policy.js` v6.4.35:
- shows exact deposit/full/optional commitment before appointment request;
- shows balance due timing and overdue escalation;
- explicitly states no automatic consumer penalty/compounding fee/interest;
- sends `paymentPolicyRevision` and blocks submission until current terms load.

`api/booking-core.js`:
- loads current policy server-side;
- rejects stale/missing revisions;
- blocks an active required-payment request when the payment provider is unavailable;
- checks for materially overdue prior invoices only when that earlier invoice has its own active payment-policy snapshot and recorded hold threshold;
- freezes `payment_policy_revision`, `payment_policy_locked_at`, `payment_policy_snapshot`, `deposit_required` on the new booking;
- records payment terms in customer/staff communications.

## Admin-created booking non-retroactivity fix
New Admin-created Window appointments snapshot the current payment policy when created. If the active policy requires payment, a real final quote is required and a direct Confirmed creation cannot bypass the required-payment flow.

For existing true legacy bookings that have no payment snapshot, later Admin confirmation does **not** apply today’s payment/deposit policy retroactively. This preserves the owner invariant that future policy changes affect future bookings only.

## Invoice / checkout / confirmation enforcement
`lib/server.js` copies an active booking snapshot to invoices and records deposit/due/hold/review settings. Only active-policy snapshots alter invoice `due_at` to job end + configured `balanceDueHours`; legacy/payment-off bookings keep old due-date behavior.

`api/create-checkout.js`:
- still requires live Stripe readiness and global payment activation;
- restores frozen booking/invoice contract policy;
- never forces a legacy booking into a new deposit rule;
- completed or due invoices use full outstanding balance;
- idempotent Stripe checkout behavior retained.

`api/admin-booking-update.js`:
- customer-booking confirmation uses the frozen policy;
- actual net paid must meet the locked deposit/full amount;
- tiny part payment cannot satisfy a larger required deposit;
- legitimate recorded money can satisfy frozen terms even if Stripe later becomes temporarily unavailable;
- legacy no-snapshot bookings remain legacy.

## Billing / overdue behavior
`api/customer-billing.js` + `account-payments.js` expose only customer-safe payment-policy data:
- revision;
- frozen deposit amount;
- balance timing;
- overdue days;
- booking-hold/recovery state;
- `consumerMonetaryLateFees:false`.

No provider cost/private Stripe fields are exposed.

`lib/business-followup-batched.js`:
- active-policy invoices use reminder days frozen in their snapshot;
- legacy/inactive-policy invoices keep the prior 1/8/15/29-day reminder schedule;
- reminder metadata can record hold/review thresholds but never adds money to the invoice.

## Production migration — APPLIED
Repo migration: `supabase/migrations/20260915111500_flexible_payment_policy_engine.sql`.
Applied to Supabase production as migration `flexible_payment_policy_engine` after exact-head CI and preview passed.

Verified booking columns:
- `payment_policy_revision`
- `payment_policy_locked_at`
- `payment_policy_snapshot`
- `deposit_required`

Verified invoice columns:
- `payment_policy_revision`
- `payment_policy_snapshot`
- `deposit_required`
- `balance_due_hours`
- `overdue_booking_hold_days`
- `overdue_final_review_days`

Published Terms verified at v3 with `Payment due dates and overdue balances`. Wording preserves non-retroactivity, consumer fairness/no automatic monetary penalty, and separate B2B treatment.

Production verification confirmed `0` `site_settings` rows with key `payments`; migrations/deploys did not activate commercial payments.

## Privacy/export
`api/customer-data-export.js` includes customer-safe booking/invoice payment-policy evidence and still excludes provider fees/IDs, private staff notes and tokens.

## Payment release verification evidence
- exact product head `54e480a00e93bb780e687d0f59a0f14a2aa3bc29`
- CI run `34965887792` SUCCESS
- exact preview `dpl_uUHG5oQaiP6gTiV3sFXoxwRisM3F` READY, errors-only build clean
- production migration applied and schema/Terms verified
- product merge `ab1d95930816f3116828e410bf07e6208e93216f`
- product production deployment `dpl_GvU42X4GGN3mGRojFJTcvRBZfsV4` READY, build clean
- `/account.js` 200, v`6.4.35-payment-policy-engine-1`
- `/admin-payment-settings.js` 200/current and retained by the newer Admin loader
- `/account-booking-policy.js` 200/current
- `/api/legal?slug=terms` 200, Terms v3/current
- no real booking, deposit, payment, late fee or refund created for release verification
- the already-known Node `url.parse()` deprecation warning remains open technical debt.

# Stable live systems
- Fair 48-hour cancellation/deposit policy remains live and is part of the current Terms.
- Privacy Centre remains live; owner postponed public controller legal-name/postal-address publication.
- Staff auth recovery and Security Hardening remain live.
- Business Finance / Smart Receipts private and sole-trader-first.
- Newsletter Centre consent-aware/resumable.
- Ask Namdar guided assistant live; provider AI off.
- Commercial Stripe payments remain OFF until a separate explicit owner decision on activation and actual bands.

## Remaining open items
- Owner later chooses actual commercial deposit bands/amounts and whether/when to activate Stripe.
- Explicit business-customer classification before any automated B2B statutory-debt workflow.
- ICO data-protection fee self-assessment.
- Supabase Leaked Password Protection.
- Google review-request URL.
- Window real-job pricing calibration.
- SMS/legal checks.
- `url.parse()` deprecation cleanup.
- Address-data pilot remains parked.
