# Namdar project status

Last updated: 2026-09-17 UTC

## Production baseline
- Repo `pchroonic/pchroonic`, default `main`.
- Current main/product merge `02590b881ef07db82cd5a1ddbbc77767bd5b8051` (PR #100 Stripe live-readiness hardening).
- Customer base loader `6.4.35-payment-policy-engine-1`; post-job extension `6.4.42-post-job-experience-1`; Staff operations/ETA `6.4.41-staff-operations-v3-1`.
- Admin base `6.4.37-admin-website-crash-fix-1`; Google Review System `6.4.43-google-reviews-1`; Stripe readiness `6.4.44-stripe-live-readiness-1`.
- Supabase production `qjigldxjcpnrlyxgmlqq`.
- Production deployment `dpl_FY31SSsYRAQpSwzsc11HiNaCgQoX` is READY and aliased to `namdar.co.uk`; health HTTP 200 / `ok:true` at `2026-09-17T19:04:18.008Z`.
- Window Cleaning only live.
- Privileged Staff/Admin requires CAPTCHA + AAL2/TOTP MFA.
- Customer Stripe remains OFF; production has zero `site_settings.payments` rows and zero active payment-policy rows.
- Ask Namdar provider AI remains disabled.
- Google Business review URL remains unconfigured/off.

## Stripe live readiness — LIVE
PR #100 / Admin extension `6.4.44-stripe-live-readiness-1`.

Production provider readiness now requires recognised LIVE Stripe credentials plus a configured webhook. TEST credentials stay preview/sandbox-only and cannot activate production payments. Existing hosted Checkout, signed webhook reconciliation, frozen payment terms, deposits/balances, refunds and processor-cost accounting remain intact.

Current connected Stripe account `acct_1UFAd1Cu9tojH31y` is still test-only/incomplete: `charges_enabled=false`, `payouts_enabled=false`, `details_submitted=false`. Owner action is required to complete business details and accept Stripe Terms. Live customer payments must remain off until live credentials/webhook are configured, Stripe is live-ready, and the owner chooses the exact deposit/balance policy.

## Payment receipt tracking — RELEASE CANDIDATE
Branch `feature/payment-receipt-tracking-20260917`; customer/Admin asset token `6.4.45-payment-receipts-1`.

Candidate improvements:
- stable Namdar receipt number for every payment/refund, derived deterministically from the immutable payment UUID (`RCP-XXXXXXXX-XXXXXXXX`);
- Stripe payment/refund emails include receipt number, invoice, amount, date, payment type/method and current invoice balance;
- manually recorded non-Stripe payments/refunds use the same receipt-number/email standard;
- billing emails remain archived in the customer's Namdar messages;
- My Namdar Billing shows the receipt number beside every transaction and keeps authenticated receipt-PDF downloads;
- receipt PDFs use the same receipt number and include it in invoice payment history;
- Admin payment transaction rows display the receipt number and Payments search supports `RCP-...` lookup;
- audit records include the receipt number for manual payment/refund actions;
- internal Stripe reconciliation IDs remain separate; customer surfaces still exclude processor fee/net fields;
- no database migration is required and no payment row is rewritten.

Production readback before this candidate: 4 existing `payment_records`; RLS enabled. This release must not manufacture or delete production payments during verification.

## Google Review System — LIVE
PR #98 / `6.4.43-google-reviews-1` remains live. Owner-controlled fair review requests, one-time reminders, tracked clicks and 30/90/365-day reporting are available, but the official Google Business review URL is still intentionally unconfigured/off.

## Post-job Customer Experience — LIVE
PR #96 / `6.4.42-post-job-experience-1`: completed-job panel, private feedback, fair Google review access when configured, safe repeat quoting and recurring next-clean guidance remain live. Real-world authenticated smoke should use a genuine completed job only.

## Staff operations v3 — LIVE
PR #94 remains the field-operations layer: six-step Window Cleaning quality checklist, server completion gate, incidents/evidence, Admin incident handling, On My Way ETA and customer ETA. Authenticated mobile smoke using a real assigned job remains outstanding.

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
- Verify/merge/deploy Payment Receipt Tracking before Stripe onboarding continues.
- Owner completes Stripe business onboarding/TOS.
- Configure and verify LIVE Stripe production secret + live webhook; confirm charges/payouts are enabled.
- Owner chooses exact production deposit/balance policy, then activate customer Stripe payments.
- Configure the real Google Business Profile review-request URL later.
- Real-world Google review/post-job smoke with a genuine completed job.
- Authenticated Staff v3 mobile smoke test.
- Window real-job pricing calibration after genuine completed jobs accumulate.
- ICO data-protection fee self-assessment.
- Supabase Leaked Password Protection.
- SMS/legal checks.
- Node `url.parse()` deprecation cleanup.
- Address-data pilot remains parked.
