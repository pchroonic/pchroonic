# Namdar project status

Last updated: 2026-09-13 UTC

## Production baseline
- Repo: `pchroonic/pchroonic`, default `main`.
- Current product release: PR #56 `Fix My Namdar Stripe return session restore stall`.
- PR #56 merge/main HEAD `70af420aa17787ce22879b2a6cd4880cb9238113`.
- PR #56 CI passed; production deployment `dpl_CXTkbzJ4q29BfW7CmrLjCsGgA8rH` is READY on `https://namdar.co.uk`.
- Supabase production: `namdar-production` (`qjigldxjcpnrlyxgmlqq`).
- Window Cleaning is the only live/quotable/bookable service; five future services remain planned.
- Address-data work remains parked.

## Window Cleaning Stage 1 — LIVE
Product sequence includes:
- PR #38 Window quote/recurring journey and quote-gate hardening;
- PR #40 server-enforced booking operations and postcode-area route density;
- PR #42 consent-aware acquisition funnel + direct-contribution reporting;
- PR #45 completed-job close-out + neutral feedback/review foundation;
- PR #47 first booking-notification resilience layer;
- PR #49 secure Stripe payment foundation;
- PR #50 processor-cost accounting + no-surcharge headline pricing option;
- PR #52 bounded transient PostgREST/Data API recovery for notification cron + schedule moved to minute 7;
- PR #54 Vercel-compatible raw-body handling for verified Stripe webhooks;
- PR #56 bounded My Namdar session-restore/Stripe-return failure handling.

## Notification 504 resilience — LIVE / MONITORED
PR #52 remains deployed. `Namdar Cron Watch` remains active because the upstream 504 source may still recur transiently.

## Stripe sandbox — CONNECTED, CUSTOMER COMMERCIAL POLICY OFF
Stripe test credentials and webhook signing secret are present server-side in Vercel Production only for sandbox verification. They are not live-money credentials.

PR #54 plus the earlier £1.23 sandbox payment/refund already proved verified-webhook authority, refund idempotency and exact processor-cost accounting.

## Normal signed-in Checkout verification — PARTIAL PASS
A temporary sandbox-only Window policy was enabled to test the real My Namdar customer route using a controlled £1.00 invoice:
- deposit required;
- 20% deposit;
- £0.50 minimum;
- pay in full allowed;
- headline allowance OFF.

The real customer `Pay £0.50 deposit` flow succeeded:
- `/api/create-checkout` HTTP 200;
- Stripe test Checkout completed;
- webhook HTTP 200;
- invoice £0.50 paid / £0.50 outstanding / `part_paid`;
- booking `payment_status='deposit_paid'`;
- one £0.50 Stripe deposit row;
- sandbox fee £0.22 / net £0.28.

The remaining £0.50 balance is retained as the controlled completion fixture.

## My Namdar browser session restoration — ACTIVE FIX
The initial Stripe return exposed an endless `Restoring your secure session` spinner. PR #56 is live and now bounds `getSession()` to 5 seconds, allows only one Stripe-return retry and falls back to recovery guidance instead of hanging indefinitely.

After PR #56 deployed, a real `/account` refresh with several Namdar tabs still timed out. This confirms PR #56 fixed the failure mode but not the underlying Supabase restore stall.

## Stronger diagnosis / current candidate
`account.html` loads the floating CDN alias `@supabase/supabase-js@2`. A browser can retain an older v2 build, and older Supabase Auth browser builds are known to deadlock/hang `getSession()` under multi-tab `navigator.locks` contention.

Current Supabase JS `2.116.0` uses lockless coordination by default when no custom lock is supplied.

Current branch:
`fix/account-supabase-lockless-pin-20260913`

Candidate:
- `account.js` synchronously loads exact `@supabase/supabase-js@2.116.0` before any Namdar account client is created;
- the exact runtime loads before the PR #56 auth guard;
- loader version is `6.4.23-supabase-lockless-1`;
- regression coverage asserts the exact pin and load order;
- PR #56 timeout protection remains as defense-in-depth.

The floating script still present in `account.html` is superseded before client creation; duplicate cleanup can be done after production verification.

No migration or environment-variable change is required.

## Commercial safety during auth work
The temporary `site_settings.payments` row was removed after the second reproduction. Online customer payment policy is OFF while the auth path is being fixed.

The successful £0.50 deposit remains untouched so no duplicate deposit is charged and the remaining £0.50 can later complete the same controlled invoice.

## Immediate next work
1. pass CI and exact preview checks for the Supabase runtime pin;
2. merge/deploy and verify production serves the exact pinned runtime;
3. test ordinary My Namdar session restore with several tabs before enabling payments;
4. if stable, recheck no other customer account is payment-eligible;
5. briefly re-enable the sandbox-only policy and pay only the remaining £0.50 balance;
6. verify webhook, second ledger row, fully-paid invoice/booking state and corrected return flow;
7. refund/clean the sandbox fixture and return payment policy OFF;
8. only after this, choose the actual Window launch payment policy and later connect live Stripe deliberately;
9. continue Window real-job evidence/pricing calibration.

## Other open work
- official Google review-request URL;
- fresh privileged password/CAPTCHA/MFA interactive completion;
- SMS, legal and remaining launch checks;
- address-data pilot remains parked.

## Handoff rule
Every substantial product/provider/data change updates `docs/AI_START.md`, `docs/AI_HANDOFF.md`, and this file. Never store credentials, raw API keys, customer secrets, TOTP codes or one-time Auth links.
