# Namdar AI handoff

Last verified: 2026-09-17 UTC

Read `docs/AI_START.md` first. Use `docs/PROJECT_STATUS.md` for roadmap/status.

## Production baseline
- Repo `pchroonic/pchroonic`, default `main`.
- Current main/product merge `02590b881ef07db82cd5a1ddbbc77767bd5b8051` from PR #100.
- Customer base loader `6.4.35-payment-policy-engine-1`; Post-job Customer Experience `6.4.42-post-job-experience-1`; Staff operations/ETA `6.4.41-staff-operations-v3-1`.
- Admin base `6.4.37-admin-website-crash-fix-1`; Google Reviews `6.4.43-google-reviews-1`; Stripe readiness `6.4.44-stripe-live-readiness-1`.
- Supabase production `qjigldxjcpnrlyxgmlqq`.
- Vercel project `prj_4fILo0pCaLGUSUIMWrBIVGzeWVDC`; team `team_8Az8WtWcnfwtYRdhR8vGqC3L`.
- Production deployment `dpl_FY31SSsYRAQpSwzsc11HiNaCgQoX` READY on `namdar.co.uk`.
- Health HTTP 200 / `ok:true` at `2026-09-17T19:04:18.008Z`.
- Window Cleaning only live. Provider AI OFF. Privileged access requires CAPTCHA + AAL2/TOTP.
- Customer commercial Stripe remains OFF: zero production `site_settings.payments` rows and zero active payment-policy rows.

# Stripe live readiness — LIVE

Product PR #100: `Harden Stripe live-mode activation`.
Exact tested head `3d810d70a9201105075e2db410ff997d781f23d0`; merge `02590b881ef07db82cd5a1ddbbc77767bd5b8051`.

## Why this release exists
Namdar already had hosted Stripe Checkout, signed webhook reconciliation, deposits/balances, frozen policy snapshots, refunds and fee accounting. The missing production guard was that provider readiness previously checked only whether a Stripe secret and webhook secret existed. PR #100 makes the Stripe environment explicit and fails closed in production unless the credentials are recognisably LIVE.

## Provider readiness rules
`lib/payment-policy.js` now exports `stripeKeyMode(secret)` and expands `providerReadiness(env)`.

Recognised secret prefixes:
- `sk_live_` or `rk_live_` => `live`;
- `sk_test_` or `rk_test_` => `test`;
- empty => `unconfigured`;
- anything else => `unknown`.

Readiness behavior:
- production requires recognised LIVE Stripe secret + configured webhook for `ready=true`;
- production TEST keys can be configured but never become ready/effective;
- unknown production key types fail closed;
- preview/test environments may use recognised TEST keys + webhook for sandbox validation;
- `loadPaymentPolicy` still computes `effectiveActive=policy.active && provider.ready`, so a manually active policy cannot bypass the production credential guard.

No key material is returned by Admin APIs or stored in audit metadata.

## Admin behavior
`api/admin-payment-settings.js` returns non-secret readiness state: `stripeMode`, `production`, `liveReady`, `testReady`, provider readiness and a human-readable activation blocker. Activation uses that blocker when provider readiness is incomplete.

`admin-payment-settings.js` now shows:
- secret configured/not connected;
- Stripe mode LIVE / TEST only / unconfigured / unknown;
- verified webhook configured/not configured;
- production live-ready yes/no;
- customer payments enabled/disabled.

When payments are off and production readiness is incomplete, the activation checkbox is disabled; other commercial settings remain editable so the owner can prepare a disabled draft. Admin asset version is `6.4.44-stripe-live-readiness-1`.

## Existing Stripe/payment architecture preserved
This release does not replace the established payment layer:
- hosted full-page Stripe Checkout;
- GBP one-time service payments;
- Window Cleaning only;
- customer authentication and booking-policy evidence required;
- payment policy snapshot frozen per booking;
- exact locked deposit amount and configurable deposit/full-payment modes;
- balance due timing and full outstanding payment after completion/due;
- Checkout idempotency keys;
- signed raw-body Stripe webhook as payment authority;
- idempotent payment records and refund handling;
- exact processor fee/net accounting from Stripe balance transactions;
- internal processor-cost fields excluded from customer billing/PDFs;
- no automatic consumer monetary late penalties;
- B2B statutory late-payment calculation remains preview/manual only.

## Release evidence
Exact-head checks on `3d810d70a9201105075e2db410ff997d781f23d0`:
- Stripe live readiness `35262480364` SUCCESS;
- AI handoff/full JavaScript `35262480235` SUCCESS;
- Google Review compatibility `35262480241` SUCCESS;
- Staff v3 compatibility `35262480256` SUCCESS;
- Post-job compatibility `35262480434` SUCCESS.

Exact-head preview `dpl_6iAk6C9G3uaZ2rg8uXSbMf1TRaX4` READY with clean errors-only build log.

Production verification after merge:
- deployment `dpl_FY31SSsYRAQpSwzsc11HiNaCgQoX` READY and aliased to `namdar.co.uk`;
- `/api/health` HTTP 200 / `ok:true`;
- `admin.js` HTTP 200 and pins `6.4.44-stripe-live-readiness-1`;
- release-deployment 5xx scan returned no 5xx logs;
- Supabase readback: `payments_settings_rows=0`, `active_payments_settings_rows=0`;
- no customer, booking or payment records were created during verification.

## Current Stripe account / owner action
The connected Stripe context currently exposes GB account `acct_1UFAd1Cu9tojH31y` in test mode only. Stripe reports:
- `charges_enabled=false`;
- `payouts_enabled=false`;
- `details_submitted=false`;
- `business_type=null`.

Outstanding Stripe requirements include business profile product description, support phone, business URL and Stripe Terms acceptance. Owner acceptance of Stripe Terms must be performed by the owner; do not accept them on the owner's behalf. Do not invent a support phone, business type or other missing business identity details.

Before production payments can be activated:
1. owner completes Stripe onboarding and Terms;
2. Stripe account becomes eligible for live charges/payouts;
3. LIVE production secret is configured in Vercel;
4. live webhook endpoint/secret is configured and verified;
5. Admin reports Stripe mode LIVE and production live-ready Yes;
6. owner explicitly chooses the commercial deposit/balance policy;
7. only then enable `site_settings.payments.active`.

# Google Review System — LIVE
PR #98 remains live. Official review URL is not configured yet, so public review requests/reminders remain off. Review availability is never gated by positive private feedback and no incentive is offered.

# Existing live product layers
Post-job Customer Experience PR #96 remains live with completed-job actions, private feedback, safe repeat quoting and next-clean guidance. Staff operations v3 PR #94 remains live with field checklist/completion gate, incidents/evidence and On My Way/customer ETA.

## Safety invariants
- Do not manufacture production customers/bookings/payments for testing.
- Do not expose Stripe keys/secrets to browser/Admin responses.
- Do not enable production customer payments with TEST/unknown credentials.
- Do not accept Stripe legal terms for the owner.
- Do not activate a commercial deposit policy until the owner chooses its terms.
