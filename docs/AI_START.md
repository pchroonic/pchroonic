# Namdar AI fast resume

Last verified: 2026-09-12 UTC

Read this file first. It is the compact current-state/next-action record; use `docs/AI_HANDOFF.md` for technical detail.

## Current phase

**Phase 7 — Launch Security & Readiness**

## Current baseline

- Repository: `pchroonic/pchroonic`, default branch `main`.
- Current main continuity commit before this feature branch: `5a5c4f5e8578290ecda6ac16cafdb697f7ad4910`.
- Current live runtime product behavior before this feature branch: all-width homepage fix from `46a635396ae364fe9b5783bc18c3de2b72025efc`.
- Production: `https://namdar.co.uk` on Vercel project `namdar-website-starter-1`.
- Supabase: `namdar-production` (`qjigldxjcpnrlyxgmlqq`), Free plan.
- MFA Stage 2 is live and user-verified; privileged Admin/Staff browser, API and RLS access require AAL2.
- Customer support tickets remain customer-only; public inbound email remains Admin Email inbox.

## Auth URLs — COMPLETE

Owner-verified Supabase Auth URL state:
- Site URL: `https://namdar.co.uk`
- Redirect allowlist: `https://namdar.co.uk/**`

Four old/broad Vercel redirect entries were removed and saved on 2026-09-12.

## Sign-in providers — REVIEWED

Owner screenshots plus code/database checks confirm the intended provider state:
- Email: enabled.
- Google: enabled and intentional.
- Phone, anonymous sign-in, manual linking and other social/custom providers: disabled.
- Confirm email: enabled.

Important correction to older notes: Namdar **does use Google sign-in**. The customer portal uses Google Identity Services with `signInWithIdToken`, and production contains at least one customer identity that relies on Google without a separate email/password identity. Do not disable Google without a migration/recovery plan.

## Supabase CAPTCHA / Turnstile — READINESS PATCH IN PROGRESS

Supabase → Authentication → Attack Protection currently shows **Enable CAPTCHA protection OFF**. Do not switch it on until the readiness patch is live.

Namdar already has Cloudflare Turnstile configured in the customer portal. Existing login, magic-link and signup flows pass CAPTCHA tokens, but password-reset and confirmation-resend did not, and used Turnstile tokens were not explicitly refreshed.

Feature branch: `security/auth-captcha-readiness-20260912`.

Patch scope:
- new `account-captcha-guard.js`;
- account loader version `6.4.16-auth-captcha-1`;
- supplies CAPTCHA tokens to email/password login, magic link, Google ID-token login, signup, password reset and confirmation resend;
- records Turnstile widget IDs and resets the appropriate challenge/token after each auth request;
- preserves `account-original.js` byte-for-byte;
- adds CI syntax coverage for the new guard.

No database migration and no environment-variable change are required for the code patch.

**Status:** branch implementation exists; PR, CI, exact Vercel preview, merge and production verification are still required before asking the owner to enable Supabase CAPTCHA.

## After the code patch is live

Owner action in Supabase Attack Protection:
1. Turn **Enable CAPTCHA protection** ON.
2. Select **Cloudflare Turnstile**.
3. Retrieve the existing Namdar Turnstile **Secret Key** from Cloudflare and paste it directly into the Supabase secret field.
4. Save changes.

Never ask the owner to paste the Turnstile secret into chat or commit it to GitHub.

Then run controlled production auth smoke tests: password sign-in, magic-link request, password-reset request, Google sign-in, and a safe signup/confirmation path if practical.

## Other open items

- Same-iPhone final confirmation for the all-width homepage overflow fix remains pending; Windows/Edge desktop is confirmed fixed.
- Leaked Password Protection remains optional/plan-blocked because the Supabase organization is on Free and the feature requires Pro or above.
- After CAPTCHA: Stripe, SMS, Resend/legal configuration, cron jobs, double-booking protection, inbound alias behavior and remaining controlled customer-support journey.

## Do not repeat / do not break

- Do not disable Google sign-in; it is used by the live portal and at least one current customer identity relies on it.
- Do not enable Supabase CAPTCHA before the readiness patch is deployed and verified.
- Do not ask for or store the Turnstile secret in chat/GitHub.
- Do not redo Auth URL cleanup unless a redirect issue appears.
- Do not repeat MFA Stage 2 work or migration `20260911230055`.
- Do not upgrade Supabase without explicit owner approval.
- Do not make support tickets public.
- Do not move production back to Netlify.
- Never expose credentials, tokens, customer data, passwords or TOTP codes.

## Resume protocol

For simple continuation: read this file, verify current `main` HEAD/live state, then inspect only relevant code/docs.

For substantial production/security work: read `AGENTS.md`, this file, `docs/AI_HANDOFF.md`, `docs/PROJECT_STATUS.md` and relevant code; use branch → PR → CI → preview/testing → merge → production verification.

Every substantial change must update all three continuity files: `docs/AI_START.md`, `docs/AI_HANDOFF.md`, and `docs/PROJECT_STATUS.md`.
