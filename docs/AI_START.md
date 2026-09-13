# Namdar AI fast resume

Last verified: 2026-09-13 UTC

Read this first. Use `docs/AI_HANDOFF.md` for implementation detail and `docs/PROJECT_STATUS.md` for roadmap/status.

## Production baseline
- Repository: `pchroonic/pchroonic`, default `main`.
- Latest product release: PR #52, `Harden notification cron against transient PostgREST 504s`.
- Exact tested PR #52 head: `0cc73a93772d99f38eedc5287b7901fb14853185`.
- GitHub Actions `34753702507`: SUCCESS.
- Exact-head Vercel preview: `dpl_HPyvguMrtVaXT8Aw8BnrnFNU9g6J`, READY, clean errors-only build.
- Merge: `2efca178f49221d3ca819b3c4df9d1780d759579`.
- Production: `dpl_HSbQuHWcKxVQLPHJKZFb9RDctkVm`, READY on `https://namdar.co.uk`, canonical alias present, no alias error, clean errors-only build.
- Supabase: `namdar-production` (`qjigldxjcpnrlyxgmlqq`).
- Window Cleaning is the only live/quotable/bookable service. Gutters, jet washing, roof cleaning, handyman and 3D tours remain `planned`.
- Address-data work remains parked.
- Privileged Staff/Admin requires AAL2/MFA.

## Window Stage 1 — LIVE
Window quote/pricing, route-aware booking, Staff On my way → Start → Complete, reviewed direct-cost/travel close-out, consent-aware conversion funnel, direct-contribution reporting, neutral post-job feedback/reviews, Stripe payment foundation and processor-fee accounting remain live.

**Direct contribution is not net profit.** Missing reviewed job cost or unresolved Stripe processor cost is not £0.

## Notification 504 recovery — CODE LIVE, OBSERVATION GATE OPEN
Before PR #52, authenticated production cron runs degraded repeatedly with unrelated Supabase Data API 504s across `post_job`, `booking_delivery`, `admin_contact`, quote reminders, overdue invoices, unassigned bookings, booking attention and business delivery. The issue was still present at 11:00 UTC on the then-current production deployment.

Database diagnosis showed tiny data volume, no notification backlog and millisecond SQL execution. This did not fit a slow-query problem; it fit transient PostgREST/Data API pool acquisition failures.

PR #52 now provides:
- bounded transient retries for idempotent cron GET/HEAD/OPTIONS database reads;
- no generic automatic replay of POST/PATCH/PUT/DELETE;
- bounded retry for thrown transient top-level post-job / booking-delivery / business-delivery reads;
- resilient business-scan reads while retaining existing idempotent conflict-ignore queue writes;
- retry/recovery telemetry in the cron JSON;
- Vercel schedule moved from `0 * * * *` to `7 * * * *`.

Production source confirms `/api/booking-notifications` now runs at minute 7 each hour. Release smoke is clean: `/api/health` 200; database/email/reminders/follow-ups healthy; no due pending notification backlog; no Stripe activation; Window remains the only live service.

**Do not call the underlying 504 issue permanently resolved yet.** The next proof gate is a real authenticated scheduled run on the released PR #52 production deployment. A clean run means the release is operationally healthy; a recovered retry means containment worked but upstream instability still occurred. Keep `Namdar Cron Watch` active.

## Stripe — CODE READY, PROVIDER DISABLED
Stripe remains deliberately disconnected while the cron observation gate is open.

Current production state:
- `/api/health`: `stripe:false`, `stripeSecret:false`, `stripeWebhook:false`;
- zero `payment_records` with `method='stripe'`;
- no `site_settings.payments` row.

Verified Stripe webhook remains authoritative for money. Browser return/status is read-only. Customer card data never passes through Namdar.

## Processor-fee accounting / pricing — LIVE FOUNDATION
Internal Stripe processor fields and reporting from PR #50 remain live. Customer Billing/PDFs do not expose processor fee/net data and staff cannot manually create Stripe ledger rows.

There is no customer Stripe/card surcharge. The optional Window headline-price allowance remains OFF by default; if later enabled it becomes part of the ordinary service price for every payment method.

## Next action
1. observe the first real PR #52 production cron run at `:07` and inspect retry/degraded telemetry;
2. only after a healthy observation, resume secure Stripe provider/webhook setup;
3. test Checkout, delayed/duplicate webhook, fee capture and refund end-to-end in Stripe test mode;
4. deliberately enable Window online payments only after tests pass;
5. separately decide whether to enable the headline price allowance.

## Do not break
- Window Cleaning only; no Stage 2 activation without deliberate decision.
- Notification retries must not blindly replay non-idempotent writes or duplicate customer emails.
- No separate consumer card/Stripe surcharge.
- Verified Stripe webhook, not browser redirect, is authoritative for Stripe money.
- Never expose Stripe/Supabase/SMTP/Turnstile/cron secrets.
- Privileged access remains AAL2/MFA protected.
- Review requests remain neutral/equal; no positive-only gating or incentives.
- Address work stays parked.
- Support tickets remain customer-only; public inbound email remains Admin Email inbox.
