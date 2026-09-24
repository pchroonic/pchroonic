# Namdar AI fast resume

Last verified: 2026-09-25 UTC

Read this first. Use `docs/AI_HANDOFF.md` for implementation detail and `docs/PROJECT_STATUS.md` for roadmap/status.

## Production source of truth
- Repo `pchroonic/pchroonic`, default `main`.
- Current production main merge: `0bdb4d54daa8342bc354f1edd707f5f7d113f5c6` (PR #104 Admin inbox close-navigation fix). Payment Receipt Tracking PR #102 remains live beneath it.
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

## Admin inbox workflow — HOTFIX CANDIDATE
- Existing PR #104 behavior remains: Close/Reopen preserves the current folder.
- Candidate asset `6.4.48-inbox-workflow-polish-fix-1` adds automatic next-conversation opening after Close/Reopen, bulk selection/actions, and registered-customer context with account shortcut.
- Bulk Close excludes conversations already Closed or Spam so quarantine state is not changed accidentally.
- NodeList iteration hotfix replaces the incorrect single-element selector used by bulk-row enhancement so selection mode can initialize safely.

## Open items
- Use the first genuine payment for authenticated receipt/email/My Namdar verification; do not manufacture a production payment.
- Configure the real Google Business Profile review-request URL later.
- Real-world authenticated review/post-job smoke with the first genuine completed customer job.
- Authenticated Staff v3 mobile smoke test with a real assigned job.
- Window real-job pricing calibration after genuine completed jobs accumulate.
- ICO self-assessment, Supabase Leaked Password Protection, SMS/legal checks, Node `url.parse()` cleanup and the parked address-data pilot remain open.
