# Namdar AI handoff

Last verified: 2026-09-13 UTC

Read `docs/AI_START.md` first.

## Production source of truth
- Repo: `pchroonic/pchroonic`, default `main`.
- Latest product release: PR #50 `Account for Stripe fees without customer surcharges`.
- PR #50 exact tested head: `17892e015f8e7f8b7c9a6b0b577292bb950d5c64`.
- CI: `34752824319` SUCCESS.
- Exact-head preview: `dpl_2py2f1pDzH8YK5YD6GRkiD2hojfi` READY / clean.
- Product merge: `32e13016601492eae3daa2021f35195298b00f5b`.
- Product production: `dpl_Ce8kShg3ikTXVubaTYMKcgAFjztT` READY on `https://namdar.co.uk`.
- Docs-only PR #51 merge `c350fc3a225c96ad0033a54727e5ab5d8c2490f7`; current production deployment `dpl_7sFz4g2vR4RmLhHS7J7PthjLydbi` READY / canonical alias / no alias error.
- Supabase: `namdar-production` (`qjigldxjcpnrlyxgmlqq`).
- Only `windows` is live; gutters/jetwash/roof/handyman/tour3d remain `planned`.
- Address work remains parked.
- Staff/Admin privileged API access requires AAL2/MFA.

## Window Stage 1 live baseline
Keep Window quote/recurring pricing, service-live gates, route-aware booking, Staff On my way → Start → Complete, completed-job direct-cost/travel review, consent-aware conversion funnel, direct-contribution reporting, neutral post-job review flow, Stripe foundation and processor-cost accounting.

`booking_job_costs` remains the staff-reviewed job-cost source. Missing review is not £0. Missing/incomplete Stripe processor cost is not £0. Direct contribution is not net profit.

Public Google review requests remain disabled until the official Business Profile review-request URL is deliberately entered. Never restore positive-only review gating or incentives.

## CURRENT PRIORITY — notification cron 504s
Do not proceed with Stripe provider connection until this is released and observed.

### Production evidence
Vercel runtime logs on 2026-09-13 showed repeated authenticated `/api/booking-notifications` HTTP 200 responses with degraded internal stages:
- 05:00 UTC: `booking_delivery` 504;
- 06:00 UTC: `post_job` 504, `booking_delivery` 504, `admin_contact` 504, `overdue_invoices` 504;
- 07:00 UTC: `booking_delivery` 504, `quote_reminders` 504, `unassigned_bookings` 504;
- 08:00 UTC: `booking_delivery` 504, `booking_attention` 504;
- 09:00 UTC: `post_job` 504, `admin_contact` 504, `business_delivery` 504;
- 10:00 UTC: `booking_delivery` 504, `unassigned_bookings` 504.

05:00 ran on the PR #48 docs deployment; 06:00–10:00 were on PR #49 production `dpl_ALo78vUX3j9xwVZ8PnMjC9mAASmw`. PR #50/#51 did not change notification database access, so the vulnerability remains in current production source until this candidate is released.

### Database diagnosis
Production Supabase diagnostics during investigation:
- `pg_notification_queue_usage()` = 0;
- `datconnlimit` = -1;
- PostgREST application observed as 14.5;
- `authenticator` role has `statement_timeout=8s` and `lock_timeout=8s`;
- PostgREST connections observed idle rather than blocked on a long query;
- data size is tiny: 6 quotes, 2 bookings, 2 invoices, 4 business notifications, 2 booking notifications;
- no due pending/sending notification backlog at diagnosis time.

`pg_stat_statements` for the due booking-notification PostgREST query shows ~3.649 ms average execution and ~310.753 ms max over 100 calls. The query itself is not approaching the 8-second timeout.

Supabase current docs identify HTTP 504/PGRST003 as timing out while waiting for an internal PostgREST pool connection. Their current retry guidance also includes 504 among transient retryable Data API errors for idempotent calls. The failure pattern across unrelated tiny reads is therefore treated as transient Data API/PostgREST pool acquisition pressure, not a single bad SQL query.

Do **not** increase statement timeout or add random indexes as the primary fix; evidence does not support slow SQL.

### Candidate branch
`fix/cron-postgrest-504-retries-20260913`

New file: `lib/notification-cron-resilience.js`.

Behavior:
- classifies 408/429/502/503/504/520/522/524 and network reset/timeout/fetch failures as transient;
- `retryTransient()` uses at most 3 total attempts by default with short jittered backoff;
- `createResilientReadDb()` retries only GET/HEAD/OPTIONS;
- the read wrapper deliberately does **not** replay POST/PATCH/PUT/DELETE automatically;
- retry metrics track `retries`, `recovered`, `exhausted`.

`api/booking-notifications.js` now:
- retries a thrown transient `post_job`, `booking_delivery` or `business_delivery` stage up to 3 total attempts;
- gives `scanBusinessFollowUpsBatched()` the resilient read-only DB wrapper so `admin_contact`, quote, invoice, unassigned and attention source reads can recover before the scanner marks itself degraded;
- keeps the business scanner's existing conflict-ignore batch insert retry for its idempotent notification queue POST;
- adds per-stage `attempts` / `recovered` plus top-level `databaseRetries` to cron JSON for observability;
- preserves HTTP 503 only when all four stages fail; partial failures remain HTTP 200 + `degraded:true` as before.

Why retrying the top-level delivery stages is safe in the current implementation:
- their uncaught stage-level gateway failure happens on the initial due-row read;
- per-row processing catches row errors internally after a claim;
- immediate stage retry therefore does not blindly resend already-delivered emails.

Do not generalize this into automatic mutation retries without proving idempotency.

### Schedule change
`vercel.json` moves `/api/booking-notifications` from `0 * * * *` to `7 * * * *`.

This avoids the exact-hour contention window repeatedly observed at 05:00–10:00 while preserving hourly cadence. Notification due times/business rules are unchanged; worst-case normal scheduling shift is only seven minutes.

### Tests / release gate
`scripts/booking-notification-resilience.test.mjs` now verifies:
- 504/network classification;
- recovery after transient failures;
- GET reads retry;
- PATCH mutation does not auto-retry;
- business scanner recovers a first source 504 without becoming degraded;
- existing conflict-ignore batch insert retry remains intact;
- Vercel schedule is `7 * * * *`;
- cron exposes retry observability.

`.github/workflows/ai-handoff-check.yml` syntax-checks the new helper and runs the resilience test.

Release only after exact-head GitHub CI SUCCESS and exact-head Vercel preview READY/clean. No database migration is needed.

After production deploy, inspect the first real authenticated `:07` scheduled run. Do not declare the issue resolved until a real run is clean. If retries recover a transient, record that as containment/recovery, not proof the upstream pool issue vanished.

Keep `Namdar Cron Watch` active.

## Stripe foundation — LIVE CODE, PROVIDER DISABLED
PR #49 added Window-only secure Checkout/payment policy without activating Stripe.

Core rules retained:
- online payments default disabled;
- activation needs Admin activation + `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET`;
- Checkout is customer-owned, Window-only and server-calculated;
- webhook signature/raw-body verification precedes money writes;
- browser payment return/status is read-only for money;
- unique `payment_records.provider_reference` keeps webhook replay idempotent;
- required deposit/full payment is enforced before Window confirmation;
- card details never pass through or persist in Namdar.

Production still has `/api/health` Stripe flags false, no `site_settings.payments` row and zero Stripe payment rows.

## PR #50 processor-fee accounting — LIVE
There is no separate customer Stripe/card surcharge.

Production migration `stripe_processor_fee_accounting` added nullable internal fields to `payment_records`:
- `provider_payment_id`;
- `provider_balance_transaction`;
- `provider_fee`;
- `provider_net`;
- `provider_fee_currency`.

The partial provider-payment index exists and RLS remains enabled.

Verified Stripe webhooks record money/state first and attach actual provider fee/net afterward. If provider cost lookup is temporarily unavailable, the webhook returns retryable 503 after safe money recording; replay cannot duplicate money/receipt and can finish fee reconciliation.

Staff cannot manually create `method='stripe'` rows. Customer Billing and PDFs do not expose internal processor-cost fields.

Admin has an optional Window headline-price allowance, currently OFF. Default suggestion is 1.5% + £0.20. If enabled, it is part of the ordinary service price for every payment method and never an itemised card fee. Actual reporting cost always comes from Stripe balance-transaction data.

Window direct contribution subtracts actual captured Stripe fee along with reviewed direct job costs. Missing/non-GBP processor fee excludes the affected job from aggregate contribution rather than assuming £0.

## Next sequence after cron fix
1. release the notification 504 resilience candidate;
2. observe a real clean/recovered `:07` scheduled cron run;
3. only then configure Stripe account/provider securely;
4. store secrets only in Vercel/server-side settings, never chat/source;
5. configure `https://namdar.co.uk/api/stripe-webhook`;
6. test deposit/full Checkout, delayed/duplicate webhook, fee capture, balance and refund in test mode;
7. deliberately enable Window payment policy;
8. separately decide whether headline allowance should be enabled.

## Non-negotiables
- Window Cleaning only.
- No separate customer card/Stripe surcharge.
- Verified Stripe webhook is authoritative for Stripe money; browser redirect is not.
- Actual Stripe fee is internal provider accounting data.
- Missing processor cost is not £0.
- Cron resilience must not blindly retry non-idempotent mutations or duplicate customer email.
- No card details/provider secrets in browser, source, logs, docs or chat.
- Privileged changes remain AAL2/MFA protected.
- Existing accepted work survives service pauses.
- Address work remains parked.
- Support tickets stay customer-only; public inbound email stays Admin Email inbox.
- Review solicitation stays neutral/equal.
