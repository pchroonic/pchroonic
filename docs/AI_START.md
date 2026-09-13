# Namdar AI fast resume

Last verified: 2026-09-13 UTC

Read this first. Use `docs/AI_HANDOFF.md` for implementation detail and `docs/PROJECT_STATUS.md` for roadmap/status.

## Production baseline
- Repository: `pchroonic/pchroonic`, default `main`.
- Latest product release: PR #54 `Fix Stripe webhook raw body handling on Vercel`.
- Exact tested head: `d9a7d2cdded5905e032b53a38b725e30f50be531`.
- GitHub Actions `34759777343`: SUCCESS.
- Exact-head preview `dpl_F38E2rKUyZsnG2afqhsdsMEo1eNx`: READY, clean errors-only build.
- Merge: `3dfdd4cb7cbf244dc450631c23273792b3b82853`.
- Production: `dpl_9maand6wJHASgET55huV2EtauFjp`, READY on `https://namdar.co.uk`, clean errors-only build.
- Supabase: `namdar-production` (`qjigldxjcpnrlyxgmlqq`).
- Window Cleaning is the only live/quotable/bookable service. Gutters, jet washing, roof cleaning, handyman and 3D tours remain `planned`.
- Address-data work remains parked.
- Privileged Staff/Admin requires AAL2/MFA.

## Notification cron
PR #52 remains live with bounded transient Data API read retries and schedule `7 * * * *`.

A real post-release scheduled run at 2026-09-13 12:07 UTC completed non-degraded, clearing the Stripe setup gate. Keep `Namdar Cron Watch` active because upstream 504s may still recur transiently.

## Stripe sandbox — CONNECTED AND END-TO-END VERIFIED
Production `/api/health` currently reports:
- `stripe:true`
- `stripeSecret:true`
- `stripeWebhook:true`

These are Stripe **sandbox/test-mode** credentials stored server-side in Vercel Production env so `namdar.co.uk` can be tested safely. They are not live-money credentials.

Webhook destination: `https://namdar.co.uk/api/stripe-webhook`.

Commercial safety remains:
- no `site_settings.payments` row;
- customer online payment policy is OFF;
- headline-price allowance is OFF;
- no real customer payment path is deliberately enabled.

## PR #54 webhook raw-body fix — LIVE
The first £1.23 sandbox payment initially exposed a production bug: Vercel's lazy `request.body` getter was touched before reading the request stream, so the exact signed Stripe payload was lost and webhook requests returned HTTP 400 `Webhook raw body is unavailable.`

PR #54 fixes `readRawBody()` so stream-capable requests are consumed directly without touching `req.body`, preserving the exact bytes required for Stripe signature verification. A regression test fails if a Vercel-style lazy body getter is accessed first.

After deployment, Stripe automatically retried the previously failed event. Production webhook returned HTTP 200 at 13:30:39 UTC and Namdar recorded exactly one Stripe payment ledger row.

Verified payment result before cleanup:
- amount £1.23;
- invoice paid and booking `payment_status='paid'`;
- one Stripe ledger payment only;
- actual Stripe sandbox processor cost captured: £0.24 fee / £0.99 net;
- browser success remained non-authoritative; the verified webhook performed the money write.

A full £1.23 sandbox refund was then issued. Refund-related webhooks returned HTTP 200 at 13:32:23 UTC. Namdar created exactly one refund ledger row and synchronized invoice/booking to refunded. Multiple Stripe refund-related events did not duplicate the refund row.

The one-time sandbox Payment Link is disabled. Temporary test quote/booking/invoice/payment rows were deleted after verification. Current DB safety check: zero Stripe payment rows and zero `site_settings.payments` rows.

## Next action
1. choose the desired Window customer payment policy (optional payment vs required deposit vs full payment; deposit percentage/minimum if applicable);
2. keep this in sandbox while testing the real Namdar customer Checkout route under that policy;
3. only after that is satisfactory, connect/verify the Stripe live account and replace sandbox provider credentials with live credentials/webhook secret;
4. deliberately enable the payment policy only when ready for real customers;
5. separately decide whether to enable the headline price allowance.

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
