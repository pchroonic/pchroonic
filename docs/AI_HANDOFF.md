# Namdar AI handoff

Last verified: 2026-09-13 UTC

Read `docs/AI_START.md` first.

## Production source of truth
- Repo `pchroonic/pchroonic`, default `main`.
- Current product release: PR #61 `Polish Business Finance initial setup`, merge `2bb2f20b41136a2b3ba2dac1d083955d3108fd6c`.
- Production deployment `dpl_F8Ti9xMH6xYRynvUcQw14Cda4fpV` READY on `https://namdar.co.uk`.
- Production Admin loader `6.4.25-business-finance-setup-1`.
- Supabase production `qjigldxjcpnrlyxgmlqq`.
- Window Cleaning only live; future services planned; address work parked.
- Staff/Admin privileged APIs require AAL2/MFA.

## Stripe state
Sandbox provider connected; commercial customer payment policy OFF; no live-money credentials. Normal signed-in deposit + balance + refund passed end-to-end with authoritative webhooks. Four retained Stripe rows are sandbox and excluded from Business Finance.

## Business Finance state
Namdar starts as a **sole trader** and later becomes a **limited company after success**. Preserve historical sole-trader activity and switch future reporting only from the real incorporation date.

Authenticated Admin screenshots verified Business Finance renders correctly. PR #61 added setup gating so the tax timeline is not presented as complete until the actual sole-trader start date is saved.

### £106 test fixture cleanup
The user explicitly confirmed the £106 Sep-11 Window booking/invoice was test data. Before deletion it had zero payment rows, zero job-cost rows, zero feedback, zero project links and zero promo use. The quote, booking, invoice, booking notifications and matching archived reminder were deleted together. Post-cleanup checks show:
- outstanding invoices £0;
- rolling invoice turnover £0;
- business expenses 0;
- 4 Stripe sandbox rows / 0 live rows;
- `site_settings.payments` 0 rows.

## Intelligent receipt branch
Branch: `feat/intelligent-expense-receipts-20260913`.

Applied production migrations:
- `20260913152601 intelligent_expense_receipts`;
- `20260913153443 intelligent_expense_receipt_fk_indexes`.

Both migrations have matching SQL files on this branch. The second migration added covering indexes for `business_expense_receipts.updated_by`, `business_expense_merchant_rules.created_by`, and `business_expense_merchant_rules.updated_by`. Re-running the performance advisor removed all three new receipt-specific missing-FK findings. Remaining missing-FK advisor findings are pre-existing elsewhere in the product.

### New private schema/storage
`business_expense_receipts`
- private receipt/draft metadata;
- optional `expense_id` link;
- private storage path, original file metadata and SHA-256 fingerprint;
- OCR text, structured extraction JSON, confidence, method and lifecycle status;
- RLS enabled/no direct table browser policies; server API access only.

`business_expense_merchant_rules`
- private learned supplier rules;
- remembers reviewed category, tax treatment, business-use percentage and payment method;
- RLS enabled/no direct table browser policies.

Storage bucket `finance-receipts`
- private;
- JPG/PNG/WebP/PDF;
- 10 MB limit;
- authenticated storage policies require `private.can_manage_finance_receipts()`;
- helper requires AAL2 and either Admin role or active staff `settings` permission;
- upload path must start with authenticated user's UUID.

Starting receipt state: 0 receipt rows, 0 learned merchant rules.

### Receipt workflow
Frontend `admin-finance-receipts.js`:
- loaded after Business Finance under Admin loader target `6.4.26-intelligent-receipts-1`;
- drag/select receipt UI above manual expense form;
- SHA-256 file fingerprint before upload;
- exact-file duplicate block before creating another receipt document;
- direct authenticated upload to private Supabase Storage;
- pinned Tesseract.js 7.0.0 local browser OCR for images;
- pinned PDF.js 4.10.38 embedded-text extraction for PDFs; scanned PDFs render and fall back to OCR;
- progress, confidence, review warnings and possible duplicate display;
- suggestions populate existing expense fields but do not post automatically;
- receipt-backed submit is intercepted so `receiptId` is included;
- possible same-date/amount/supplier duplicates require explicit confirmation;
- recent receipt documents can be reopened through short-lived signed URLs;
- reviewed unattached drafts can be reloaded without rerunning OCR.

Privacy model: receipt pixels/document content are not sent to an external AI provider. OCR is performed in the authenticated browser. Pinned jsDelivr assets provide OCR/PDF code/language data; CSP allows jsDelivr connect/worker assets. Original receipt file is retained only in private Namdar/Supabase storage.

Backend `lib/receipt-intelligence.js`:
- deterministic extraction of supplier/date/total/VAT/reference/payment method;
- keyword/rule category suggestion;
- tax-treatment warnings including fine/penalty detection;
- confidence scores + review warnings;
- merchant-key normalisation;
- learned merchant rules can override generic suggestions after the user has previously reviewed a supplier.

Backend `api/admin-finance-receipts.js`:
- GET requires analytics permission;
- receipt prepare/analyze/discard/error actions require settings permission + AAL2 through `requireStaff`;
- validates MIME, size and SHA-256;
- exact-file duplicate detection;
- stores OCR/extraction only after analyze;
- checks likely expense duplicates by date/amount/supplier;
- audit logs prepare/analyze/discard actions.

`api/admin-finance-expenses.js` changes:
- `receiptId` can attach a reviewed receipt to a newly saved expense;
- receipt status becomes `attached`, `expense_id` is linked, expense `source='receipt'` and `receipt_reference` stores receipt id;
- reviewed final supplier/category/tax/business-use/payment-method choices train/upsert private merchant rules;
- deleting a receipt-backed expense detaches the receipt back to `review` rather than losing its document history.

### Tests/CI
Added:
- `scripts/receipt-intelligence.test.mjs`;
- `scripts/business-finance-receipts.test.mjs`;
- CI syntax checks for new frontend/API/parser files and both tests.

Current branch still requires PR CI + exact Vercel preview before merge.

## Applied finance migrations
- `20260913143525 business_finance_expense_ledger`
- `20260913144052 business_finance_expense_updated_by_index`
- `20260913144632 stripe_payment_environment_tracking`
- `20260913152601 intelligent_expense_receipts`
- `20260913153443 intelligent_expense_receipt_fk_indexes`

Older finance migrations may lack matching SQL files; both receipt migrations have matching branch files. Supabase migration history plus continuity docs are authoritative for what is applied.

## Next
1. Open PR from `feat/intelligent-expense-receipts-20260913`.
2. Require green GitHub CI + READY exact-head Vercel preview + clean errors-only build.
3. Merge only if clean and verify production loader `6.4.26-intelligent-receipts-1` + `/api/health`.
4. User uploads one controlled sample receipt in authenticated Admin -> Reports.
5. Verify private storage, OCR, extracted fields, review/edit, save/attach, learned merchant rule, reopen link and duplicate protection.
6. Keep Stripe commercial policy OFF until this finance workflow is validated.
7. User saves real sole-trader start date when ready; never invent it.

## Non-negotiables
- No customer exposure of private finance settings, expense ledger or receipt documents.
- Receipt extraction is suggestion-only; never silently create tax/accounting entries.
- Sandbox Stripe activity never counts as revenue/tax activity.
- No separate customer card surcharge.
- Stripe webhook authoritative for money state.
- No secrets or unnecessary personal finance details in source/logs/docs/chat.
- Direct contribution != net profit; finance estimate != filed tax return.
- Window only live; address work parked.
