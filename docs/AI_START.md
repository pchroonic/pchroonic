# Namdar AI fast resume

Last verified: 2026-09-13 UTC

Read this first. Use `docs/AI_HANDOFF.md` for implementation detail and `docs/PROJECT_STATUS.md` for roadmap/status.

## Production baseline
- Repository: `pchroonic/pchroonic`, default `main`.
- Current product release: PR #59 `Add sole trader Business Finance dashboard`.
- PR #59 exact tested head: `03121fa992b5d845e5478e61665a90d59c9a9d4f`; CI `34763802394`: SUCCESS; exact preview `dpl_Fb14yFYcoa5F7Bf2mdh7LKQ7Sqo9`: READY.
- PR #59 merge/main HEAD: `7eb4ebd47041288faac444eb4ae0a2304043d7c9`.
- Production deployment: `dpl_GbqaKFaNpjCVfKNeJ51aReKiixs4`, READY on `https://namdar.co.uk`; `/api/health` returned HTTP 200 after release.
- Production Admin loader currently serves `6.4.24-business-finance-1` and loads `/admin-business-finance.js`.
- Supabase production: `namdar-production` (`qjigldxjcpnrlyxgmlqq`).
- Window Cleaning is the only live service. Future services remain planned. Address work remains parked.
- Privileged Staff/Admin requires AAL2/MFA.

## Stripe sandbox — FULL NORMAL FLOW VERIFIED, CUSTOMER POLICY OFF
Signed-in My Namdar deposit -> balance -> refund passed end-to-end with verified 200 webhooks, exact processor-fee capture and corrected multi-tab return. Audit ledger retained.

Current safety: `site_settings.payments` absent; online customer-payment policy OFF; headline allowance OFF; no live Stripe credentials.

## Business Finance — LIVE + AUTHENTICATED VISUAL CHECK PASSED
Product decision: Namdar starts as a **sole trader**, then moves to a **limited company after success**. Preserve sole-trader history and split future company records from the incorporation date; never retroactively convert historic sole-trader activity.

The user opened production Admin -> Reports in an authenticated browser on 2026-09-13 and provided screenshots confirming Business Finance renders successfully: KPI cards, sole-trader tax reserve, VAT/MTD monitor, monthly tax-year cash table, expense mix and private finance settings all load.

Observed live UI state from the screenshots:
- cash received £0;
- net business receipts £0;
- recorded expenses £0;
- Stripe processing £0;
- estimated taxable profit £0;
- one outstanding invoice £106;
- rolling VAT monitor currently shows £106 because it uses issued non-draft/non-void/non-refunded invoices rather than cash receipts;
- no sole-trader start date is saved yet;
- no `finance_private` row exists yet.

Database inspection confirms the £106 comes from one normal issued Window invoice created 2026-09-09 for a confirmed appointment dated 2026-09-11; it is unpaid and the booking still shows `scheduled`. It is **not** coming from Stripe sandbox. Do not delete, void or finance-exclude this record until the user says whether it was a genuine job or a test/old booking.

## Current setup-polish work
Branch: `fix/business-finance-setup-ux-20260913`.

Safe UI-only changes in progress:
- loader target `6.4.25-business-finance-setup-1`;
- new `admin-business-finance-polish.js`;
- when sole trader is selected but no saved start date exists, show `Finish finance setup` and replace the premature £0 tax/deadline panel with `Tax timeline not activated yet`;
- keep cash/invoice/expense tracking usable before start-date setup;
- show incorporation date only when `Limited company` is selected;
- show VAT registration date only when `Namdar is VAT registered` is ticked;
- no finance data is mutated by this polish.

## Applied production database migrations
- `20260913143525 business_finance_expense_ledger`
- `20260913144052 business_finance_expense_updated_by_index`
- `20260913144632 stripe_payment_environment_tracking`

`business_expenses` is private, RLS enabled, with no browser policies. `payment_records.provider_livemode` separates Stripe sandbox from live money. Verified state remains 4 Stripe sandbox rows, 0 live Stripe rows, 0 unknown Stripe rows, 0 business-expense rows, 0 `finance_private` rows, 0 `payments` policy rows.

The GitHub connector blocked creation of matching SQL migration files for these schema changes. Do not claim repo migration files exist. Supabase migration history plus these continuity docs are authoritative.

## Finance v1 rules
- Sole trader, cash basis, England/Wales/Northern Ireland by default.
- 2026/27 sole-trader Income Tax + Class 4 NI estimator.
- Stripe sandbox/test rows excluded entirely from business finance; only `provider_livemode=true` Stripe rows count as real Stripe receipts/refunds/processor costs.
- Actual live Stripe processor fees included automatically.
- Expense ledger supports business-use %, allowable/capital-allowance/non-allowable treatment.
- Cash surplus is distinct from estimated taxable trading profit.
- Outstanding invoices stay separate from cash-basis income until paid.
- Incremental Income Tax attributable to Namdar + Class 4 NI; tax reserve/gap + illustrative payments-on-account warning.
- Rolling 12-month VAT £90,000 monitor and MTD staged threshold indicators.
- Capital-allowance items are not silently deducted; operational `booking_job_costs` remain separate estimates.
- Tax output is management-only, not an HMRC assessment.

## Next action
1. Finish PR for the setup-polish branch and require green CI + READY Vercel preview.
2. Merge only if those checks pass, then verify production loader `6.4.25-business-finance-setup-1`.
3. Ask the user whether the £106 Sep-11 booking/invoice was real or test/old data before changing it.
4. User enters the actual sole-trader start date through Admin; never invent it.
5. Optionally enter private other taxable income and tax reserve through Admin; do not put unnecessary personal financial details in source/docs/chat.
6. Begin recording real paid business expenses.
7. Keep Stripe commercial policy OFF while finance behaviour is validated; later return to Window commercial payment policy/live Stripe rollout.

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
