# Namdar AI handoff

Last verified: 2026-09-13 UTC

Read `docs/AI_START.md` first.

## Production source of truth before PR #59
- Repo `pchroonic/pchroonic`, default `main`.
- Product release PR #57 merge `52979eab757db23bed21416c9ec5a520b57c72c2`.
- PR #58 docs-only merge/main HEAD `24d041864fd31b31a76aa559ebdae1c85c330acc`.
- Production deployment `dpl_bhvyvNbhjoi1JFgpYt3x46bjSkfW` READY.
- Supabase production `qjigldxjcpnrlyxgmlqq`.
- Window Cleaning only live; future services planned; address work parked.
- Staff/Admin privileged APIs require AAL2/MFA.

## Stripe state
Sandbox provider connected; commercial customer payment policy OFF; no live-money credentials. Normal signed-in deposit + balance + refund flow passed end-to-end with authoritative webhooks, exact processor-fee capture and corrected multi-tab browser return. `site_settings.payments` absent.

## Business Finance product decision
Namdar starts as a **sole trader** and later becomes a **limited company after success**.
- preserve dated sole-trader history;
- incorporation requires a date;
- switch future reporting only from that date;
- never retroactively reinterpret historic sole-trader activity as company activity;
- refresh current Corporation Tax rules when incorporation happens.

## PR #59
Title: `Add sole trader Business Finance dashboard`
Branch: `feat/sole-trader-finance-dashboard-20260913`.

Earlier code head `9944e7dcac5db197aa3023cdbfda785fb5f881fd` passed CI `34763503689`; Vercel preview `dpl_DgPUvMYTXjmDzDdEp5VaC1L3tVo2` was READY with clean build output. Final Stripe-environment separation commits were added afterward and must pass the same gates before merge.

## Applied Supabase finance migrations
- `20260913143525 business_finance_expense_ledger`
- `20260913144052 business_finance_expense_updated_by_index`
- `20260913144632 stripe_payment_environment_tracking`

### `business_expenses`
Private table, RLS enabled, no browser policies. Records actual paid expenses: date/category/description/supplier, amount, VAT amount, business-use %, tax treatment, payment method, optional booking/reference/receipt reference/private notes, source and audit users/timestamps.

Tax treatments:
- `allowable`: deducted by simple sole-trader estimate;
- `capital_allowance`: visible/cash-impacting but excluded from simple tax deduction pending proper treatment;
- `non_allowable`: visible/cash-impacting but excluded from taxable-profit deduction.

The second migration fixed the finance-specific missing FK covering index on `updated_by`; performance advisor no longer reports it.

### Stripe environment tracking
`payment_records.provider_livemode` now records provider environment:
- `false`: sandbox/test Stripe row;
- `true`: live Stripe row;
- null is allowed for non-Stripe/manual rows.

All existing Stripe rows were safely backfilled `false` because no live Stripe credentials have ever been connected. Verified state: 4 sandbox Stripe rows, 0 live Stripe rows, 0 unknown Stripe rows.

Verified Stripe webhooks now persist:
- Checkout payments: `provider_livemode = session.livemode === true`;
- refunds: `provider_livemode = paymentIntent.livemode === true`.

Business Finance filters Stripe rows so only `provider_livemode=true` counts as real revenue/refunds/processor costs. Sandbox audit rows remain in Billing/payment history but never enter business finance or tax estimates.

GitHub SQL migration-file creation was blocked by the connector safety gate. Do not invent repo migration files for these schema changes. Supabase migration history plus these continuity docs are authoritative.

## Finance implementation
### Tax engine
`lib/uk-tax.js` supports 2026/27 England/Wales/Northern Ireland:
- UK tax year starts 6 April;
- Personal Allowance £12,570; taper above £100,000; zero at £125,140;
- Income Tax 20% / 40% / 45%;
- Class 4 NI 6% £12,570–£50,270, then 2% above;
- VAT threshold metadata £90,000;
- MTD staged thresholds metadata;
- illustrative payments-on-account warning only.

Income Tax attributable to Namdar is incremental:
`tax(other taxable income + Namdar profit) - tax(other taxable income)`.

### Private finance settings
`api/admin-finance-settings.js`
- GET requires `analytics`;
- POST requires `settings`;
- stores under non-public `site_settings.finance_private`;
- audit metadata redacts private values;
- limited-company switch requires incorporation date.

Defaults: sole trader, cash basis, England/Wales/NI, no start date, no incorporation date, other taxable income £0, tax reserved £0, not VAT registered.

### Expense ledger API
`api/admin-finance-expenses.js`
- GET `analytics`;
- POST/PATCH/DELETE `settings`;
- audited mutations;
- bad date/description/non-positive amount return HTTP 400 via `error.status`.

### Business Finance API
`api/admin-business-finance.js`
- cash-basis receipts/refunds from real payment ledger rows;
- excludes every Stripe row unless `provider_livemode===true`;
- actual live GBP Stripe fees deducted automatically;
- expense ledger prorated by business-use %;
- cash surplus = net receipts - all business-use ledger cash expenses - live Stripe fees;
- estimated taxable profit = net receipts - allowable expenses - live Stripe fees;
- outstanding invoices stay outside cash-basis income until paid;
- indicative rolling-12-month VAT monitor;
- MTD indicator does not infer legal obligation from current turnover alone;
- monthly cash movement + expense-category breakdown;
- operational `booking_job_costs` are reference-only, never silently tax-deducted.

### Admin UI
`admin-business-finance.js` adds Business Finance under Reports: cash KPIs, tax reserve estimate, VAT/MTD monitor, monthly table, expense mix, private settings, expense entry/delete.

`admin.js` loader version `6.4.24-business-finance-1`.

## Public/private boundary
`api/public-data.js` allow-lists only `brand`, `appearance`, `maintenance`, `advertising`, `contact`; `finance_private` is never public.

Verified current production data before merge:
- 4 sandbox Stripe rows;
- 0 live Stripe rows;
- 0 unknown Stripe rows;
- 0 business expenses;
- 0 `finance_private` rows.

## Explicit limitations
Management estimate only, not HMRC assessment. V1 does not model loss relief/carry-forward, student loans, pension/Gift Aid adjusted-net-income effects beyond simple PA taper, savings/dividend tax, Marriage Allowance/other reliefs, combined employment/self-employment NI interactions, detailed capital allowances, VAT scheme/input-tax rules, Scottish bands, or traditional-accounting accrual adjustments.

If Scotland or traditional accounting is selected, numeric tax estimate is withheld. If switched to limited company, company tax estimate is withheld until incorporation-time rules are deliberately refreshed.

## Post-merge verification
1. production deployment READY + `/api/health` healthy;
2. production `admin.js` contains Business Finance loader;
3. finance API excludes all 4 retained sandbox Stripe audit rows;
4. expense ledger remains clean unless user adds real costs;
5. no `finance_private` row is required until user enters real settings;
6. user enters actual sole-trader start date and optional private other-income/tax-reserve values through Admin; never invent them;
7. begin logging real paid expenses;
8. keep Stripe commercial policy OFF until finance validation is complete;
9. then return to Window payment-policy/live-Stripe rollout.

## Non-negotiables
- No customer exposure of private finance settings/expense ledger.
- Sandbox Stripe activity never counts as revenue/tax activity.
- No separate customer card surcharge.
- Stripe webhook authoritative for money state.
- No secrets or unnecessary personal finance details in source/logs/docs/chat.
- Direct contribution != net profit; finance estimate != filed tax return.
- Privileged finance mutations remain AAL2/settings-permission protected.
- Window only live; address work parked.
