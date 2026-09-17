# Namdar AI handoff

Last verified: 2026-09-17 UTC

Read `docs/AI_START.md` first. Use `docs/PROJECT_STATUS.md` for roadmap/status.

## Production baseline
- Repo `pchroonic/pchroonic`, default `main`.
- Current main/product merge `02590b881ef07db82cd5a1ddbbc77767bd5b8051` from PR #100.
- Customer base loader `6.4.35-payment-policy-engine-1`; Post-job Customer Experience `6.4.42-post-job-experience-1`; Staff operations/ETA `6.4.41-staff-operations-v3-1`.
- Admin base `6.4.37-admin-website-crash-fix-1`; Google Reviews `6.4.43-google-reviews-1`; Stripe readiness `6.4.44-stripe-live-readiness-1`.
- Supabase production `qjigldxjcpnrlyxgmlqq`.
- Vercel project `prj_4fILo0pCaLGUSUIMWrBIVGzeWVDC`; team `team_8Az8WtWcnfwtYRdhR8vGqC3L`.
- Production deployment `dpl_FY31SSsYRAQpSwzsc11HiNaCgQoX` READY on `namdar.co.uk`.
- Health HTTP 200 / `ok:true` at `2026-09-17T19:04:18.008Z`.
- Window Cleaning only live. Provider AI OFF. Privileged access requires CAPTCHA + AAL2/TOTP.
- Customer commercial Stripe remains OFF: zero production `site_settings.payments` rows and zero active payment-policy rows.

# Stripe live readiness — LIVE

Product PR #100: `Harden Stripe live-mode activation`.
Exact tested head `3d810d70a9201105075e2db410ff997d781f23d0`; merge `02590b881ef07db82cd5a1ddbbc77767bd5b8051`.

Production requires a recognised LIVE Stripe secret plus configured webhook before `effectiveActive` can become true. TEST credentials remain usable in previews only. Admin reports LIVE/TEST mode and production readiness without exposing secret material. Existing hosted Checkout, frozen payment policy snapshots, deposit/balance rules, signed webhook authority, refunds and processor-cost reconciliation remain in place.

Production verification for PR #100: deployment `dpl_FY31SSsYRAQpSwzsc11HiNaCgQoX` READY on `namdar.co.uk`; health 200; no release 5xx; `admin.js` pins `6.4.44-stripe-live-readiness-1`; production has zero payment settings rows/active policies.

Current Stripe account `acct_1UFAd1Cu9tojH31y` is test-only/incomplete: `charges_enabled=false`, `payouts_enabled=false`, `details_submitted=false`. Owner must complete business onboarding and accept Stripe Terms. Do not accept those legal terms or invent missing business details for the owner.

# Payment receipt tracking — RELEASE CANDIDATE

Branch `feature/payment-receipt-tracking-20260917`; asset token `6.4.45-payment-receipts-1`.

## Goal
Before Stripe goes live, every successful payment/refund must have one stable Namdar receipt reference that the customer and Namdar staff can quote to trace the transaction.

## Receipt identity
`lib/payment-receipts.js` derives a receipt number from the immutable `payment_records.id` UUID:
- format example: `RCP-12345678-9ABCDEF0`;
- deterministic: the same payment always produces the same receipt number;
- no Stripe secret/provider token is encoded;
- no schema change is required, so existing rows are not rewritten.

Production readback before this candidate found 4 `payment_records`; RLS is enabled on `public.payment_records`. Do not delete or rewrite those rows for this feature.

## Customer email
`api/stripe-webhook.js` now sends a true payment-receipt email after an idempotently recorded Stripe payment. The email includes:
- Namdar receipt number;
- invoice number;
- amount;
- payment type and method;
- payment date/time;
- net paid/outstanding invoice state;
- link to My Namdar Billing;
- instruction to quote the receipt number for support.

Stripe refund emails include the same traceable receipt reference. Existing `archiveForCustomer:true` behavior remains, so the billing email is also archived to the customer's Namdar message history.

`api/admin-payments.js` applies the same receipt-number/email behavior to staff-recorded cash/bank/card/other payments and refunds. Stripe remains webhook-only and cannot be impersonated by manual staff entry.

## My Namdar
`api/customer-billing.js` returns a safe `receiptNumber` for each payment/refund. It still does not expose processor fee/net/balance-transaction/provider-payment fields.

`account-payments.js` shows each receipt number in Billing payment history and keeps the authenticated receipt PDF download. Receipt filenames use the customer-facing receipt number. `account.js` cache-busts this customer asset with `6.4.45-payment-receipts-1`.

## Receipt PDF
`api/billing-document.js` uses the same receipt number in the PDF and filename, includes it in invoice payment history, and tells the customer to quote that number when contacting Namdar. Authentication/ownership/Staff payments-permission checks remain unchanged.

## Admin tracking
`api/admin-payments.js` adds `receipt_number` to the safe Admin payment payload and records the receipt number in payment audit metadata/summary.

`admin-payment-receipts.js` decorates transaction rows with the receipt number and extends the existing Payments search so an `RCP-...` reference can be used to find the matching invoice/payment row without changing `admin-original.js`. `admin.js` loads this extension at `6.4.45-payment-receipts-1`.

## Safety invariants
- customer-facing receipt numbers are Namdar references, not Stripe secrets;
- Stripe provider references/payment IDs remain internal reconciliation evidence;
- customer billing/PDF surfaces continue to exclude processor-cost fields;
- duplicate Stripe webhooks do not duplicate payment records/emails because provider-reference idempotency remains authoritative;
- this feature does not enable Stripe or create a commercial payment policy;
- do not manufacture production customer/payment rows to test it.

# Google Review System — LIVE
PR #98 remains live. Official review URL is not configured yet, so public review requests/reminders remain off. Review availability is never gated by positive private feedback and no incentive is offered.

# Existing live product layers
Post-job Customer Experience PR #96 remains live with completed-job actions, private feedback, safe repeat quoting and next-clean guidance. Staff operations v3 PR #94 remains live with field checklist/completion gate, incidents/evidence and On My Way/customer ETA.

## Next steps
1. run exact-head CI/Vercel checks for payment receipt tracking;
2. merge only if receipt, Stripe/payment-policy, full handoff, Staff/Post-job/Review compatibility and Vercel checks are green;
3. verify production health, loader tokens and no new payment/customer rows;
4. only after this receipt layer is live should owner onboarding/live Stripe credentials continue;
5. production payments remain OFF until owner completes Stripe onboarding/TOS, live charges/payouts are enabled, LIVE secret + verified live webhook are configured, and owner chooses the commercial deposit/balance policy.
