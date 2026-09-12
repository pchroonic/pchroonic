# Namdar project status

Last updated: 2026-09-12 UTC

Read `docs/AI_START.md` first for fast continuation. This file is the broader roadmap/status view.

## Current baseline

- Release documented in `README.md`: v6.4.16.
- Source: `pchroonic/pchroonic`, default branch `main`.
- Current live product code SHA: `72d52d06a09852de8ee5c329adf57f5934e5dcc1`.
- Delivery: Vercel project `namdar-website-starter-1`, canonical `namdar.co.uk`.
- Supabase: `namdar-production` (`qjigldxjcpnrlyxgmlqq`), Free plan.
- App: static multi-page front end plus Vercel Node serverless APIs.

## Main product areas

| Area | Status |
| --- | --- |
| Public website | Live; desktop overflow confirmed fixed, same-iPhone confirmation pending |
| Customer portal | Session fix, Google + email auth, optional customer MFA live; hosted CAPTCHA enabled; first real login smoke test passed |
| Admin workspace | Inbox Security v2 + mandatory privileged MFA/AAL2 live and smoke-tested |
| Staff PWA | Mandatory privileged MFA/AAL2 live; AAL2 required for offline cached session |
| Server functions | Privileged APIs require AAL2 |
| Production DB | Central privileged RLS requires AAL2 |
| Supabase Auth URLs | Hardened to canonical Namdar production domain |
| Supabase Auth providers | Reviewed; Email + Google intentionally enabled, unnecessary providers disabled |
| Supabase CAPTCHA | Owner-confirmed ON with Cloudflare Turnstile; customer login passed; Magic Link/password-reset smoke tests remain |

## Phase 7 — Launch Security & Readiness

### MFA Stage 2 — LIVE AND VERIFIED

Admin/Staff browser, central Vercel API and direct Supabase RLS require AAL2. User production smoke test passed on 2026-09-12. Applied migration: `20260911230055 require_aal2_for_staff_permissions`.

## Homepage horizontal overflow — LIVE

PR #16 all-width fix is live. Windows/Edge desktop is owner-confirmed fixed. Same-iPhone final confirmation remains pending.

## Supabase Auth URL Configuration — COMPLETE

Owner saved Site URL `https://namdar.co.uk` and redirect allowlist `https://namdar.co.uk/**`; four unnecessary Vercel redirect entries were removed.

## Sign In / Providers — REVIEW COMPLETE

Owner screenshots plus source/database checks confirm:
- Email enabled;
- Google enabled and required by live portal/customer access;
- Confirm email + signup enabled;
- phone, anonymous sign-in, manual linking, other shown social/custom providers and custom providers disabled.

Do not disable Google without a safe recovery/migration plan.

## Attack Protection / CAPTCHA — ENABLED, FIRST LOGIN TEST PASSED

On 2026-09-12 the owner confirmed Supabase Attack Protection was saved with CAPTCHA enabled using **Cloudflare Turnstile** and the existing Namdar Turnstile Secret Key entered directly from Cloudflare into Supabase. The secret was not shared in chat or stored in source/docs.

PR #19 prepared the customer Auth flows and is live:
- feature head `cecab9d0236a8ef804c7b52f6f78741f46a93001`;
- CI `34688813723`: success;
- exact preview `dpl_2rb4eyRExRTMiG1dxgdrf6xv4XHv`: READY;
- production code SHA `72d52d06a09852de8ee5c329adf57f5934e5dcc1`;
- production deployment `dpl_DSmsBZ9DTxg9Dtw9tbyYHWWtpxYw`: READY with `namdar.co.uk`, no alias error.

Live code applies Turnstile tokens to password sign-in, Magic Link, Google ID-token sign-in, signup, password reset and confirmation resend, then resets the relevant one-time challenge after each Auth request.

**Owner smoke test passed:** fresh/private My Namdar session → Cloudflare anti-bot check → normal existing customer sign-in → customer portal opened normally.

Remaining CAPTCHA Auth smoke tests:
1. Magic Link request;
2. password-reset request;
3. alternate live login method if practical;
4. confirmation resend/safe signup only with a suitable disposable account and cleanup.

## Security advisor / plan-blocked item

Leaked Password Protection remains disabled. Namdar is on Supabase Free and this feature requires Pro or above. Treat as optional/plan-blocked; do not upgrade without owner approval.

## Applied recent production migrations

- `20260911213820 inbox_spam_controls`
- `20260911213842 inbox_spam_blocklist_fk_index`
- `20260911220343 inbox_security_indexes`
- `20260911220415 harden_invoice_number_function_search_path`
- `20260911230055 require_aal2_for_staff_permissions`

## Outstanding work

1. Complete remaining hosted Supabase CAPTCHA production Auth smoke tests.
2. Recheck iPhone overflow and close cross-device regression if passed.
3. Complete Stripe, SMS, Resend and legal launch readiness.
4. Verify production cron jobs and double-booking protections.
5. Run safe recognized-mailbox/unknown-alias inbound test.
6. Complete controlled customer-support journey with safe eligible test customer.
7. Optional/plan-blocked: leaked-password protection only if Supabase plan later upgrades.

## Handoff maintenance rule

Every substantial product/provider change must update all three continuity files in the same change. Never include credentials, private customer data, passwords, TOTP codes or CAPTCHA secrets.
