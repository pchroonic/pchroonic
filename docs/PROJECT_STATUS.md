# Namdar project status

Last updated: 2026-09-12 UTC

Read `docs/AI_START.md` first for fast continuation. This file is the broader roadmap/status view.

## Current baseline

- Release documented in `README.md`: v6.4.16.
- Source: `pchroonic/pchroonic`, default branch `main`.
- Current `main` before branded-email feature branch: `f9192284d2f2844d3b2940408fb3cda363758b9c`.
- Current live runtime product code SHA: `72d52d06a09852de8ee5c329adf57f5934e5dcc1`.
- Delivery: Vercel project `namdar-website-starter-1`, canonical `namdar.co.uk`.
- Supabase: `namdar-production` (`qjigldxjcpnrlyxgmlqq`), Free plan.
- Resend: `namdar.co.uk` verified, sending + receiving enabled.
- App: static multi-page front end plus Vercel Node serverless APIs.

## Main product areas

| Area | Status |
| --- | --- |
| Public website | Live; desktop overflow confirmed fixed, same-iPhone confirmation pending |
| Customer portal | Session fix, Google + email auth, optional customer MFA live; hosted CAPTCHA enabled; login + password-reset request passed |
| Auth email branding | Six branded Supabase Auth templates prepared in source; not yet applied to hosted templates |
| Sender avatar / BIMI | Not configured; separate DMARC/BIMI identity task after sender audit |
| Admin workspace | Inbox Security v2 + mandatory privileged MFA/AAL2 live and smoke-tested |
| Staff PWA | Mandatory privileged MFA/AAL2 live; AAL2 required for offline cached session |
| Server functions | Privileged APIs require AAL2 |
| Production DB | Central privileged RLS requires AAL2 |
| Supabase Auth URLs | Hardened to canonical Namdar production domain |
| Supabase Auth providers | Reviewed; Email + Google intentionally enabled, unnecessary providers disabled |
| Supabase CAPTCHA | Owner-confirmed ON with Cloudflare Turnstile |

## Phase 7 — Launch Security & Readiness

### MFA Stage 2 — LIVE AND VERIFIED

Admin/Staff browser, central Vercel API and direct Supabase RLS require AAL2. User production smoke test passed on 2026-09-12. Applied migration: `20260911230055 require_aal2_for_staff_permissions`.

## Homepage horizontal overflow — LIVE

PR #16 all-width fix is live. Windows/Edge desktop is owner-confirmed fixed. Same-iPhone final confirmation remains pending.

## Supabase Auth URL Configuration — COMPLETE

Owner saved Site URL `https://namdar.co.uk` and redirect allowlist `https://namdar.co.uk/**`; four unnecessary Vercel redirect entries were removed.

## Sign In / Providers — REVIEW COMPLETE

Email + Google intentionally enabled; confirm email/signup enabled; phone, anonymous sign-in, manual linking and other shown providers disabled. Do not disable Google without a safe recovery/migration plan.

## Attack Protection / CAPTCHA — ENABLED, PARTIAL SMOKE TESTS PASSED

Hosted Supabase CAPTCHA is owner-confirmed ON using Cloudflare Turnstile. PR #19 readiness code is live and applies Turnstile tokens to password, Magic Link, Google, signup, password reset and resend flows.

Passed production tests:
- fresh/private-session customer login → My Namdar opened normally;
- password-reset request → reset email delivered successfully through Resend.

Still pending:
- Magic Link request/delivery;
- alternate login method if practical;
- confirmation resend/safe signup only with disposable account if needed.

## Auth email branding — SOURCE READY, HOSTED APPLY PENDING

A delivered reset-password message showed the existing Supabase Auth email is still the plain default template. Resend inspection showed sender display as lowercase `namdar <accounts@namdar.co.uk>`.

Feature branch: `feature/branded-auth-emails-20260912`.

Prepared under `supabase/email-templates/`:
- branded Reset password;
- Magic Link;
- Confirm signup;
- Change email address;
- Reauthentication code;
- Invite user;
- README containing recommended subjects, sender presentation and apply/test workflow.

Design follows Namdar brand colours, uses table-based inline HTML for email compatibility and an HTML-built Namdar lockup so branding does not depend on remote images. It adds clear CTA buttons, security guidance and support/footer details.

Recommended hosted sender presentation: `Namdar <accounts@namdar.co.uk>`.

Current status: source is prepared only. These files are not live until manually saved in Supabase Dashboard → Authentication → Emails / Email Templates and verified with delivered messages. No database migration, runtime code or environment-variable change is required for the source templates.

Resend open/click tracking is disabled, which should remain so for one-time Supabase Auth links.

## Sender profile avatar — SEPARATE EMAIL-IDENTITY WORK

The Gmail sender avatar is not controlled by email HTML. Durable logo display is a separate DMARC/BIMI task; Gmail may require an eligible CMC/VMC certificate path. Audit all legitimate Namdar senders/SPF/DKIM alignment before changing DMARC enforcement to quarantine/reject.

## Security advisor / plan-blocked item

Leaked Password Protection remains disabled. Namdar is on Supabase Free and this feature requires Pro or above. Treat as optional/plan-blocked; do not upgrade without owner approval.

## Applied recent production migrations

- `20260911213820 inbox_spam_controls`
- `20260911213842 inbox_spam_blocklist_fk_index`
- `20260911220343 inbox_security_indexes`
- `20260911220415 harden_invoice_number_function_search_path`
- `20260911230055 require_aal2_for_staff_permissions`

## Outstanding work

1. Finish branded Auth-email branch CI/merge; apply and verify Reset password first, then remaining templates.
2. Complete Magic Link/remaining CAPTCHA Auth smoke tests.
3. Audit DMARC + legitimate senders and decide on BIMI/Gmail sender-avatar path.
4. Recheck iPhone overflow and close cross-device regression if passed.
5. Complete Stripe, SMS, Resend and legal launch readiness.
6. Verify production cron jobs and double-booking protections.
7. Run safe recognized-mailbox/unknown-alias inbound test.
8. Complete controlled customer-support journey with safe eligible test customer.
9. Optional/plan-blocked: leaked-password protection only if Supabase plan later upgrades.

## Handoff maintenance rule

Every substantial product/provider change must update all three continuity files in the same change. Never include credentials, private customer data, passwords, TOTP codes, SMTP/CAPTCHA secrets or one-time Auth links.
