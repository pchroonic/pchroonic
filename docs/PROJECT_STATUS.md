# Namdar project status

Last updated: 2026-09-25 UTC

## Production baseline
- Repo `pchroonic/pchroonic`, default `main`.
- Current production main merge `a3e65a0bb13982841b5ece319fbc859d27ed90ae` (PR #125 ECB save-refresh release). PR #102 Payment Receipt Tracking remains live.
- Customer base loader `6.4.35-payment-policy-engine-1`; post-job extension `6.4.42-post-job-experience-1`; Staff operations/ETA `6.4.41-staff-operations-v3-1`.
- Admin base `6.4.37-admin-website-crash-fix-1`; Google Review System `6.4.43-google-reviews-1`; Stripe readiness `6.4.44-stripe-live-readiness-1`; Payment Receipt Tracking `6.4.45-payment-receipts-1`.
- Supabase production `qjigldxjcpnrlyxgmlqq`.
- Vercel team is on Pro. Production deployment `dpl_3M7PRirsVVwfFgTkDxqGFs5qnUNH` is READY and aliased to `namdar.co.uk`; health HTTP 200 / `ok:true` at `2026-09-25T14:01:35.488Z`.
- Hourly booking-notification cron (`7 * * * *`) is restored.
- Window Cleaning only live.
- Privileged Staff/Admin requires CAPTCHA + AAL2/TOTP MFA.
- Customer Stripe is ACTIVE for new Window Cleaning bookings: revision 1, required 20% deposit, full upfront payment allowed, remaining balance due at completion.
- Ask Namdar provider AI remains disabled.
- Google Business review URL remains unconfigured/off.

## Stripe live readiness — LIVE
PR #100 / Admin extension `6.4.44-stripe-live-readiness-1` remains live. Production provider readiness requires recognised LIVE Stripe credentials plus configured webhook; TEST credentials remain preview/sandbox-only and cannot activate production payments.

Stripe account `acct_1UFAd1Cu9tojH31y` is live and fully onboarded: charges/payouts enabled, details submitted, verification complete, card payments and transfers active. Live production webhook `https://namdar.co.uk/api/stripe-webhook` is enabled and production runtime has the live Stripe secret plus webhook secret. Customer payments are active under payment-policy revision 1; the first genuine live payment remains the end-to-end checkout/webhook/receipt validation.

## Payment Receipt Tracking — LIVE
PR #102 / customer+Admin asset `6.4.45-payment-receipts-1`.

Live improvements:
- stable Namdar receipt number for every payment/refund, derived deterministically from immutable payment UUID (`RCP-XXXXXXXX-XXXXXXXX`);
- Stripe payment/refund emails include receipt number, invoice, amount, date, payment type/method and current invoice balance;
- manually recorded non-Stripe payments/refunds use the same receipt-number/email standard;
- billing emails remain archived in the customer's Namdar messages;
- My Namdar Billing shows the receipt number beside every transaction and offers authenticated receipt-PDF downloads;
- receipt PDFs and filenames use the same receipt number and invoice PDFs show receipt references in payment history;
- Admin payment transaction rows display the receipt number and Payments search supports `RCP-...` lookup;
- manual payment/refund audit records include the receipt number;
- Stripe provider IDs remain separate internal reconciliation evidence and customer surfaces still exclude processor fee/net data;
- no database migration or payment-row rewrite was needed;
- duplicate Stripe webhook deliveries remain idempotent and do not create duplicate payment rows/receipt emails.

Release evidence:
- exact tested head `e3c4e3147716d9697b2692aafe89a73454694cee`;
- Stripe live-readiness check `35264280479` SUCCESS;
- full/handoff JavaScript check `35264280446` SUCCESS;
- Google Review compatibility `35264280451` SUCCESS;
- Staff v3 compatibility `35264280558` SUCCESS;
- Post-job compatibility `35264280869` SUCCESS;
- exact-head preview `dpl_BNvoECAundwwbcB95Rh79nKKJyEV` READY / clean;
- merge `95cda91adb2fe7276f49a73d8626f97d87c2521e`;
- production `dpl_HmwxY6oHCiCX8s14xrtHCK6CVpHz` READY / `namdar.co.uk` alias;
- health HTTP 200;
- live Account and Admin loaders pin `6.4.45-payment-receipts-1`;
- live receipt assets return HTTP 200;
- production 5xx scan found no 5xx logs;
- Supabase readback after release: 4 payment records, zero payment settings rows and zero active payment policies;
- the payment-record count remained 4 before and after deployment, so release verification created no synthetic transactions.

## Booking/payment launch policy — LIVE
- Manual booking confirmation.
- Monday–Saturday; Sunday closed.
- 08:00–11:00, 11:00–14:00, 14:00–17:00.
- Maximum 3 jobs/day, 24-hour notice, 21-day horizon, postcode-area route density enabled.
- New bookings require 20% deposit; customers may pay 100% upfront; balance due at completion.

## Admin inbox workflow — LIVE
- Existing PR #104 preserves the current folder on Close/Reopen.
- Live `6.4.48-inbox-workflow-polish-fix-1` adds next-conversation flow, bulk selection/actions, and customer context/profile shortcuts.
- Bulk Close deliberately skips Closed/Spam rows.
- NodeList iteration hotfix corrects the bulk-row selector so selection mode does not throw during initialization.

## Professional Page Analytics — LIVE
PR #107 / `6.4.49-page-analytics-1`.
- Asset `6.4.49-page-analytics-1`.
- Adds professional Website Analytics inside Reporting: page views, period change, average/day, search/direct traffic shares, views→quotes, views→bookings, traffic trend, landing pages and referrers.
- Uses existing first-party page-view data only; no visitor fingerprinting, device ID or third-party tracker added.
- UI explains that page views are not unique visitors and business ratios are based on page loads rather than person-level attribution.

## Analytics v2 — LIVE
- Live Admin analytics asset `6.4.51-analytics-v2-revenue-fix-1`; browser tracker remains `6.4.50-analytics-v2-1`; migration `20260924234226_analytics_v2_session_funnel` is applied in production and committed.
- Adds browser sessions, quote/booking/payment funnel, acquisition sources, UTM campaigns, source-attributed revenue and contact engagement to Reporting.
- Preview hosts are ignored.
- No fingerprinting/persistent analytics ID: sessionStorage only. Essential only deletes/disables the current v2 analytics session; UTM campaign/advertising measurement requires Allow marketing.
- Published Cookie Policy v3 now describes the statistical analytics objection/deletion and marketing-only campaign attribution.
- Historical page views before v2 remain in totals but have no session/campaign attribution.
- PR #109 launched Analytics v2; PR #110 is live and separates total, attributed and unattributed payment revenue so only v2-linked payments appear as attributed.

## Smart receipt Vercel PDF fix — CANDIDATE
- Target `6.4.52-receipt-unicode-currency-1`.
- Real Vercel invoice reproduced the PostgreSQL Unicode error because PDF text includes hidden NUL characters.
- Server sanitization, same-file retry, Vercel→Software recognition, month-first date parsing, and foreign-currency GBP safety are implemented.
- Existing Vercel receipt remains unattached and status `error` until the owner retries it after release.

## Smart receipt flattened-PDF fix — LIVE
- Live `6.4.53-receipt-pdf-layout-1`.
- Preserves PDF line endings and hardens supplier/date/total/VAT parsing when PDF.js flattens a page.
- Exact Vercel flat-text regression passes with supplier Vercel Inc., date 2026-09-24, USD 24.00 total and USD 4.00 VAT.

## Smart receipt draft re-read — CANDIDATE
- Target `6.4.54-receipt-reread-draft-1`.
- Same-file re-read is allowed for unattached error/review drafts; attached receipts remain protected.

## Smart receipt form persistence — LIVE
- Live `6.4.55-receipt-form-persistence-1`.
- Active receipt values survive Business Finance re-renders.
- Spaced PDF invoice numbers normalize correctly.
- Current Vercel draft was corrected while still unattached; no expense ledger entry was created automatically.

## Smart receipt manual-edit persistence — CANDIDATE
- Target `6.4.56-receipt-manual-edits-1`.
- Manual reviewer edits now survive Finance-panel rerenders and override re-applied receipt suggestions.
- Foreign-currency GBP amount remains manual, but once entered it is no longer wiped.

## Analytics v2 loading lifecycle — CANDIDATE
- Target `6.4.57-analytics-load-lifecycle-1`.
- Fixes blank/stuck Analytics v2 “Loading…” state while the backend is healthy.
- Explicit reload hooks: secure-session boot, Reporting tab, range changes and Refresh.
- Adds timeout/retry/error UI instead of indefinite blank panels.

## Receipt expense source constraint — PRODUCTION FIX APPLIED
- Migration `20260925122723_allow_receipt_expense_source` is applied in production.
- Receipt-created ledger entries may now use `source='receipt'`; manual/import/job-cost sources remain valid.
- Fixes Add expense failure on reviewed Smart Receipts without weakening review or attachment safeguards.

## Automatic foreign-currency expenses — LIVE / ECB VERIFIED
- Base `6.4.58-expense-fx-1`; ECB hardening live `6.4.62-ecb-save-refresh-1`; migration `20260925125132_foreign_currency_expense_audit` is applied in production.
- Manual and Smart Receipt expenses support automatic historical FX → GBP conversion.
- Original currency/amount and reference rate/date/provider are preserved for audit.
- Reviewer-entered actual GBP charge overrides the reference conversion without losing the FX trail.
- Automatic reference metadata is re-verified server-side against the ECB provider at save time; browser FX metadata is not trusted.
- Save-time freshness: automatic GBP values are recalculated from the newly verified ECB rate when the expense is saved; reviewer-entered actual GBP charges are preserved as overrides.
- Staff-only FX lookup is pinned to the ECB provider through Frankfurter; no blended-rate fallback is used for automatic accounting references.

## Smart Receipt extraction + Finance draft stability — CANDIDATE
- Target `6.4.59-finance-receipt-stability-1`.
- Fixes Amazon/Equipmart invoice extraction: seller, invoice date, invoice number, VAT and purchased-item description.
- PDF text extraction is row-aware for multi-column/table invoices.
- Routine auth token refreshes no longer redraw the Finance form; legitimate reloads preserve the active draft and cursor.
- Paid invoices with no explicit payment date show a confirmation warning.
- Review drafts include Re-read so stored receipt text can be reparsed after parser improvements without another file upload; attached expense receipts are immutable to this action.

## Reporting hub + focused report pages — LIVE
- Live `6.4.60-report-hub-1`.
- Reporting now opens a report-centre hub instead of exposing every section in one long page.
- Nine focused routes: overview, revenue/payments, quotes/conversion, services, staff, feedback, website analytics, Window Cleaning performance and Business Finance.
- Each report has a stable `?tab=reports&report=...` URL and browser Back support.
- Existing reporting calculations and live panels are reused, not duplicated.
- Shared period/refresh/export controls are shown only where relevant.

## Window Cleaning SEO foundation — LIVE
- SEO is now aligned to the live service catalog: Window Cleaning only.
- Homepage, live service page and London/South London/Lewisham landing pages target Window Cleaning search intent with unique metadata and structured data.
- Planned services are statically noindex,follow until launch and stay out of the live-service sitemap.
- Local landing pages no longer tell crawlers that future services are currently available.
- Sitemap includes lastmod signals for the SEO pages changed on 2026-09-25.
- Regression test: scripts/seo-foundation.test.mjs.
- Next measurement layer: connect Google Search Console and inspect indexing, queries, impressions, CTR and positions; configure the genuine Google Business Profile separately.
- PR #127 is live on production deployment dpl_C3gf98ZruxSBfckd9uSiuEmz1xMJ; health HTTP 200 / ok:true at 2026-09-25T14:50:21.502Z.
- Window Cleaning sitemap lastmod is pinned to 2026-09-25 to reflect the actual public SEO page update.

- PR #130 is LIVE on production deployment `dpl_CEjJJTQVDgkfCw53YvwHBdaeeYYV`; production health HTTP 200 / `ok:true` at `2026-09-25T17:55:13.522Z`.
- Search Console integration is authorised, but Google currently has no `namdar.co.uk` property for the connected account; first-property add/verification remains the only blocker to URL Inspection and query/indexing reporting.
- Real service-area SEO: homepage/service/London/South London copy and `areaServed` schema now reflect the production borough set Lewisham, Southwark, Lambeth, Wandsworth and Greenwich; exact property coverage is still determined by the live postcode checker.
- Rendered-home SEO invariant keeps initial and JavaScript-rendered title/description/hero aligned to South London/Lewisham Window Cleaning, while future-service cards/radios/3D content start hidden until catalog status permits them.

## Portfolio SEO fail-closed — LIVE
- Current production database has 0 published portfolio jobs.
- Candidate release makes `/work` dynamic: 404 + noindex while no genuine published live-service work exists; server-rendered/indexable when qualifying work is later published.
- Empty `/work` is conditionally removed from the sitemap and hidden from public navigation.
- Individual case-study URLs enter the sitemap only when their published job belongs to a currently live service.
- Legacy `work.html` is removed so Vercel cannot serve the static clean URL ahead of the dynamic `/work` gate.
- No synthetic case studies or reviews are created for SEO.
- Production proof: PR #133 / main `5e824312a5768cfa41ce992da6f0c148df6055f8` is live on `dpl_9X7fXDm4cYfvR9BKgkk74QV1ihr8`; `/work` is 404 + noindex with zero published jobs, sitemap omits it, portfolio nav is hidden, and health is green.

## Google Review System — LIVE
PR #98 / `6.4.43-google-reviews-1` remains live. Owner-controlled fair review requests, one-time reminders, tracked clicks and 30/90/365-day reporting are available, but the official Google Business review URL remains intentionally unconfigured/off.

## Post-job Customer Experience — LIVE
PR #96 / `6.4.42-post-job-experience-1`: completed-job panel, private feedback, fair Google review access when configured, safe repeat quoting and recurring next-clean guidance remain live.

## Staff operations v3 — LIVE
PR #94 remains the field-operations layer: six-step Window Cleaning quality checklist, server completion gate, incidents/evidence, Admin incident handling, On My Way ETA and customer ETA.

## Owner & custom access roles — LIVE
Protected Owner/Administrator system roles and reusable custom Staff roles remain live with hierarchy-sensitive safeguards.

## Other live systems
- Responsive Admin booking editor.
- Secure Admin logo upload and Website/Legal crash fix.
- Flexible payment/deposit policy engine with live Stripe active under the current 20% deposit launch policy.
- Fair cancellation terms and Privacy Centre.
- Security Hardening and Staff auth recovery.
- Business Finance and Smart Receipts.
- Newsletter Centre and guided Ask Namdar.

## Open roadmap
- First genuine payment should be used for authenticated end-to-end receipt/email/My Namdar confirmation; do not manufacture a production transaction just to test.
- Configure the real Google Business Profile review-request URL later.
- Real-world Google review/post-job smoke with a genuine completed job.
- Authenticated Staff v3 mobile smoke test.
- Window real-job pricing calibration after genuine completed jobs accumulate.
- ICO data-protection fee self-assessment.
- Supabase Leaked Password Protection.
- SMS/legal checks.
- Node `url.parse()` deprecation cleanup.
- Address-data pilot remains parked.
