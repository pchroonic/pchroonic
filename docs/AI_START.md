# Namdar AI fast resume

Last verified: 2026-09-13 UTC

Read this first. Use `docs/AI_HANDOFF.md` for implementation detail and `docs/PROJECT_STATUS.md` for roadmap/status.

## Production baseline
- Repository: `pchroonic/pchroonic`, default `main`.
- Latest merged product release: PR #52, `Harden notification cron against transient PostgREST 504s`.
- PR #52 merge: `2efca178f49221d3ca819b3c4df9d1780d759579`.
- Current production deployment after Stripe sandbox env redeploy: `dpl_DiD8jChsRaA64fRBdovzr3euKHj8`, READY on `https://namdar.co.uk`.
- Supabase: `namdar-production` (`qjigldxjcpnrlyxgmlqq`).
- Window Cleaning is the only live/quotable/bookable service. Gutters, jet washing, roof cleaning, handyman and 3D tours remain `planned`.
- Address-data work remains parked.
- Privileged Staff/Admin requires AAL2/MFA.

## Notification cron
PR #52 remains live with bounded transient Data API read retries and schedule `7 * * * *`.

A real post-release scheduled run at 2026-09-13 12:07 UTC completed non-degraded, so the Stripe setup gate was cleared. Keep `Namdar Cron Watch` active because the upstream 504 issue is still treated as potentially transient rather than permanently eliminated.

## Stripe sandbox provider — CONNECTED, CUSTOMER PAYMENTS STILL DISABLED
Current production `/api/health` after adding sandbox secrets and redeploy:
- `stripe:true`
- `stripeSecret:true`
- `stripeWebhook:true`

Stripe context is sandbox/test mode only. The webhook destination `https://namdar.co.uk/api/stripe-webhook` is enabled for checkout success and refund events.

Still safe/inactive commercially:
- no `site_settings.payments` row;
- customer online payments are not enabled;
- headline-price allowance remains OFF;
- Window remains the only live service.

## Sandbox payment test exposed a webhook bug
A one-time £1.23 Stripe sandbox Payment Link completed successfully in Stripe. The Checkout Session is paid/complete, but Namdar did not record the payment.

Production Vercel logs showed two webhook POSTs returning HTTP 400 with:
`Webhook raw body is unavailable.`

Root cause: `lib/stripe-payments.js::readRawBody()` accessed Vercel's lazy `request.body` getter before streaming the IncomingMessage. Vercel parsed the JSON at that point, so the exact raw bytes required for Stripe signature verification were no longer available.

## PR #54 — Stripe webhook raw-body fix CANDIDATE
Branch: `fix/stripe-webhook-raw-body-20260913`
PR: #54 `Fix Stripe webhook raw body handling on Vercel`
Current exact head: `fcd149882d604e5b3865246e22fc5324c258e634`
Exact-head Vercel preview: `dpl_76VaZhk28MRTWKiJYm7BLVVGFi5X`, READY, clean errors-only build.

Fix:
- stream the raw request first without touching `req.body`;
- only use body fallback for non-stream adapters;
- regression test throws if a Vercel-style lazy body getter is accessed before streaming.

The first CI run `34759643914` failed only because continuity docs were not yet updated; JavaScript syntax/tests passed before the handoff gate. Re-run CI after these three docs updates.

## Temporary sandbox test records
Prepared only for webhook verification, no real customer/service:
- quote `b1057c1c-d417-43aa-9fe9-3483ba31126d`
- booking `4eb3100f-d05a-4f5c-977b-b569f25c3cb2`
- invoice `805706a9-d9ff-4ed1-9cc6-8721a2454eb6`
- amount £1.23

They currently remain unpaid in Namdar because the webhook failed before verification. Remove them after payment + refund verification is complete.

## Do not break
- Window Cleaning only; no Stage 2 activation without deliberate decision.
- No separate consumer card/Stripe surcharge.
- Verified Stripe webhook, not browser redirect, is authoritative for Stripe money.
- Never expose Stripe/Supabase/SMTP/Turnstile/cron secrets.
- Customer payments stay disabled until sandbox payment, duplicate/delayed webhook, fee capture and refund tests all pass.
- Staff cannot manually impersonate Stripe payment rows.
- Direct contribution is not net profit; unresolved processor cost is not £0.
- Privileged access remains AAL2/MFA protected.
- Review requests remain neutral/equal; no positive-only gating or incentives.
- Address work stays parked.
