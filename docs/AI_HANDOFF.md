# Namdar AI handoff

Last verified: 2026-09-13 UTC

Read `docs/AI_START.md` first.

## Production source of truth
- Repo `pchroonic/pchroonic`, default `main`.
- Product release PR #57 `Pin lockless Supabase runtime for My Namdar auth`, merge `52979eab757db23bed21416c9ec5a520b57c72c2`, production `dpl_AFyzoBkodBAZD5qqLjx2z73yHTvg` READY.
- PR #58 docs-only merge `24d041864fd31b31a76aa559ebdae1c85c330acc` records completed Stripe signed-in sandbox verification.
- Supabase production `qjigldxjcpnrlyxgmlqq`.
- Window Cleaning only live; future services planned.
- Address work parked.
- Staff/Admin privileged APIs require AAL2/MFA.

## Stripe state
Sandbox provider connected; commercial customer policy OFF; no live-money credentials. Normal signed-in deposit + balance + refund flow has passed end-to-end with authoritative 200 webhooks, exact processor-fee capture and corrected multi-tab browser return. Payment/refund ledger retained as audit history. `site_settings.payments` absent.

## Business Finance product decision
The user wants Namdar to operate first as a **sole trader** and later switch to a **limited company after success**.

Design rule:
- keep dated sole-trader records intact;
- when incorporation occurs, set an incorporation date and switch the finance mode going forward;
- never retroactively reinterpret the sole-trader period as company activity;
- refresh Corporation Tax rules at incorporation time rather than hard-code a future company calculation today.

## Current finance branch
`feat/sole-trader-finance-dashboard-20260913`

## Supabase migration already applied
Production migration history includes:
- `20260913143525 business_finance_expense_ledger`

`business_expenses` is private, RLS enabled, no browser policies. Columns include expense date, category, description, supplier, amount, VAT amount, business-use percentage, tax treatment, payment method, optional booking/reference/receipt reference/notes, source and audit users/timestamps.

Allowed tax treatments:
- `allowable` — included in simple sole-trader taxable-profit estimate;
- `capital_allowance` — visible but excluded from simple estimate pending proper capital-allowance treatment;
- `non_allowable` — visible/cash-impacting but excluded from taxable-profit deduction.

The attempt to add the SQL migration file to GitHub was blocked by the GitHub connector safety gate. Do not invent a repo migration file. Supabase migration history is authoritative for this applied schema change.

## New/changed branch files
- `lib/uk-tax.js`
  - supports current `2026-27` sole-trader estimator for England/Wales/Northern Ireland;
  - tax-year boundary helper uses 6 April;
  - Personal Allowance taper;
  - Income Tax bands/rates;
  - Class 4 NI;
  - VAT threshold constant;
  - MTD staged thresholds;
  - estimated payments-on-account warning only, not a definitive bill.
- `scripts/uk-tax.test.mjs` covers tax-year boundary, tax/NI, other income, allowance taper, loss flag and MTD thresholds.
- `api/admin-finance-settings.js`
  - GET requires `analytics`;
  - POST requires `settings`;
  - stores private settings under `site_settings.finance_private`;
  - public site settings allow-list does not expose this key;
  - audit metadata redacts private financial values.
- `api/admin-finance-expenses.js`
  - GET requires `analytics`;
  - POST/PATCH/DELETE require `settings`;
  - validates categories, dates, amounts, business-use %, tax treatment and payment method;
  - writes audit logs.
- `api/admin-business-finance.js`
  - cash-basis income comes from `payment_records` by `paid_at`;
  - refunds reduce current cash receipts;
  - actual GBP Stripe fees are deducted automatically from captured provider fees;
  - manual ledger expenses are prorated by business-use %;
  - estimated trading profit = net receipts - allowable ledger expenses - captured Stripe fees;
  - cash surplus = net receipts - all business-use ledger cash expenses - Stripe fees;
  - invoice outstanding amount remains separate and is not counted as cash-basis income until paid;
  - VAT monitor uses rolling 12-month non-draft/non-void/non-refunded invoice value as an explicit indicative estimate;
  - MTD monitor shows current cash-basis turnover but does not infer legal obligation solely from current turnover;
  - monthly tax-year cash movement + expense category breakdown;
  - operational `booking_job_costs` shown only as a reference/warning and not silently treated as tax expenses.
- `admin-business-finance.js`
  - inserts Business Finance in Admin Reports after Window performance;
  - KPIs for cash received, net receipts, outstanding, expenses, Stripe cost, cash surplus, estimated taxable profit;
  - sole-trader tax-reserve panel;
  - VAT/MTD monitor;
  - monthly cash table;
  - expense-mix bars;
  - private finance settings form;
  - expense-entry + delete flow.
- `admin.js` loader version `6.4.24-business-finance-1` and loads `admin-business-finance.js`.
- `scripts/business-finance.test.mjs` asserts loader, private public-data boundary, cash/expense sources, permission boundary and private settings key.
- `.github/workflows/ai-handoff-check.yml` now syntax-checks finance files and runs `uk-tax` + `business-finance` tests.

## Finance settings schema in `site_settings.finance_private`
Defaults:
- `business_type: sole_trader`
- `accounting_basis: cash`
- `tax_region: england_wales_ni`
- `sole_trader_started_on: null`
- `incorporation_date: null`
- `other_taxable_income: 0`
- `tax_reserved: 0`
- `vat_registered: false`
- `vat_registration_date: null`

Switching to `limited_company` requires an incorporation date. The current finance API intentionally withholds a company tax estimate and tells the operator to refresh Corporation Tax rules at incorporation time.

## Current 2026/27 estimate assumptions
- Personal Allowance £12,570; £1 reduction per £2 above £100,000; zero at £125,140.
- Income Tax (England/Wales/NI): 20% basic, 40% higher, 45% additional.
- Class 4 NI: 6% £12,570–£50,270; 2% above.
- Class 2: treated as paid above the statutory threshold; voluntary rate metadata shown only.
- VAT registration monitor threshold £90,000 rolling 12 months.
- MTD staged qualifying-income thresholds shown: >£50,000 Apr 2026, >£30,000 Apr 2027, >£20,000 Apr 2028.

Important estimator method:
`Income Tax attributable to Namdar = Income Tax(other taxable income + Namdar profit) - Income Tax(other taxable income)`.
This prevents the dashboard from pretending all personal Income Tax belongs to the business.

## Explicit limitations / warnings
The dashboard must continue to say it is a management estimate, not an HMRC assessment. It does not model:
- loss relief/carry-forward;
- student loans;
- pension/gift-aid adjusted-net-income effects beyond the simple allowance taper;
- savings/dividend tax;
- Marriage Allowance/Blind Person's Allowance/other reliefs;
- combined employment/self-employment National Insurance interactions;
- detailed capital allowances;
- VAT scheme/input-tax rules;
- traditional-accounting accrual adjustments;
- Scottish Income Tax bands.

If settings use Scotland or traditional accounting, the first version withholds the numeric tax estimate rather than guessing.

## Next verification sequence
1. finish docs and open PR from `feat/sole-trader-finance-dashboard-20260913`.
2. CI must pass all existing tests plus finance tests.
3. Vercel exact-head preview must be READY with clean build errors.
4. Check Supabase security/performance advisors after the new table migration.
5. Verify table has RLS enabled and no accidental public policy.
6. After merge, verify production `/api/health` and Admin Reports loads Business Finance.
7. Create one tiny controlled expense through Admin and verify create/read/delete + audit log, then leave ledger clean unless the user wants to begin entering real costs.
8. Enter actual sole-trader start date and optional private other-income/tax-reserve settings only through Admin UI.
9. Keep Stripe commercial customer policy OFF during finance verification.
10. Return to actual Window payment-policy/live-Stripe decision only after finance dashboard is stable.

## Non-negotiables
- No customer exposure of private finance settings/expense ledger.
- No separate customer card surcharge.
- Stripe webhook authoritative for money state.
- No secrets in source/logs/docs/chat.
- Direct contribution != net profit; finance tax estimate != filed tax return.
- Privileged finance mutations require AAL2-backed staff settings permission.
- Window only remains live; address work stays parked.
