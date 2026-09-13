# Namdar project status

Last updated: 2026-09-13 UTC

## Production baseline
- Repo `pchroonic/pchroonic`, default `main`.
- Current product release PR #57 `Pin lockless Supabase runtime for My Namdar auth`.
- PR #57 merge `52979eab757db23bed21416c9ec5a520b57c72c2`; production deployment `dpl_AFyzoBkodBAZD5qqLjx2z73yHTvg` READY.
- PR #58 docs-only merge `24d041864fd31b31a76aa559ebdae1c85c330acc` records the completed Stripe sandbox E2E verification.
- Supabase production `qjigldxjcpnrlyxgmlqq`.
- Window Cleaning only live; five future services planned.
- Address-data work parked.

## Window Cleaning Stage 1 — LIVE
Core sequence includes PRs #38, #40, #42, #45, #47, #49, #50, #52, #54, #56 and #57 for quote/booking operations, funnel/profitability, follow-up/reviews, Stripe, processor-cost accounting, notification resilience and account-session reliability.

## Stripe sandbox — FULL PASS / COMMERCIAL POLICY OFF
Normal signed-in £0.50 deposit + £0.50 balance + full refunds have passed with 200 Checkout/webhook responses, exact processor-fee capture, correct invoice/booking progression and corrected multi-tab return. Customer payment policy remains OFF; no live Stripe credentials.

## Business Finance — IN DEVELOPMENT
Business structure decision: **sole trader first, limited company after success**.

Current branch:
`feat/sole-trader-finance-dashboard-20260913`

### Applied production schema
Supabase migration `20260913143525 business_finance_expense_ledger` created private `business_expenses` with RLS and no browser policies.

The table records actual paid business expenses with:
- date/category/description/supplier;
- amount + VAT amount;
- business-use percentage;
- tax treatment;
- payment method;
- optional booking/reference/receipt/private notes;
- source + audit users/timestamps.

GitHub migration-file creation was blocked by the connector safety gate, so no repository migration file should be claimed. Supabase migration history + handoff docs record the applied change.

### Candidate finance functionality
- `Business Finance` panel in Admin Reports.
- Current tax-year cash received / refunds / net receipts.
- Outstanding invoices kept separate from cash-basis income.
- Private expense ledger.
- Actual Stripe processor costs deducted automatically.
- Cash surplus metric.
- Estimated sole-trader taxable profit.
- Estimated incremental Income Tax attributable to Namdar.
- Estimated Class 4 NI.
- Tax-reserve target/gap and illustrative payment-on-account warning.
- Rolling 12-month VAT threshold monitor.
- Current-turnover MTD indicator with staged thresholds, without claiming current turnover alone establishes obligation.
- Monthly tax-year cash table and expense-category mix.
- Future incorporation-date setting preserves sole-trader history and switches future mode only.

### Accounting/tax defaults
- Sole trader.
- Cash basis.
- England/Wales/Northern Ireland estimator.
- Tax year 2026/27 supported in first engine.
- Private optional other taxable income is used only to improve marginal Income Tax calculation.
- Operational job-cost estimates are not silently treated as deductible tax expenses; actual paid costs belong in the expense ledger.
- Capital-allowance items are excluded from the simple taxable-profit deduction and flagged for proper treatment.
- Tax results explicitly remain estimates, not HMRC assessments.

### Code currently on branch
- `lib/uk-tax.js`
- `scripts/uk-tax.test.mjs`
- `api/admin-business-finance.js`
- `api/admin-finance-settings.js`
- `api/admin-finance-expenses.js`
- `admin-business-finance.js`
- `scripts/business-finance.test.mjs`
- updated `admin.js`
- updated CI workflow
- updated all continuity docs

## Immediate next work
1. open PR for Business Finance;
2. pass CI including tax + finance regressions;
3. verify exact Vercel preview/build;
4. run Supabase security/performance advisors for the new expense table;
5. merge only if clean;
6. production-verify Admin Business Finance and perform one controlled expense create/read/delete test;
7. then begin entering real business costs and private tax assumptions through Admin;
8. after finance is stable, return to the real Window payment-policy decision and live Stripe preparation;
9. Google review URL, privileged password/CAPTCHA/MFA, SMS/legal and Window real-job pricing evidence remain open;
10. duplicate floating Supabase include remains optional cleanup;
11. address-data pilot remains parked.

## Handoff rule
Every substantial product/provider/data change updates `docs/AI_START.md`, `docs/AI_HANDOFF.md`, and this file. Never store credentials, raw API keys, customer secrets, TOTP codes, one-time Auth links or unnecessary private financial details in source/docs.
