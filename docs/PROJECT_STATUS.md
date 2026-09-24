# Namdar project status

Last updated: 2026-09-25 UTC

## Production baseline
- Repo `pchroonic/pchroonic`, default `main`.
- Current main/product merge `95cda91adb2fe7276f49a73d8626f97d87c2521e` (PR #102 Payment Receipt Tracking).
- Customer base loader `6.4.35-payment-policy-engine-1`; post-job extension `6.4.42-post-job-experience-1`; Staff operations/ETA `6.4.41-staff-operations-v3-1`.
- Admin base `6.4.37-admin-website-crash-fix-1`; Google Review System `6.4.43-google-reviews-1`; Stripe readiness `6.4.44-stripe-live-readiness-1`; Payment Receipt Tracking `6.4.45-payment-receipts-1`.
- Supabase production `qjigldxjcpnrlyxgmlqq`.
- Vercel team is on Pro. Production deployment `dpl_AZJPSx4HfaAXcb8GuJNjYqKwr82Y` is READY and aliased to `namdar.co.uk`; health HTTP 200 / `ok:true` at `2026-09-24T22:49:08.728Z`.
- Hourly booking-notification cron (`7 * * * *`) is restored.
- Window Cleaning only live.
- Privileged Staff/Admin requires CAPTCHA + AAL2/TOTP MFA.
- Customer Stripe remains OFF; production has zero `site_settings.payments` rows and zero active payment-policy rows.
- Ask Namdar provider AI remains disabled.
- Google Business review URL remains unconfigured/off.

## Stripe live readiness — LIVE
PR #100 / Admin extension `6.4.44-stripe-live-readiness-1` remains live. Production provider readiness requires recognised LIVE Stripe credentials plus configured webhook; TEST credentials remain preview/sandbox-only and cannot activate production payments.

Stripe account `acct_1UFAd1Cu9tojH31y` is live and fully onboarded: charges/payouts enabled, details submitted, verification complete, card payments and transfers active. Live production webhook `https://namdar.co.uk/api/stripe-webhook` is enabled and production runtime has the live Stripe secret plus webhook secret. Live customer payments remain OFF only pending the owner's exact deposit/balance policy choice and explicit activation.

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

## Admin inbox navigation — FIX CANDIDATE
- Close conversation: status becomes Closed, but the inbox remains on the current folder/filter and the detail pane returns to the conversation list.
- Reopen conversation: preserves the Closed/current folder rather than forcing Open.
- Asset: `6.4.46-inbox-close-stay-folder-1`.

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
- Flexible payment/deposit policy engine with commercial Stripe still OFF pending owner onboarding/live credentials/policy choice.
- Fair cancellation terms and Privacy Centre.
- Security Hardening and Staff auth recovery.
- Business Finance and Smart Receipts.
- Newsletter Centre and guided Ask Namdar.

## Open roadmap
- Owner chooses exact production deposit/balance policy, then activate customer Stripe payments.
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
