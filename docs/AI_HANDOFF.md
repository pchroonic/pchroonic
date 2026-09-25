# Namdar AI handoff

Last verified: 2026-09-25 UTC

Read `docs/AI_START.md` first. Use `docs/PROJECT_STATUS.md` for roadmap/status.

## Production baseline
- Repo `pchroonic/pchroonic`, default `main`.
- Current production main merge `ef9ff366a0b956ab96776a11faa8203fba12bda5` from PR #110. PR #102 Payment Receipt Tracking remains live below it.
- Customer base loader `6.4.35-payment-policy-engine-1`; Post-job Customer Experience `6.4.42-post-job-experience-1`; Staff operations/ETA `6.4.41-staff-operations-v3-1`.
- Admin base `6.4.37-admin-website-crash-fix-1`; Google Reviews `6.4.43-google-reviews-1`; Stripe readiness `6.4.44-stripe-live-readiness-1`; payment receipts `6.4.45-payment-receipts-1`.
- Supabase production `qjigldxjcpnrlyxgmlqq`.
- Vercel project `prj_4fILo0pCaLGUSUIMWrBIVGzeWVDC`; team `team_8Az8WtWcnfwtYRdhR8vGqC3L`.
- Vercel team is on Pro. Production deployment `dpl_5ejdx52DnrLFJzctMhpJe88iGc7q` is READY on `namdar.co.uk`.
- Health HTTP 200 / `ok:true` at `2026-09-25T00:01:42.762Z`.
- Hourly booking-notification cron (`7 * * * *`) is restored.
- Window Cleaning only live. Provider AI OFF. Privileged access requires CAPTCHA + AAL2/TOTP.
- Customer Stripe is ACTIVE for new Window Cleaning bookings. Production `site_settings.payments` revision 1 is `deposit_required`: flat 20%, minimum £0.50, full payment allowed, balance due at completion.

# Stripe live readiness — LIVE
PR #100 remains the production credential guard. Production requires a recognised LIVE Stripe secret plus a configured webhook before payment policy can become effective. TEST credentials remain preview/sandbox-only. Existing hosted Checkout, frozen booking payment-policy snapshots, deposits/balances, signed webhook authority, refunds and processor-cost reconciliation remain in place.

Stripe account `acct_1UFAd1Cu9tojH31y` is live and fully onboarded: `charges_enabled=true`, `payouts_enabled=true`, `details_submitted=true`, verification complete, card payments and transfers active. Live production webhook `https://namdar.co.uk/api/stripe-webhook` is enabled for checkout completion/async success and refund events. Production `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` were updated by the owner and are present in the verified production runtime.

# Payment Receipt Tracking — LIVE

Product PR #102: `Add traceable payment receipt references`.
Exact tested head `e3c4e3147716d9697b2692aafe89a73454694cee`; merge `95cda91adb2fe7276f49a73d8626f97d87c2521e`.
Asset token: `6.4.45-payment-receipts-1`.

## Goal and identity
Every Namdar payment/refund has one stable customer-facing receipt reference that customer and staff can quote to trace the transaction.

`lib/payment-receipts.js` derives it deterministically from immutable `payment_records.id`:
- format `RCP-XXXXXXXX-XXXXXXXX`;
- the same payment always produces the same number;
- it contains no Stripe secret/provider token;
- no schema change or payment-row rewrite is needed.

## Stripe payment/refund email
`api/stripe-webhook.js` sends a receipt email only when an idempotent new Stripe payment/refund row is actually recorded. Payment email includes:
- Namdar receipt number;
- invoice number;
- amount;
- payment type and method;
- payment date/time;
- net paid and outstanding invoice balance;
- My Namdar Billing link;
- instruction to quote the receipt number for support.

Stripe refund emails use the same receipt standard. `archiveForCustomer:true` keeps billing messages in the customer's Namdar message history. Provider-reference idempotency still prevents duplicate payment rows and duplicate receipt emails on repeated webhook delivery.

## Manual non-Stripe payments/refunds
`api/admin-payments.js` uses the same receipt number and email standard for staff-recorded cash, bank-transfer, card or other payments/refunds. Manual `method='stripe'` remains rejected so staff cannot impersonate a verified Stripe webhook. Manual payment audit summaries/metadata include the receipt number.

## My Namdar
`api/customer-billing.js` exposes only the customer-safe receipt number with each payment/refund. Internal processor-cost fields and provider payment IDs remain excluded.

`account-payments.js` shows the receipt number in Billing payment history and provides the authenticated Receipt PDF button. Receipt download filenames use the same receipt number. `account.js` loads the receipt asset at `6.4.45-payment-receipts-1`.

## Receipt/invoice PDF
`api/billing-document.js` uses the same receipt number on the receipt PDF and filename and includes receipt references in invoice payment history. It tells the customer to quote the number if contacting Namdar. Existing ownership/Admin/Staff-payment permission checks remain in force.

## Admin tracking
`api/admin-payments.js` supplies `receipt_number` to the privileged Admin payment payload.

`admin-payment-receipts.js`:
- displays the receipt number on transaction receipt controls;
- extends Payments search so an `RCP-...` value locates the matching payment row;
- does not expose Stripe secrets.

`admin.js` loads this extension at `6.4.45-payment-receipts-1`.

## Release evidence
Exact-head checks on `e3c4e3147716d9697b2692aafe89a73454694cee`:
- Stripe live readiness `35264280479` SUCCESS;
- AI handoff/full JavaScript `35264280446` SUCCESS;
- Google Review compatibility `35264280451` SUCCESS;
- Staff v3 compatibility `35264280558` SUCCESS;
- Post-job compatibility `35264280869` SUCCESS.

Exact-head preview `dpl_BNvoECAundwwbcB95Rh79nKKJyEV` READY with clean errors-only build log.

Production verification after merge:
- deployment `dpl_HmwxY6oHCiCX8s14xrtHCK6CVpHz` READY and aliased to `namdar.co.uk`;
- `/api/health` HTTP 200 / `ok:true` at `2026-09-17T19:23:15.221Z`;
- live `account.js` HTTP 200 and loads `account-payments.js` at `6.4.45-payment-receipts-1`;
- live `admin.js` HTTP 200 and loads `admin-payment-receipts.js` at `6.4.45-payment-receipts-1`;
- both live receipt assets returned HTTP 200;
- production release 5xx scan found no 5xx logs;
- Supabase readback after deployment: 4 payment records, zero payment-setting rows, zero active payment policies;
- payment-record count was 4 before and after release, so verification created no synthetic payment row.

## Safety invariants
- customer receipt numbers are Namdar references, not Stripe secrets;
- Stripe provider references/payment IDs remain internal reconciliation evidence;
- customer billing/PDF surfaces do not expose processor fee/net/balance-transaction/provider-payment fields;
- do not manufacture production customers/payments for smoke testing;
- new bookings snapshot payment-policy revision 1 so later policy edits cannot rewrite accepted terms;
- the first genuine live Stripe payment is still the required end-to-end checkout/webhook/receipt validation.

# Booking/payment launch policy — LIVE
Production booking operations: manual confirmation, Monday–Saturday, three daily windows (08–11 / 11–14 / 14–17), 3 jobs/day, 24-hour minimum notice and 21-day horizon. Route density remains grouped by postcode area.

# Admin inbox workflow — LIVE
`admin-inbox-safety.js` live asset `6.4.48-inbox-workflow-polish-fix-1` builds on PR #104 and adds:
- open the next visible conversation after Close/Reopen when one exists;
- selection mode with Select visible, Mark read, Mark unread, Assign to me and Close selected;
- bulk Close excludes Closed/Spam conversations;
- registered-customer context with customer-since/activity counts and Open customer shortcut; unlinked senders are labelled External sender.
- NodeList iteration hotfix uses `document.querySelectorAll(...).forEach(...)` for bulk-row loops instead of the single-element `$()` helper.

# Professional Page Analytics — LIVE
Asset `6.4.49-page-analytics-1` is live and adds `admin-page-analytics.js/css` plus `api/admin-page-analytics.js`.

The analytics endpoint requires Staff/Admin `analytics` permission and aggregates existing `page_views(path, referrer_host, created_at)` together with quote/booking creation timestamps. The Admin Reporting period selector controls both business and website analytics. Surfaces include page-view trend, same-length previous-period comparison, average views/day, search/direct shares, views-to-quotes/bookings business ratios, landing pages and referrers.

Privacy invariant: these are page-load counts, not unique-user analytics. Do not label them as unique visitors or sessions unless the data model is explicitly extended later with an approved privacy design.

Release evidence: PR #107 merged at `b851660b8285c2ad74c01f00fe240e5be0dd86d5`; production `dpl_BcXGivSXztjCAEg4WZyiZr1Zb1XH` READY; live loader pins `6.4.49-page-analytics-1`; unauthenticated analytics endpoint check returns HTTP 401; `/api/health` remains HTTP 200 / `ok:true`.

# Analytics v2 — LIVE
Live Admin analytics asset `6.4.51-analytics-v2-revenue-fix-1`; browser tracker remains `6.4.50-analytics-v2-1`. Production migration `20260924234226_analytics_v2_session_funnel` is already applied and committed.

Architecture:
- `analytics-v2.js`: temporary first-party session ID in sessionStorage, first-party page/event tracking, contact/quote/booking/checkout interactions and privacy-choice hooks.
- `api/track-view.js`: records only production `namdar.co.uk` page views; accepts optional session + marketing-consented UTM fields.
- `api/funnel-event.js`: validated Window Cleaning event vocabulary, production-host guard and short duplicate suppression.
- `api/analytics-opt-out.js`: Essential-only objection deletes the current session from `page_views`, `conversion_events` and `quote_funnel_links`.
- `api/admin-page-analytics.js`: joins sessions → quote links → bookings → invoices/payment records for source/campaign conversion and net-revenue attribution.
- `admin-page-analytics.js/css`: Analytics v2 dashboard in Reporting.
- `scripts/analytics-v2.test.mjs`: privacy, production-host, funnel, attribution and migration regression checks.

Privacy invariant: no device fingerprint, user-agent fingerprint or persistent analytics visitor ID. Campaign/advertising attribution is only captured after Allow marketing. Essential only disables v2 collection and deletes the current v2 session. Published Cookie Policy v3 now accurately describes this model, including the Essential-only objection and marketing-only campaign attribution.

Legacy page-view rows pre-date session attribution and remain usable only for historical page-view totals; v2 sessions/funnel/campaign attribution should be interpreted from the release onward.

PR #109 launched Analytics v2 and PR #110 is live with the attributed-revenue accuracy fix. `totalRevenue`, `attributedRevenue` and `unattributedRevenue` are calculated separately; only payments linked through the v2 quote/session chain count as attributed.

# Smart receipt Vercel PDF fix — CANDIDATE
Target `6.4.52-receipt-unicode-currency-1`.

Root cause was reproduced against the real Vercel invoice PDF: text extraction yields seven NUL characters (for example inside the invoice reference/date punctuation). PostgreSQL text/jsonb rejects those characters with “unsupported Unicode escape sequence”. The fix sanitizes receipt text server-side through `lib/db-safe-text.js` before parsing/storage, including lone-surrogate handling.

Receipt intelligence improvements:
- skip PDF page headers when choosing supplier;
- Vercel/hosting/domain → Software;
- parse month-first dates;
- preserve source currency/original amount/VAT;
- for non-GBP receipts, leave GBP ledger amount blank and warn the reviewer to use the actual GBP card/bank charge;
- failed receipt rows are retriable with the same file using authenticated storage upsert.

The existing production Vercel receipt row is status `error` and has no `expense_id`, so release does not mutate accounting data automatically.

# Smart receipt flattened-PDF fix — CANDIDATE
Target asset `6.4.53-receipt-pdf-layout-1`.

After PR #112 removed the PostgreSQL/NUL crash, the real Vercel retry exposed a second issue: PDF.js flattened the page into one long line, so line-oriented receipt heuristics returned blank supplier, a subscription-range-derived date and zero VAT.

Fixes:
- browser PDF extraction preserves `TextItem.hasEOL` line breaks;
- supplier fallback can recover a legal entity such as Vercel Inc. from flattened text;
- labelled invoice dates such as “Date of issue” outrank generic date-range matches;
- explicit Amount due / Standard Rate VAT parsing works even when the page is one line;
- regression test covers the exact flattened Vercel invoice shape.

# Other live layers
Google Review System PR #98 remains live but the official Google Business review URL is still unconfigured/off. Post-job Customer Experience PR #96 and Staff operations v3 PR #94 remain live.

## Next steps
1. use the first genuine payment for authenticated end-to-end checkout/webhook/receipt/email/My Namdar verification rather than manufacturing production transactions;
2. configure the real Google Business Profile review URL later;
3. complete authenticated real-world Staff/Post-job smokes when genuine jobs occur.
