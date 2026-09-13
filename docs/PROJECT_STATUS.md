# Namdar project status

Last updated: 2026-09-13 UTC

## Production baseline
- Repo: `pchroonic/pchroonic`, default `main`.
- Latest product release: PR #50 `Account for Stripe fees without customer surcharges`.
- Exact tested head: `17892e015f8e7f8b7c9a6b0b577292bb950d5c64`.
- CI `34752824319`: SUCCESS.
- Exact-head preview `dpl_2py2f1pDzH8YK5YD6GRkiD2hojfi`: READY / clean build.
- Merge `32e13016601492eae3daa2021f35195298b00f5b`.
- Production `dpl_Ce8kShg3ikTXVubaTYMKcgAFjztT`: READY on `https://namdar.co.uk`, canonical alias present, no alias error, clean build/runtime release checks.
- Supabase: `namdar-production` (`qjigldxjcpnrlyxgmlqq`).
- Window Cleaning is the only live/quotable/bookable service; five future services remain planned.
- Address-data work remains parked.

## Window Cleaning Stage 1 — LIVE
Product sequence includes:
- PR #38: Window quote/recurring journey and quote-gate hardening;
- PR #40: server-enforced booking operations and postcode-area route density;
- PR #42: consent-aware acquisition funnel + direct-contribution reporting;
- PR #45: completed-job close-out + neutral feedback/Google-review foundation;
- PR #47: booking-notification resilience;
- PR #49: secure Stripe payment foundation;
- PR #50: actual Stripe processor-cost accounting + no-surcharge headline pricing option.

Live booking defaults remain 21 days, 24h notice, Mon–Sat, 08–11 / 11–14 / 14–17, max 3 jobs/day and postcode-area route density.

## Stripe — CODE READY, PROVIDER DISABLED
Production health after PR #50:
- `stripe:false`;
- `stripeSecret:false`;
- `stripeWebhook:false`;
- no `site_settings.payments` row;
- zero `payment_records` with `method='stripe'`.

Therefore Stripe is not yet accepting customer payments. Provider credentials/webhook and test-mode verification are still required before Admin activation.

Core security:
- verified webhook is authoritative for Stripe money;
- browser return/status cannot write payment records;
- Checkout amount is server-calculated;
- payment requirements are enforced before Window confirmation;
- card data is never stored by Namdar.

## Processor-fee accounting — LIVE
Production migration `stripe_processor_fee_accounting` is applied and verified.

`payment_records` now has nullable internal provider fields for payment ID, balance transaction, actual fee, provider net and fee currency. The provider-payment partial index exists and RLS remains enabled.

Verified webhooks record money/state first, then attach actual Stripe balance-transaction economics. If cost data is temporarily unavailable, the webhook returns retryable 503 after safe money recording; an idempotent replay cannot duplicate the transaction/receipt and can finish the missing fee reconciliation.

Staff cannot manually create Stripe payment rows. Customer Billing and billing PDFs do not expose internal processor-cost fields.

## Pricing rule — no customer Stripe/card surcharge
Namdar does not add a separate consumer-facing payment fee.

Admin → Payments has an optional **headline price allowance** for Window Cleaning. It is currently **OFF**. If enabled, the allowance is part of the normal Window service price for all customers regardless of payment method and is not itemised as a card/Stripe fee.

Default suggestion stored in code is 1.5% + £0.20, configurable. It is only a pricing buffer; actual Stripe cost comes from balance-transaction data.

## Performance/economics — LIVE
Window reporting now includes actual captured Stripe processing fees in direct costs.

A completed job enters direct-contribution totals only when:
1. staff reviewed/saved its direct job costs; and
2. every Stripe transaction for that job has known GBP processor-fee data.

Missing/non-GBP fee data excludes the job instead of assuming £0.

**Direct contribution is not net profit.** Labour, overheads, tax and other business costs remain outside the metric.

## Post-job / reviews — LIVE
Staff uses On my way → Start → Complete, then saves direct costs/travel. Immediate completion email remains; 24-hour follow-up asks every completed customer for private feedback and, only when configured, an equal optional honest Google review.

Google review CTA is still disabled because no official review URL is configured. Never selectively solicit only positive reviews or offer incentives.

## Notification 504 resilience — containment works, upstream 504 persists
A real authenticated cron invocation on 13 September 2026 at 05:00:02 UTC returned HTTP 200 but logged `booking_delivery 504 Gateway Timeout`. Stage isolation prevented whole-cron failure, but the transient Supabase REST issue remains.

Keep `Namdar Cron Watch` active. Do not mark the underlying 504 resolved.

## PR #50 release verification
- exact head `17892e015f8e7f8b7c9a6b0b577292bb950d5c64`;
- CI `34752824319` SUCCESS;
- exact-head preview `dpl_2py2f1pDzH8YK5YD6GRkiD2hojfi` READY / clean;
- additive migration applied before merge and verified: 5 columns, provider index, RLS enabled, 0 Stripe rows, 0 payment-policy rows, catalog unchanged;
- merge `32e13016601492eae3daa2021f35195298b00f5b`;
- production `dpl_Ce8kShg3ikTXVubaTYMKcgAFjztT` READY / canonical alias / no alias error;
- production errors-only build clean;
- production release-time error/fatal logs clean;
- live Admin asset version `6.4.22-stripe-fee-accounting-1`;
- post-deploy DB recheck still 0 Stripe rows and 0 payment-policy rows; service catalog unchanged.

## Immediate next work
1. configure Stripe account securely;
2. store provider secret and webhook secret only in Vercel/server-side configuration;
3. configure production webhook `/api/stripe-webhook`;
4. test Checkout, duplicate/delayed webhook, fee capture, balance and refund in Stripe test mode;
5. then deliberately enable Window payment policy;
6. decide separately whether to enable headline price allowance (currently OFF);
7. continue real-job Window evidence/pricing calibration;
8. keep monitoring cron 504s;
9. Stage 2 remains blocked until deliberate business decision.

## Other open work
- official Google review-request URL;
- fresh privileged password/CAPTCHA/MFA interactive completion;
- SMS, legal and remaining launch checks;
- address-data pilot remains parked.

## Handoff rule
Every substantial product/provider/data change updates `docs/AI_START.md`, `docs/AI_HANDOFF.md`, and this file. Never store credentials, raw API keys, customer secrets, TOTP codes or one-time Auth links.
