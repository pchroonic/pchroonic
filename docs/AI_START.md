# Namdar AI fast resume

Last verified: 2026-09-13 UTC

Read this first. Use `docs/AI_HANDOFF.md` for implementation detail and `docs/PROJECT_STATUS.md` for roadmap/status.

## Production baseline
- Repository: `pchroonic/pchroonic`, default `main`.
- Current production product release: PR #56 `Fix My Namdar Stripe return session restore stall`.
- PR #56 merge/main HEAD: `70af420aa17787ce22879b2a6cd4880cb9238113`.
- PR #56 CI passed; production deployment `dpl_CXTkbzJ4q29BfW7CmrLjCsGgA8rH` is READY on `https://namdar.co.uk`; `/api/health` returned healthy database + Stripe sandbox configuration.
- Supabase production: `namdar-production` (`qjigldxjcpnrlyxgmlqq`).
- Window Cleaning is the only live/quotable/bookable service. Gutters, jet washing, roof cleaning, handyman and 3D tours remain `planned`.
- Address-data work remains parked.
- Privileged Staff/Admin requires AAL2/MFA.

## Notification cron
PR #52 remains live with bounded transient Data API read retries and schedule `7 * * * *`. Keep `Namdar Cron Watch` active because upstream 504s may still recur transiently.

## Stripe sandbox provider — CONNECTED, CUSTOMER POLICY OFF
Production has Stripe test-mode secret + webhook signing secret only. These are sandbox credentials, not live-money credentials.

Webhook destination: `https://namdar.co.uk/api/stripe-webhook`.

PR #54 remains the verified raw-body webhook fix. The earlier £1.23 sandbox payment + refund proved verified-webhook authority, refund idempotency and processor-cost capture.

## Normal My Namdar Checkout verification — FIRST DEPOSIT PASSED
A controlled £1.00 Window invoice was used through the real signed-in My Namdar route. A £0.50 sandbox deposit completed successfully:
- `/api/create-checkout` HTTP 200;
- `/api/stripe-webhook` HTTP 200;
- invoice £1.00 total / £0.50 paid / £0.50 outstanding / `part_paid`;
- booking `payment_status='deposit_paid'`;
- one Stripe deposit ledger row for £0.50;
- sandbox processor fee £0.22 / net £0.28.

The remaining £0.50 balance is intentionally left as the controlled fixture for the return-flow test.

## My Namdar session restore — PR #56 IMPROVED FAILURE MODE, ROOT ISSUE STILL PRESENT
PR #56 fixed the endless spinner failure mode:
- auth guard loads before `account-original.js`;
- `getSession()` is bounded to 5 seconds;
- Stripe returns can retry once only;
- the UI falls back to sign-in/recovery guidance instead of spinning forever.

After PR #56 went live, a real `/account` refresh with several Namdar tabs still hit the 5-second timeout and showed:
`Your secure session is taking longer than expected...`

So PR #56 correctly prevents an infinite hang, but the underlying Supabase session restore can still stall.

## Stronger root-cause finding / current fix candidate
`account.html` currently loads the floating CDN alias `@supabase/supabase-js@2` before `account.js`. A browser can therefore keep using an older cached v2 Auth build. Older Supabase browser Auth builds are known to hang `getSession()` under multi-tab `navigator.locks` contention. Current Supabase JS `2.116.0` uses lockless coordination by default unless a custom lock is supplied.

Current branch: `fix/account-supabase-lockless-pin-20260913`.

Candidate changes:
- `account.js` version `6.4.23-supabase-lockless-1`;
- synchronously load exact `@supabase/supabase-js@2.116.0` before the Namdar auth guard and before any Supabase client is created;
- keep PR #56's 5-second fail-safe as defense-in-depth;
- regression test asserts the exact Supabase pin loads before the auth guard.

The existing floating script in `account.html` is not used to create a client before the exact pinned build replaces the global. This intentionally avoids a large HTML rewrite in the hotfix; it can be cleaned up later after production verification.

## Commercial safety during auth fix
The temporary `site_settings.payments` row was deleted again after the second reproduction. Customer online payment policy is OFF. The successful £0.50 fixture remains recorded and must not be charged again or deleted while the auth fix is being verified.

## Next action
1. run CI and exact preview checks for the Supabase pin;
2. merge/deploy only if green;
3. first verify ordinary `/account` session restoration with multiple Namdar tabs, without enabling payments;
4. if session restoration is stable, recheck payment eligibility and temporarily enable the same sandbox-only policy;
5. pay only the remaining £0.50 balance and verify webhook/ledger/invoice/booking state plus the browser return;
6. refund/clean the controlled sandbox fixture and return payment policy OFF;
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
