# Namdar AI fast resume

Last verified: 2026-09-13 UTC

Read this first. Use `docs/AI_HANDOFF.md` for implementation detail and `docs/PROJECT_STATUS.md` for roadmap/status.

## Production baseline
- Repository: `pchroonic/pchroonic`, default `main`.
- Current product release: PR #57 `Pin lockless Supabase runtime for My Namdar auth`.
- PR #57 merge: `52979eab757db23bed21416c9ec5a520b57c72c2`; production deployment `dpl_AFyzoBkodBAZD5qqLjx2z73yHTvg` READY on `https://namdar.co.uk`.
- PR #58 is docs-only and records the completed signed-in Stripe sandbox E2E verification; main HEAD after PR #58: `24d041864fd31b31a76aa559ebdae1c85c330acc`.
- Supabase production: `namdar-production` (`qjigldxjcpnrlyxgmlqq`).
- Window Cleaning is the only live/quotable/bookable service. Gutters, jet washing, roof cleaning, handyman and 3D tours remain `planned`.
- Address-data work remains parked.
- Privileged Staff/Admin requires AAL2/MFA.

## Stripe sandbox — FULL NORMAL FLOW VERIFIED, CUSTOMER POLICY OFF
The real signed-in My Namdar flow passed deposit -> balance -> refund using a controlled £1.00 Window invoice.
- £0.50 deposit Checkout: 200; webhook 200; invoice `part_paid`; booking `deposit_paid`; Stripe fee £0.22 / net £0.28.
- £0.50 balance Checkout: 200; webhook 200; invoice `paid`; booking `paid`; second fee £0.22 / net £0.28.
- Stripe return reopened signed-in My Namdar Billing correctly with several Namdar tabs open after PR #57.
- Both £0.50 sandbox charges were fully refunded; refund webhooks 200; exactly two refund ledger rows; invoice/booking synchronized to `refunded`.
- Sandbox payment/refund ledger is intentionally retained as audit history.
- `site_settings.payments` is absent; customer online-payment policy OFF; headline allowance OFF; no live Stripe credentials.

## My Namdar auth/session — VERIFIED
PR #56 bounded `auth.getSession()` and removed the endless spinner failure mode. PR #57 pins exact Supabase JS `2.116.0` before account client creation, avoiding the stale multi-tab browser lock path. Multi-tab production restore passed.

`account.html` still contains an older floating `@supabase/supabase-js@2` include, but exact `2.116.0` replaces the global before client creation. Optional cleanup only.

## Business Finance — CURRENT WORK
User decision: start Namdar as a **sole trader**, then move to a **limited company after the business succeeds**. Preserve sole-trader history and split future company records from the incorporation date rather than retroactively converting old activity.

Branch: `feat/sole-trader-finance-dashboard-20260913`.

### Database
Supabase production migration applied successfully:
- version `20260913143525`
- name `business_finance_expense_ledger`

It creates private `business_expenses` with:
- expense date/category/description/supplier;
- gross amount + VAT amount;
- business-use percentage;
- tax treatment: `allowable`, `capital_allowance`, `non_allowable`;
- payment method;
- optional booking/reference/receipt reference/private notes;
- audit user/timestamps;
- RLS enabled and no browser policies; privileged server API only.

The matching repository migration-file write was blocked by the GitHub connector safety gate. Do not claim a repo migration file exists; the migration is recorded by Supabase migration history and these handoff docs.

### Finance implementation candidate
New files on branch:
- `lib/uk-tax.js`: 2026/27 England/Wales/NI sole-trader Income Tax + Class 4 NI estimator, Personal Allowance taper, VAT threshold and MTD thresholds.
- `scripts/uk-tax.test.mjs`.
- `api/admin-business-finance.js`: private cash-basis dashboard aggregation.
- `api/admin-finance-settings.js`: private `site_settings.finance_private` settings.
- `api/admin-finance-expenses.js`: private expense-ledger CRUD.
- `admin-business-finance.js`: Admin Reports UI for revenue/cash, expenses, estimated taxable profit, tax reserve, VAT/MTD monitors, monthly cash movement, expense mix, settings and expense entry.
- `scripts/business-finance.test.mjs`.
- `admin.js` loads the new module with version `6.4.24-business-finance-1`.
- CI workflow includes syntax + finance regression/tax tests.

### Current finance rules
- Default business mode: `sole_trader`.
- Default accounting basis: `cash` (HMRC default for eligible sole traders from 2024/25).
- Tax estimator currently supports tax year `2026-27` and region `england_wales_ni`.
- Standard Personal Allowance £12,570; taper starts at £100,000 and reaches zero at £125,140.
- Class 4 NI: 6% between £12,570 and £50,270, then 2% above.
- VAT registration threshold monitor: £90,000 rolling 12 months.
- MTD indicators show staged qualifying-income thresholds: >£50k Apr 2026, >£30k Apr 2027, >£20k Apr 2028; dashboard explicitly says obligation depends on prior submitted return, not current turnover alone.
- Income Tax estimate is **incremental tax attributable to Namdar**: tax on other taxable income + Namdar profit minus tax on other taxable income alone.
- Private optional `other_taxable_income` improves marginal-tax accuracy; it is never public.
- Stripe processor fees are included automatically from actual payment-provider fee records.
- Operational `booking_job_costs` remain separate from tax expenses; they are not silently deducted unless actual paid costs are recorded in the expense ledger.
- Capital-allowance items remain visible but are excluded from the simple taxable-profit estimate pending specialist treatment.
- Estimate is clearly labelled management-only, not an HMRC assessment. Loss relief, student loans, pension adjustments, savings/dividends and combined-employment NI interactions are not modelled.

## Next verification sequence
1. finish/update all three handoff docs on the finance branch;
2. open PR and run CI;
3. inspect exact Vercel preview/build;
4. call preview APIs with authenticated Admin if practical, otherwise verify production only after merge;
5. merge only when CI/build are green;
6. verify `business_expenses` security/advisors and production finance API/UI;
7. enter the user's actual sole-trader start date and any optional tax settings through Admin, not source code;
8. keep Stripe customer policy OFF while finance work is validated;
9. only after Business Finance is stable return to the real Window payment-policy decision.

## Do not break
- Window Cleaning only; no Stage 2 activation without deliberate decision.
- No separate consumer card/Stripe surcharge.
- Verified Stripe webhook is authoritative for Stripe money; browser success is never payment proof.
- Never expose Stripe/Supabase/SMTP/Turnstile/cron secrets or private finance settings.
- Sandbox-ready does not mean live-money-ready.
- Direct contribution is not net profit; tax dashboard estimates are not filed tax returns.
- Privileged access remains AAL2/MFA protected.
- Review requests remain neutral/equal.
- Address work stays parked.
