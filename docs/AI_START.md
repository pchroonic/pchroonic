# Namdar AI fast resume

Last verified: 2026-09-13 UTC

Read this first. Use `docs/AI_HANDOFF.md` for implementation detail and `docs/PROJECT_STATUS.md` for roadmap/status.

## Production baseline
- Repository: `pchroonic/pchroonic`, default `main`.
- Current `main` HEAD before this fix: `71935bdb169cb3d4f8f0413d1be8c36041a2f744` (PR #55 docs-only merge).
- Latest product release before this fix: PR #54 `Fix Stripe webhook raw body handling on Vercel`.
- PR #54 exact tested head: `d9a7d2cdded5905e032b53a38b725e30f50be531`; CI `34759777343` SUCCESS; production `dpl_9maand6wJHASgET55huV2EtauFjp` READY on `https://namdar.co.uk`.
- Supabase: `namdar-production` (`qjigldxjcpnrlyxgmlqq`).
- Window Cleaning is the only live/quotable/bookable service. Gutters, jet washing, roof cleaning, handyman and 3D tours remain `planned`.
- Address-data work remains parked.
- Privileged Staff/Admin requires AAL2/MFA.

## Notification cron
PR #52 remains live with bounded transient Data API read retries and schedule `7 * * * *`.

A real post-release scheduled run at 2026-09-13 12:07 UTC completed non-degraded. Keep `Namdar Cron Watch` active because upstream 504s may still recur transiently.

## Stripe sandbox provider — CONNECTED
Production `/api/health` reports Stripe secret + webhook configuration present. These are Stripe **sandbox/test-mode** credentials stored server-side in Vercel Production env so `namdar.co.uk` can be tested safely. They are not live-money credentials.

Webhook destination: `https://namdar.co.uk/api/stripe-webhook`.

PR #54 remains the verified webhook raw-body fix. The earlier £1.23 sandbox payment + full refund proved verified-webhook authority, refund idempotency and exact processor-cost capture.

## Normal My Namdar Checkout verification — IN PROGRESS
On 2026-09-13 the real signed-in customer Checkout route was tested with a controlled £1.00 Window invoice under a temporary sandbox-only policy:
- mode `deposit_required`;
- 20% deposit;
- £0.50 minimum deposit;
- pay-in-full allowed;
- headline-price allowance OFF.

The normal My Namdar Checkout created successfully and a £0.50 sandbox deposit completed. Verified live state immediately afterwards:
- POST `/api/stripe-webhook` -> HTTP 200;
- invoice £1.00 total / £0.50 paid / £0.50 outstanding / `part_paid`;
- booking `payment_status='deposit_paid'`;
- one Stripe payment ledger row, kind `deposit`, amount £0.50;
- actual sandbox processor cost £0.22 / net £0.28.

The payment itself was correct. The browser return exposed a separate frontend bug: after Stripe redirected to `/account?tab=billing&payment=success&session_id=...`, My Namdar could remain indefinitely on `Opening My Namdar… Restoring your secure session.` when Supabase `getSession()` stalled, especially with multiple Namdar tabs open.

The temporary `site_settings.payments` row was removed immediately after reproducing the bug. Customer online payment policy is OFF again while the fix is developed. The successful £0.50 sandbox deposit ledger/invoice state remains intact for the controlled £1.00 fixture.

## Current fix candidate
Branch: `fix/account-stripe-return-session-20260913`.

Changes:
- load `account-auth-hotfix.js` before `account-original.js`, so the Supabase client factory is patched before initial session restoration starts;
- bound `auth.getSession()` to 5 seconds instead of allowing an indefinite spinner;
- on a Stripe success return, permit one automatic page retry per Checkout session, with a session-storage loop guard;
- if restoration still fails, replace the endless spinner with existing refresh/close-extra-tabs recovery guidance;
- add `scripts/account-auth-hotfix.test.mjs` and run it in CI to lock the load order, bounded timeout and one-retry/no-loop behavior.

No database migration or environment-variable change is required for this fix.

## Next action
1. run CI and preview checks for the session-restore fix;
2. merge/deploy only if those checks pass;
3. verify production no longer leaves Stripe returns on an endless session spinner;
4. recheck that only the controlled account has an eligible Window invoice, then temporarily re-enable the sandbox policy;
5. pay the remaining £0.50 balance through normal My Namdar Checkout and verify webhook/ledger/invoice/booking state;
6. refund/clean the controlled sandbox test and return payment policy OFF;
7. only later choose the real Window commercial payment policy and connect live Stripe deliberately.

## Do not break
- Window Cleaning only; no Stage 2 activation without deliberate decision.
- No separate consumer card/Stripe surcharge.
- Verified Stripe webhook, not browser redirect, is authoritative for Stripe money.
- Never expose Stripe/Supabase/SMTP/Turnstile/cron secrets.
- Sandbox credentials must not be mistaken for live-money readiness.
- Staff cannot manually impersonate Stripe payment rows.
- Direct contribution is not net profit; unresolved processor cost is not £0.
- Privileged access remains AAL2/MFA protected.
- Review requests remain neutral/equal; no positive-only gating or incentives.
- Address work stays parked.
