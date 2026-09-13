# Namdar AI fast resume

Last verified: 2026-09-13 UTC

Read this first. Use `docs/AI_HANDOFF.md` for implementation detail and `docs/PROJECT_STATUS.md` for roadmap/status.

## Production baseline
- Repository: `pchroonic/pchroonic`, default `main`.
- Current product release: PR #59 `Add sole trader Business Finance dashboard`.
- PR #59 exact tested head: `03121fa992b5d845e5478e61665a90d59c9a9d4f`.
- PR #59 CI run `34763802394`: SUCCESS.
- PR #59 exact preview `dpl_Fb14yFYcoa5F7Bf2mdh7LKQ7Sqo9`: READY with clean errors-only build output.
- PR #59 merge/main HEAD: `7eb4ebd47041288faac444eb4ae0a2304043d7c9`.
- Production deployment: `dpl_GbqaKFaNpjCVfKNeJ51aReKiixs4`, READY on `https://namdar.co.uk`.
- Production `/api/health` after deploy returned HTTP 200 with database healthy and Stripe sandbox secret/webhook configured.
- Production `admin.js` serves loader version `6.4.24-business-finance-1` and loads `/admin-business-finance.js`.
- Supabase production: `namdar-production` (`qjigldxjcpnrlyxgmlqq`).
- Window Cleaning is the only live service. Future services remain planned. Address work remains parked.
- Privileged Staff/Admin requires AAL2/MFA.

## Stripe sandbox — FULL NORMAL FLOW VERIFIED, CUSTOMER POLICY OFF
Signed-in My Namdar deposit -> balance -> refund passed end-to-end with verified 200 webhooks, exact processor-fee capture and corrected multi-tab return. Both sandbox charges were refunded and invoice/booking synchronized to `refunded`. Audit ledger retained.

Current safety: `site_settings.payments` absent; online customer-payment policy OFF; headline allowance OFF; no live Stripe credentials.

## Business Finance — LIVE
Product decision: Namdar starts as a **sole trader**, then moves to a **limited company after success**. Preserve sole-trader history and split future company records from the incorporation date; do not retroactively convert historic sole-trader activity.

### Applied production database migrations
- `20260913143525 business_finance_expense_ledger`
- `20260913144052 business_finance_expense_updated_by_index`
- `20260913144632 stripe_payment_environment_tracking`

`business_expenses` is private, RLS enabled, with no browser policies. The second migration fixed the finance-specific missing-FK-index advisor finding.

`payment_records.provider_livemode` separates Stripe sandbox from live money. All existing Stripe rows were safely backfilled `false` because Namdar has never had live Stripe credentials. Verified post-release database state:
- 4 Stripe sandbox rows;
- 0 live Stripe rows;
- 0 unknown Stripe rows;
- 0 business-expense rows;
- 0 `finance_private` rows;
- 0 `payments` policy rows.

The GitHub connector blocked creation of matching SQL migration files for these schema changes. Do not claim repo migration files exist. Supabase migration history plus these continuity docs are authoritative for the already-applied production schema changes.

### Finance v1
- `lib/uk-tax.js`: 2026/27 England/Wales/NI sole-trader estimator.
- private `site_settings.finance_private` settings API.
- private expense-ledger CRUD with audit logging.
- Admin Business Finance dashboard under Reports.
- cash-basis receipts/refunds from real payment records.
- **Stripe sandbox/test rows are excluded entirely from business finance**; only `provider_livemode=true` Stripe rows count as real Stripe receipts/refunds/processor costs. Non-Stripe real payment methods remain eligible.
- verified Stripe webhook records `provider_livemode` from Checkout Session/PaymentIntent objects.
- actual live Stripe processor fees are included automatically.
- expense ledger supports business-use %, allowable/capital-allowance/non-allowable treatment.
- cash surplus is distinct from estimated taxable trading profit.
- outstanding invoices are shown separately from cash-basis income.
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

## Next action
1. Open Admin -> Reports and visually verify the live Business Finance panel with the user's authenticated Admin session.
2. Enter the user's **actual sole-trader start date** through Admin; never invent it.
3. Optionally enter private other taxable income and current tax reserve through Admin for a more accurate marginal tax estimate; do not put unnecessary personal financial details in source/docs/chat.
4. Begin recording real paid business expenses in the expense ledger.
5. Keep Stripe commercial policy OFF while finance data-entry behaviour is validated.
6. Once finance is stable, return to the Window commercial payment policy and live Stripe rollout.

## Do not break
- Window Cleaning only until deliberate next-stage activation.
- No customer exposure of private finance settings/expense ledger.
- No separate consumer card/Stripe surcharge.
- Verified Stripe webhook remains authoritative for money state.
- Never expose secrets or unnecessary private financial details.
- Sandbox Stripe activity must never enter revenue/tax reporting.
- Direct contribution != net profit; tax estimate != filed tax return.
- Privileged finance mutations remain AAL2/settings-permission protected.
- Review solicitation stays neutral/equal. Address work stays parked.
