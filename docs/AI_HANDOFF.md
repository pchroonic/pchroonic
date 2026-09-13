# Namdar AI handoff

Last verified: 2026-09-13 UTC

Read `docs/AI_START.md` first.

## Production source of truth
- Repo: `pchroonic/pchroonic`, default `main`.
- Current product release: PR #56 `Fix My Namdar Stripe return session restore stall`.
- PR #56 merge/main HEAD: `70af420aa17787ce22879b2a6cd4880cb9238113`.
- PR #56 CI passed; production deployment `dpl_CXTkbzJ4q29BfW7CmrLjCsGgA8rH` is READY on `https://namdar.co.uk`.
- Production `/api/health` after deploy returned database healthy and Stripe sandbox secret/webhook configured.
- Supabase: `namdar-production` (`qjigldxjcpnrlyxgmlqq`).
- Only `windows` is live; gutters/jetwash/roof/handyman/tour3d remain `planned`.
- Address work remains parked.
- Staff/Admin privileged API access requires AAL2/MFA.

## Notification cron status
PR #52 remains deployed with bounded transient Data API read retries and schedule `7 * * * *`. Keep `Namdar Cron Watch` active; upstream 504s may still recur transiently.

## Stripe provider state — SANDBOX CONNECTED, COMMERCIAL PAYMENTS OFF
Vercel Production contains Stripe test-mode secret + webhook signing secret so the real `namdar.co.uk` route can receive sandbox events. These are not live-money credentials.

Webhook destination:
`https://namdar.co.uk/api/stripe-webhook`

Selected events remain:
- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `refund.created`
- `refund.updated`
- `charge.refunded`

PR #54 remains the verified exact-raw-body fix. The earlier £1.23 sandbox payment and full refund proved verified-webhook authority, idempotent payment/refund writes and exact Stripe processor-cost capture.

## Normal signed-in My Namdar Checkout — FIRST DEPOSIT PASSED
A controlled £1.00 Window invoice was used to test the actual signed-in customer flow.

Temporary sandbox-only policy used during the test:
- `active:true`;
- `mode:'deposit_required'`;
- `deposit_percent:20`;
- `minimum_deposit:0.50`;
- `allow_full_payment:true`;
- headline allowance OFF.

Before activation, database checks showed zero eligible Window bookings/invoices on other customer accounts. The controlled account had two eligible Window invoices and the £1.00 fixture was chosen to keep charges minimal.

The customer clicked the real My Namdar `Pay £0.50 deposit` button. Production `/api/create-checkout` returned HTTP 200 and Stripe Checkout completed in test mode.

Verified result:
- POST `/api/stripe-webhook` -> HTTP 200 at 13:55:32 UTC;
- invoice £1.00 total, £0.50 paid, £0.50 outstanding, status `part_paid`;
- booking remained confirmed and `payment_status='deposit_paid'`;
- exactly one Stripe payment ledger row for £0.50, kind `deposit`;
- provider fee £0.22 GBP;
- provider net £0.28 GBP.

The verified webhook remains authoritative. The remaining £0.50 balance is the controlled fixture for completing normal-flow verification.

## PR #56 — LIVE bounded session-return failure handling
The first successful deposit exposed a browser-return bug. After Stripe redirected to `/account?tab=billing&payment=success&session_id=...`, My Namdar could stay indefinitely on `Opening My Namdar… Restoring your secure session.`.

PR #56 changed the account bootstrap so:
- `/account-auth-hotfix.js` loads before `/account-original.js`;
- `auth.getSession()` is bounded to 5 seconds;
- timeout timers are cleared when the real session call wins;
- Stripe success return can automatically reload at most once per Checkout session using a `sessionStorage` loop guard;
- an independent loading-shell guard falls back to sign-in/recovery guidance instead of spinning forever;
- deterministic regression tests cover load order, timeout and one-retry/no-loop behavior.

PR #56 therefore fixed the infinite spinner failure mode and is live.

## Post-PR #56 reproduction — underlying session restore still stalls
After PR #56 was deployed, a real `/account` refresh with several Namdar tabs open still reached the 5-second timeout and displayed the recovery message. This proves the guard is working but the underlying Supabase browser session restore can still stall.

At that point the temporary `site_settings.payments` row was deleted again. Customer payment policy is OFF while auth is fixed. The existing £0.50 Stripe deposit record and invoice state remain intact.

## Stronger root cause: floating/cached Supabase v2 browser bundle
`account.html` loads:
`https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2`

This is a floating major-version alias. A browser may continue serving an older cached v2 build. Older Supabase Auth v2 builds are known to hang `getSession()` when multiple tabs contend on `navigator.locks`.

The current exact Supabase JS tag `2.116.0` has lockless coordination as the default Auth path when no custom lock is supplied. Its `GoTrueClient` keeps `lock` null by default and coordinates refreshes without the legacy browser mutex.

Namdar does not intentionally pass a custom Auth lock. Pinning the browser runtime therefore removes the stale-lock implementation as a variable instead of trying to patch around it indefinitely.

## Current fix candidate
Branch:
`fix/account-supabase-lockless-pin-20260913`

Implementation:
- `account.js` version bumped to `6.4.23-supabase-lockless-1`;
- before any Namdar account client is created, `account.js` synchronously loads exact `@supabase/supabase-js@2.116.0` from jsDelivr;
- only after that exact bundle loads does `account-auth-hotfix.js` patch `createClient`, followed by `account-original.js`;
- PR #56's 5-second bounded-session guard remains as defense-in-depth;
- regression test now asserts the exact Supabase pin is present and is loaded before the auth guard.

`account.html` still contains the older floating `@2` script include. During this hotfix, the exact pinned bundle deliberately replaces the global before any Supabase client is instantiated, so the floating-loaded library does not create a client or own the account session. This avoids a large HTML rewrite during the incident. After production verification, the duplicate/floating HTML include can be cleaned up separately.

No database migration and no environment-variable change are required.

## Required verification sequence
1. CI must pass, including `scripts/account-auth-hotfix.test.mjs` and handoff checks.
2. Exact branch preview must be READY with clean build errors.
3. Merge/deploy only after those checks pass.
4. Verify production serves `account.js` containing `2.116.0` before the auth guard.
5. Before touching payments, test ordinary `/account` restore with several Namdar tabs open. It should either restore promptly or at least provide a real error rather than hang; repeat refreshes should not lose a valid session.
6. Only if account restore is stable, recheck database eligibility and ensure no other customer account is eligible for Window online payment.
7. Re-enable the same temporary sandbox policy only for the controlled test window.
8. Pay only the remaining £0.50 balance through normal Checkout.
9. Verify webhook 200, exactly one second Stripe payment row, invoice fully paid £1.00, booking `payment_status='paid'`, provider fee/net fields and no duplicate writes.
10. Verify Stripe return opens My Namdar without the previous restore failure.
11. Refund/clean the controlled sandbox fixture and return payment policy OFF.
12. Only after normal-flow verification is complete should the user choose the actual launch payment policy and later connect live Stripe deliberately.

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
