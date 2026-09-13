# Namdar AI handoff

Last verified: 2026-09-13 UTC

Read `docs/AI_START.md` first.

## Production source of truth
- Repo: `pchroonic/pchroonic`, default `main`.
- Latest product release: PR #52 `Harden notification cron against transient PostgREST 504s`.
- Exact tested head: `0cc73a93772d99f38eedc5287b7901fb14853185`.
- GitHub Actions: `34753702507` SUCCESS.
- Exact-head preview: `dpl_HPyvguMrtVaXT8Aw8BnrnFNU9g6J` READY / clean errors-only build.
- Merge: `2efca178f49221d3ca819b3c4df9d1780d759579`.
- Product production: `dpl_HSbQuHWcKxVQLPHJKZFb9RDctkVm` READY on `https://namdar.co.uk`, canonical alias, `aliasError:null`.
- Production build errors-only check clean.
- Supabase: `namdar-production` (`qjigldxjcpnrlyxgmlqq`).
- Only `windows` is live; gutters/jetwash/roof/handyman/tour3d remain `planned`.
- Address work remains parked.
- Staff/Admin privileged API access requires AAL2/MFA.

## Window Stage 1 baseline
Keep the existing Window quote/recurring pricing, service-live gates, route-aware booking, Staff On my way → Start → Complete, completed-job direct-cost/travel review, consent-aware conversion funnel, direct-contribution reporting, neutral post-job review flow, Stripe foundation and processor-cost accounting.

Missing reviewed cost is not £0. Missing Stripe processor cost is not £0. Direct contribution is not net profit.

## PR #52 notification cron PostgREST resilience — LIVE, awaiting scheduled proof
### Failure evidence before release
Production cron failures on 2026-09-13 crossed unrelated stages and source scans, including post-job, booking delivery, admin contact, quote reminders, overdue invoices, unassigned bookings, booking attention and business delivery. The 11:00 UTC run on then-current production still logged `booking_attention 504 Gateway Timeout`.

The outer cron could return HTTP 200 because PR #47 isolated stages, but degraded stage/source failures meant the job was not fully healthy.

### Diagnosis
Production Supabase diagnostics during investigation:
- only 6 quotes, 2 bookings, 2 invoices, 4 business notifications and 2 booking notifications;
- no due pending notification backlog;
- `pg_notification_queue_usage()` = 0;
- `datconnlimit` = -1;
- PostgREST observed as 14.5;
- authenticator role has 8-second statement/lock timeout;
- due booking-notification SQL averaged ~3.649 ms and maxed ~310.753 ms over the observed calls.

The database query execution was therefore far below the timeout window. The broad random 504 pattern is treated as transient PostgREST/Data API connection-pool acquisition pressure rather than a single slow query. Do not add random indexes or increase query timeouts as the primary response without new evidence.

### Release implementation
New `lib/notification-cron-resilience.js`:
- transient statuses: 408/429/502/503/504/520/522/524;
- recognizes transport/reset/timed-out/fetch failures;
- max 3 total attempts by default;
- short jittered backoff;
- `createResilientReadDb()` retries only GET/HEAD/OPTIONS;
- POST/PATCH/PUT/DELETE are not generically replayed;
- retry metrics track retries/recovered/exhausted.

`api/booking-notifications.js`:
- post-job, booking-delivery and business-delivery top-level stages can retry thrown transient failures;
- business scan receives the resilient read DB wrapper, so admin-contact, quote, invoice, unassigned and booking-attention reads can recover before being marked degraded;
- existing business queue conflict-ignore batch insert retains its own idempotent transient retry;
- response exposes stage `attempts` / `recovered` and top-level `databaseRetries`;
- partial failures remain HTTP 200 + degraded; all-stage failure remains HTTP 503.

Safety rationale for top-level stage retry: the uncaught stage-level gateway errors currently occur on the initial due-row read, while per-row claim/send processing catches row failures internally. Do not extend this pattern to arbitrary mutations without explicit idempotency proof.

`vercel.json` production schedule is now:
- `/api/account-purge`: `15 4 * * *`;
- `/api/booking-notifications`: `7 * * * *`.

Moving notification cron from `:00` to `:07` avoids the exact-hour contention pattern repeatedly observed while preserving hourly cadence.

### Release verification
- PR #52 exact head `0cc73a93772d99f38eedc5287b7901fb14853185`;
- CI `34753702507` SUCCESS;
- exact-head preview `dpl_HPyvguMrtVaXT8Aw8BnrnFNU9g6J` READY / clean build;
- merge `2efca178f49221d3ca819b3c4df9d1780d759579`;
- production `dpl_HSbQuHWcKxVQLPHJKZFb9RDctkVm` READY / canonical alias / no alias error;
- production build errors-only check clean;
- `/api/health` 200 with database/email/reminders/followups healthy;
- Stripe flags still false;
- post-release DB check: no due booking/business notification backlog, zero Stripe rows, zero payment-policy rows, Window only live;
- only release-time error-level log observed was an unrelated Node `url.parse()` deprecation warning from `/api/staff-notifications`.

### Observation gate
Do **not** call the 504 issue permanently resolved from code deployment alone.

Inspect the first real authenticated scheduled run on PR #52 production at minute 7. Interpret results:
- all stages clean, no retries: operationally healthy run;
- all stages clean with recovered retries: containment succeeded but upstream transient still occurred;
- any degraded stage/source after retries: issue remains active and needs next escalation.

Keep `Namdar Cron Watch` active.

## Stripe foundation — LIVE CODE, PROVIDER DISABLED
PR #49 secure Checkout/payment-policy foundation and PR #50 processor-fee accounting remain deployed, but provider credentials are deliberately absent while the cron observation gate is open.

Production remains:
- `stripe:false`;
- `stripeSecret:false`;
- `stripeWebhook:false`;
- no `site_settings.payments` row;
- zero Stripe ledger rows.

Rules:
- verified Stripe webhook is authoritative for money;
- browser return/status is read-only;
- server calculates deposit/full/balance amounts;
- card details never pass through Namdar;
- staff cannot manually create Stripe ledger rows.

## No-surcharge pricing / processor economics
There is no separate customer Stripe/card surcharge.

The optional Window headline-price allowance remains OFF. If later enabled, it is folded into one normal Window service price for every payment method. Actual processor cost in reporting comes from Stripe balance-transaction fee data, never from the allowance estimate.

## Next sequence
1. inspect the first real PR #52 production `:07` cron run;
2. after a healthy observation, resume Stripe account/provider setup securely;
3. configure `https://namdar.co.uk/api/stripe-webhook` and server-side secrets;
4. test deposit/full Checkout, delayed/duplicate webhook, processor-fee capture, balance and refund in test mode;
5. deliberately enable Window payment policy only after tests pass;
6. separately decide whether headline allowance should be enabled.

## Non-negotiables
- Window Cleaning only.
- Notification retries must not blindly replay non-idempotent writes or duplicate email.
- No separate customer card/Stripe surcharge.
- Verified Stripe webhook is authoritative for Stripe money.
- No provider/card/secrets in browser, source, logs, docs or chat.
- Privileged changes remain AAL2/MFA protected.
- Existing accepted work survives service pauses.
- Address work remains parked.
- Support tickets stay customer-only; public inbound email stays Admin Email inbox.
- Review solicitation stays neutral/equal.
