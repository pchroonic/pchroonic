# Namdar AI fast resume

Last verified: 2026-09-13 UTC

Read this first. Use `docs/AI_HANDOFF.md` for implementation detail and `docs/PROJECT_STATUS.md` for roadmap/status.

## Production baseline
- Repository: `pchroonic/pchroonic`, default `main`.
- Latest product release: PR #50, `Account for Stripe fees without customer surcharges`.
- PR #50 exact tested head: `17892e015f8e7f8b7c9a6b0b577292bb950d5c64`.
- GitHub Actions `34752824319`: SUCCESS.
- Exact-head preview: `dpl_2py2f1pDzH8YK5YD6GRkiD2hojfi`, READY, clean errors-only build.
- Merge: `32e13016601492eae3daa2021f35195298b00f5b`.
- Product production: `dpl_Ce8kShg3ikTXVubaTYMKcgAFjztT`, READY on `https://namdar.co.uk`, canonical alias present, no alias error, clean errors-only build.
- Docs-only PR #51 merge: `c350fc3a225c96ad0033a54727e5ab5d8c2490f7`; production `dpl_7sFz4g2vR4RmLhHS7J7PthjLydbi` READY.
- Supabase: `namdar-production` (`qjigldxjcpnrlyxgmlqq`).
- Window Cleaning is the only live/quotable/bookable service. Gutters, jet washing, roof cleaning, handyman and 3D tours remain `planned`.
- Address-data work remains parked.
- Privileged Staff/Admin requires AAL2/MFA.

## Window Stage 1 — LIVE
Live foundation includes Window quote/pricing rules, route-aware booking, Staff On my way → Start → Complete, completed-job direct-cost/travel close-out, consent-aware acquisition funnel, direct-contribution reporting, neutral post-job feedback/reviews, secure Stripe payment foundation and processor-fee accounting.

**Direct contribution is not net profit.** Missing reviewed cost or unresolved Stripe processor cost is not £0 and is excluded from contribution totals.

## Notification 504 issue — ACTIVE; fix candidate in progress
Do not connect Stripe until this cron reliability fix is released and observed.

Production runtime evidence on 2026-09-13 before the fix:
- 06:00 UTC: `post_job` 504, `booking_delivery` 504, `admin_contact` 504, `overdue_invoices` 504;
- 07:00 UTC: `booking_delivery` 504, `quote_reminders` 504, `unassigned_bookings` 504;
- 08:00 UTC: `booking_delivery` 504, `booking_attention` 504;
- 09:00 UTC: `post_job` 504, `admin_contact` 504, `business_delivery` 504;
- 10:00 UTC: `booking_delivery` 504, `unassigned_bookings` 504.

Those runs were on the pre-PR50 production deployment, but PR #50/#51 did not change notification database access, so current code still has the same exposure.

Database diagnosis:
- only 6 quotes, 2 bookings, 2 invoices, 4 business notifications and 2 booking notifications;
- no due pending notification backlog at diagnosis time;
- PostgREST is 14.5; `authenticator` has `statement_timeout=8s`;
- `pg_notification_queue_usage()` is 0 and database connection limit is default/unlimited (`-1`);
- due booking-notification SQL averages about 3.6 ms in Postgres, max observed ~311 ms — query execution is not the 8-second bottleneck;
- the random 504s across unrelated tiny queries are consistent with transient Data API/PostgREST connection-pool acquisition failures rather than a specific slow query.

Current candidate branch: `fix/cron-postgrest-504-retries-20260913`.

Candidate changes:
- new `lib/notification-cron-resilience.js` with bounded transient retry classification;
- idempotent cron GET/HEAD/OPTIONS Data API reads retry up to 3 total attempts with short jittered backoff on 408/429/502/503/504/520/522/524 and network timeout/reset failures;
- POST/PATCH/PUT/DELETE are **not** automatically replayed by this wrapper;
- top-level post-job / booking-delivery / business-delivery stages retry transient thrown gateway failures; their stage-level throws occur before per-row email delivery in the current processors;
- business scan receives the resilient read wrapper, while its existing conflict-ignore batch insert retains its own idempotent transient retry;
- cron response exposes retry/recovery counts for observability;
- Vercel schedule moves from `0 * * * *` to `7 * * * *` to avoid the repeated exact-hour contention window;
- business rules, recipient rules, event keys and notification cadence remain unchanged.

Do not call the 504 issue resolved until at least one real authenticated scheduled run on the released fix is clean. Keep `Namdar Cron Watch` active.

## Stripe payments — CODE READY, PROVIDER STILL DISABLED
PR #49 delivered secure Checkout/webhook/payment-policy foundations. PR #50 added processor-cost accounting and the no-surcharge pricing model.

Latest production verification after PR #50:
- `/api/health`: `stripe:false`, `stripeSecret:false`, `stripeWebhook:false`;
- no `site_settings.payments` row;
- zero `payment_records` with `method='stripe'`;
- Window remains the only live service;
- Admin serves `6.4.22-stripe-fee-accounting-1`.

Therefore customers still cannot make real Stripe payments. Do not describe Stripe as activated until provider setup and test-mode verification are completed.

## Processor-fee accounting — LIVE
Migration `stripe_processor_fee_accounting` is applied to production.

Existing `payment_records` has nullable internal fields:
- `provider_payment_id`;
- `provider_balance_transaction`;
- `provider_fee`;
- `provider_net`;
- `provider_fee_currency`.

Verified Stripe webhooks will record payment/refund money first, then attach actual Stripe balance-transaction fee/net. Customer Billing and PDF invoices/receipts do not expose these internal fields. Staff cannot manually create `method='stripe'` rows.

## Customer pricing rule — no separate card/Stripe surcharge
Namdar does not add a separate Stripe/card fee at Checkout.

Admin → Payments has an optional **headline price allowance** for Window Cleaning. It is **OFF by default**. If deliberately enabled, it becomes part of the ordinary Window service price for everyone regardless of later payment method and is never itemised as a payment fee.

Default suggestion in code is 1.5% + £0.20, configurable. Actual processor cost in reporting comes from Stripe balance-transaction data.

## Next action
1. finish CI/preview/release of the cron PostgREST 504 resilience candidate;
2. observe a real authenticated scheduled run at the new `:07` schedule and confirm it is clean or that any transient is recovered internally without degraded stages;
3. only then resume Stripe provider connection/configuration;
4. configure production webhook `https://namdar.co.uk/api/stripe-webhook` and its signing secret in Vercel;
5. test Checkout, delayed/duplicate webhook, actual fee capture and refund end-to-end in Stripe test mode;
6. deliberately enable Window online-payment policy only after those tests pass;
7. separately decide whether to enable the headline price allowance; it remains OFF now.

## Do not break
- Window Cleaning only; do not activate Stage 2 without deliberate decision.
- No separate consumer card/Stripe surcharge.
- Actual Stripe fee is internal accounting data from provider balance transactions.
- Verified Stripe webhook, not browser redirect, is authoritative for Stripe money.
- Missing processor cost is not £0.
- Notification retries must never blindly replay non-idempotent writes or duplicate customer emails.
- Never expose Stripe/Supabase/SMTP/Turnstile/cron secrets.
- Existing accepted work survives service pauses.
- Privileged access remains AAL2/MFA protected.
- Review requests stay neutral/equal; no positive-only gating or incentives.
- Address work stays parked.
- Support tickets remain customer-only; public inbound email remains Admin Email inbox.
