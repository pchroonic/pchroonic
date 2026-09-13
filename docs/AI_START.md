# Namdar AI fast resume

Last verified: 2026-09-13 UTC

Read this first. Use `docs/AI_HANDOFF.md` for implementation detail and `docs/PROJECT_STATUS.md` for roadmap/status.

## Production baseline before Business Finance merge
- Repository: `pchroonic/pchroonic`, default `main`.
- Current product release: PR #57 `Pin lockless Supabase runtime for My Namdar auth`, merge `52979eab757db23bed21416c9ec5a520b57c72c2`.
- PR #58 docs-only merge/main HEAD: `24d041864fd31b31a76aa559ebdae1c85c330acc`.
- Production deployment before finance merge: `dpl_bhvyvNbhjoi1JFgpYt3x46bjSkfW`, READY on `https://namdar.co.uk`.
- Supabase production: `namdar-production` (`qjigldxjcpnrlyxgmlqq`).
- Window Cleaning is the only live service. Future services remain planned. Address work remains parked.
- Privileged Staff/Admin requires AAL2/MFA.

## Stripe sandbox — FULL NORMAL FLOW VERIFIED, CUSTOMER POLICY OFF
Signed-in My Namdar deposit -> balance -> refund passed end-to-end with verified 200 webhooks, exact processor-fee capture and corrected multi-tab return. Both sandbox charges were refunded and invoice/booking synchronized to `refunded`. Audit ledger retained.

Current safety: `site_settings.payments` absent; online customer-payment policy OFF; headline allowance OFF; no live Stripe credentials.

## Business Finance — PR #59 READY TO MERGE
Product decision: Namdar starts as a **sole trader**, then moves to a **limited company after success**. Preserve sole-trader history and split future company records at the incorporation date; do not retroactively convert historic sole-trader activity.

PR #59: `Add sole trader Business Finance dashboard`
Branch: `feat/sole-trader-finance-dashboard-20260913`.

Exact tested code head before this docs sync: `9944e7dcac5db197aa3023cdbfda785fb5f881fd`.
- GitHub CI run `34763503689`: SUCCESS.
- Exact-head Vercel preview `dpl_DgPUvMYTXjmDzDdEp5VaC1L3tVo2`: READY.
- Preview build errors-only log: clean; build completed successfully.

### Applied production database migrations
- `20260913143525 business_finance_expense_ledger`
- `20260913144052 business_finance_expense_updated_by_index`

`business_expenses` is private, RLS enabled, with no browser policies. The second migration fixed the only finance-specific missing-FK-index advisor finding. Re-run performance advisor confirmed `business_expenses_updated_by_fkey` is no longer listed.

The GitHub connector blocked creation of a matching SQL migration file. Do not claim one exists in the repo. Supabase migration history plus these handoff docs are the authoritative record for the already-applied schema changes.

### Finance v1
- `lib/uk-tax.js`: 2026/27 England/Wales/NI sole-trader estimator.
- private `site_settings.finance_private` settings API.
- private expense-ledger CRUD with audit logging.
- Admin Business Finance dashboard under Reports.
- cash-basis receipts/refunds from `payment_records`.
- actual Stripe processor fees automatically included.
- expense ledger supports business-use %, allowable/capital-allowance/non-allowable treatment.
- cash surplus kept distinct from estimated taxable trading profit.
- outstanding invoices shown separately from cash-basis income.
- estimated incremental Income Tax attributable to Namdar + Class 4 NI.
- tax reserve/gap + illustrative payments-on-account warning.
- rolling 12-month VAT £90,000 threshold monitor.
- MTD staged qualifying-income indicators (>£50k Apr 2026, >£30k Apr 2027, >£20k Apr 2028) with explicit caveat that current turnover alone does not establish the legal start date.
- monthly tax-year cash movement and expense-category mix.
- capital-allowance items are not silently deducted by the simple estimator.
- operational `booking_job_costs` remain separate estimates; actual paid tax expenses must be recorded in the expense ledger.
- invalid expense form data returns proper HTTP 400 validation errors.

Defaults: `sole_trader`, `cash`, `england_wales_ni`, other taxable income £0, tax reserve £0, not VAT registered. Switching to `limited_company` requires an incorporation date and intentionally withholds company-tax estimates until Corporation Tax rules are refreshed at incorporation time.

Tax output is management-only, not an HMRC assessment. V1 does not model loss relief, student loans, pension/Gift Aid adjustments, savings/dividends, detailed capital allowances, VAT scheme/input-tax rules, Scottish bands, traditional-accounting adjustments or combined employment/self-employment NI interactions.

## Supabase advisor status
- `business_expenses`: RLS enabled/no browser policy is intentional for server-only private finance data.
- finance-specific `updated_by` missing-index finding: fixed.
- existing project-wide advisor items remain, including leaked-password protection disabled and unrelated RLS/performance warnings; these pre-date Business Finance.

## Next action after merge
1. verify production deployment READY + `/api/health` healthy;
2. confirm production Admin loader serves `admin-business-finance.js`;
3. verify expense ledger starts clean and no `finance_private` row is required until real settings are entered;
4. user enters actual sole-trader start date and, optionally, private other taxable income/tax reserve through Admin — never hard-code personal figures;
5. begin recording real paid business expenses;
6. keep Stripe commercial policy OFF until finance validation is complete, then return to Window payment-policy/live-Stripe decision.

## Do not break
- Window Cleaning only until deliberate next-stage activation.
- No customer exposure of private finance settings/expense ledger.
- No separate consumer card/Stripe surcharge.
- Verified Stripe webhook remains authoritative for money state.
- Never expose secrets or unnecessary private financial details.
- Direct contribution != net profit; tax estimate != filed tax return.
- Privileged finance mutations remain AAL2/settings-permission protected.
- Review solicitation stays neutral/equal. Address work stays parked.
