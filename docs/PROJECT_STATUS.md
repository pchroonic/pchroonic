# Namdar project status

Last updated: 2026-09-11 UTC

## Current baseline

- Release documented in `README.md`: v6.4.16.
- Source: GitHub `main` in `pchroonic/pchroonic`.
- Delivery: Vercel project `namdar-website-starter-1`, canonical domain `namdar.co.uk`.
- Data/auth/storage: Supabase `namdar-production`.
- Application: static multi-page front end plus Vercel Node serverless APIs.

## Main product areas

| Area | Primary source | Status |
| --- | --- | --- |
| Public website | `index.html`, `app.js`, `styles.css`, `services/`, `areas/` | Live |
| Customer portal | `account.html`, loader + original + auth/MFA guards, customer APIs | Session fix live; MFA Stage 1 prepared |
| Admin workspace | loader + original + inbox safety + MFA guard, admin APIs | Inbox Security v2 live; MFA Stage 1 prepared |
| Staff PWA | loader + preserved original + MFA guard + service worker | Existing PWA live; MFA Stage 1 prepared |
| Server functions | `api/` | Hardened email/inbox APIs live |
| Production DB | Supabase | Healthy; inbox/security migrations applied |

## Phase 7 — Launch Security & Readiness

Branch: `feature/security-mfa-phase-20260911`.

Pre-change production check: `auth.mfa_factors` contains **0 verified factors**. This means the rollout must first let privileged users enroll safely instead of immediately hard-requiring AAL2.

Prepared Stage 1:

- Customer accounts that have opted into MFA must satisfy the second factor before My Namdar loads.
- Admin and Staff with verified MFA must satisfy the second factor before privileged data loads.
- Admin/Staff without MFA are prompted to enroll a TOTP authenticator. A temporary “Continue for now” option remains during rollout to prevent accidental lockout; the prompt returns on a later session.
- Staff online access follows the same staged gate. Existing offline snapshot behavior is unchanged and remains session-expiry/TTL limited.
- `staff.js` becomes a small loader and preserves the previous source as `staff-original.js`.
- `staff-sw.js` cache version is bumped to include the new loader/guard assets.
- CI is extended to syntax-check all new MFA guard files and preserved staff source.

Stage 1 does **not** yet provide comprehensive API/RLS AAL2 enforcement. That is intentionally deferred until direct Supabase browser access and server API paths are audited together.

## Email/security baseline already live

Inbox spam protection + Inbox Security v2 are live, including:
- spam/quarantine folder and manual restore;
- exact-sender/domain blocks with shared-provider safeguards;
- recognized mailbox allowlist;
- loop suppression and valid reply-token context;
- provider/RFC Message-ID dedupe;
- repeated campaign detection;
- DMARC/SPF/DKIM signals;
- dangerous attachment quarantine/caution metadata;
- Report phishing;
- no staff notification for quarantined mail.

## Database/Auth security state

Applied production migrations:
- `20260911213820 inbox_spam_controls`
- `20260911213842 inbox_spam_blocklist_fk_index`
- `20260911220343 inbox_security_indexes`
- `20260911220415 harden_invoice_number_function_search_path`

No new database migration or environment variable is required for Phase 7 Stage 1.

Supabase Security Advisor still reports **Leaked Password Protection disabled**. This is a hosted Auth setting and must be enabled/verified separately. RLS-with-no-policy INFO findings on server-only operational tables are intentional.

## Verification status

Verified current production baseline:
- Inbox Security v2 PR #5 CI passed and exact preview reached READY.
- Main security commit: `c3d788dfd61751faf888197801b0fce587d97d38`.
- Production deployment: `dpl_CA4tTdYrtjxvxQR6jor1cs3Lvjwn`, READY with `namdar.co.uk` and no alias error.
- Handoff sync commit `1dc4b2535c6b16c99137e484d23d691643542082` passed CI and deployed READY.

Phase 7 Stage 1 verification still required before it can be called live:
1. GitHub syntax/handoff CI.
2. Exact Vercel preview READY.
3. PR merge to `main`.
4. Matching production deployment and canonical asset checks.
5. Real administrator TOTP enrollment + subsequent AAL2 challenge test.

## Outstanding work

1. Finish Phase 7 Stage 1 branch verification/deployment.
2. Enable Supabase Auth Leaked Password Protection in hosted Auth settings.
3. Enroll administrator TOTP (plus backup factor if practical), test next-login challenge, then remove temporary Admin/Staff bypass in a separate change.
4. Audit and enforce AAL2 on privileged server APIs and direct Supabase/RLS paths.
5. Run safe recognized-mailbox/unknown-alias inbound behavior test and confirm customer Support stays unchanged.
6. Complete controlled authenticated customer-support ticket test.
7. Confirm launch readiness for Stripe, Turnstile, OAuth, SMS, Resend and legal configuration.
8. Confirm intended database/application double-booking protections.

## Handoff maintenance rule

Any substantial change must update this file and `docs/AI_HANDOFF.md` in the same commit. Never include credentials or customer data.
