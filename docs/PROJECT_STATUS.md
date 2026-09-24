# Namdar project status

Last updated: 2026-09-25 UTC

## Production baseline
- Repo `pchroonic/pchroonic`, default `main`.
- Current production main merge `a5b7c7ebd6222ea56015ef7e730a3d7ed50f8188` (PR #106 inbox bulk-selection hotfix). PR #102 Payment Receipt Tracking remains live.
- Customer base loader `6.4.35-payment-policy-engine-1`; post-job extension `6.4.42-post-job-experience-1`; Staff operations/ETA `6.4.41-staff-operations-v3-1`.
- Admin base `6.4.37-admin-website-crash-fix-1`; Google Review System `6.4.43-google-reviews-1`; Stripe readiness `6.4.44-stripe-live-readiness-1`; Payment Receipt Tracking `6.4.45-payment-receipts-1`.
- Supabase production `qjigldxjcpnrlyxgmlqq`.
- Vercel team is on Pro. Production deployment `dpl_DTEE2rpAstJ59btQ1UQEVmw5kQnR` is READY and aliased to `namdar.co.uk`; health HTTP 200 / `ok:true` at `2026-09-24T23:16:26.327Z`.
- Hourly booking-notification cron (`7 * * * *`) is restored.
- Window Cleaning only live.
- Privileged Staff/Admin requires CAPTCHA + AAL2/TOTP MFA.
- Customer Stripe is ACTIVE for new Window Cleaning bookings: revision 1, required 20% deposit, full upfront payment allowed, remaining balance due at completion.
- Ask Namdar provider AI remains disabled.
- Google Business review URL remains unconfigured/off.

## Stripe live readiness — LIVE
PR #100 / Admin extension `6.4.44-stripe-live-readiness-1` remains live. Production provider readiness requires recognised LIVE Stripe credentials plus configured webhook; TEST credentials remain preview/sandbox-only and cannot activate production payments.

Stripe account `acct_1UFAd1Cu9tojH31y` is live and fully onboarded: charges/payouts enabled, details submitted, verification complete, card payments and transfers active. Live production webhook `https://namdar.co.uk/api/stripe-webhook` is enabled and production runtime has the live Stripe secret plus webhook secret. Customer payments are active under payment-policy revision 1; the first genuine live payment remains the end-to-end checkout/webhook/receipt validation.

## Payment Receipt Tracking — LIVE
PR #102 / customer+Admin asset `6.4.45-payment-receipts-1`.

Live improvements:
- stable Namdar receipt number for every payment/refund, derived deterministically from immutable payment UUID (`RCP-XXXXXXXX-XXXXXXXX`);
- Stripe payment/refund emails include receipt number, invoice, amount, date, payment type/method and current invoice balance;
- manually recorded non-Stripe payments/refunds use the same receipt-number/email standard;
- billing emails remain archived in the customer's Namdar messages;
- My Namdar Billing shows the receipt number beside every transaction and offers authenticated receipt-PDF downloads;
- receipt PDFs and filenames use the same receipt number and invoice PDFs show receipt references in payment history;
- Admin payment transaction rows display the receipt number and Payments search supports `RCP-...` lookup;
- manual payment/refund audit records include the receipt number;
- Stripe provider IDs remain separate internal reconciliation evidence and customer surfaces still exclude processor fee/net data;
- no database migration or payment-row rewrite was needed;
- duplicate Stripe webhook deliveries remain idempotent and do not create duplicate payment rows/receipt emails.

Release evidence:
- exact tested head `e3c4e3147716d9697b2692aafe89a73454694cee`;
- Stripe live-readiness check `35264280479` SUCCESS;
- full/handoff JavaScript check `35264280446` SUCCESS;
- Google Review compatibility `35264280451` SUCCESS;
- Staff v3 compatibility `35264280558` SUCCESS;
- Post-job compatibility `35264280869` SUCCESS;
- exact-head preview `dpl_BNvoECAundwwbcB95Rh79nKKJyEV` READY / clean;
- merge `95cda91adb2fe7276f49a73d8626f97d87c2521e`;
- production `dpl_HmwxY6oHCiCX8s14xrtHCK6CVpHz` READY / `namdar.co.uk` alias;
- health HTTP 200;
- live Account and Admin loaders pin `6.4.45-payment-receipts-1`;
- live receipt assets return HTTP 200;
- production 5xx scan found no 5xx logs;
- Supabase readback after release: 4 payment records, zero payment settings rows and zero active payment policies;
- the payment-record count remained 4 before and after deployment, so release verification created no synthetic transactions.

## Booking/payment launch policy — LIVE
- Manual booking confirmation.
- Monday–Saturday; Sunday closed.
- 08:00–11:00, 11:00–14:00, 14:00–17:00.
- Maximum 3 jobs/day, 24-hour notice, 21-day horizon, postcode-area route density enabled.
- New bookings require 20% deposit; customers may pay 100% upfront; balance due at completion.

## Admin inbox workflow — LIVE
- Existing PR #104 preserves the current folder on Close/Reopen.
- Live `6.4.48-inbox-workflow-polish-fix-1` adds next-conversation flow, bulk selection/actions, and customer context/profile shortcuts.
- Bulk Close deliberately skips Closed/Spam rows.
- NodeList iteration hotfix corrects the bulk-row selector so selection mode does not throw during initialization.

## Google Review System — LIVE
PR #98 / `6.4.43-google-reviews-1` remains live. Owner-controlled fair review requests, one-time reminders, tracked clicks and 30/90/365-day reporting are available, but the official Google Business review URL remains intentionally unconfigured/off.

## Post-job Customer Experience — LIVE
PR #96 / `6.4.42-post-job-experience-1`: completed-job panel, private feedback, fair Google review access when configured, safe repeat quoting and recurring next-clean guidance remain live.

## Staff operations v3 — LIVE
PR #94 remains the field-operations layer: six-step Window Cleaning quality checklist, server completion gate, incidents/evidence, Admin incident handling, On My Way ETA and customer ETA.

## Owner & custom access roles — LIVE
Protected Owner/Administrator system roles and reusable custom Staff roles remain live with hierarchy-sensitive safeguards.

## Other live systems
- Responsive Admin booking editor.
- Secure Admin logo upload and Website/Legal crash fix.
- Flexible payment/deposit policy engine with live Stripe active under the current 20% deposit launch policy.
- Fair cancellation terms and Privacy Centre.
- Security Hardening and Staff auth recovery.
- Business Finance and Smart Receipts.
- Newsletter Centre and guided Ask Namdar.

## Open roadmap
- First genuine payment should be used for authenticated end-to-end receipt/email/My Namdar confirmation; do not manufacture a production transaction just to test.
- Configure the real Google Business Profile review-request URL later.
- Real-world Google review/post-job smoke with a genuine completed job.
- Authenticated Staff v3 mobile smoke test.
- Window real-job pricing calibration after genuine completed jobs accumulate.
- ICO data-protection fee self-assessment.
- Supabase Leaked Password Protection.
- SMS/legal checks.
- Node `url.parse()` deprecation cleanup.
- Address-data pilot remains parked.
