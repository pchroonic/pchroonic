# Namdar AI fast resume

Last verified: 2026-09-13 UTC

Read this first. Use `docs/AI_HANDOFF.md` for implementation detail and `docs/PROJECT_STATUS.md` for roadmap/status.

## Production baseline
- Repository: `pchroonic/pchroonic`, default `main`.
- Current production product release: PR #61 `Polish Business Finance initial setup`, merge `2bb2f20b41136a2b3ba2dac1d083955d3108fd6c`.
- Production deployment: `dpl_F8Ti9xMH6xYRynvUcQw14Cda4fpV`, READY on `https://namdar.co.uk`.
- Production Admin loader: `6.4.25-business-finance-setup-1`.
- Supabase production: `namdar-production` (`qjigldxjcpnrlyxgmlqq`).
- Window Cleaning is the only live service. Future services remain planned. Address work remains parked.
- Privileged Staff/Admin requires AAL2/MFA.

## Stripe sandbox — full normal flow verified, customer policy OFF
Signed-in My Namdar deposit -> balance -> refund passed end-to-end with authoritative 200 webhooks, processor-fee capture and corrected multi-tab return. Four Stripe sandbox audit rows remain and are excluded from Business Finance.

Current safety: `site_settings.payments` absent; online customer-payment policy OFF; headline allowance OFF; no live Stripe credentials.

## Business Finance — live
Namdar starts as a **sole trader**, later moves to a **limited company after success**. Preserve dated sole-trader history and split future company records from the actual incorporation date.

Authenticated Admin screenshots confirmed the Business Finance UI loads. PR #61 now hides premature tax/deadline output until the actual sole-trader start date is saved and conditionally hides incorporation/VAT registration dates.

### Confirmed test-data cleanup
The user confirmed the old £106 Window booking/invoice was test data. Database inspection showed no payments, job costs, feedback, promo redemption, project link or other real finance dependency. The test quote, booking, invoice, booking notifications and matching archived reminder were deleted together on 2026-09-13.

Verified finance state after cleanup:
- outstanding invoices: £0;
- rolling invoice turnover used by VAT monitor: £0;
- business expenses: 0;
- Stripe ledger: 4 sandbox / 0 live;
- `site_settings.payments`: 0 rows.

## Intelligent Expense Receipts — in progress
Branch: `feat/intelligent-expense-receipts-20260913`.

Applied Supabase migration:
- `20260913152601 intelligent_expense_receipts`.

Migration adds:
- private `business_expense_receipts` document/draft table;
- private `business_expense_merchant_rules` learning table;
- private `finance-receipts` Storage bucket (JPG/PNG/WebP/PDF, 10 MB limit);
- AAL2 + finance/settings storage access helper/policies.

Current receipt data starts clean: 0 receipt rows and 0 learned merchant rules.

Receipt workflow under development:
1. staff chooses/drops a JPG, PNG, WebP or PDF receipt;
2. browser hashes the file and blocks exact-file duplicates;
3. original file uploads to private Supabase Storage;
4. OCR runs **locally in the browser** with pinned Tesseract.js; text PDFs are read with pinned PDF.js first and scanned PDFs fall back to OCR;
5. server-side deterministic receipt intelligence extracts/suggests supplier, date, total, VAT, reference, payment method, expense category, tax treatment and business-use percentage;
6. Namdar warns about low-confidence fields and possible date/amount/supplier duplicates;
7. user reviews/corrects fields before saving — no receipt is silently posted as an expense;
8. reviewed receipt becomes attached to the saved `business_expenses` row;
9. corrected supplier/category/tax/business-use/payment-method choices update a private merchant rule for better suggestions next time.

Code added/changed on branch:
- `lib/receipt-intelligence.js`;
- `api/admin-finance-receipts.js`;
- `admin-finance-receipts.js`;
- `api/admin-finance-expenses.js` receipt attachment + merchant learning;
- Admin loader target `6.4.26-intelligent-receipts-1`;
- CSP allows pinned jsDelivr OCR/PDF worker/fetch assets;
- receipt parser/security regression tests + CI syntax checks.

Important privacy design: receipt image/PDF pixels are not sent to a third-party AI provider. OCR runs in the authenticated Admin browser; the original receipt is stored in private Namdar/Supabase storage. External CDN use is for pinned OCR/PDF library/runtime assets only. Optional AI enrichment can be added later deliberately, but is not required for v1.

## Applied production finance migrations
- `20260913143525 business_finance_expense_ledger`
- `20260913144052 business_finance_expense_updated_by_index`
- `20260913144632 stripe_payment_environment_tracking`
- `20260913152601 intelligent_expense_receipts`

Supabase migration history plus these handoff docs are authoritative for applied schema changes. Do not invent missing repo SQL migration files.

## Next action
1. Open PR for intelligent receipt branch.
2. Require green GitHub CI and READY exact Vercel preview with clean errors-only build.
3. Verify Supabase receipt storage policies/advisors and clean starting state.
4. Merge only if green, then verify production loader `6.4.26-intelligent-receipts-1`.
5. In authenticated Admin -> Reports, upload a controlled sample receipt and verify: private upload -> OCR -> suggestions -> review -> save -> attachment -> learned merchant rule -> duplicate protection.
6. Enter the actual sole-trader start date through Admin when the user is ready; never invent it.
7. Keep Stripe commercial policy OFF until finance/receipt behaviour is validated.

## Do not break
- No customer exposure of private finance settings, expense ledger or receipt documents.
- Receipt suggestions must remain review-first; never auto-post tax/accounting entries.
- Sandbox Stripe activity must never enter revenue/tax reporting.
- No separate consumer card/Stripe surcharge.
- Verified Stripe webhook remains authoritative for money state.
- Never expose secrets or unnecessary private financial details.
- Direct contribution != net profit; tax estimate != filed tax return.
- Window Cleaning only until deliberate next-stage activation. Address work remains parked.
