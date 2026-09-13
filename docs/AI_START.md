# Namdar AI fast resume

Last verified: 2026-09-13 UTC

Read this first. Use `docs/AI_HANDOFF.md` for implementation detail and `docs/PROJECT_STATUS.md` for roadmap/status.

## Production baseline
- Repository: `pchroonic/pchroonic`, default `main`.
- Current product release: PR #62 `Add intelligent receipt-driven expense ledger`.
- PR #62 exact tested head: `2496e80a085f3acf812a4e865f5befb72eec02a8`.
- PR #62 CI run `34766157941`: SUCCESS.
- Exact-head Vercel preview `dpl_4adpSAC33DWg2oawWeqWPqUW78KM`: READY; errors-only build clean.
- PR #62 merge/main HEAD: `a6b73927f1649f2ad167cda4410f2f5632b78212`.
- Production deployment: `dpl_B4nhdmgLZ13n813rUMWQfJRj2KUN`, READY on `https://namdar.co.uk`.
- Production `/api/health`: HTTP 200 after deploy.
- Production Admin loader: `6.4.26-intelligent-receipts-1`; it loads `admin-finance-receipts.js`.
- Supabase production: `namdar-production` (`qjigldxjcpnrlyxgmlqq`).
- Window Cleaning is the only live service. Future services remain planned. Address work remains parked.
- Privileged Staff/Admin requires AAL2/MFA.

## Stripe sandbox — full normal flow verified, customer policy OFF
Signed-in My Namdar deposit -> balance -> refund passed end-to-end with authoritative webhooks. Four Stripe sandbox audit rows remain and are excluded from Business Finance. `site_settings.payments` is absent; no live Stripe credentials.

## Business Finance — LIVE
Namdar starts as a **sole trader**, later moves to a **limited company after success**. Preserve dated sole-trader history and split future company records from the real incorporation date. Tax output remains a management estimate, not an HMRC assessment.

### Test-data cleanup
The user confirmed the old £106 Sep-11 Window booking/invoice was test data. It had no payments, job costs, feedback, project link or promo use. Its quote, booking, invoice, notifications and matching archived reminder were deleted together.

Verified post-PR62 clean finance state:
- outstanding invoices £0;
- rolling invoice turnover £0;
- business expenses 0;
- receipt rows 0;
- learned merchant rules 0;
- Stripe rows 4 sandbox / 0 live;
- payment policy rows 0.

## Intelligent Expense Receipts — LIVE / NEEDS FIRST AUTHENTICATED RECEIPT TEST
Applied migrations:
- `20260913152601 intelligent_expense_receipts`;
- `20260913153443 intelligent_expense_receipt_fk_indexes`.

Both receipt migrations have matching files in `supabase/migrations/`. Receipt-specific missing-FK advisor findings are cleared. Private receipt/merchant tables intentionally use RLS without browser table policies; server APIs mediate table access. Private Storage access requires AAL2 plus Admin or active staff settings permission.

Live receipt workflow:
1. choose/drop JPG, PNG, WebP or PDF (up to 10 MB);
2. browser computes SHA-256 and blocks exact-file duplicates;
3. original uploads to private `finance-receipts` Supabase Storage;
4. OCR runs locally in the Admin browser with pinned Tesseract.js 7.0.0; PDF.js 4.10.38 reads text PDFs first and scanned PDFs fall back to OCR;
5. server-side receipt intelligence suggests supplier, date, total, VAT, reference, payment method, category, tax treatment and business-use percentage;
6. low-confidence and possible date/amount/supplier duplicate warnings are shown;
7. user reviews/corrects fields before saving — never auto-post;
8. saved expense links to the private original receipt;
9. reviewed supplier/category/tax/business-use/payment-method choices become a private merchant rule for future suggestions;
10. recent receipt documents reopen with short-lived signed URLs.

Privacy: receipt pixels/document contents are not sent to a third-party AI provider in v1. OCR runs in the authenticated browser and originals remain in private Namdar/Supabase storage. CDN use is limited to pinned OCR/PDF runtime assets.

## Next action
1. User hard-refreshes Admin -> Reports and confirms the `Smart receipt` panel appears above Expense Ledger.
2. User uploads one controlled sample/real receipt.
3. Verify end-to-end: private upload -> OCR -> suggestions -> review/edit -> save -> attached receipt -> merchant rule -> reopen -> duplicate protection.
4. Do not fabricate an expense. If testing with a non-business/sample receipt, delete/detach the resulting test expense/receipt afterward.
5. User saves actual sole-trader start date when ready; never invent it.
6. Keep Stripe commercial policy OFF until finance/receipt behaviour is validated.

## Do not break
- No customer exposure of private finance settings, expense ledger or receipt documents.
- Receipt suggestions are review-first; never auto-post accounting/tax entries.
- Sandbox Stripe activity never enters revenue/tax reporting.
- No separate consumer card/Stripe surcharge.
- Verified Stripe webhook remains authoritative for money state.
- Never expose secrets or unnecessary private financial details.
- Direct contribution != net profit; tax estimate != filed tax return.
- Window Cleaning only until deliberate next-stage activation. Address work stays parked.
