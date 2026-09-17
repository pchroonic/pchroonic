# Namdar AI fast resume

Last verified: 2026-09-17 UTC

Read this first. Use `docs/AI_HANDOFF.md` for implementation detail and `docs/PROJECT_STATUS.md` for roadmap/status.

## Production source of truth
- Repo `pchroonic/pchroonic`, default `main`.
- Current main/product merge: `95cda91adb2fe7276f49a73d8626f97d87c2521e` (PR #102 Payment Receipt Tracking).
- Customer base loader remains `6.4.35-payment-policy-engine-1`; post-job extension `6.4.42-post-job-experience-1`; Staff operations/ETA `6.4.41-staff-operations-v3-1`.
- Admin base remains `6.4.37-admin-website-crash-fix-1`; Google Review System `6.4.43-google-reviews-1`; Stripe readiness `6.4.44-stripe-live-readiness-1`; payment receipts `6.4.45-payment-receipts-1`.
- Supabase production project: `qjigldxjcpnrlyxgmlqq`.
- Production deployment `dpl_HmwxY6oHCiCX8s14xrtHCK6CVpHz` is READY and aliased to `namdar.co.uk`.
- `/api/health` returned HTTP 200 / `ok:true` at `2026-09-17T19:23:15.221Z`.
- Window Cleaning is the only live/quotable/bookable service.
- Customer Stripe remains OFF: production has zero `site_settings` rows with key `payments` and zero active payment policies.
- Ask Namdar provider AI remains OFF.
- Privileged Staff/Admin access requires CAPTCHA + AAL2/TOTP MFA.
- No real Google Business review URL is configured yet, so public Google review requests/reminders remain off.

## Stripe live readiness — LIVE
PR #100 remains live below this release. Production payment provider readiness requires a recognised LIVE Stripe secret plus a configured webhook; TEST credentials can be used only for preview/sandbox validation and cannot activate production customer payments.

Current connected Stripe account `acct_1UFAd1Cu9tojH31y` is still test-only/incomplete: `charges_enabled=false`, `payouts_enabled=false`, `details_submitted=false`. Owner must complete Stripe business onboarding and accept Stripe Terms. Do not accept those legal terms or invent missing business details on the owner's behalf.

Do not enable production payments until owner onboarding is complete, LIVE credentials and a verified live webhook are configured, Stripe is ready for live charges/payouts, and the owner explicitly chooses the production deposit/balance policy.

## Payment Receipt Tracking — LIVE
Product PR #102: `Add traceable payment receipt references`.
Exact tested head: `e3c4e3147716d9697b2692aafe89a73454694cee`.
Merge/main: `95cda91adb2fe7276f49a73d8626f97d87c2521e`.
Production: `dpl_HmwxY6oHCiCX8s14xrtHCK6CVpHz`, READY, clean build, `namdar.co.uk` alias active.

Live behavior:
- every payment/refund has a stable Namdar receipt number derived from immutable `payment_records.id`, format `RCP-XXXXXXXX-XXXXXXXX`;
- the same receipt number appears in Stripe/manual payment or refund emails, My Namdar Billing, receipt PDFs, Admin payment tracking and manual-payment audit history;
- customer billing email includes invoice, amount, payment type/method, payment date, current paid/outstanding balance and a My Namdar Billing link;
- billing email is archived in the customer's Namdar message history;
- My Namdar shows receipt number beside each transaction and offers an authenticated receipt PDF download;
- receipt PDF and filename use the same receipt number and tell the customer to quote it for support;
- Admin transaction rows show the receipt number and Payments search supports `RCP-...` lookup;
- Stripe provider references/payment IDs remain internal reconciliation evidence and processor fee/net fields remain excluded from customer surfaces;
- duplicate Stripe webhook events remain provider-reference idempotent, preventing duplicate payment rows/receipt emails;
- no database migration was needed and existing payment rows were not rewritten.

Release verification:
- exact-head Stripe live-readiness check `35264280479`: SUCCESS;
- AI handoff/full JavaScript check `35264280446`: SUCCESS;
- Google Review compatibility `35264280451`: SUCCESS;
- Staff v3 compatibility `35264280558`: SUCCESS;
- Post-job compatibility `35264280869`: SUCCESS;
- exact-head preview `dpl_BNvoECAundwwbcB95Rh79nKKJyEV`: READY with clean errors-only build log;
- production health HTTP 200 / `ok:true`;
- live `account.js` and `admin.js` HTTP 200 and both pin `6.4.45-payment-receipts-1`;
- live `admin-payment-receipts.js` and `account-payments.js` HTTP 200;
- production release 5xx scan found no 5xx logs;
- Supabase readback after deployment: `payment_record_count=4`, `payments_settings_rows=0`, `active_payment_policy_rows=0`, so verification created no payment records and Stripe stayed OFF.

## Existing live layers
Google Review System PR #98 remains live, but its official Google review URL is intentionally unconfigured/off. Post-job Customer Experience PR #96 remains live. Staff operations v3 PR #94 remains live.

## Open items
- Owner completes Stripe business onboarding/TOS.
- Configure and verify LIVE Stripe production secret + live webhook; confirm charges/payouts are enabled.
- Owner chooses exact production deposit/balance policy, then activate customer Stripe payments.
- Configure the real Google Business Profile review-request URL later.
- Real-world authenticated review/post-job smoke with the first genuine completed customer job.
- Authenticated Staff v3 mobile smoke test with a real assigned job.
- Window real-job pricing calibration after genuine completed jobs accumulate.
- ICO self-assessment, Supabase Leaked Password Protection, SMS/legal checks, Node `url.parse()` cleanup and the parked address-data pilot remain open.
