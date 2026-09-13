# Namdar AI handoff

Last verified: 2026-09-13 UTC

Read `docs/AI_START.md` first.

## Production source of truth
- Repo `pchroonic/pchroonic`, default `main`.
- Current product release: PR #59 `Add sole trader Business Finance dashboard`.
- Exact tested PR head `03121fa992b5d845e5478e61665a90d59c9a9d4f`; CI `34763802394` SUCCESS; preview `dpl_Fb14yFYcoa5F7Bf2mdh7LKQ7Sqo9` READY.
- PR #59 merge/main HEAD `7eb4ebd47041288faac444eb4ae0a2304043d7c9`.
- Production deployment `dpl_GbqaKFaNpjCVfKNeJ51aReKiixs4` READY on `https://namdar.co.uk`; `/api/health` HTTP 200 after deploy.
- Production `admin.js` currently serves `6.4.24-business-finance-1`.
- Supabase production `qjigldxjcpnrlyxgmlqq`.
- Window Cleaning only live; future services planned; address work parked.
- Staff/Admin privileged APIs require AAL2/MFA.

## Authenticated Business Finance visual verification
On 2026-09-13 the user opened production Admin -> Reports while signed in and supplied screenshots. This closes the earlier interactive-verification gap: Business Finance visibly renders in the authenticated Admin browser with its KPIs, tax-reserve section, VAT/MTD monitor, monthly cash movement table, expense mix and settings form.

Visible state:
- cash received £0;
- net business receipts £0;
- expenses £0;
- Stripe processing £0;
- taxable-profit estimate £0;
- outstanding invoices £106;
- VAT rolling-12-month monitor £106;
- sole-trader start date empty;
- no VAT registration ticked.

The current £106 is one issued Window invoice created 2026-09-09 for a confirmed booking dated 2026-09-11. It is unpaid and the booking still has `work_status=scheduled`. It is not a Stripe sandbox artifact. Do not delete/void/exclude it without the user's classification of that booking as real vs test/old data.

## Stripe state
Sandbox provider connected; commercial customer payment policy OFF; no live-money credentials. Normal signed-in deposit + balance + refund passed end-to-end with authoritative webhooks. `site_settings.payments` absent. Four retained Stripe rows are sandbox and excluded from finance.

## Business Finance product decision
Namdar starts as a **sole trader** and later becomes a **limited company after success**. Preserve historical sole-trader activity and switch future reporting from the incorporation date only.

## Current work branch
`fix/business-finance-setup-ux-20260913`

Purpose: polish the initial finance setup after the authenticated screenshots, without changing money or historical records.

Changes:
- add `admin-business-finance-polish.js`;
- bump Admin loader target to `6.4.25-business-finance-setup-1`;
- if business type is sole trader and no saved start date exists, show a setup warning and suppress the premature £0 tax/deadline display with `Tax timeline not activated yet`;
- cash/invoice/expense tracking remains usable before start-date setup;
- hide incorporation date unless `Limited company` is selected;
- hide VAT registration date unless the VAT-registered checkbox is selected;
- regression test covers the setup gate/conditional fields;
- CI syntax checks the new polish file.

Implementation detail: the setup gate uses the date input's `defaultValue` rather than the unsaved live `value`, so merely typing a date does not make the tax timeline look activated before settings are actually saved and rerendered from server state.

## Applied Supabase finance migrations
- `20260913143525 business_finance_expense_ledger`
- `20260913144052 business_finance_expense_updated_by_index`
- `20260913144632 stripe_payment_environment_tracking`

`business_expenses` remains private/RLS enabled/no browser policies. `payment_records.provider_livemode` records Stripe test/live environment. Verified state: 4 sandbox Stripe rows, 0 live, 0 unknown, 0 business expenses, 0 `finance_private` rows, 0 `payments` rows.

GitHub SQL migration-file creation for these schema changes was blocked by the connector safety gate. Supabase migration history + continuity docs remain authoritative.

## Finance implementation summary
- `lib/uk-tax.js`: 2026/27 England/Wales/NI sole-trader estimator.
- private `site_settings.finance_private` settings.
- private audited business-expense ledger.
- cash-basis receipts/refunds from real payment rows only.
- Stripe rows count only when `provider_livemode===true`.
- actual live GBP Stripe fees included automatically.
- cash surplus kept separate from estimated taxable profit.
- outstanding invoices are not cash-basis income until paid.
- VAT monitor is invoice-based indicative taxable-turnover monitoring, not the same thing as cash receipts.
- MTD monitor is informational; current turnover alone does not establish legal start date.
- management estimate only; no claim of being an HMRC assessment.

## Next
1. Open PR from `fix/business-finance-setup-ux-20260913` and require green CI + READY exact-head Vercel preview.
2. Merge only if clean, then verify production loader/version and the new setup warning/conditional fields.
3. Ask user whether the £106 Sep-11 booking/invoice is genuine or test/old data before changing it.
4. User saves the actual sole-trader start date through Admin.
5. Optionally enter private other-taxable-income/tax-reserve values and begin real expense logging.
6. Keep Stripe commercial policy OFF during finance validation, then return to Window payment-policy/live Stripe rollout.

## Non-negotiables
- No customer exposure of private finance settings/expense ledger.
- Sandbox Stripe activity never counts as revenue/tax activity.
- Do not mutate the £106 invoice until user classifies it.
- No separate customer card surcharge.
- Stripe webhook authoritative for money state.
- No secrets or unnecessary personal finance details in source/logs/docs/chat.
- Direct contribution != net profit; finance estimate != filed tax return.
- Privileged finance mutations remain AAL2/settings-permission protected.
- Window only live; address work parked.
