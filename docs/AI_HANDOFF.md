# Namdar AI handoff

Last verified: 2026-09-13 UTC

Read `docs/AI_START.md` first.

## Production source of truth
- Repo: `pchroonic/pchroonic`, default `main`.
- Current product release: PR #57 `Pin lockless Supabase runtime for My Namdar auth`.
- Merge/main HEAD: `52979eab757db23bed21416c9ec5a520b57c72c2`.
- CI run `34762049828`: SUCCESS.
- Production deployment `dpl_AFyzoBkodBAZD5qqLjx2z73yHTvg`: READY on `https://namdar.co.uk`.
- Production `/api/health`: database healthy, Stripe sandbox secret + webhook configured.
- Supabase production: `namdar-production` (`qjigldxjcpnrlyxgmlqq`).
- Only `windows` is live; gutters/jetwash/roof/handyman/tour3d remain `planned`.
- Address work remains parked.
- Staff/Admin privileged API access requires AAL2/MFA.

## Notification cron
PR #52 remains deployed with bounded transient Data API retries and schedule `7 * * * *`. Keep `Namdar Cron Watch` active; upstream 504s may still recur transiently.

## Stripe provider state — SANDBOX CONNECTED, COMMERCIAL PAYMENTS OFF
Vercel Production has Stripe test-mode secret + webhook signing secret so the real `namdar.co.uk` webhook path can be tested safely. These are not live-money credentials.

Webhook destination:
`https://namdar.co.uk/api/stripe-webhook`

Selected events remain:
- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `refund.created`
- `refund.updated`
- `charge.refunded`

PR #54 remains the verified raw-body fix. For Stripe money, verified webhook processing is authoritative; browser return is informational only.

Current commercial safety:
- zero `site_settings` rows where `key='payments'`;
- customer online-payment policy OFF;
- headline allowance OFF;
- no live Stripe credentials;
- no real customer money was charged during verification.

## My Namdar session restore — RESOLVED / VERIFIED
The first real signed-in Stripe deposit exposed a browser return hang on `Opening My Namdar… Restoring your secure session.`.

PR #56 fixed the failure mode:
- loads `/account-auth-hotfix.js` before `/account-original.js`;
- bounds `auth.getSession()` to 5 seconds;
- clears timeout timers when the real session wins;
- permits at most one Stripe-return reload per Checkout session with `sessionStorage` guard;
- replaces endless spinner with recovery guidance;
- adds deterministic regression tests.

After PR #56 went live, a real multi-tab `/account` refresh still reached the timeout. This proved the underlying Supabase session restore was still stalling.

PR #57 addressed the underlying browser-runtime variable:
- `account.js` version `6.4.23-supabase-lockless-1`;
- synchronously loads exact `@supabase/supabase-js@2.116.0` before the auth guard and before any account client is created;
- current Supabase Auth defaults to lockless coordination when no custom lock is supplied;
- retains PR #56 bounded timeout as defense-in-depth;
- regression tests assert exact runtime pin and load order.

Production multi-tab verification passed: with several Namdar tabs open, hard-refreshing `/account?tab=billing` restored the signed-in My Namdar portal normally.

`account.html` still has the older floating `@supabase/supabase-js@2` include. It is overwritten by exact `2.116.0` before client creation. Removing the duplicate include is optional cleanup and should not be treated as an auth blocker.

## Normal signed-in My Namdar Checkout — FULL E2E PASSED
A controlled £1.00 Window invoice was used with the real authenticated My Namdar flow.

Temporary sandbox policy used only during controlled test windows:
- `active:true`;
- `mode:'deposit_required'`;
- `deposit_percent:20`;
- `minimum_deposit:0.50`;
- `allow_full_payment:true`;
- headline allowance OFF.

Before activation, database checks showed no eligible Window bookings on any other customer account.

### Deposit
Customer clicked the real `Pay £0.50 deposit` button.
- `/api/create-checkout` 200;
- Stripe test Checkout completed;
- `/api/stripe-webhook` 200;
- invoice £0.50 paid / £0.50 outstanding / `part_paid`;
- booking `payment_status='deposit_paid'`;
- one £0.50 Stripe deposit record;
- provider fee £0.22 GBP;
- provider net £0.28 GBP.

### Balance
After PR #57 production verification, the same controlled invoice was used for the remaining £0.50.
- `/api/create-checkout` 200 at 14:18:00 UTC;
- `/api/stripe-webhook` 200 at 14:18:19 UTC;
- invoice £1.00 paid / £0.00 outstanding / `paid`;
- booking `payment_status='paid'`;
- exactly two payment ledger rows total: £0.50 deposit + £0.50 balance;
- second fee £0.22 GBP;
- second net £0.28 GBP;
- browser returned to signed-in Billing correctly while other Namdar tabs remained open.

No duplicate payment rows were created.

## Refund verification / cleanup — PASSED
Both £0.50 sandbox PaymentIntents were fully refunded after the flow completed.

Verified result:
- both Stripe refunds returned `status='succeeded'`;
- refund webhook deliveries returned HTTP 200;
- exactly two refund ledger rows were created, one per original payment;
- no duplicate refund records;
- each refund provider fee £0.00 / provider net -£0.50;
- invoice synchronized to `status='refunded'`, `amount_paid=0.00`, `paid_at=null`;
- booking synchronized to `payment_status='refunded'`;
- temporary `site_settings.payments` row deleted after the test.

The sandbox ledger is intentionally kept as the audit record of this verification. Do not manually create/delete Stripe payment rows to make the UI look clean; processor history must remain traceable.

## Current code/runtime notes
- PR #54: exact raw Stripe webhook body on Vercel.
- PR #56: bounded My Namdar auth restore / no endless spinner.
- PR #57: exact Supabase JS 2.116.0 before account client creation.
- One Node/Vercel `url.parse()` deprecation warning is still visible on some API requests; it did not affect this verification and can be handled separately.

## Next sequence
1. decide the actual Window launch policy: optional, deposit required, or full required;
2. if deposit required, decide percentage/minimum and whether pay-in-full is allowed;
3. keep Stripe in sandbox until the commercial policy is deliberately approved;
4. connect the Stripe live account and live webhook signing secret only after that decision;
5. perform a live-readiness checklist before enabling real customer payments;
6. separately decide whether the same-price headline allowance should remain permanently OFF or be enabled;
7. continue other launch checks: Google review URL, privileged password/CAPTCHA/MFA interactive verification, SMS/legal checks and real-job Window pricing evidence;
8. address-data work stays parked unless deliberately resumed.

## Non-negotiables
- Window Cleaning only.
- No separate customer card/Stripe surcharge.
- Verified Stripe webhook is authoritative for Stripe money; browser success is never payment proof.
- No blind replay of non-idempotent writes.
- No secrets in source, logs, docs or chat.
- Sandbox-ready does not mean live-money-ready.
- Missing Stripe processor cost is not £0; direct contribution is not net profit.
- Staff cannot manually impersonate Stripe payments.
- Privileged changes remain AAL2/MFA protected.
- Review solicitation stays neutral/equal.
- Address work remains parked.
