# Namdar AI fast resume

Last verified: 2026-09-15 UTC

Read this first. Use `docs/AI_HANDOFF.md` for implementation detail and `docs/PROJECT_STATUS.md` for roadmap/status.

## Production source of truth
- Repo `pchroonic/pchroonic`, default `main`.
- Current main before this release: `64de3f653d294a31afb4ef690189017272c33766` (PR #81 docs sync).
- Current live customer product: PR #80 booking cancellation/deposit policy, product merge `0027693a4be536752d1a189d42c2622c33d9d9ec`, v`6.4.34-cancellation-policy-1`.
- Production is healthy on `namdar.co.uk`.
- Window Cleaning is the only live/quotable/bookable service.
- Stripe commercial customer payment policy is OFF. Production currently has no `site_settings.payments` row. Do not infer a commercially approved deposit amount from fallback code values.
- Ask Namdar provider AI remains disabled (`aiEnabled:false`).
- Privileged Staff/Admin requires CAPTCHA + AAL2/TOTP MFA.

## Flexible Payment & Deposit Policy Engine — RELEASE CANDIDATE, NOT LIVE
Branch: `feature/flexible-payment-policy-engine-20260915`
Release version: `6.4.35-payment-policy-engine-1`
Base: current main `64de3f653d294a31afb4ef690189017272c33766`.

Owner intent:
- Namdar must be able to change deposit rules later as real trading experience develops;
- higher-value jobs can require a higher deposit;
- each booking keeps the payment rule the customer saw, so a later Admin change cannot silently increase an existing customer’s deposit;
- the balance can become due at/after job completion;
- overdue balances can escalate through reminders, a future-booking hold and recovery review;
- the system must not invent or compound automatic consumer penalty charges;
- B2B statutory late-payment interest/recovery is a separate manual-review path, not automatically applied to residential consumers.

### Payment policy engine
`lib/payment-policy.js` now supports:
- policy revisions;
- flat deposit % + minimum OR tiered job-value bands;
- validation requiring continuous bands and preventing deposit percentage/minimum from falling as job value rises;
- configurable balance due timing from job end (0–168 hours);
- configurable overdue reminder days, booking-hold day and final recovery-review day;
- frozen booking snapshots and locked deposit amounts;
- exact-money deposit enforcement (a tiny part payment cannot satisfy a large required deposit);
- full outstanding balance checkout after job completion/due date;
- B2B statutory-interest/recovery preview helper only (`automatic:false`, `reviewRequired:true`).

Fallback values remain only safe defaults while no payments row exists: 20% / £10, optional, inactive. They are not a commercial decision.

### Customer commitment / non-retroactivity
`api/customer-quote-action.js` exposes the exact current payment commitment for an accepted quote.
`account-booking-policy.js` displays it before appointment request and sends `paymentPolicyRevision`.
`api/booking-core.js` rejects stale revisions and freezes the payment snapshot/revision/deposit on the booking.
The customer email records the payment terms and explicitly says the consumer overdue engine does not automatically add a penalty, compounding fee or interest.

A materially overdue prior invoice can pause a new appointment request only when that older invoice has its own active payment-policy snapshot and has crossed its recorded booking-hold threshold.

### Checkout / billing / Staff enforcement
- `api/create-checkout.js` uses the frozen booking policy, not a later Admin deposit setting.
- Legacy bookings are not retroactively forced into a new deposit rule.
- `api/admin-booking-update.js` checks actual money paid against the frozen required deposit/full amount before confirmation.
- `api/customer-billing.js` and `account-payments.js` show frozen deposit/revision, due timing and overdue/hold/review state.
- `lib/server.js` copies booking payment terms to the invoice and changes due timing only for bookings whose frozen payment policy was active.
- Legacy/payment-off invoices keep the old due-date behavior.

### Overdue reminders
`lib/business-followup-batched.js` uses the frozen configured reminder days for active-policy invoices. Legacy invoices retain the existing 1/8/15/29-day schedule. This release does not add money to overdue consumer invoices.

### Database / Terms migration — PENDING
Repo migration: `supabase/migrations/20260915111500_flexible_payment_policy_engine.sql`.
Safe additive columns store payment-policy snapshots/revisions/deposit evidence on bookings and invoices. It also appends a Terms section, “Payment due dates and overdue balances”, and advances Terms to at least v3 if needed.

Do NOT apply this migration until exact-head CI and exact-head Vercel preview are green.

### Verification gate still required
1. Run full CI including `scripts/payment-policy-engine.test.mjs`.
2. Exact-head Vercel preview READY + clean errors-only build.
3. Review diff for no secret/data exposure and no unintended Stripe activation.
4. Apply production migration only after the exact candidate is green.
5. Verify new columns + Terms v3 and confirm no payment-settings row/customer mutation was created.
6. Merge only exact tested head.
7. Verify production READY, health 200, account/admin v6.4.35 assets and safe APIs.
8. Do not create a real booking, deposit, late fee, refund or live payment for deployment testing.

## Stable live systems
- Fair 48-hour cancellation/deposit policy remains live.
- Privacy Centre / UK GDPR operations v6.4.33 remain live; controller legal name/public postal address publication postponed by owner.
- Security Hardening and Staff My Jobs auth recovery remain live.
- Business Finance and Smart Receipts remain private/sole-trader-first.

## Open manual/commercial items
- Commercial Stripe activation and actual deposit amounts/bands remain deliberately OFF/unapproved until a separate owner decision.
- B2B customer classification and automatic commercial-debt enforcement are not implemented.
- ICO data-protection fee self-assessment.
- Supabase Leaked Password Protection.
- Google review-request URL, Window real-job pricing calibration, SMS/legal checks, `url.parse()` cleanup.
