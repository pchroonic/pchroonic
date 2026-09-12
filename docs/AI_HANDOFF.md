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

Do not repeat unless a later auth change requires regression testing.

## Homepage horizontal overflow — LIVE

PR #16 implemented all-width document containment and x=0 restoration after the issue was reproduced on both iPhone and Windows/Edge desktop.

References: feature SHA `5e05d6d3da1df0ea2049b3c2ca440e2ce304d2c2`, CI `34686741515` success, preview `dpl_9AEFL9yKDgSvZGkAqGuKQnQws88a` READY, production runtime SHA `46a635396ae364fe9b5783bc18c3de2b72025efc`, production `dpl_Bh1kfnpaShf6JwNnzG6N6YvYP1Qh` READY.

Owner verification: Windows/Edge desktop confirmed fixed on 2026-09-12. Same-iPhone final check remains pending; do not call the cross-device regression fully closed until that passes.

## Supabase Auth URL Configuration — COMPLETE

Owner reviewed Supabase → Authentication → URL Configuration and saved:
- Site URL `https://namdar.co.uk`
- Redirect allowlist `https://namdar.co.uk/**`

Four unnecessary Vercel exact/wildcard redirect entries were removed. Treat this as owner-verified dashboard state; current connected Supabase tools do not expose hosted Auth URL-setting readback.

## Supabase Sign In / Providers — REVIEWED

Owner screenshots plus source/database checks confirm intended production state:
- new user signup + confirm email enabled;
- Email provider enabled;
- Google provider enabled and intentional;
- Phone, anonymous sign-in, manual linking, all other shown social providers and custom providers disabled.

Important correction to older notes: Namdar does use Google authentication. `account-original.js` uses Google Identity Services and `sb.auth.signInWithIdToken({provider:'google', ...})`; generic provider buttons can call `signInWithOAuth`; the account flow also uses `signInWithOtp` for Magic Links; `api/auth-providers.js` reports hosted provider availability.

Privacy-safe production identity aggregation showed at least one current customer identity relies on Google without a separate email/password identity. No identifying data is recorded here. **Do not disable Google** without a safe recovery/migration plan.

## Supabase Attack Protection / CAPTCHA — ENABLED, AUTH SMOKE TESTS PENDING

### Owner-confirmed provider configuration

On 2026-09-12 the owner confirmed that Supabase → Authentication → Attack Protection was saved with:
- **Enable Captcha protection: ON**;
- provider: **Cloudflare Turnstile**;
- the existing Namdar Turnstile Secret Key copied directly from the Cloudflare Turnstile widget into Supabase.

No Turnstile secret value was shared in chat, committed to GitHub or written to continuity docs.

Readback limitation: the connected Supabase tool does not expose hosted Auth CAPTCHA configuration readback, so the enabled/provider state above is owner-confirmed dashboard state. Do not overclaim independent provider verification until controlled production Auth smoke tests pass.

Leaked-password prevention remains disabled/plan-blocked; see below.

### CAPTCHA readiness implementation — LIVE

PR #19 `Prepare customer Auth for Supabase CAPTCHA` is merged and deployed.

Promotion verification:
- feature/PR head: `cecab9d0236a8ef804c7b52f6f78741f46a93001`;
- GitHub CI run `34688813723`: success;
- exact Vercel preview `dpl_2rb4eyRExRTMiG1dxgdrf6xv4XHv`: READY on exact feature SHA, no alias error;
- production merge/main code SHA `72d52d06a09852de8ee5c329adf57f5934e5dcc1`;
- production deployment `dpl_DSmsBZ9DTxg9Dtw9tbyYHWWtpxYw`: READY on exact merge SHA, target production, aliases include `namdar.co.uk`, `aliasError: null`;
- canonical `https://namdar.co.uk/account.js` returned HTTP 200 and loads `account-captcha-guard.js` with version `6.4.16-auth-captcha-1` before the session/MFA guards;
- canonical `https://namdar.co.uk/account-captcha-guard.js?v=6.4.16-auth-captcha-1` returned HTTP 200 with expected token injection/reset logic.

Implementation details:
- `account-original.js` remains byte-for-byte preserved;
- `account-captcha-guard.js` retains login/register Turnstile widget IDs;
- supplies the existing CAPTCHA token to `signInWithPassword`, `signInWithOtp`, `signInWithIdToken`, `signUp`, `resetPasswordForEmail`, and `resend`;
- clears/resets the relevant Turnstile challenge after each Auth call, success or failure;
- CI syntax-checks the guard;
- no database migration, environment-variable change or secret commit was required.

Current Supabase documentation confirms hosted CAPTCHA protects sign-in, sign-up and password-reset endpoints and supports Cloudflare Turnstile when the frontend provides a valid CAPTCHA token and the provider secret is configured.

### Required smoke tests after enablement

Do not mark this stage fully verified until controlled production customer-auth checks have passed.

Recommended order:
1. open `https://namdar.co.uk/account` in a fresh/private browser session and verify the Turnstile challenge can complete;
2. sign in with one real existing customer account using its normal method (password or Google) and confirm the portal opens;
3. test the alternate live login method where practical (Google or password);
4. request a Magic Link and verify the request is accepted;
5. request a password reset and verify the request is accepted;
6. test confirmation resend or a safe signup/confirmation path only if a suitable test account exists; clean up any synthetic account immediately afterward.

Never ask the owner for account passwords, Google tokens, Turnstile secrets or customer private data.

## Leaked Password Protection — PLAN-BLOCKED

Supabase Auth leaked-password protection remains disabled. Namdar is on Supabase Free and the feature requires Pro or above. Treat as optional/plan-blocked; do not upgrade or incur cost without explicit owner approval.

## Applied recent production migrations

- `20260911213820 inbox_spam_controls`
- `20260911213842 inbox_spam_blocklist_fk_index`
- `20260911220343 inbox_security_indexes`
- `20260911220415 harden_invoice_number_function_search_path`
- `20260911230055 require_aal2_for_staff_permissions`

## Remaining launch work

1. Complete hosted CAPTCHA production Auth smoke tests and mark the stage verified if they pass.
2. Recheck same iPhone for homepage overflow and close cross-device regression if it passes.
3. Finish Stripe, SMS, Resend and legal launch configuration.
4. Verify production cron jobs and intended double-booking protections.
5. Run safe recognized-mailbox/unknown-alias inbound behavior test.
6. Complete controlled authenticated customer-support journey when a safe eligible test customer is available.
7. Optional/plan-blocked: leaked-password protection only if owner later chooses Pro or above.

## Required workflow

For substantial work: read `AGENTS.md`, `docs/AI_START.md`, this file, `docs/PROJECT_STATUS.md` and relevant source. Use branch → PR → CI → preview/testing → merge → production verification. Update all three continuity files in the same substantial change. Never include credentials, private customer data, TOTP codes or CAPTCHA secrets.

## Next recommended step

Run the first real production My Namdar login smoke test in a fresh/private browser session now that hosted Supabase CAPTCHA is owner-confirmed enabled.
