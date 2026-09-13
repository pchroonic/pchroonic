# Namdar project status

Last updated: 2026-09-13 UTC

## Production baseline
- Repo `pchroonic/pchroonic`, default `main`.
- Current product release: PR #59 `Add sole trader Business Finance dashboard`.
- Exact tested head `03121fa992b5d845e5478e61665a90d59c9a9d4f`; CI `34763802394` SUCCESS; preview `dpl_Fb14yFYcoa5F7Bf2mdh7LKQ7Sqo9` READY.
- PR #59 merge/main HEAD `7eb4ebd47041288faac444eb4ae0a2304043d7c9`.
- Production deployment `dpl_GbqaKFaNpjCVfKNeJ51aReKiixs4` READY on `https://namdar.co.uk`; `/api/health` HTTP 200.
- Production Admin loader currently serves Business Finance version `6.4.24-business-finance-1`.
- Supabase production `qjigldxjcpnrlyxgmlqq`.
- Window Cleaning only live; future services planned; address work parked.

## Stripe sandbox — FULL PASS / COMMERCIAL POLICY OFF
Signed-in deposit + balance + full-refund sandbox flow passed with authoritative webhooks and exact processor costs. Customer payment policy remains OFF; no live Stripe credentials. Four retained Stripe ledger rows are sandbox and excluded from finance.

## Business Finance — LIVE / AUTHENTICATED UI VERIFIED
Business structure decision: **sole trader first, limited company after success**.

The user opened production Admin -> Reports while authenticated and supplied screenshots on 2026-09-13. The live module visibly loads all major Business Finance sections.

Current visible/live state:
- cash received £0;
- net business receipts £0;
- expenses £0;
- Stripe processing £0;
- taxable profit £0;
- outstanding invoices £106;
- VAT rolling-12-month monitor £106;
- no saved sole-trader start date;
- no VAT registration selected.

The £106 comes from one issued Window invoice created 9 Sep 2026 for a confirmed appointment on 11 Sep 2026. It remains unpaid and `scheduled`. It is not Stripe sandbox activity. It must remain untouched until the user confirms whether that booking was genuine or test/old data.

## Business Finance setup UX — IN PROGRESS
Branch: `fix/business-finance-setup-ux-20260913`.

Planned/reviewed changes:
- `admin-business-finance-polish.js` added;
- Admin loader target becomes `6.4.25-business-finance-setup-1`;
- no saved sole-trader start date => show setup-incomplete warning and withhold the tax filing timeline/reserve display instead of showing misleading £0 placeholders;
- cash/invoice/expense tracking continues to work before tax setup is completed;
- future incorporation date hidden unless Limited company selected;
- VAT registration date hidden unless VAT registered selected;
- no financial records changed by these UX improvements;
- regression and syntax checks added.

## Applied production schema
Supabase migrations:
- `20260913143525 business_finance_expense_ledger`
- `20260913144052 business_finance_expense_updated_by_index`
- `20260913144632 stripe_payment_environment_tracking`

Private `business_expenses` has RLS enabled/no browser policies. `payment_records.provider_livemode` distinguishes sandbox/live Stripe. Verified state remains 4 sandbox / 0 live / 0 unknown Stripe rows, 0 business expenses, 0 `finance_private` rows and 0 payment-policy rows.

Business Finance excludes sandbox Stripe receipts/refunds/processor fees entirely while retaining technical audit history.

## Finance v1 functionality
- Business Finance panel in Admin Reports.
- cash received/refunds/net receipts and outstanding invoices.
- private expense ledger with category, business-use %, tax treatment and audit trail.
- only real/live Stripe provider rows enter finance; test-mode Stripe excluded.
- actual live Stripe provider fees deducted automatically.
- cash surplus separate from taxable-profit estimate.
- estimated sole-trader Income Tax attributable to Namdar + Class 4 NI.
- tax reserve target/gap + illustrative payment-on-account warning.
- rolling 12-month £90,000 VAT threshold monitor.
- MTD staged threshold indicator with legal-obligation caveat.
- monthly tax-year cash table and expense-category mix.
- optional private other taxable income for marginal tax accuracy.
- future incorporation date preserves historic sole-trader records.
- capital-allowance items excluded from simple taxable-profit deduction pending proper treatment.
- operational job-cost estimates not silently used as tax expenses.

Tax output is a management estimate, not an HMRC assessment. Scotland/traditional-accounting/limited-company tax calculations are withheld rather than guessed in v1.

## Immediate next work
1. Open PR for setup UX branch and require green CI + READY Vercel preview.
2. Merge only when clean; verify production loader `6.4.25-business-finance-setup-1` and conditional setup fields.
3. User classifies the £106 Sep-11 booking/invoice as real vs test/old before any mutation.
4. User saves actual sole-trader start date through Admin.
5. Optionally enter private other taxable income/tax reserve and begin real paid-expense entry.
6. Keep Stripe customer payment policy OFF during finance validation.
7. Once finance data-entry is stable, return to Window commercial payment policy/live Stripe rollout.
8. Other open work remains Google review URL, privileged security follow-ups, SMS/legal and Window real-job pricing evidence; address work remains parked.

## Handoff rule
Every substantial product/provider/data change updates `docs/AI_START.md`, `docs/AI_HANDOFF.md`, and this file. Never store credentials, raw API keys, customer secrets, TOTP codes, one-time Auth links or unnecessary private financial details in source/docs.
