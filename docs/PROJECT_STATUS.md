# Namdar project status

Last updated: 2026-09-13 UTC

## Production baseline
- Repo `pchroonic/pchroonic`, default `main`.
- Current product release: PR #62 `Add intelligent receipt-driven expense ledger`.
- Exact tested PR head `2496e80a085f3acf812a4e865f5befb72eec02a8`; GitHub CI run `34766157941` SUCCESS.
- Exact-head Vercel preview `dpl_4adpSAC33DWg2oawWeqWPqUW78KM` READY with clean errors-only build output.
- PR #62 merge/main HEAD `a6b73927f1649f2ad167cda4410f2f5632b78212`.
- Production deployment `dpl_B4nhdmgLZ13n813rUMWQfJRj2KUN` READY on `https://namdar.co.uk`.
- Production `/api/health` returned HTTP 200 after deploy.
- Production Admin loader `6.4.26-intelligent-receipts-1` loads `admin-finance-receipts.js`.
- Supabase production `qjigldxjcpnrlyxgmlqq`.
- Window Cleaning only live; future services planned; address work parked.

## Stripe sandbox — full pass / commercial policy OFF
Signed-in deposit + balance + full-refund sandbox flow passed with authoritative webhooks. Customer payment policy remains OFF; no live Stripe credentials. Four retained Stripe ledger rows are sandbox and excluded from finance.

## Business Finance — LIVE
Business structure decision: **sole trader first, limited company after success**.

PR #61 setup gating remains live: the tax timeline is withheld until the real sole-trader start date is saved, and incorporation/VAT registration dates appear only when applicable.

### Confirmed test-data cleanup
The user confirmed the old £106 Sep-11 Window booking/invoice was test data. It had no payments, job costs, feedback, project link or promo use. Its quote, booking, invoice, booking notifications and matching archived reminder were removed together.

Verified post-PR62 finance state:
- outstanding invoices £0;
- rolling invoice turnover £0;
- business expenses 0;
- receipt rows 0;
- learned merchant rules 0;
- Stripe rows 4 sandbox / 0 live;
- payment policy rows 0.

## Intelligent Expense Receipts — LIVE / FIRST AUTHENTICATED RECEIPT TEST PENDING
Applied migrations:
- `20260913152601 intelligent_expense_receipts`;
- `20260913153443 intelligent_expense_receipt_fk_indexes`.

Both intelligent-receipt migrations have matching SQL files in git. Receipt-specific missing-FK advisor findings are cleared. Remaining advisor findings are pre-existing elsewhere.

### Private receipt foundation
- private `business_expense_receipts` document/draft table;
- private `business_expense_merchant_rules` supplier-learning table;
- private `finance-receipts` Supabase Storage bucket;
- accepted files: JPG, PNG, WebP, PDF up to 10 MB;
- Storage access requires AAL2 plus Admin or active staff settings permission;
- receipt/merchant tables use RLS without direct browser table policies by design; privileged APIs mediate table data.

### Live receipt workflow
- Smart Receipt panel above Expense Ledger;
- SHA-256 exact-file duplicate protection before another receipt record is created;
- private original receipt storage;
- browser-local OCR using pinned Tesseract.js 7.0.0;
- PDF embedded-text extraction using pinned PDF.js 4.10.38, with scanned-PDF OCR fallback;
- automatic suggestions for supplier/date/total/VAT/reference/payment method/category/tax treatment/business-use %;
- confidence and review warnings;
- likely duplicate expense warning based on date/amount/supplier;
- no automatic posting: user must review and save;
- reviewed receipt is attached to the saved expense;
- corrected merchant/category/tax/business-use/payment-method choices are learned for future receipts;
- recent receipt documents reopen with short-lived signed URLs;
- deleting a receipt-backed expense detaches the receipt back to review instead of destroying document history.

Privacy: receipt pixels/document contents are not sent to a third-party AI provider in v1. OCR runs in the authenticated Admin browser; originals stay in private Supabase storage. jsDelivr is used only for pinned OCR/PDF runtime assets.

## Applied production finance schema
- `20260913143525 business_finance_expense_ledger`
- `20260913144052 business_finance_expense_updated_by_index`
- `20260913144632 stripe_payment_environment_tracking`
- `20260913152601 intelligent_expense_receipts`
- `20260913153443 intelligent_expense_receipt_fk_indexes`

## Immediate next work
1. User hard-refreshes Admin -> Reports and confirms the `Smart receipt` panel appears.
2. Upload one controlled real/sample receipt.
3. Verify private upload -> OCR -> field suggestions -> review/edit -> save -> attached receipt -> learned merchant rule -> reopen link -> duplicate protection.
4. If the sample is not a genuine business expense, do not keep it as accounting data; clean the test expense/receipt after verification.
5. User saves the actual sole-trader start date when ready; never invent it.
6. Keep Stripe customer payment policy OFF during finance/receipt validation.
7. Once finance is stable, return to Window commercial payment policy/live Stripe rollout.

## Handoff rule
Every substantial product/provider/data change updates `docs/AI_START.md`, `docs/AI_HANDOFF.md`, and this file. Never store credentials, raw API keys, customer secrets, TOTP codes, one-time Auth links or unnecessary private financial details in source/docs.
