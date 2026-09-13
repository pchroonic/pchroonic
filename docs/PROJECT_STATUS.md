# Namdar project status

Last updated: 2026-09-13 UTC

## Production baseline before PR #59
- Repo `pchroonic/pchroonic`, default `main`.
- Product release PR #57 merge `52979eab757db23bed21416c9ec5a520b57c72c2`.
- PR #58 docs-only merge/main HEAD `24d041864fd31b31a76aa559ebdae1c85c330acc`.
- Production deployment `dpl_bhvyvNbhjoi1JFgpYt3x46bjSkfW` READY.
- Supabase production `qjigldxjcpnrlyxgmlqq`.
- Window Cleaning only live; future services planned; address work parked.

## Stripe sandbox — FULL PASS / COMMERCIAL POLICY OFF
Signed-in deposit + balance + full-refund sandbox flow passed, with authoritative webhooks, exact processor costs and corrected multi-tab return. Customer payment policy remains OFF; no live Stripe credentials.

## Business Finance — PR #59 READY TO MERGE
Business structure decision: **sole trader first, limited company after success**.

PR #59: `Add sole trader Business Finance dashboard`
Branch: `feat/sole-trader-finance-dashboard-20260913`
Exact tested code head before final docs sync: `9944e7dcac5db197aa3023cdbfda785fb5f881fd`.
- CI `34763503689`: SUCCESS.
- Vercel preview `dpl_DgPUvMYTXjmDzDdEp5VaC1L3tVo2`: READY, clean build.

### Applied production schema
Supabase migrations:
- `20260913143525 business_finance_expense_ledger`
- `20260913144052 business_finance_expense_updated_by_index`

The private `business_expenses` table has RLS enabled with no browser policies. The second migration fixed the finance-specific unindexed `updated_by` foreign key flagged by the performance advisor. No finance-specific missing-FK-index finding remains.

GitHub migration-file creation was blocked by the connector safety gate, so do not claim a repo SQL migration file exists. Supabase migration history + handoff docs are authoritative for the applied schema.

### Finance v1 functionality
- Business Finance panel in Admin Reports.
- cash received, refunds, net receipts and outstanding invoices.
- private expense ledger with category, business-use %, tax treatment and audit trail.
- actual Stripe provider fees deducted automatically.
- cash surplus metric separate from taxable-profit estimate.
- estimated sole-trader taxable trading profit.
- estimated incremental Income Tax attributable to Namdar.
- estimated Class 4 NI.
- tax reserve target/gap + illustrative payment-on-account warning.
- rolling 12-month £90,000 VAT threshold monitor.
- MTD staged threshold indicator with legal-obligation caveat.
- monthly tax-year cash table and expense-category mix.
- optional private other taxable income for marginal tax accuracy.
- future incorporation-date setting preserves historical sole-trader records.
- capital-allowance items excluded from simple taxable-profit deduction pending proper treatment.
- operational job-cost estimates not silently used as tax expenses.
- invalid expense input returns proper HTTP 400 validation messages.

### Accounting/tax defaults
- sole trader;
- cash basis;
- England/Wales/Northern Ireland;
- tax year 2026/27 supported by first estimator;
- other taxable income £0 until privately entered;
- tax reserved £0 until privately entered;
- not VAT registered until changed.

Tax output is explicitly a management estimate, not an HMRC assessment. Scotland/traditional accounting/limited-company tax calculations are withheld rather than guessed in v1.

## Supabase advisor state
For `business_expenses`:
- RLS enabled/no policy is intentional and server-only;
- missing `updated_by` FK index fixed.

Other project-wide advisor warnings remain pre-existing and out of scope for this finance PR, including leaked-password protection disabled and unrelated RLS/performance items.

## Immediate next work
1. merge PR #59 only after final docs-sync CI passes;
2. verify production deployment and `/api/health`;
3. verify production Admin loads Business Finance;
4. confirm private expense ledger is initially clean and `finance_private` defaults safely if no row exists;
5. enter actual sole-trader start date through Admin — do not invent it;
6. optionally enter private other taxable income and tax reserve for a more accurate estimate;
7. begin entering real paid business expenses;
8. keep Stripe customer payment policy OFF during finance validation;
9. once finance is stable, return to Window commercial payment policy and live Stripe rollout;
10. other open work remains Google review URL, privileged security follow-ups, SMS/legal and Window real-job pricing evidence; address work remains parked.

## Handoff rule
Every substantial product/provider/data change updates `docs/AI_START.md`, `docs/AI_HANDOFF.md`, and this file. Never store credentials, raw API keys, customer secrets, TOTP codes, one-time Auth links or unnecessary private financial details in source/docs.
