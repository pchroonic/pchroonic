# Namdar project status

Last updated: 2026-09-12 UTC

Read `docs/AI_START.md` first for fast continuation. This file is the broader roadmap/status view.

## Current baseline

- Release documented in `README.md`: v6.4.16.
- Source: `pchroonic/pchroonic`, default branch `main`.
- Current `main` before CAPTCHA-readiness branch: `5a5c4f5e8578290ecda6ac16cafdb697f7ad4910`.
- Current live runtime behavior before CAPTCHA-readiness branch: homepage all-width fix from `46a635396ae364fe9b5783bc18c3de2b72025efc`.
- Delivery: Vercel project `namdar-website-starter-1`, canonical `namdar.co.uk`.
- Supabase: `namdar-production` (`qjigldxjcpnrlyxgmlqq`), Free plan.
- App: static multi-page front end plus Vercel Node serverless APIs.

## Continuity system

Namdar uses:
- `docs/AI_START.md` — current state + exact next action;
- `docs/AI_HANDOFF.md` — detailed technical continuity;
- `docs/PROJECT_STATUS.md` — roadmap/status.

CI requires all three on substantial product-source changes.

## Main product areas

| Area | Status |
| --- | --- |
| Public website | Live; desktop overflow confirmed fixed, same-iPhone confirmation pending |
| Customer portal | Session fix, Google + email auth, optional customer MFA live; CAPTCHA readiness patch in verification |
| Admin workspace | Inbox Security v2 + mandatory privileged MFA/AAL2 live and smoke-tested |
| Staff PWA | Mandatory privileged MFA/AAL2 live; AAL2 required for offline cached session |
| Server functions | Privileged APIs require AAL2 |
| Production DB | Central privileged RLS requires AAL2 |
| Supabase Auth URLs | Hardened to canonical Namdar production domain |
| Supabase Auth providers | Reviewed; Email + Google intentionally enabled, unnecessary providers disabled |
| Supabase CAPTCHA | Dashboard toggle currently OFF; code readiness patch in progress |

## Phase 7 — Launch Security & Readiness

### MFA Stage 2 — LIVE AND VERIFIED

Admin/Staff browser, central Vercel API and direct Supabase RLS require AAL2. User production smoke test passed on 2026-09-12.

Applied migration: `20260911230055 require_aal2_for_staff_permissions`.

Do not repeat unless later Auth changes require regression testing.

## Homepage horizontal overflow — LIVE

PR #16 all-width fix is live. Windows/Edge desktop is owner-confirmed fixed. Same-iPhone final confirmation remains pending.

References:
- feature SHA `5e05d6d3da1df0ea2049b3c2ca440e2ce304d2c2`;
- CI `34686741515`: success;
- preview `dpl_9AEFL9yKDgSvZGkAqGuKQnQws88a`: READY;
- production runtime SHA `46a635396ae364fe9b5783bc18c3de2b72025efc`;
- production `dpl_Bh1kfnpaShf6JwNnzG6N6YvYP1Qh`: READY.

## Supabase Auth URL Configuration — COMPLETE

Owner saved:
- Site URL `https://namdar.co.uk`;
- redirect allowlist `https://namdar.co.uk/**`.

Four unnecessary Vercel redirect entries were removed. Do not repeat unless an Auth redirect issue appears.

## Sign In / Providers — REVIEW COMPLETE

Owner screenshots plus source/database checks confirm:
- Email enabled;
- Google enabled and required by the live customer portal;
- Confirm email enabled;
- signup enabled;
- phone, anonymous sign-in, manual linking, other shown social providers and custom providers disabled.

Important: earlier notes that claimed no OAuth/provider usage were wrong. `account-original.js` contains Google Identity Services + Supabase `signInWithIdToken`, generic OAuth button handling, and email Magic Link via `signInWithOtp`. Production also contains at least one customer identity relying on Google without a separate email/password identity. Do not disable Google without a safe recovery/migration plan.

## Attack Protection / CAPTCHA — READINESS PATCH IN VERIFICATION

Owner screenshot shows hosted Supabase `Enable Captcha protection` currently OFF.

Namdar already renders Cloudflare Turnstile in the customer portal and currently passes tokens for password sign-in, Magic Link and signup. Before enabling hosted CAPTCHA, an audit found missing protection/readiness for:
- password-reset request;
- confirmation resend;
- Google ID-token login;
- explicit refresh of one-time Turnstile tokens after Auth requests.

Feature branch: `security/auth-captcha-readiness-20260912`.

Patch:
- adds `account-captcha-guard.js` compatibility overlay;
- keeps `account-original.js` byte-for-byte unchanged;
- updates `account.js` loader to `6.4.16-auth-captcha-1`;
- applies existing login/register Turnstile tokens to password sign-in, Magic Link, Google ID-token sign-in, signup, password reset and resend;
- retains widget IDs and resets the relevant challenge/token after every Auth request;
- adds CI syntax checking for the new guard.

No database migration or environment-variable change is required for the code patch.

**Current status:** code exists on branch; PR/CI/Vercel preview/merge/production verification still required. Supabase CAPTCHA is not yet enabled.

After production code is verified, owner must enable CAPTCHA in Supabase, select Cloudflare Turnstile, and paste the existing Turnstile Secret Key directly from Cloudflare into Supabase. Never request the secret in chat or store it in GitHub.

Then run controlled production checks for password login, Magic Link, password reset, Google login and safe signup/confirmation.

## Security advisor / plan-blocked item

Leaked Password Protection remains disabled. Namdar is on Supabase Free and this feature requires Pro or above. Treat as optional/plan-blocked; do not upgrade without owner approval.

## Applied recent production migrations

- `20260911213820 inbox_spam_controls`
- `20260911213842 inbox_spam_blocklist_fk_index`
- `20260911220343 inbox_security_indexes`
- `20260911220415 harden_invoice_number_function_search_path`
- `20260911230055 require_aal2_for_staff_permissions`

## Outstanding work

1. Promote CAPTCHA-readiness branch through PR, CI, exact Vercel preview, merge and production verification.
2. Enable Supabase CAPTCHA with Cloudflare Turnstile secret entered directly in dashboard; run Auth smoke tests.
3. Recheck iPhone overflow and close cross-device regression if passed.
4. Complete Stripe, SMS, Resend and legal launch readiness.
5. Verify production cron jobs and double-booking protections.
6. Run safe recognized-mailbox/unknown-alias inbound test.
7. Complete controlled customer-support journey with safe eligible test customer.
8. Optional/plan-blocked: leaked-password protection only if Supabase plan later upgrades.

## Handoff maintenance rule

Every substantial product/provider change must update all three continuity files in the same change. Never include credentials, private customer data, passwords, TOTP codes or CAPTCHA secrets.
