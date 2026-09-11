# Namdar project status

Last updated: 2026-09-11 UTC

## Current baseline

- Release documented in `README.md`: v6.4.16.
- Source: GitHub `main` in `pchroonic/pchroonic`.
- Delivery: Vercel project `namdar-website-starter-1`, canonical domain `namdar.co.uk`.
- Data/auth/storage: Supabase `namdar-production` (`qjigldxjcpnrlyxgmlqq`).
- Application: static multi-page front end plus Vercel Node serverless APIs.

## Main product areas

| Area | Status |
| --- | --- |
| Public website | Live |
| Customer portal | Session fix + optional customer MFA live |
| Admin workspace | Inbox Security v2 + Stage 1 MFA live; Stage 2 prepared |
| Staff PWA | Stage 1 MFA live; Stage 2 prepared |
| Server functions | Hardened email/inbox APIs live; AAL2 wrapper prepared |
| Production DB | Healthy; Stage 2 AAL2 RLS migration pending |

## Phase 7 — Launch Security & Readiness

### Stage 1 live

Administrator TOTP enrollment worked and production now shows **1 verified factor for 1 admin user**.

### Stage 2 prepared

Branch: `feature/security-mfa-stage2-20260911`.

Planned changes:
- remove Admin/Staff `Continue for now` bypass;
- force TOTP enrollment for privileged users who have no verified factor;
- force second-factor challenge for verified privileged accounts before privileged UI data loads;
- wrap central server `requireStaff()` so privileged API access requires verified JWT `aal2`;
- preserve the previous server helper byte-for-byte as `lib/server-original.js` and keep `lib/server.js` as the small AAL2 wrapper;
- update Staff offline security so old `aal1` sessions cannot open cached job snapshots;
- apply `20260911231500_require_aal2_for_staff_permissions.sql` so central `private.has_staff_permission()` and staff self-access require AAL2.

Customer/public policies and customer MFA behavior are intentionally unchanged.

## Database/Auth security state

Applied production migrations before Stage 2:
- `20260911213820 inbox_spam_controls`
- `20260911213842 inbox_spam_blocklist_fk_index`
- `20260911220343 inbox_security_indexes`
- `20260911220415 harden_invoice_number_function_search_path`

Stage 2 migration is present in the branch but **not yet applied**.

Supabase Security Advisor still reports **Leaked Password Protection disabled**; this hosted Auth setting remains a separate launch task.

## Verification completed before Stage 2 merge

- Production MFA state: 1 verified admin factor / 1 MFA-enabled admin user.
- Audited current RLS policies: privileged direct-client policies use `private.has_staff_permission(...)` across bookings, quotes, profiles, support, loyalty, content, settings and related admin tables.
- Audited central function: it currently checks active role and permission but does not yet require AAL2.
- Confirmed representative sensitive APIs use central `requireStaff()` including support inbox, admin users/reporting/payments/address directory, staff jobs/actions/notifications/presence and staff ticket paths.
- New Stage 2 JavaScript wrapper/guards were syntax-checked locally before branch packaging.
- No new environment variable is required.

## Outstanding work

1. Package Stage 2 as one branch commit with both handoff files.
2. Open PR; require CI and exact Vercel preview READY.
3. Merge and verify production exact SHA + `namdar.co.uk` alias.
4. Apply the Stage 2 Supabase migration and record its actual migration ID.
5. Verify live Admin AAL2 read/write paths and controlled AAL1 rejection at API/RLS layers.
6. Run Supabase security advisor again.
7. Enable hosted Auth Leaked Password Protection.
8. Continue launch checks for Stripe, Turnstile, OAuth, SMS, Resend, legal configuration, cron jobs and double-booking protection.

## Handoff maintenance rule

Any substantial change must update this file and `docs/AI_HANDOFF.md` in the same commit. Never include credentials or customer data.
