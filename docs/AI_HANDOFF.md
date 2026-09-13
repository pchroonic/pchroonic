# Namdar AI handoff

Last verified: 2026-09-13 UTC

Read `docs/AI_START.md` first.

## Production source of truth
- Repo `pchroonic/pchroonic`, default `main`.
- Product release: PR #62 `Add intelligent receipt-driven expense ledger`.
- Tested PR head `2496e80a085f3acf812a4e865f5befb72eec02a8`; CI `34766157941` SUCCESS; exact preview `dpl_4adpSAC33DWg2oawWeqWPqUW78KM` READY with clean errors-only build.
- Merge/main HEAD `a6b73927f1649f2ad167cda4410f2f5632b78212`.
- Production deployment `dpl_B4nhdmgLZ13n813rUMWQfJRj2KUN` READY on `https://namdar.co.uk`.
- Production `/api/health` HTTP 200 after deploy.
- Production Admin loader `6.4.26-intelligent-receipts-1`, including `admin-finance-receipts.js`.
- Supabase production `qjigldxjcpnrlyxgmlqq`.
- Window Cleaning only live; future services planned; address work parked.
- Staff/Admin privileged APIs require AAL2/MFA.

## Stripe state
Sandbox provider connected; commercial customer payment policy OFF; no live-money credentials. Normal signed-in deposit + balance + refund passed end-to-end with authoritative webhooks. Four retained Stripe rows are sandbox and excluded from Business Finance.

## Business Finance
Business structure: **sole trader first, limited company after success**. Preserve historical sole-trader activity and switch future reporting only from the real incorporation date. PR #61 setup gating stays live; do not invent the sole-trader start date or private financial assumptions.

### £106 test fixture removed
User confirmed the old £106 Sep-11 Window booking/invoice was test data. It had no payments, job costs, feedback, project links or promo use. Quote, booking, invoice, notifications and matching archived reminder were deleted together.

Verified post-release finance state:
- outstanding invoices £0;
- rolling invoice turnover £0;
- business expenses 0;
- receipt rows 0;
- merchant rules 0;
- Stripe 4 sandbox / 0 live;
- payment-policy rows 0.

## Intelligent receipts — LIVE, awaiting first authenticated receipt test
Applied migrations:
- `20260913152601 intelligent_expense_receipts`;
- `20260913153443 intelligent_expense_receipt_fk_indexes`.

Both have matching SQL files in git. Receipt-specific unindexed-FK advisor findings are cleared. Receipt/merchant tables have RLS enabled with no browser table policies by design; their data is mediated by privileged server APIs. Original documents are stored in private bucket `finance-receipts` (JPG/PNG/WebP/PDF, 10 MB), with AAL2 + Admin/active-settings-staff storage policies.

### Browser flow
`admin-finance-receipts.js` adds `Smart receipt` above the expense form:
1. select/drop receipt;
2. SHA-256 fingerprint and exact-file duplicate check;
3. authenticated upload to private Supabase Storage;
4. image OCR in browser via pinned Tesseract.js 7.0.0;
5. PDF embedded-text extraction via pinned PDF.js 4.10.38; scanned PDFs fall back to OCR;
6. receipt text sent only to Namdar's own protected analysis API;
7. fields suggested: supplier/date/total/VAT/reference/payment method/category/tax treatment/business-use %;
8. confidence and duplicate warnings shown;
9. existing expense form populated but nothing saved automatically;
10. reviewed submit attaches receipt to expense and learns final merchant choices;
11. recent documents reopen via short-lived signed URLs.

### Backend
`lib/receipt-intelligence.js`
- deterministic field extraction/category rules;
- fine/penalty non-allowable warning;
- merchant-key normalization and learned-rule application;
- confidence/review warnings.

`api/admin-finance-receipts.js`
- GET: analytics permission;
- prepare/analyze/error/discard: settings permission via AAL2 `requireStaff`;
- MIME/size/hash validation, exact-file duplicate detection, expense duplicate candidates, audit logs.

`api/admin-finance-expenses.js`
- accepts reviewed `receiptId`;
- creates receipt-backed expense with `source='receipt'`;
- attaches receipt and learns reviewed merchant/category/tax/business-use/payment-method values;
- deleting a receipt-backed expense returns the receipt to review rather than destroying document history.

Privacy: no third-party AI service receives receipt pixels/document content in v1. OCR happens in the authenticated Admin browser; original files remain private in Supabase. jsDelivr is used only for pinned OCR/PDF runtime assets.

## Next test
1. User hard-refreshes Admin -> Reports.
2. Confirm `Smart receipt` panel appears.
3. Upload a controlled receipt.
4. Verify OCR/suggestions and correct anything wrong before saving.
5. After save, verify `business_expenses`, `business_expense_receipts`, merchant rule, private reopen link and duplicate handling.
6. If sample is not a genuine business expense, clean it after testing.
7. Keep customer Stripe policy OFF until finance/receipt workflow is validated.

## Non-negotiables
- No customer exposure of private finance settings, expenses or receipts.
- Receipt extraction is suggestion-only; never silently post accounting/tax entries.
- Sandbox Stripe activity never counts as business revenue/tax activity.
- No separate customer card surcharge.
- Stripe webhook authoritative for money state.
- No secrets or unnecessary personal finance details in source/logs/docs/chat.
- Direct contribution != net profit; finance estimate != filed tax return.
- Window only live; address work parked.
