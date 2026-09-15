# Namdar project status

Last updated: 2026-09-15 UTC

## Production baseline
- Repo `pchroonic/pchroonic`, default `main`.
- Current live main/product merge: `ab1d95930816f3116828e410bf07e6208e93216f` (PR #82).
- Current release: v`6.4.35-payment-policy-engine-1`.
- Production deployment `dpl_GvU42X4GGN3mGRojFJTcvRBZfsV4`, READY on `namdar.co.uk`.
- Production health HTTP 200 / `ok:true` verified after deployment.
- Supabase production: `qjigldxjcpnrlyxgmlqq`.
- Window Cleaning only live.
- Privileged Staff/Admin requires CAPTCHA + AAL2/TOTP MFA.
- Stripe customer payment policy OFF; production has no `site_settings.payments` row and no commercial deposit bands have been approved/enabled.
- Ask Namdar provider AI disabled (`aiEnabled:false`).

## Flexible Payment & Deposit Policy Engine — LIVE
PR #82 / v`6.4.35-payment-policy-engine-1`.

Release evidence:
- exact tested head `54e480a00e93bb780e687d0f59a0f14a2aa3bc29`
- CI run `34965887792` SUCCESS
- exact preview `dpl_uUHG5oQaiP6gTiV3sFXoxwRisM3F` READY and clean
- migration `flexible_payment_policy_engine` applied successfully
- merge/main `ab1d95930816f3116828e410bf07e6208e93216f`
- production `dpl_GvU42X4GGN3mGRojFJTcvRBZfsV4` READY and clean
- account/admin loaders and policy modules verified live
- Terms v3 verified live
- no real booking/deposit/payment/late fee/refund created for release verification.

### Live capabilities
- Revisioned flat or job-value-tiered deposit policies.
- Higher-value jobs can be configured for higher percentage/minimum deposits.
- Continuous/non-decreasing tier validation.
- Frozen booking-specific payment policy revision, snapshot and deposit amount.
- Future Admin policy changes do not rewrite an earlier booking’s terms.
- Configurable balance due timing after job end (0–168 hours).
- Configurable overdue reminders, future-booking hold and recovery-review thresholds.
- Exact-money deposit/full-payment check before a required-payment booking can be confirmed.
- Completed/due invoices can request the full outstanding balance.
- Customer billing surfaces show frozen terms and overdue state without exposing processor-private fields.
- Customer data export contains safe payment-policy evidence.

### Legacy/non-retroactivity protection
A final release review found and fixed an Admin-confirmation edge case. New Admin-created Window appointments now snapshot the current policy at creation. True legacy bookings with no payment-policy snapshot are not later forced into a newly enabled deposit requirement merely because Admin confirms them after the policy changes.

### Consumer / B2B safeguards
- Consumer invoice amounts are never automatically increased for lateness by this engine.
- No automatic consumer penalty, compounding fee or interest.
- Consumer escalation is reminders, possible new-booking hold, then manual recovery review.
- B2B statutory interest/recovery calculation is preview/manual only and is never automatically posted.
- Explicit business-customer classification is still required before any future automated commercial-debt workflow.

### Production database / Terms
Migration `20260915111500_flexible_payment_policy_engine.sql` is applied.

Bookings now have:
- payment policy revision
- lock timestamp
- payment-policy snapshot
- frozen deposit amount.

Invoices now have:
- payment policy revision/snapshot
- frozen deposit amount
- balance-due hours
- overdue booking-hold days
- overdue final-review days.

Published Terms are v3 and include `Payment due dates and overdue balances`, preserving non-retroactivity and consumer fairness.

### Commercial invariants
- Customer Stripe payments remain OFF.
- Production has `0` `site_settings` rows with key `payments`.
- Fallback 20% / £10 values are inactive code defaults only, not an approved commercial policy.
- Window Cleaning remains the only live payment-capable service.

## Booking cancellation / deposit policy — LIVE
The earlier fair 48-hour policy remains live and is incorporated into the current v3 Terms:
- >48h deposit normally refundable/transferable;
- <48h, no-show/no access: retention only for reasonable direct loss after savings/rebooking are considered;
- Namdar cancellation/no replacement: refund unprovided service payments;
- statutory consumer rights unaffected;
- booking acceptance evidence recorded.

## Privacy Centre / UK GDPR — LIVE
- Privacy/Cookie and My Namdar/Admin privacy centres live.
- Controller legal name/public postal address publication postponed by owner.
- ICO fee self-assessment still open.

## Security / operations stable
- Security Hardening live.
- Staff My Jobs auth recovery live and user-confirmed.
- Business Finance sole-trader-first/private.
- Smart Receipts private/review-first.
- Newsletter Centre consent-aware/resumable.
- Ask Namdar guided assistant live; provider AI off.
- Support tickets customer-only/private.

## Known technical debt / open roadmap
- Owner later chooses actual commercial deposit bands/amounts and whether/when to activate Stripe.
- Build explicit business-customer classification before any automated B2B statutory-debt workflow.
- ICO data-protection fee self-assessment.
- Supabase Leaked Password Protection.
- Google review-request URL.
- Window real-job pricing calibration.
- SMS/legal checks.
- Node `url.parse()` deprecation cleanup; this warning was still visible in the post-release runtime scan.
- Address-data pilot remains parked.
