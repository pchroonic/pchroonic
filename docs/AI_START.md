# Namdar AI fast resume

Last verified: 2026-09-25 UTC

Read this first. Use `docs/AI_HANDOFF.md` for implementation detail and `docs/PROJECT_STATUS.md` for roadmap/status.

## Production source of truth
- Repo `pchroonic/pchroonic`, default `main`.
- Current production main merge: `44d4d06add1666234560ccbddc3b30be7cbd99a0` (PR #113 flattened PDF receipt parsing fix). Payment Receipt Tracking PR #102 remains live beneath it.
- Customer base loader remains `6.4.35-payment-policy-engine-1`; post-job extension `6.4.42-post-job-experience-1`; Staff operations/ETA `6.4.41-staff-operations-v3-1`.
- Admin base remains `6.4.37-admin-website-crash-fix-1`; Google Review System `6.4.43-google-reviews-1`; Stripe readiness `6.4.44-stripe-live-readiness-1`; payment receipts `6.4.45-payment-receipts-1`.
- Supabase production project: `qjigldxjcpnrlyxgmlqq`.
- Production health remains HTTP 200 / `ok:true`.
- Window Cleaning is the only live/quotable/bookable service.
- Customer Stripe is ACTIVE for new Window Cleaning bookings: payment-policy revision 1 requires a 20% deposit, allows full upfront payment, and makes the remaining balance due at job completion.
- Ask Namdar provider AI remains OFF.
- Privileged Staff/Admin access requires CAPTCHA + AAL2/TOTP MFA.
- No real Google Business review URL is configured yet, so public Google review requests/reminders remain off.

## Stripe live readiness — LIVE / CUSTOMER PAYMENTS ACTIVE
PR #100 remains live below this release. Production payment provider readiness requires a recognised LIVE Stripe secret plus a configured webhook.

Verified 2026-09-22:
- Stripe account `acct_1UFAd1Cu9tojH31y` is live and fully onboarded;
- `charges_enabled=true`;
- `payouts_enabled=true`;
- `details_submitted=true`;
- individual verification status is `verified`;
- no currently-due, past-due or eventually-due account requirements;
- card payments and transfers capabilities are active;
- a live GBP payout bank account is connected;
- live production webhook endpoint `https://namdar.co.uk/api/stripe-webhook` exists and is enabled;
- webhook listens to exactly: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `refund.created`, `refund.updated`, `charge.refunded`;
- owner updated the Vercel Production `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` values on 2026-09-22;
- Vercel team is now on Pro; production deployment `dpl_AZJPSx4HfaAXcb8GuJNjYqKwr82Y` is READY and aliased to `namdar.co.uk`;
- production `/api/health` returned HTTP 200 / `ok:true` at `2026-09-24T22:49:08.728Z` with database, Stripe secret/webhook, email, reminders and followups all present;
- hourly booking-notification cron (`7 * * * *`) is restored on Vercel Pro.

Live provider deployment is verified. Production payment-policy revision 1 is active for new Window Cleaning bookings: `deposit_required`, flat 20%, minimum deposit £0.50, full payment allowed, balance due at completion. Existing bookings keep their locked/legacy terms.

## Booking operations — LIVE LAUNCH POLICY
- Manual booking confirmation.
- Monday–Saturday operating days; Sunday closed.
- Customer windows: 08:00–11:00, 11:00–14:00, 14:00–17:00.
- Maximum 3 jobs/day, minimum 24 hours notice, 21-day booking horizon.
- Route-density grouping remains enabled by postcode area.

## Payment Receipt Tracking — LIVE
Product PR #102: `Add traceable payment receipt references`.
Exact tested head: `e3c4e3147716d9697b2692aafe89a73454694cee`.
Merge/main: `95cda91adb2fe7276f49a73d8626f97d87c2521e`.

Live behavior:
- every payment/refund has a stable Namdar receipt number derived from immutable `payment_records.id`, format `RCP-XXXXXXXX-XXXXXXXX`;
- the same receipt number appears in Stripe/manual payment or refund emails, My Namdar Billing, receipt PDFs, Admin payment tracking and manual-payment audit history;
- customer billing email includes invoice, amount, payment type/method, payment date, current paid/outstanding balance and a My Namdar Billing link;
- billing email is archived in the customer's Namdar message history;
- My Namdar shows receipt number beside each transaction and offers an authenticated receipt PDF download;
- receipt PDF and filename use the same receipt number and tell the customer to quote it for support;
- Admin transaction rows show the receipt number and Payments search supports `RCP-...` lookup;
- Stripe provider references/payment IDs remain internal reconciliation evidence and processor fee/net fields remain excluded from customer surfaces;
- duplicate Stripe webhook events remain provider-reference idempotent, preventing duplicate payment rows/receipt emails;
- no database migration was needed and existing payment rows were not rewritten.

## Existing live layers
Google Review System PR #98 remains live, but its official Google review URL is intentionally unconfigured/off. Post-job Customer Experience PR #96 remains live. Staff operations v3 PR #94 remains live.

## Admin inbox workflow — LIVE
- Existing PR #104 behavior remains: Close/Reopen preserves the current folder.
- Live asset `6.4.48-inbox-workflow-polish-fix-1` adds automatic next-conversation opening after Close/Reopen, bulk selection/actions, and registered-customer context with account shortcut.
- Bulk Close excludes conversations already Closed or Spam so quarantine state is not changed accidentally.
- NodeList iteration hotfix replaces the incorrect single-element selector used by bulk-row enhancement so selection mode can initialize safely.

## Professional Page Analytics — LIVE
- Admin analytics asset: `6.4.49-page-analytics-1`.
- New privileged endpoint `/api/admin-page-analytics` uses existing privacy-friendly `page_views` data only: path, referrer host and timestamp.
- Reporting now adds selected-period page views, previous-period comparison, average/day, Google/Bing share, direct/unknown share, views-to-quotes, views-to-bookings, traffic trend, landing pages and top referrers.
- No persistent visitor/device identifier, fingerprint or third-party analytics tracker is added; the UI explicitly states that views are page loads, not unique people.
- Production deployment `dpl_BcXGivSXztjCAEg4WZyiZr1Zb1XH` is READY on `namdar.co.uk`; the analytics endpoint rejects unauthenticated access with HTTP 401.

## Analytics v2 — LIVE
- Asset target: `6.4.50-analytics-v2-1`.
- Production migration `20260924234226_analytics_v2_session_funnel` is applied and mirrored in the repo.
- Existing first-party `page_views` now supports temporary session ID plus UTM source/medium/campaign; existing rows remain valid with null v2 fields.
- Existing `conversion_events` is extended from postcode-only into the Window Cleaning funnel: service interest, quote start, postcode coverage, quote submit/continue/accept/decline, booking start/submit, checkout start, payment confirmation and contact actions.
- Homepage quote creation now sends the temporary analytics session into the existing `quote_funnel_links`, enabling quote→booking→payment and net-revenue attribution without a device fingerprint.
- Admin Reporting v2 surfaces sessions, views/session, traffic trend, full conversion funnel, acquisition sources, UTM campaigns, engagement, landing pages, raw referrers and source-attributed revenue.
- Vercel preview/non-production hosts are ignored by tracking endpoints.
- Privacy design: session ID is stored in `sessionStorage`, not a persistent analytics cookie/device identifier; Essential only is a free objection that deletes the current session's raw page views/events/quote link and disables future v2 tracking; UTM campaign/advertising fields are stored only after Allow marketing.
- Published Cookie Policy v3 now describes the statistical-purpose analytics session, Essential-only objection/deletion, and marketing-only campaign measurement.
- Older page-view rows remain valid but have no v2 session/campaign fields; session, funnel and attribution metrics become meaningful from the v2 release onward.
- PR #109 launched Analytics v2; PR #110 corrected attributed-revenue reporting. Production deployment `dpl_5ejdx52DnrLFJzctMhpJe88iGc7q` is READY on `namdar.co.uk`.

## Smart receipt Vercel PDF fix — CANDIDATE
- Target Admin asset: `6.4.52-receipt-unicode-currency-1`.
- Reproduced with the real Vercel invoice `Invoice-YYVCYYP4-0004.pdf`: extracted PDF text contains seven NUL characters, which PostgreSQL rejects as an unsupported Unicode escape sequence.
- New `lib/db-safe-text.js` repairs NUL/control/lone-surrogate text before receipt intelligence or database storage. Between alphanumeric characters, a NUL is reconstructed as a hyphen where practical.
- Failed receipt rows can be retried with the same selected file; the private storage object is safely upserted because Finance staff already have INSERT/SELECT/UPDATE storage policies.
- Vercel/hosting/domain suppliers are recognised as Software.
- Month-first dates such as `September 24, 2026` are parsed.
- Foreign-currency invoices are never silently treated as GBP. The source currency/amount/VAT are shown, while GBP amount/VAT are left for the reviewer to enter from the actual card/bank charge.
- Production receipt record for `Invoice-YYVCYYP4-0004.pdf` is currently status `error`, unattached to any expense, ready for retry after release.

## Smart receipt flattened-PDF fix — LIVE
- Live Admin asset: `6.4.53-receipt-pdf-layout-1`.
- Real production retry proved PDF.js can flatten the Vercel invoice page into one long text line, which caused supplier/date/VAT misreads even though the Unicode crash was fixed.
- Browser PDF extraction now preserves PDF.js `hasEOL` line endings when available.
- Server parser is hardened for flattened PDFs: legal-entity supplier fallback, explicit labelled invoice-date priority, specific amount-due parsing and Standard Rate VAT parsing.
- Exact flattened Vercel regression resolves to Vercel Inc., 2026-09-24, USD 24.00 total and USD 4.00 VAT.
- Production deployment `dpl_CQFiX2Dft2nc2KYYt9d6wysfdMXc` is READY and aliased to `namdar.co.uk`; live health remains HTTP 200 / `ok:true`.

## Smart receipt draft re-read — CANDIDATE
- Target asset: `6.4.54-receipt-reread-draft-1`.
- Unattached receipt rows in either `error` or `review` state can be safely re-read with the same file, reusing the existing private storage object instead of being blocked as a duplicate.
- Attached receipts remain immutable through this path.

## Smart receipt form persistence — CANDIDATE
- Target asset: `6.4.55-receipt-form-persistence-1`.
- Active receipt suggestion is now kept in memory and automatically re-applied if the Business Finance expense form re-renders after authentication/report refresh activity.
- Spaced PDF invoice references such as `YYVCYYP4 0004` normalize to `YYVCYYP4-0004` without greedily capturing following labels.
- This prevents a successfully analysed receipt from visually reverting to today's date/default category/blank supplier before save.

## Open items
- Use the first genuine payment for authenticated receipt/email/My Namdar verification; do not manufacture a production payment.
- Configure the real Google Business Profile review-request URL later.
- Real-world authenticated review/post-job smoke with the first genuine completed customer job.
- Authenticated Staff v3 mobile smoke test with a real assigned job.
- Window real-job pricing calibration after genuine completed jobs accumulate.
- ICO self-assessment, Supabase Leaked Password Protection, SMS/legal checks, Node `url.parse()` cleanup and the parked address-data pilot remain open.
