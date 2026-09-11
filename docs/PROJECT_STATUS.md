# Namdar project status

Last updated: 2026-09-12 UTC

For fast continuation, read `docs/AI_START.md` first. This file is the broader roadmap/status view.

## Current baseline

- Release documented in `README.md`: v6.4.16.
- Source: GitHub `main` in `pchroonic/pchroonic`.
- Delivery: Vercel project `namdar-website-starter-1`, canonical domain `namdar.co.uk`.
- Data/auth/storage: Supabase `namdar-production` (`qjigldxjcpnrlyxgmlqq`).
- Application: static multi-page front end plus Vercel Node serverless APIs.

## Continuity system

Namdar now has a three-layer AI handoff system:
- `docs/AI_START.md` — fast resume, exact current step and do-not-repeat notes.
- `docs/AI_HANDOFF.md` — detailed technical handoff.
- `docs/PROJECT_STATUS.md` — this broader roadmap/status file.

CI requires all three files to change whenever product-source files change, reducing the chance that ChatGPT/Claude finishes work without recording the next step.

## Main product areas

| Area | Status |
| --- | --- |
| Public website | Live |
| Customer portal | Session fix + optional customer MFA live |
| Admin workspace | Inbox Security v2 + mandatory privileged MFA/AAL2 live |
| Staff PWA | Mandatory privileged MFA/AAL2 live; AAL2 required for offline cached session |
| Server functions | Privileged APIs require AAL2 through central `requireStaff()` wrapper |
| Production DB | Central privileged RLS requires AAL2 |

## Phase 7 — Launch Security & Readiness

### MFA Stage 2 — LIVE

The admin authenticator was successfully enrolled before Stage 2. Production currently has 1 verified admin MFA factor.

Enforcement now exists at browser, API and database levels:
- Admin/Staff browser bypass removed.
- Privileged users must enroll/verify TOTP and reach AAL2 before privileged UI loads.
- Central Vercel `requireStaff()` requires AAL2 after the existing validated identity/permission check.
- Central Supabase `private.has_staff_permission()` requires AAL2 for direct-client privileged RLS.
- `Staff read own access` requires AAL2.
- Old AAL1 Staff sessions cannot use privacy-limited offline job snapshots until they reconnect and verify.
- Customer/public access policies and customer support-ticket rules are unchanged.

## Deployment verification

- Stage 2 feature SHA: `d203c64d9e5da3cca049bcb43e988f7432e2864c`.
- PR #8.
- GitHub CI run `34656209581`: success.
- Preview deployment: `dpl_2bfBkHgR4k8SY4hL4AcUrn3NWzzT`, READY on exact feature SHA.
- Main Stage 2 code SHA: `ece88931bd5e05b26173b25ff7fa75c46b6b4e63`.
- Production deployment: `dpl_Jkb8ZavhqrBD6PLpqjAPnEdiGAsW`, READY with `namdar.co.uk` and no alias error.
- Live `admin.js` serves `6.4.16-security-mfa-2`.
- Live Admin MFA guard contains no `Continue for now` bypass.

## Database/Auth verification

Applied migration:
- `20260911230055 require_aal2_for_staff_permissions`

Verified after migration:
- central `private.has_staff_permission()` definition includes AAL2 requirement;
- `Staff read own access` policy includes AAL2 requirement;
- controlled database test: AAL1 denied, AAL2 allowed for the same active administrator identity;
- post-migration Security Advisor reported no new Stage 2 security regression.

Migration filename is aligned in source to the actual applied version `20260911230055_require_aal2_for_staff_permissions.sql`.

## Security advisor state

Existing findings remain:
- INFO: 8 operational/server-only tables have RLS enabled with no authenticated policies. These remain intentionally inaccessible through ordinary authenticated Data API access.
- WARN: Supabase Auth **Leaked Password Protection is disabled** and should be enabled as the next Auth-hardening task.

## Applied production migrations relevant to recent security work

- `20260911213820 inbox_spam_controls`
- `20260911213842 inbox_spam_blocklist_fk_index`
- `20260911220343 inbox_security_indexes`
- `20260911220415 harden_invoice_number_function_search_path`
- `20260911230055 require_aal2_for_staff_permissions`

## Outstanding work

1. Smoke test a fresh Admin login after signing out: password/login → authenticator → Admin/Inbox load → harmless action.
2. Enable Supabase Auth Leaked Password Protection and verify the advisor warning clears.
3. Complete provider launch readiness for Stripe, Turnstile, OAuth, SMS, Resend and legal configuration.
4. Confirm Supabase Auth Site URL and redirect allowlist for `https://namdar.co.uk`.
5. Verify production cron jobs and intended double-booking protections.
6. Run safe recognized-mailbox/unknown-alias inbound behavior test.
7. Complete controlled customer-support ticket journey when a safe eligible test customer is available.

## Handoff maintenance rule

Any substantial product change must update **all three** continuity files in the same change: `docs/AI_START.md`, `docs/AI_HANDOFF.md`, and `docs/PROJECT_STATUS.md`. CI enforces this for product-source changes. Never include credentials or customer data.
