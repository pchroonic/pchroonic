# Namdar project status

Last updated: 2026-09-13 UTC

## Production baseline
- Repo `pchroonic/pchroonic`, default `main`.
- Current product release: PR #61 `Polish Business Finance initial setup`, merge `2bb2f20b41136a2b3ba2dac1d083955d3108fd6c`.
- Production deployment `dpl_F8Ti9xMH6xYRynvUcQw14Cda4fpV` READY on `https://namdar.co.uk`.
- Production Admin loader `6.4.25-business-finance-setup-1`.
- Supabase production `qjigldxjcpnrlyxgmlqq`.
- Window Cleaning only live; future services planned; address work parked.

## Stripe sandbox — full pass / commercial policy OFF
Signed-in deposit + balance + full-refund sandbox flow passed with authoritative webhooks. Customer payment policy remains OFF; no live Stripe credentials. Four retained Stripe ledger rows are sandbox and excluded from finance.

## Business Finance — live
Business structure decision: **sole trader first, limited company after success**.

Authenticated Admin screenshots verified the live module. PR #61 now withholds the tax timeline until the real sole-trader start date is saved and hides irrelevant incorporation/VAT date fields until applicable.

### Test-data cleanup completed
The user confirmed the old £106 Sep-11 Window booking/invoice was test data. It had no payments, job costs, feedback, promo use or project linkage. Its quote, booking, invoice, booking notifications and matching archived reminder were removed together.

Verified clean finance state after cleanup:
- outstanding invoices £0;
- rolling invoice turnover £0;
- business expenses 0;
- Stripe rows 4 sandbox / 0 live;
- payment policy rows 0.

## Intelligent Expense Receipts — IN PROGRESS
Branch: `feat/intelligent-expense-receipts-20260913`.

Applied migrations:
- `20260913152601 intelligent_expense_receipts`;
- `20260913153443 intelligent_expense_receipt_fk_indexes`.

Both intelligent-receipt migrations have matching SQL files on the branch. The second added covering audit-user FK indexes; the receipt-specific missing-FK advisor findings are now cleared. Remaining advisor items are pre-existing elsewhere.

New foundation:
- private `business_expense_receipts` receipt-document/draft table;
- private `business_expense_merchant_rules` learning table;
- private `finance-receipts` Supabase Storage bucket, JPG/PNG/WebP/PDF, 10 MB;
- storage access requires AAL2 plus Admin or active staff settings permission;
- current receipt rows 0, learned merchant rules 0.

Receipt experience being built:
- receipt drag/select above Expense Ledger;
- SHA-256 exact-file duplicate protection;
- private original receipt storage;
- browser-local OCR using pinned Tesseract.js 7.0.0;
- PDF embedded-text extraction using pinned PDF.js 4.10.38, with scanned-PDF OCR fallback;
- automatic suggestions for supplier/date/total/VAT/reference/payment method/category/tax treatment/business-use %;
- confidence and review warnings;
- likely duplicate expense warning based on date/amount/supplier;
- no auto-posting: user must review and save;
- receipt attached to saved expense after review;
- final corrected merchant choices learned for later receipts;
- recent receipt documents can be reopened privately;
- deleting an expense detaches its receipt back to review rather than deleting document history.

Privacy: receipt content is not sent to a third-party AI service in v1. OCR runs in the authenticated browser; originals remain in private Supabase storage. CDN access is limited to pinned OCR/PDF runtime assets.

Code/CI additions:
- `lib/receipt-intelligence.js`;
- `api/admin-finance-receipts.js`;
- `admin-finance-receipts.js`;
- receipt attachment/learning in `api/admin-finance-expenses.js`;
- Admin loader target `6.4.26-intelligent-receipts-1`;
- CSP support for pinned jsDelivr worker/fetch assets;
- receipt parser/security tests and CI syntax checks.

## Applied production finance schema
- `20260913143525 business_finance_expense_ledger`
- `20260913144052 business_finance_expense_updated_by_index`
- `20260913144632 stripe_payment_environment_tracking`
- `20260913152601 intelligent_expense_receipts`
- `20260913153443 intelligent_expense_receipt_fk_indexes`

Older finance migrations may lack repo SQL files; both intelligent-receipt migrations have matching git files. Supabase migration history + continuity docs remain authoritative for applied schema.

## Immediate next work
1. Open PR for intelligent receipts.
2. Require green CI + READY exact-head Vercel preview + clean errors-only build.
3. Merge only when clean; verify production loader `6.4.26-intelligent-receipts-1` and health endpoint.
4. User uploads one controlled sample receipt and verifies OCR -> suggestions -> edit/review -> save -> receipt attachment -> learned supplier rule -> duplicate protection.
5. User saves actual sole-trader start date when ready.
6. Keep Stripe customer payment policy OFF during finance validation.
7. Then return to Window commercial payment policy/live Stripe rollout.

## Handoff rule
Every substantial product/provider/data change updates `docs/AI_START.md`, `docs/AI_HANDOFF.md`, and this file. Never store credentials, raw API keys, customer secrets, TOTP codes, one-time Auth links or unnecessary private financial details in source/docs.
