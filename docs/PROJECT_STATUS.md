# Namdar project status

Last updated: 2026-09-13 UTC

## Production baseline
- Repo: `pchroonic/pchroonic`, default `main`.
- Current product release: PR #57 `Pin lockless Supabase runtime for My Namdar auth`.
- Main HEAD: `52979eab757db23bed21416c9ec5a520b57c72c2`.
- CI run `34762049828`: SUCCESS.
- Production deployment `dpl_AFyzoBkodBAZD5qqLjx2z73yHTvg`: READY on `https://namdar.co.uk`.
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
- PR #50 processor-cost accounting + no-surcharge headline-pricing option;
- PR #52 bounded transient PostgREST/Data API recovery for notification cron + schedule moved to minute 7;
- PR #54 Vercel-compatible exact raw-body handling for verified Stripe webhooks;
- PR #56 bounded My Namdar session-restore/Stripe-return failure handling;
- PR #57 exact Supabase JS 2.116.0 account runtime to avoid stale multi-tab auth locking.

## Notification 504 resilience — LIVE / MONITORED
PR #52 remains deployed. `Namdar Cron Watch` remains active because upstream 504s may still recur transiently.

## My Namdar browser session restoration — VERIFIED
PR #56 stopped the endless `Restoring your secure session` failure mode but a real multi-tab refresh still reached the 5-second fail-safe.

PR #57 pins exact Supabase JS `2.116.0` before the account auth guard and before any account client is created. Current Supabase Auth uses lockless coordination by default when no custom lock is supplied.

Production validation passed with several Namdar tabs open: hard-refreshing My Namdar Billing restored the signed-in portal normally rather than timing out.

The old floating `@supabase/supabase-js@2` include remains in `account.html`, but exact `2.116.0` replaces the global before client creation. Removing the duplicate include is optional cleanup.

## Stripe sandbox — CONNECTED, COMMERCIAL CUSTOMER POLICY OFF
Stripe test credentials and webhook signing secret remain server-side in Vercel Production for sandbox verification only. They are not live-money credentials.

Current safety state:
- zero `site_settings.payments` rows;
- online customer payment policy OFF;
- headline allowance OFF;
- no live-money credentials connected.

## Normal signed-in Checkout verification — FULL PASS
A temporary sandbox-only Window policy was enabled in controlled windows using a dedicated £1.00 invoice:
- deposit required;
- 20% deposit;
- £0.50 minimum;
- pay in full allowed;
- headline allowance OFF.

Before each activation, checks confirmed zero eligible Window bookings on other customer accounts.

### Deposit leg
- `/api/create-checkout` HTTP 200;
- Stripe test Checkout completed;
- `/api/stripe-webhook` HTTP 200;
- invoice became £0.50 paid / £0.50 outstanding / `part_paid`;
- booking `payment_status='deposit_paid'`;
- one £0.50 Stripe deposit row;
- sandbox fee £0.22 / net £0.28.

### Balance leg
After PR #57 fixed session restoration:
- remaining £0.50 paid through normal My Namdar Checkout;
- `/api/create-checkout` HTTP 200 at 14:18:00 UTC;
- `/api/stripe-webhook` HTTP 200 at 14:18:19 UTC;
- invoice became £1.00 paid / £0.00 outstanding / `paid`;
- booking `payment_status='paid'`;
- exactly two payment rows total;
- second fee £0.22 / net £0.28;
- Stripe return reopened signed-in Billing successfully with multiple Namdar tabs still open.

This validates authenticated Checkout, deposit/balance progression, authoritative webhook state, idempotent ledger writes, processor-cost capture and the corrected browser-return/session path.

## Refund verification / controlled cleanup — FULL PASS
Both £0.50 sandbox charges were fully refunded after verification.

Result:
- both Stripe refunds succeeded;
- refund webhook deliveries returned HTTP 200;
- exactly two refund ledger rows were created, with no duplicate refund writes;
- invoice synchronized to `refunded` with £0.00 amount paid;
- booking synchronized to `payment_status='refunded'`;
- each sandbox refund recorded fee £0.00 / net -£0.50;
- temporary payments policy deleted again.

Payment/refund ledger rows are intentionally retained as the audit trail for the controlled sandbox verification.

## Immediate next work
1. choose the actual Window commercial payment policy: optional, deposit required, or full required;
2. if deposit is chosen, decide deposit percentage/minimum and whether pay-in-full remains available;
3. remain in Stripe sandbox until that policy is approved;
4. only then connect live Stripe credentials + live webhook signing secret and run a live-readiness checklist;
5. decide whether headline-price allowance should remain permanently OFF or be enabled;
6. continue Window real-job evidence/pricing calibration;
7. complete Google review URL, privileged password/CAPTCHA/MFA interactive checks, SMS/legal and remaining launch checks;
8. optionally remove the duplicate floating Supabase include from `account.html`;
9. address-data pilot remains parked.

## Other technical debt / observations
- A Node/Vercel `url.parse()` deprecation warning appears on some API requests. It did not affect the successful payment/session verification and can be addressed separately.

## Handoff rule
Every substantial product/provider/data change updates `docs/AI_START.md`, `docs/AI_HANDOFF.md`, and this file. Never store credentials, raw API keys, customer secrets, TOTP codes or one-time Auth links.
