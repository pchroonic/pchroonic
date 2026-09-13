# Namdar AI fast resume

Last verified: 2026-09-13 UTC

Read this first. Use `docs/AI_HANDOFF.md` for implementation detail and `docs/PROJECT_STATUS.md` for roadmap/status.

## Production baseline
- Repository: `pchroonic/pchroonic`, default `main`.
- Current product release: PR #57 `Pin lockless Supabase runtime for My Namdar auth`.
- PR #57 merge/main HEAD: `52979eab757db23bed21416c9ec5a520b57c72c2`.
- PR #57 CI run `34762049828`: SUCCESS.
- Production deployment: `dpl_AFyzoBkodBAZD5qqLjx2z73yHTvg`, READY on `https://namdar.co.uk`.
- Production `/api/health` after deployment: database healthy; Stripe sandbox secret + webhook configured.
- Supabase production: `namdar-production` (`qjigldxjcpnrlyxgmlqq`).
- Window Cleaning is the only live/quotable/bookable service. Gutters, jet washing, roof cleaning, handyman and 3D tours remain `planned`.
- Address-data work remains parked.
- Privileged Staff/Admin requires AAL2/MFA.

## My Namdar auth/session — VERIFIED
PR #56 first fixed the failure mode by loading the auth guard before portal bootstrap, bounding `auth.getSession()` to 5 seconds and preventing an endless Stripe-return spinner.

A real multi-tab browser test after PR #56 still reached the timeout, proving the underlying session restore was still stalling.

PR #57 then pinned exact `@supabase/supabase-js@2.116.0` in `account.js` before the auth guard and before any Namdar Supabase client is created. The current Supabase Auth path is lockless by default when no custom lock is supplied, avoiding the older multi-tab `navigator.locks` contention path.

Production verification passed with several Namdar tabs still open: hard-refreshing `/account?tab=billing` restored the signed-in My Namdar portal normally instead of dropping to the timeout/recovery state.

`account.html` still contains the older floating `@supabase/supabase-js@2` include. It is superseded by the exact `2.116.0` bundle in `account.js` before client creation. Removing the duplicate include is optional cleanup, not a blocker.

## Stripe sandbox provider — CONNECTED, CUSTOMER POLICY OFF
Production contains Stripe **test-mode** secret + webhook signing secret only. These are sandbox credentials, not live-money credentials.

Webhook destination: `https://namdar.co.uk/api/stripe-webhook`.

PR #54 remains the verified exact-raw-body webhook fix. The verified webhook, not browser redirect, is authoritative for Stripe money state.

Current commercial safety state:
- zero `site_settings` rows where `key='payments'`;
- customer online payment policy OFF;
- headline-price allowance OFF;
- no live-money Stripe credentials connected.

## Normal signed-in My Namdar Checkout — FULL E2E PASSED
A controlled £1.00 Window invoice was used through the real signed-in customer route.

Temporary sandbox-only policy during testing:
- `active:true`;
- `mode:'deposit_required'`;
- `deposit_percent:20`;
- `minimum_deposit:0.50`;
- `allow_full_payment:true`;
- headline allowance OFF.

Before each temporary activation, database checks showed zero eligible Window bookings on other customer accounts.

### Deposit leg
Customer clicked the real My Namdar `Pay £0.50 deposit` button.
- `/api/create-checkout` -> HTTP 200;
- Stripe Checkout completed in test mode;
- `/api/stripe-webhook` -> HTTP 200;
- invoice became £0.50 paid / £0.50 outstanding / `part_paid`;
- booking `payment_status='deposit_paid'`;
- exactly one Stripe deposit ledger row for £0.50;
- sandbox processor fee £0.22 / net £0.28.

### Balance leg
After PR #57 fixed session restoration, customer paid the remaining £0.50 balance through the real My Namdar flow.
- `/api/create-checkout` -> HTTP 200 at 14:18:00 UTC;
- `/api/stripe-webhook` -> HTTP 200 at 14:18:19 UTC;
- invoice became £1.00 paid / £0.00 outstanding / `paid`;
- booking `payment_status='paid'`;
- exactly two Stripe payment rows total: £0.50 deposit + £0.50 balance;
- second sandbox processor fee £0.22 / net £0.28;
- browser returned directly to signed-in My Namdar Billing with multiple Namdar tabs still open.

This proves the normal authenticated Checkout route, verified webhook writes, deposit-to-balance progression, processor-cost capture and corrected browser return work together.

## Refund verification / cleanup — PASSED
Both £0.50 sandbox PaymentIntents were fully refunded after the test.

Verified result:
- both Stripe refunds succeeded;
- refund webhooks returned HTTP 200;
- exactly two refund ledger rows were created, one per £0.50 payment, with no duplicate refund writes;
- each sandbox refund recorded provider fee £0.00 / provider net -£0.50;
- invoice now `refunded`, amount_paid £0.00;
- booking `payment_status='refunded'`;
- temporary `site_settings.payments` row deleted again; payment policy OFF.

The payment/refund ledger is intentionally retained as an audit record of the controlled sandbox E2E verification. Do not manually rewrite Stripe history.

## Next action
1. choose the actual Window launch payment policy: optional payment, required deposit, or full payment required;
2. if deposit is chosen, decide deposit percentage/minimum and whether pay-in-full remains available;
3. keep sandbox credentials until the launch policy is deliberately approved;
4. only then connect Stripe live credentials + live webhook signing secret;
5. re-verify health and a deliberately controlled live-readiness checklist before enabling customer payments;
6. separately decide whether the no-surcharge headline-price allowance should ever be enabled;
7. continue remaining launch work: Google review URL, privileged password/CAPTCHA/MFA interactive checks, SMS/legal checks and Window real-job pricing evidence.

## Do not break
- Window Cleaning only; no Stage 2 activation without deliberate decision.
- No separate consumer card/Stripe surcharge.
- Verified Stripe webhook is authoritative for Stripe money; browser success is never payment proof.
- Never expose Stripe/Supabase/SMTP/Turnstile/cron secrets.
- Sandbox-ready does not mean live-money-ready.
- Staff cannot manually impersonate Stripe payment rows.
- Missing processor cost is not £0; direct contribution is not net profit.
- Privileged access remains AAL2/MFA protected.
- Review requests remain neutral/equal; no positive-only gating or incentives.
- Address work stays parked.
