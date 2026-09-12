# Namdar AI fast resume

Last verified: 2026-09-12 UTC

Read this first. It is the compact current-state/next-action record; use `docs/AI_HANDOFF.md` for technical detail.

## Current phase

**Phase 7 — Launch Security & Readiness**

## Current live baseline

- Repository: `pchroonic/pchroonic`, default branch `main`.
- Current live product commit: `72d52d06a09852de8ee5c329adf57f5934e5dcc1`.
- Production: `https://namdar.co.uk` on Vercel project `namdar-website-starter-1`.
- Supabase: `namdar-production` (`qjigldxjcpnrlyxgmlqq`), Free plan.
- MFA Stage 2 is live and owner-verified; privileged Admin/Staff browser, API and RLS access require AAL2.
- Customer support tickets remain customer-only; public inbound email remains Admin Email inbox.

## Auth URLs — COMPLETE

Owner-verified production Auth URL state:
- Site URL: `https://namdar.co.uk`
- Redirect allowlist: `https://namdar.co.uk/**`

Four old/broad Vercel redirect entries were removed and saved on 2026-09-12.

## Sign-in providers — REVIEWED

Intended production state:
- Email: enabled.
- Google: enabled and intentional.
- Confirm email + new user signup: enabled.
- Phone, anonymous sign-in, manual linking and other shown social/custom providers: disabled.

Important: Namdar **does use Google sign-in**. The portal uses Google Identity Services + Supabase `signInWithIdToken`, and at least one current customer identity relies on Google without a separate email/password identity. Do not disable Google without a recovery/migration plan.

## Supabase CAPTCHA / Turnstile — CODE READY/LIVE, DASHBOARD TOGGLE STILL OFF

The code needed before enabling hosted Supabase CAPTCHA is now live.

Promotion:
- PR #19: `Prepare customer Auth for Supabase CAPTCHA`.
- PR head: `cecab9d0236a8ef804c7b52f6f78741f46a93001`.
- GitHub CI `34688813723`: success.
- Exact Vercel preview `dpl_2rb4eyRExRTMiG1dxgdrf6xv4XHv`: READY on exact head SHA.
- Main merge SHA: `72d52d06a09852de8ee5c329adf57f5934e5dcc1`.
- Production deployment: `dpl_DSmsBZ9DTxg9Dtw9tbyYHWWtpxYw`, READY on exact merge SHA with `namdar.co.uk`, `aliasError: null`.
- Canonical `/account.js` and `/account-captcha-guard.js?v=6.4.16-auth-captcha-1` both returned HTTP 200 with the expected live code.

Live readiness behavior:
- existing login/register Cloudflare Turnstile challenges are retained;
- CAPTCHA tokens are supplied for password login, Magic Link, Google ID-token login, signup, password reset and confirmation resend;
- the relevant Turnstile challenge/token is reset after each Auth request;
- `account-original.js` remains byte-for-byte preserved;
- no database migration or environment-variable change was required.

**Supabase → Authentication → Attack Protection still showed `Enable Captcha protection` OFF at the last owner screenshot. Do not claim hosted CAPTCHA is enabled until the owner saves that setting.**

## Immediate next action

Owner should now, in the already-open **Supabase → Authentication → Attack Protection** page:
1. turn **Enable Captcha protection** ON;
2. choose **Cloudflare Turnstile**;
3. copy the existing Namdar Turnstile **Secret Key** from Cloudflare and paste it directly into Supabase;
4. click **Save changes**.

Never ask the owner to paste or show the Turnstile secret in chat/GitHub.

After the owner confirms it is saved, run/coordinate controlled production Auth checks: password sign-in, Google sign-in, Magic Link request, password-reset request, and safe signup/confirmation where practical.

## Other open items

- Windows/Edge homepage overflow: confirmed fixed. Same-iPhone final confirmation remains pending.
- Leaked Password Protection: optional/plan-blocked because Supabase is on Free and the feature requires Pro or above.
- After CAPTCHA: Stripe, SMS, Resend/legal configuration, cron jobs, double-booking protection, inbound alias behavior and remaining controlled customer-support journey.

## Do not repeat / do not break

- Do not disable Google sign-in.
- Do not ask for or store the Turnstile secret in chat/GitHub.
- Do not redo Auth URL cleanup unless a redirect issue appears.
- Do not repeat MFA Stage 2 work or migration `20260911230055` unless a later change requires it.
- Do not upgrade Supabase without explicit owner approval.
- Do not make support tickets public.
- Do not move production back to Netlify.
- Never expose credentials, access tokens, customer data, passwords or TOTP codes.

## Resume protocol

For simple continuation: read this file, verify current `main` HEAD/live state, then inspect only relevant code/docs.

For substantial production/security work: read `AGENTS.md`, this file, `docs/AI_HANDOFF.md`, `docs/PROJECT_STATUS.md` and relevant code; use branch → PR → CI → preview/testing → merge → production verification.

Every substantial change must update all three continuity files: `docs/AI_START.md`, `docs/AI_HANDOFF.md`, and `docs/PROJECT_STATUS.md`.
