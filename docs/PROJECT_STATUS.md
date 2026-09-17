# Namdar project status

Last updated: 2026-09-17 UTC

## Production baseline
- Repo `pchroonic/pchroonic`, default `main`.
- Current main/product merge `02590b881ef07db82cd5a1ddbbc77767bd5b8051` (PR #100 Stripe live-readiness hardening).
- Customer base loader `6.4.35-payment-policy-engine-1`; post-job extension `6.4.42-post-job-experience-1`; Staff operations/ETA `6.4.41-staff-operations-v3-1`.
- Admin base `6.4.37-admin-website-crash-fix-1`; Google Review System `6.4.43-google-reviews-1`; Stripe readiness `6.4.44-stripe-live-readiness-1`.
- Supabase production `qjigldxjcpnrlyxgmlqq`.
- Production deployment `dpl_FY31SSsYRAQpSwzsc11HiNaCgQoX` is READY and aliased to `namdar.co.uk`; health HTTP 200 / `ok:true` at `2026-09-17T19:04:18.008Z`.
- Window Cleaning only live.
- Privileged Staff/Admin requires CAPTCHA + AAL2/TOTP MFA.
- Customer Stripe remains OFF; production has zero `site_settings.payments` rows and zero active payment-policy rows.
- Ask Namdar provider AI remains disabled.
- Google Business review URL remains unconfigured/off.

## Stripe live readiness — LIVE
PR #100 / Admin extension `6.4.44-stripe-live-readiness-1`.

Live improvements:
- Stripe secret environment is classified LIVE / TEST / unconfigured / unknown without exposing key material;
- production payment provider readiness requires recognised LIVE Stripe credentials plus configured webhook;
- TEST credentials remain usable for preview/sandbox validation but cannot activate production customer payments;
- unknown production key types fail closed;
- Admin payment settings show Stripe mode, webhook state, production live-ready state and precise activation blocker;
- activation checkbox remains unavailable while payments are off and production provider readiness is incomplete, while disabled policy drafts stay editable;
- existing hosted Checkout, webhook, frozen policy snapshots, deposits/balances, refunds and processor-fee accounting remain unchanged.

Release evidence:
- exact tested head `3d810d70a9201105075e2db410ff997d781f23d0`;
- Stripe live-readiness check `35262480364` SUCCESS;
- full/handoff JavaScript check `35262480235` SUCCESS;
- Google Review compatibility `35262480241` SUCCESS;
- Staff v3 compatibility `35262480256` SUCCESS;
- Post-job compatibility `35262480434` SUCCESS;
- exact-head preview `dpl_6iAk6C9G3uaZ2rg8uXSbMf1TRaX4` READY / clean;
- merge `02590b881ef07db82cd5a1ddbbc77767bd5b8051`;
- production `dpl_FY31SSsYRAQpSwzsc11HiNaCgQoX` READY / `namdar.co.uk` alias;
- live Admin loader pins `6.4.44-stripe-live-readiness-1`;
- production 5xx scan found no 5xx logs;
- production DB readback found zero payment settings rows and zero active payment policies;
- no synthetic customer, booking or payment data was created.

Current connected Stripe account `acct_1UFAd1Cu9tojH31y` is still test-only/incomplete: `charges_enabled=false`, `payouts_enabled=false`, `details_submitted=false`. Owner action is required to complete business details and accept Stripe Terms. Live customer payments must remain off until live credentials/webhook are configured, Stripe is live-ready, and the owner chooses the exact deposit/balance policy.

## Google Review System — LIVE
PR #98 / `6.4.43-google-reviews-1` remains live. Owner-controlled fair review requests, one-time reminders, tracked clicks and 30/90/365-day reporting are available, but the official Google Business review URL is still intentionally unconfigured/off.

## Post-job Customer Experience — LIVE
PR #96 / `6.4.42-post-job-experience-1`: completed-job panel, private feedback, fair Google review access when configured, safe repeat quoting and recurring next-clean guidance remain live. Real-world authenticated smoke should use a genuine completed job only.

## Staff operations v3 — LIVE
PR #94 remains the field-operations layer: six-step Window Cleaning quality checklist, server completion gate, incidents/evidence, Admin incident handling, On My Way ETA and customer ETA. Authenticated mobile smoke using a real assigned job remains outstanding.

## Owner & custom access roles — LIVE
Protected Owner/Administrator system roles and reusable custom Staff roles remain live with hierarchy-sensitive safeguards.

## Other live systems
- Responsive Admin booking editor.
- Secure Admin logo upload and Website/Legal crash fix.
- Flexible payment/deposit policy engine with commercial Stripe still OFF pending owner onboarding/live credentials/policy choice.
- Fair cancellation terms and Privacy Centre.
- Security Hardening and Staff auth recovery.
- Business Finance and Smart Receipts.
- Newsletter Centre and guided Ask Namdar.

## Open roadmap
- Owner completes Stripe business onboarding/TOS.
- Configure and verify LIVE Stripe production secret + live webhook; confirm charges/payouts are enabled.
- Owner chooses exact production deposit/balance policy, then activate customer Stripe payments.
- Configure the real Google Business Profile review-request URL later.
- Real-world Google review/post-job smoke with a genuine completed job.
- Authenticated Staff v3 mobile smoke test.
- Window real-job pricing calibration after genuine completed jobs accumulate.
- ICO data-protection fee self-assessment.
- Supabase Leaked Password Protection.
- SMS/legal checks.
- Node `url.parse()` deprecation cleanup.
- Address-data pilot remains parked.
