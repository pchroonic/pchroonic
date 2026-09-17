# Namdar AI fast resume

Last verified: 2026-09-17 UTC

Read this first. Use `docs/AI_HANDOFF.md` for implementation detail and `docs/PROJECT_STATUS.md` for roadmap/status.

## Production source of truth
- Repo `pchroonic/pchroonic`, default `main`.
- Current main/product merge: `02590b881ef07db82cd5a1ddbbc77767bd5b8051` (PR #100 Stripe live-readiness hardening).
- Customer base loader remains `6.4.35-payment-policy-engine-1`; post-job extension `6.4.42-post-job-experience-1`; Staff operations/ETA `6.4.41-staff-operations-v3-1`.
- Admin base remains `6.4.37-admin-website-crash-fix-1`; Google Review System `6.4.43-google-reviews-1`; Stripe readiness Admin extension `6.4.44-stripe-live-readiness-1`.
- Supabase production project: `qjigldxjcpnrlyxgmlqq`.
- Production deployment `dpl_FY31SSsYRAQpSwzsc11HiNaCgQoX` is READY and aliased to `namdar.co.uk`.
- `/api/health` returned HTTP 200 / `ok:true` at `2026-09-17T19:04:18.008Z`.
- Window Cleaning is the only live/quotable/bookable service.
- Customer Stripe remains OFF: production has zero `site_settings` rows with key `payments` and zero active payment policies.
- Ask Namdar provider AI remains OFF.
- Privileged Staff/Admin access requires CAPTCHA + AAL2/TOTP MFA.
- No real Google Business review URL is configured yet, so public Google review requests/reminders remain off.

## Stripe live readiness — LIVE
Product PR #100: `Harden Stripe live-mode activation`.
Exact tested head: `3d810d70a9201105075e2db410ff997d781f23d0`.
Merge/main: `02590b881ef07db82cd5a1ddbbc77767bd5b8051`.
Production: `dpl_FY31SSsYRAQpSwzsc11HiNaCgQoX`, READY, clean build, `namdar.co.uk` alias active.

Live behavior:
- `lib/payment-policy.js` classifies Stripe secret keys as `live`, `test`, `unconfigured` or `unknown` without exposing the secret;
- production `providerReadiness` requires a recognised LIVE Stripe secret plus configured webhook before `effectiveActive` can become true;
- Stripe TEST keys remain usable only for preview/sandbox validation and can never activate production customer payments;
- unknown production key types fail closed;
- Admin Payment & deposit policy shows Stripe mode, webhook state, production live-readiness and the activation blocker;
- if payments are off and production provider readiness is incomplete, the activation checkbox cannot be switched on, while a disabled future policy draft can still be edited/saved;
- no new payment policy, customer, booking or payment record was created by the release.

Release verification:
- exact-head Stripe live-readiness check `35262480364`: SUCCESS;
- AI handoff/full JavaScript check `35262480235`: SUCCESS;
- Google Review compatibility `35262480241`: SUCCESS;
- Staff v3 compatibility `35262480256`: SUCCESS;
- Post-job compatibility `35262480434`: SUCCESS;
- exact-head preview `dpl_6iAk6C9G3uaZ2rg8uXSbMf1TRaX4`: READY with clean errors-only build log;
- production health HTTP 200 / `ok:true`;
- live `admin.js` HTTP 200 and pins `6.4.44-stripe-live-readiness-1`;
- production release 5xx scan found no 5xx logs;
- Supabase verification after deployment found `payments_settings_rows=0` and `active_payments_settings_rows=0`.

Current Stripe account connected through the Stripe integration is GB account `acct_1UFAd1Cu9tojH31y` in test mode and is not live-money ready: `charges_enabled=false`, `payouts_enabled=false`, `details_submitted=false`. Stripe still requires business-profile completion and owner acceptance of Stripe Terms. Do not accept Stripe Terms on the owner's behalf or fabricate missing business details.

Do not enable commercial production payments until the owner completes Stripe onboarding/TOS, LIVE credentials and a verified live webhook are configured, Stripe reports the live account ready to charge/payout, and the owner explicitly chooses the production deposit/balance policy.

## Payment receipt tracking — RELEASE CANDIDATE
Branch `feature/payment-receipt-tracking-20260917`; customer/Admin receipt asset candidate `6.4.45-payment-receipts-1`.

Purpose: make every Namdar payment/refund easy to trace before live Stripe is enabled.

Candidate behavior:
- every `payment_records.id` deterministically maps to a stable customer-facing receipt number such as `RCP-12345678-9ABCDEF0` without exposing Stripe secrets;
- Stripe and manually recorded payments/refunds include the receipt number in the customer email, staff/audit context and API response;
- My Namdar Billing shows the receipt number beside each payment/refund and still provides a downloadable receipt PDF;
- receipt PDFs use the same receipt number and tell the customer to quote it for support;
- Admin transaction rows display the receipt number and the existing payment search can look up `RCP-...` receipt references through the receipt-tracking extension;
- Stripe provider references/payment IDs remain available internally for reconciliation while processor fee/net fields remain excluded from customer surfaces;
- no database migration is required: the receipt number is derived from the immutable payment UUID, so existing payment records remain valid and get the same reference every time;
- this candidate does not activate Stripe, create payment policies or create customer/payment data.

Production currently has 4 existing `payment_records`; the candidate does not rewrite or delete them. RLS on `payment_records` remains enabled.

## Google Review System — LIVE
Product PR #98 remains live beneath this release. Admin can configure the official Google Business Profile review URL, fair review requests, one reminder and review funnel analytics. The URL remains intentionally unconfigured/off. Public review access never depends on a positive private rating and no reward/incentive is offered.

## Existing live layers
Post-job Customer Experience PR #96 remains live: completed-job panels, private feedback, safe repeat quoting and next-clean guidance. Staff operations v3 PR #94 remains live with field checklist/completion gate, incidents/evidence, Admin incident handling and On My Way/customer ETA.

## Open items
- Finish and verify the payment receipt-tracking release candidate before Stripe onboarding is completed.
- Owner to complete Stripe business onboarding/TOS; then connect LIVE secret + verified live webhook and verify charges/payouts readiness.
- Owner to choose exact commercial deposit/balance policy before customer payments are enabled.
- Configure the real Google Business Profile review-request URL later; keep requests/reminders off until then.
- Real-world authenticated review/post-job smoke with the first genuine completed customer job.
- Authenticated Staff v3 mobile smoke test with a real assigned job.
- Window real-job pricing calibration after genuine completed jobs accumulate.
- ICO self-assessment, Supabase Leaked Password Protection, SMS/legal checks, Node `url.parse()` cleanup and the parked address-data pilot remain open.
