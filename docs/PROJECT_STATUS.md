# Namdar project status

Last updated: 2026-09-13 UTC

## Production baseline
- Repo: `pchroonic/pchroonic`, default `main`.
- Latest merged product release: PR #52 `Harden notification cron against transient PostgREST 504s`.
- Merge `2efca178f49221d3ca819b3c4df9d1780d759579`.
- Current production deployment after Stripe sandbox env redeploy: `dpl_DiD8jChsRaA64fRBdovzr3euKHj8` READY on `https://namdar.co.uk`.
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
- PR #52 bounded transient PostgREST/Data API recovery for notification cron + schedule moved to minute 7.

## Notification 504 resilience — LIVE / MONITORED
PR #52 remains deployed. A real scheduled run at 2026-09-13 12:07 UTC completed non-degraded, so the Stripe setup gate was cleared. `Namdar Cron Watch` stays active because the upstream 504 source may still recur transiently.

## Stripe sandbox — CONNECTED, CUSTOMER PAYMENTS OFF
Stripe test credentials and webhook signing secret are present in Vercel Production env solely for sandbox verification.

Current live health:
- `stripe:true`
- `stripeSecret:true`
- `stripeWebhook:true`

Still inactive commercially:
- no `site_settings.payments` row;
- Window online payment policy not enabled;
- headline-price allowance OFF;
- no real customer payment path deliberately activated.

## Sandbox payment verification — BLOCKED ON RAW BODY BUG
A £1.23 one-time Stripe sandbox payment completed successfully in Stripe using a temporary Namdar test quote/booking/invoice.

Stripe state:
- Checkout Session paid/complete;
- GBP 123 pence;
- sandbox only.

Namdar state immediately after payment:
- booking still unpaid;
- invoice still issued with amount_paid 0;
- no Stripe payment ledger row.

Production logs showed webhook POST 400 with `Webhook raw body is unavailable.`

Root cause: `readRawBody()` touched Vercel's lazy `request.body` getter before streaming, causing JSON parsing before Stripe signature verification.

## PR #54 — RAW BODY FIX IN REVIEW
Branch `fix/stripe-webhook-raw-body-20260913`.
PR #54 `Fix Stripe webhook raw body handling on Vercel`.

Code head before continuity commits: `fcd149882d604e5b3865246e22fc5324c258e634`.
Preview `dpl_76VaZhk28MRTWKiJYm7BLVVGFi5X` READY with clean errors-only build.

Fix behavior:
- stream the Vercel request first;
- do not access lazy `req.body` on stream-capable requests;
- preserve exact signed bytes;
- retain bounded body-size protection;
- regression test ensures body getter is never touched before streaming.

Initial CI `34759643914` passed syntax/tests but failed the handoff requirement because continuity docs were not yet updated. These docs now satisfy that gate; require the new exact-head CI/preview before merge.

## Temporary sandbox data
Remove after payment + refund verification:
- quote `b1057c1c-d417-43aa-9fe9-3483ba31126d`
- booking `4eb3100f-d05a-4f5c-977b-b569f25c3cb2`
- invoice `805706a9-d9ff-4ed1-9cc6-8721a2454eb6`

## Immediate next work
1. get PR #54 exact-head CI green and preview READY;
2. merge/deploy;
3. confirm Stripe retry/fresh sandbox event reaches webhook with HTTP 200;
4. confirm exactly one payment ledger row, paid invoice/booking and captured processor fee;
5. verify duplicate delivery is idempotent;
6. perform sandbox refund and verify refund ledger/state sync;
7. delete temporary sandbox test records;
8. only then decide whether to enable Window online payments;
9. separately decide whether to enable headline price allowance.

## Handoff rule
Every substantial product/provider/data change updates `docs/AI_START.md`, `docs/AI_HANDOFF.md`, and this file. Never store credentials, raw API keys, customer secrets, TOTP codes or one-time Auth links.
