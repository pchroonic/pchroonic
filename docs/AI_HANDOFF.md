# Namdar AI handoff

Last verified: 2026-09-12 UTC

Read `docs/AI_START.md` first for compact state. Use this file for detailed technical continuity. Never store secrets or private customer data here.

## Source of truth

- Product: Namdar, UK exterior-cleaning and handyman service platform.
- Repository: `pchroonic/pchroonic`, default branch `main`.
- Current live product code SHA: `72d52d06a09852de8ee5c329adf57f5934e5dcc1`.
- Hosting: Vercel project `namdar-website-starter-1`, canonical `https://namdar.co.uk`.
- Backend/Auth: Supabase `namdar-production` (`qjigldxjcpnrlyxgmlqq`), organization plan Free.
- Current documented release heading: v6.4.16.

Repository plus verified provider/deployment state are the source of truth. If older notes conflict with code/live state, correct them.

## Continuity model

- `docs/AI_START.md`: fast resume + exact next action.
- `docs/AI_HANDOFF.md`: detailed technical continuity.
- `docs/PROJECT_STATUS.md`: broader roadmap/status.

CI requires all three for substantial product-source changes.

## Support model — unchanged

Customer support tickets are private to signed-in customers with an existing quote, booking, subscription or project. Public visitors use quote/chat/email. Public inbound email remains Admin → Email inbox and does not become a customer support ticket.

## Phase 7 — Launch Security & Readiness

### MFA Stage 2 — LIVE AND USER-VERIFIED

MFA Stage 2 is enforced at browser/Admin/Staff, Vercel API and Supabase RLS layers. Applied migration: `20260911230055 require_aal2_for_staff_permissions`.

Verified production path on 2026-09-12: Admin sign-out → fresh sign-in → authenticator challenge → Admin Inbox loaded normally.

References: PR #8, CI `34656209581` success, preview `dpl_2bfBkHgR4k8SY4hL4AcUrn3NWzzT` READY, main code SHA `ece88931bd5e05b26173b25ff7fa75c46b6b4e63`, production `dpl_Jkb8ZavhqrBD6PLpqjAPnEdiGAsW` READY.

## Homepage horizontal overflow — LIVE

PR #16 implemented all-width document containment and x=0 restoration after the issue was reproduced on both iPhone and Windows/Edge desktop.

Owner verification: Windows/Edge desktop confirmed fixed on 2026-09-12. Same-iPhone final check remains pending.

## Supabase Auth URL Configuration — COMPLETE

Owner saved:
- Site URL `https://namdar.co.uk`
- Redirect allowlist `https://namdar.co.uk/**`

Four unnecessary Vercel redirect entries were removed.

## Supabase Sign In / Providers — REVIEWED

Intended production state:
- new user signup + confirm email enabled;
- Email provider enabled;
- Google provider enabled and intentional;
- Phone, anonymous sign-in, manual linking, all other shown social/custom providers disabled.

Important: Namdar uses Google Identity Services and Supabase `signInWithIdToken`; production has at least one customer identity that relies on Google without a separate email/password identity. Do not disable Google without a recovery/migration plan.

## Supabase Attack Protection / CAPTCHA — ENABLED, FIRST CUSTOMER LOGIN VERIFIED

### Provider configuration

On 2026-09-12 the owner confirmed Supabase → Authentication → Attack Protection was saved with:
- **Enable Captcha protection: ON**;
- provider: **Cloudflare Turnstile**;
- the existing Namdar Turnstile Secret Key copied directly from Cloudflare into Supabase.

No secret value was shared in chat, committed to GitHub or written to continuity docs.

Readback limitation: the connected Supabase tool does not expose hosted Auth CAPTCHA configuration readback, so provider enablement is owner-confirmed dashboard state.

### CAPTCHA readiness implementation — LIVE

PR #19 `Prepare customer Auth for Supabase CAPTCHA` is merged and deployed.

Promotion verification:
- feature/PR head `cecab9d0236a8ef804c7b52f6f78741f46a93001`;
- GitHub CI `34688813723`: success;
- exact Vercel preview `dpl_2rb4eyRExRTMiG1dxgdrf6xv4XHv`: READY;
- production code SHA `72d52d06a09852de8ee5c329adf57f5934e5dcc1`;
- production deployment `dpl_DSmsBZ9DTxg9Dtw9tbyYHWWtpxYw`: READY, `namdar.co.uk`, no alias error;
- canonical `/account.js` and `/account-captcha-guard.js?v=6.4.16-auth-captcha-1` returned HTTP 200.

Implementation:
- `account-original.js` remains preserved;
- Turnstile tokens are supplied to password sign-in, Magic Link, Google ID-token login, signup, password reset and confirmation resend;
- the relevant challenge/token is reset after each Auth request;
- no database migration, environment-variable change or secret commit was required.

### Smoke-test progress

**Passed:** on 2026-09-12 the owner opened My Namdar in a fresh/private browser session after CAPTCHA enablement, allowed the Cloudflare anti-bot check to complete, signed in with their normal existing customer login method, and confirmed the customer portal opened normally.

This is the first real end-to-end production validation that hosted Supabase CAPTCHA + Cloudflare Turnstile does not block normal customer sign-in.

Do not repeat this exact login smoke test unless later Auth/CAPTCHA changes require regression testing.

### Remaining CAPTCHA smoke tests

Run one at a time:
1. Magic Link request — verify request accepted and email arrives;
2. password-reset request — verify request accepted and reset email arrives;
3. alternate live login method (Google or password) if practical;
4. confirmation resend or safe signup only with an appropriate disposable/synthetic account, followed by cleanup.

Never ask the owner for passwords, Google tokens, Turnstile secrets or private customer data.

## Leaked Password Protection — PLAN-BLOCKED

Supabase Auth leaked-password protection remains disabled. Namdar is on Supabase Free and the feature requires Pro or above. Treat as optional/plan-blocked; do not upgrade or incur cost without explicit owner approval.

## Applied recent production migrations

- `20260911213820 inbox_spam_controls`
- `20260911213842 inbox_spam_blocklist_fk_index`
- `20260911220343 inbox_security_indexes`
- `20260911220415 harden_invoice_number_function_search_path`
- `20260911230055 require_aal2_for_staff_permissions`

## Remaining launch work

1. Complete remaining hosted CAPTCHA customer Auth smoke tests.
2. Recheck same iPhone for homepage overflow and close cross-device regression if it passes.
3. Finish Stripe, SMS, Resend and legal launch configuration.
4. Verify production cron jobs and intended double-booking protections.
5. Run safe recognized-mailbox/unknown-alias inbound behavior test.
6. Complete controlled authenticated customer-support journey when a safe eligible test customer is available.
7. Optional/plan-blocked: leaked-password protection only if owner later chooses Pro or above.

## Required workflow

For substantial work: read `AGENTS.md`, `docs/AI_START.md`, this file, `docs/PROJECT_STATUS.md` and relevant source. Use branch → PR → CI → preview/testing → merge → production verification. Update all three continuity files in the same substantial change. Never include credentials, private customer data, TOTP codes or CAPTCHA secrets.

## Next recommended step

Request a Magic Link from My Namdar and confirm the request/email succeeds with hosted CAPTCHA enabled. Then test Forgot password.
