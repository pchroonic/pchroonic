# Namdar project status

Last updated: 2026-09-13 UTC

## Production baseline
- Repo: `pchroonic/pchroonic`, default `main`.
- `main` HEAD immediately before the current session-return fix: `71935bdb169cb3d4f8f0413d1be8c36041a2f744`.
- Latest product release before this fix: PR #54 `Fix Stripe webhook raw body handling on Vercel`.
- PR #54 exact tested head `d9a7d2cdded5905e032b53a38b725e30f50be531`; CI `34759777343` SUCCESS; production `dpl_9maand6wJHASgET55huV2EtauFjp` READY on `https://namdar.co.uk`.
- Supabase: `namdar-production` (`qjigldxjcpnrlyxgmlqq`).
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
- PR #54 Vercel-compatible raw-body handling for verified Stripe webhooks.

## Notification 504 resilience — LIVE / MONITORED
PR #52 remains deployed. A real scheduled run at 2026-09-13 12:07 UTC completed non-degraded. `Namdar Cron Watch` remains active because the upstream 504 source may still recur transiently.

## Stripe sandbox — CONNECTED, CUSTOMER COMMERCIAL POLICY OFF
Stripe test credentials and webhook signing secret are present server-side in Vercel Production solely so the real production hostname can receive sandbox webhooks. These are test-mode credentials only.

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
- invoice now £0.50 paid / £0.50 outstanding / `part_paid`;
- booking `payment_status='deposit_paid'`;
- one £0.50 Stripe deposit row;
- sandbox fee £0.22 / net £0.28.

This confirms the normal authenticated Checkout + webhook + partial-payment data path.

## Stripe browser-return session bug — FIX IN PROGRESS
After the successful deposit, the return to My Namdar remained on `Opening My Namdar… Restoring your secure session.` even though the backend had already recorded the payment.

Root cause is in the account bootstrap order: `account-original.js` started before `account-auth-hotfix.js`, so the initial Supabase session restore was not guaranteed to be bounded by the hotfix. With several Namdar tabs open, the first `auth.getSession()` could stall and the loading shell never progressed.

Current branch: `fix/account-stripe-return-session-20260913`.

Fix candidate:
- load the auth guard before `account-original.js`;
- bound `getSession()` to 5 seconds;
- allow one Stripe-return reload per Checkout session with a no-loop sessionStorage guard;
- retain an independent loading-shell fail-safe;
- add deterministic Node regression tests for load order, timeout behavior and one-retry/no-loop behavior;
- run the new test in CI.

No database migration or environment-variable change is required.

## Commercial safety during fix
The temporary `site_settings.payments` row was deleted after reproducing the issue, so customer online payment policy is OFF again during development/deployment.

The successful controlled £0.50 deposit state remains in the database so the remaining £0.50 balance can be used to finish normal-flow verification after the frontend fix is live.

## Immediate next work
1. pass CI + preview checks for the session-restore fix;
2. merge/deploy and verify production;
3. recheck that no other customer account is eligible before any temporary sandbox reactivation;
4. re-enable the controlled sandbox policy briefly and pay the remaining £0.50 balance through normal My Namdar Checkout;
5. verify webhook, second ledger row, fully-paid invoice/booking state and the corrected browser return;
6. refund/clean the sandbox fixture and return payment policy OFF;
7. only after this, choose the actual Window launch payment policy and later connect live Stripe deliberately;
8. continue Window real-job evidence/pricing calibration.

## Other open work
- official Google review-request URL;
- fresh privileged password/CAPTCHA/MFA interactive completion;
- SMS, legal and remaining launch checks;
- address-data pilot remains parked.

## Handoff rule
Every substantial product/provider/data change updates `docs/AI_START.md`, `docs/AI_HANDOFF.md`, and this file. Never store credentials, raw API keys, customer secrets, TOTP codes or one-time Auth links.
