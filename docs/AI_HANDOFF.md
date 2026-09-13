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
Sandbox provider connected; commercial customer payment policy OFF; no live-money credentials. Normal signed-in deposit + balance + refund flow has passed end-to-end with authoritative webhooks, exact processor-fee capture and corrected multi-tab browser return. `site_settings.payments` absent.

## Business Finance product decision
Namdar starts as a **sole trader** and later becomes a **limited company after success**.

Rules:
- preserve dated sole-trader history;
- future incorporation requires an incorporation date;
- switch future reporting only from that date;
- do not retroactively reinterpret old sole-trader activity as company activity;
- refresh current Corporation Tax rules when incorporation actually happens instead of freezing today's company-tax assumptions now.

## PR #59
Title: `Add sole trader Business Finance dashboard`
Branch: `feat/sole-trader-finance-dashboard-20260913`
Exact tested code head before final docs sync: `9944e7dcac5db197aa3023cdbfda785fb5f881fd`.
- GitHub CI `34763503689`: SUCCESS.
- Vercel preview `dpl_DgPUvMYTXjmDzDdEp5VaC1L3tVo2`: READY with clean errors-only build output.

Initial CI failure was a bad source-location assertion in `scripts/business-finance.test.mjs`, not a product/tax failure. It was corrected; the rerun passed. A later API review found expense validation used `statusCode:400` while Namdar `safeError` reads `error.status`; this was corrected to `status:400` and covered by regression test.

## Applied Supabase finance migrations
- `20260913143525 business_finance_expense_ledger`
- `20260913144052 business_finance_expense_updated_by_index`

The first creates `business_expenses`; the second adds the missing covering index on `updated_by` found by the Supabase performance advisor.

Security model:
- RLS enabled;
- no browser policies;
- service-role/server APIs only;
- security advisor's `RLS enabled, no policy` information item is intentional for this table.

Performance advisor after the second migration no longer reports the business-expenses `updated_by` foreign key as unindexed. Existing unrelated project-wide warnings remain.

A GitHub migration-file write was blocked by the connector safety gate. Do not invent or claim a repository SQL migration file. Supabase migration history plus continuity docs are authoritative for these already-applied production migrations.

## Finance implementation
### `business_expenses`
Tracks actual paid expenses with date, category, description, supplier, amount, VAT amount, business-use %, tax treatment, payment method, optional booking/reference/receipt reference/private notes, source and audit users/timestamps.

Tax treatments:
- `allowable`: deducted by the simple sole-trader estimate;
- `capital_allowance`: visible/cash-impacting but excluded from simple taxable-profit deduction pending proper capital-allowance treatment;
- `non_allowable`: visible/cash-impacting but not deducted from taxable profit.

### `lib/uk-tax.js`
Supports current tax year `2026-27` for England/Wales/Northern Ireland:
- UK tax-year boundary 6 April;
- Personal Allowance £12,570 with taper above £100,000 and zero at £125,140;
- Income Tax 20% / 40% / 45%;
- Class 4 NI 6% between £12,570–£50,270 and 2% above;
- VAT threshold metadata £90,000;
- MTD staged thresholds metadata;
- payments-on-account warning/illustrative 50% first payment only, not a definitive liability.

Estimator method:
`Income Tax attributable to Namdar = tax(other taxable income + Namdar profit) - tax(other taxable income)`.
This avoids pretending all personal Income Tax belongs to the business.

### APIs
`api/admin-finance-settings.js`
- GET `analytics`, POST `settings`;
- private key `site_settings.finance_private`;
- audit metadata redacts private values;
- limited-company switch requires incorporation date.

`api/admin-finance-expenses.js`
- GET `analytics`;
- POST/PATCH/DELETE `settings`;
- validation errors return clean HTTP 400;
- audited mutations.

`api/admin-business-finance.js`
- payment ledger drives cash-basis receipts/refunds;
- actual GBP Stripe fees automatically deducted;
- actual paid expense ledger prorated by business-use %;
- cash surplus = net receipts - all ledger cash expenses - Stripe fees;
- estimated taxable profit = net receipts - allowable expenses - Stripe fees;
- outstanding invoices kept outside cash-basis income until paid;
- indicative rolling-12-month VAT monitor;
- MTD indicator does not infer legal obligation solely from current turnover;
- monthly cash movement + expense-category breakdown;
- operational `booking_job_costs` are reference-only and never silently treated as tax expenses.

### Admin UI
`admin-business-finance.js` adds Business Finance to Reports with:
- cash received/net receipts/outstanding invoices;
- recorded expenses/Stripe processing/cash surplus/estimated taxable profit;
- estimated Income Tax/Class 4 NI/tax reserve/gap;
- possible January cash-need warning;
- VAT and MTD monitor;
- monthly cash table;
- expense mix;
- private finance settings;
- expense create/delete UI.

`admin.js` loader version: `6.4.24-business-finance-1`.

## Private finance settings defaults
- business type `sole_trader`
- accounting basis `cash`
- tax region `england_wales_ni`
- sole trader start date null
- incorporation date null
- other taxable income £0
- tax reserved £0
- VAT registered false
- VAT registration date null

The public site settings API explicitly allow-lists only `brand`, `appearance`, `maintenance`, `advertising`, `contact`; `finance_private` is not public.

## Explicit limitations
Management estimate only, not HMRC assessment. V1 does not model loss relief/carry-forward, student loans, pension/Gift Aid adjusted-net-income effects beyond the simple PA taper, savings/dividend tax, Marriage Allowance/other reliefs, combined employment/self-employment NI interactions, detailed capital allowances, VAT scheme/input-tax rules, Scottish Income Tax bands, or traditional-accounting accrual adjustments.

If Scotland or traditional accounting is selected, numeric tax estimate is withheld rather than guessed. If business type becomes limited company, company tax estimate is withheld until incorporation rules are deliberately refreshed.

## Post-merge verification
1. production deployment READY + `/api/health` healthy;
2. production `admin.js` contains the Business Finance loader;
3. production expense table starts clean unless real expenses have been entered;
4. `finance_private` may remain absent because coded defaults are safe; do not invent the user's sole-trader start date or personal income;
5. user enters actual start date and optional private other-income/tax-reserve values through Admin;
6. begin logging real paid business expenses;
7. keep Stripe commercial policy OFF until finance validation is complete;
8. then return to Window payment-policy/live-Stripe rollout.

## Non-negotiables
- No customer exposure of private finance settings/expense ledger.
- No separate customer card surcharge.
- Stripe webhook authoritative for money state.
- No secrets or unnecessary personal finance details in source/logs/docs/chat.
- Direct contribution != net profit; finance estimate != filed tax return.
- Privileged finance mutations remain AAL2/settings-permission protected.
- Window only live; address work parked.
