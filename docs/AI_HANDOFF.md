# Namdar AI handoff

Last verified: 2026-09-13 UTC

Read `docs/AI_START.md` first.

## Production source of truth
- Repo: `pchroonic/pchroonic`, default `main`.
- `main` HEAD immediately before this fix: `71935bdb169cb3d4f8f0413d1be8c36041a2f744` (PR #55 docs-only merge).
- Latest product release before this fix: PR #54 `Fix Stripe webhook raw body handling on Vercel`.
- PR #54 exact tested head `d9a7d2cdded5905e032b53a38b725e30f50be531`, CI `34759777343` SUCCESS, production `dpl_9maand6wJHASgET55huV2EtauFjp` READY on `https://namdar.co.uk`.
- Supabase: `namdar-production` (`qjigldxjcpnrlyxgmlqq`).
- Only `windows` is live; gutters/jetwash/roof/handyman/tour3d remain `planned`.
- Address work remains parked.
- Staff/Admin privileged API access requires AAL2/MFA.

## Notification cron status
PR #52 remains deployed with bounded transient Data API read retries and schedule `7 * * * *`.

A real scheduled run at 2026-09-13 12:07 UTC completed non-degraded. Keep `Namdar Cron Watch` active; do not assume upstream 504s can never recur.

## Stripe provider state — SANDBOX CONNECTED, COMMERCIAL PAYMENTS OFF
Vercel Production has Stripe test-mode secret + webhook signing secret so the real `namdar.co.uk` route can receive sandbox events. These are not live-money credentials.

Webhook destination:
`https://namdar.co.uk/api/stripe-webhook`

Selected events remain:
- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `refund.created`
- `refund.updated`
- `charge.refunded`

PR #54 remains the verified exact-raw-body fix. The earlier £1.23 sandbox payment and full refund proved:
- verified webhook is authoritative;
- browser success is non-authoritative;
- payment/refund writes are idempotent;
- exact Stripe processor fee/net can be captured.

## Normal signed-in My Namdar Checkout — FIRST DEPOSIT PASSED
A controlled £1.00 Window invoice was used to test the actual signed-in customer flow, rather than the earlier one-time Payment Link harness.

Temporary sandbox-only policy used for this controlled test:
- `active:true`;
- `mode:'deposit_required'`;
- `deposit_percent:20`;
- `minimum_deposit:0.50`;
- `allow_full_payment:true`;
- headline allowance OFF.

Immediately before activation, database checks showed zero eligible Window bookings/invoices on other customer accounts. The controlled account had two eligible Window invoices; the £1.00 fixture was selected specifically to keep sandbox charges minimal.

The customer clicked the real My Namdar `Pay £0.50 deposit` button. Production `/api/create-checkout` returned HTTP 200 and Stripe Checkout completed in test mode.

Verified result:
- POST `/api/stripe-webhook` -> HTTP 200 at 13:55:32 UTC;
- invoice £1.00 total, £0.50 paid, £0.50 outstanding, status `part_paid`;
- booking remained confirmed and `payment_status='deposit_paid'`;
- exactly one Stripe payment ledger row for £0.50, kind `deposit`;
- provider fee £0.22 GBP;
- provider net £0.28 GBP.

This proves the normal authenticated `/api/create-checkout` route, verified webhook write and partial-payment synchronization work together.

## Bug discovered after Stripe redirect
After successful Checkout, Stripe redirected the browser to:
`/account?tab=billing&payment=success&session_id=...`

The page remained on:
`Opening My Namdar… Restoring your secure session.`

The backend was healthy and the payment had already been recorded correctly. Vercel logs showed the webhook 200 and no failing payment API. The spinner remained because `renderState()` had not started; the initial Supabase `auth.getSession()` was stalled.

The account architecture uses:
- `account.html` -> Supabase CDN -> `account.js`;
- `account.js` then dynamically writes the account component scripts.

Before this fix, `account.js` loaded `account-original.js` before `account-auth-hotfix.js`. `account-original.js` starts `init()` immediately and can reach the initial `getSession()` while the hotfix is not yet guaranteed to have wrapped the Supabase client factory. The existing hotfix therefore could not be relied on to bound the very session restore it was intended to protect.

Multiple open Namdar tabs were present during reproduction. Supabase session restoration must therefore be treated as potentially stalled/contended rather than allowed to keep the page spinner forever.

## Current fix candidate
Branch: `fix/account-stripe-return-session-20260913`.

Implementation:
- `account.js` now loads `/account-auth-hotfix.js` before `/account-original.js`;
- loader version bumped to `6.4.22-auth-restore-1` so component script URLs change;
- `account-auth-hotfix.js` wraps the Supabase client factory before initial portal bootstrap;
- patched `auth.getSession()` is bounded to 5 seconds;
- timeout timers are cleared when the real session promise wins, avoiding delayed side effects from a completed `Promise.race`;
- a Stripe success return gets at most one automatic reload per Checkout session, keyed in `sessionStorage` so it cannot enter a reload loop;
- an independent 5.75-second loading-shell guard still replaces the endless spinner with recovery guidance if session restore remains unresolved;
- the factory patch has a short retry loop as best-effort fallback if the global Supabase object is delayed;
- `window.NamdarAuthHotfix` exposes only patch helpers/timing for deterministic regression tests; it contains no secrets or customer data.

Regression:
- new `scripts/account-auth-hotfix.test.mjs` asserts the auth guard loads before `account-original.js`;
- simulates a never-resolving `getSession()` and verifies bounded timeout;
- simulates a Stripe success return and verifies exactly one automatic retry, not a reload loop;
- CI workflow now runs this test in addition to syntax checks.

No database migration and no environment-variable change are required.

## Temporary sandbox policy returned OFF
Immediately after reproducing the return-page bug, the temporary `site_settings` row where `key='payments'` was deleted again. Current payment policy is OFF while the frontend fix is tested/deployed.

Do not delete or rewrite the successful £0.50 payment record during the fix. It is the controlled fixture needed to test the remaining £0.50 balance after the return flow is corrected.

## Required verification sequence for this fix
1. CI must pass, including `scripts/account-auth-hotfix.test.mjs` and handoff checks.
2. Exact branch preview must be READY and build errors must be clean.
3. Merge/deploy only after preview checks pass.
4. Verify production build and health.
5. Before re-enabling temporary sandbox policy, re-run database eligibility checks and ensure no other customer account has become eligible for Window online payment.
6. Re-enable the same temporary sandbox policy only for the controlled test window.
7. Refresh My Namdar billing and pay the remaining £0.50 balance through normal Checkout.
8. Verify webhook 200, exactly one second Stripe payment row, invoice paid £1.00, booking `payment_status='paid'`, provider fee/net fields and no duplicate writes.
9. Verify the Stripe return no longer sits indefinitely on the session spinner.
10. Refund/clean the controlled sandbox test as appropriate and return the payment policy OFF.
11. Only after the normal-flow verification is complete should the user choose the actual launch payment policy and later connect live Stripe deliberately.

## Non-negotiables
- Window Cleaning only.
- No separate customer card/Stripe surcharge.
- Verified Stripe webhook is authoritative for Stripe money; browser success is never payment proof.
- No blind replay of non-idempotent writes.
- No secrets in source, logs, docs or chat.
- Sandbox-ready does not mean live-money-ready.
- Missing Stripe processor cost is not £0; direct contribution is not net profit.
- Privileged changes remain AAL2/MFA protected.
- Address work remains parked.
- Review solicitation stays neutral/equal.
