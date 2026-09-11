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
| Customer portal | account loader + original + session/MFA guards, customer APIs | Session fix + staged MFA live |
| Admin workspace | admin loader + original + inbox safety + MFA guard, admin APIs | Inbox Security v2 + staged MFA live |
| Staff PWA | staff loader + preserved original + MFA guard + service worker | Staged MFA live |
| Server functions | `api/` | Hardened email/inbox APIs live |
| Production DB | Supabase | Healthy; inbox/security migrations applied |

## Phase 7 — Launch Security & Readiness

**MFA Stage 1 is live.**

Production factor check before and after deployment: **0 verified MFA factors**.

Live behavior:
- Customers who opt into MFA must complete their second factor before My Namdar portal data loads.
- Admin/Staff with verified MFA must complete the second factor before privileged dashboard/job data loads.
- Admin/Staff without MFA are prompted to enroll a TOTP authenticator. A temporary **Continue for now** option remains during rollout to prevent lockout and appears again on a later session until enrollment is complete.
- Staff online access follows the same staged gate; privacy-limited offline snapshot behavior is unchanged.
- `staff.js` is a loader and the previous source is preserved exactly as `staff-original.js`.
- Staff service worker uses `namdar-staff-v6.4.16-security-mfa-1`, caches the new security assets and calls `skipWaiting()` after successful cache preparation.

Stage 1 does **not** yet provide comprehensive server/API/RLS AAL2 enforcement. That remains a separate audited follow-up.

## Email/security baseline already live

Inbox spam protection + Inbox Security v2 remain live, including Spam/quarantine, sender/domain block rules, mailbox allowlisting, mail-loop suppression, valid reply context, provider/RFC Message-ID dedupe, repeated campaign detection, authentication signals, dangerous attachment quarantine/caution labels and Report phishing.

## Database/Auth security state

Applied production migrations:
- `20260911213820 inbox_spam_controls`
- `20260911213842 inbox_spam_blocklist_fk_index`
- `20260911220343 inbox_security_indexes`
- `20260911220415 harden_invoice_number_function_search_path`

No migration or new environment variable was required for MFA Stage 1.

Supabase Security Advisor still reports **Leaked Password Protection disabled**; this hosted Auth setting must be enabled/verified separately. RLS-with-no-policy INFO findings on server-only operational tables remain intentional.

## Verification status

MFA Stage 1:
- PR #7 feature SHA `4e69b6da60f43724fd013e7fc0583ce983ca3823` passed expanded CI.
- Vercel preview `dpl_6vGV4fWwcNVVJJpnW92CNyaXqP8X` READY on exact feature SHA.
- Main code SHA: `6cb1926b3da29d49a475f53e9dc07ddc0af915b9`.
- Production deployment: `dpl_6qMAURUKHJqbiY4ngZcHP3YaZtD2`, READY with `namdar.co.uk` and no alias error.
- Canonical HTTP 200 verified for account/admin/staff loaders, all three MFA guards and the Staff service worker.
- Real administrator TOTP enrollment and next-session AAL2 challenge remain pending; do not mark interactive MFA verification complete yet.

## Outstanding work

1. Administrator: enroll TOTP from the live security prompt, then sign out/in and confirm the second-factor challenge.
2. After recovery-safe enrollment, remove the temporary Admin/Staff bypass in a separate change.
3. Audit and enforce AAL2 on privileged server APIs and direct Supabase/RLS paths.
4. Enable Supabase Auth Leaked Password Protection in hosted Auth settings.
5. Run safe recognized-mailbox/unknown-alias inbound behavior test and confirm customer Support stays unchanged.
6. Complete controlled authenticated customer-support ticket test.
7. Confirm launch readiness for Stripe, Turnstile, OAuth, SMS, Resend and legal configuration.
8. Confirm intended database/application double-booking protections.

## Handoff maintenance rule

Any substantial change must update this file and `docs/AI_HANDOFF.md` in the same commit. Never include credentials or customer data.
