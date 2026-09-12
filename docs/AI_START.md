# Namdar AI fast resume

Last verified: 2026-09-12 UTC

Read this first. It is the compact current-state/next-action record; use `docs/AI_HANDOFF.md` for technical detail.

## Current phase

**Phase 7 — Launch Security & Readiness**

## Current live baseline

- Repository: `pchroonic/pchroonic`, default branch `main`.
- Current live product code baseline: `72d52d06a09852de8ee5c329adf57f5934e5dcc1`.
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

Important: Namdar uses Google Identity Services + Supabase `signInWithIdToken`, and at least one current customer identity relies on Google without a separate email/password identity. Do not disable Google without a recovery/migration plan.

## Supabase CAPTCHA / Turnstile — ENABLED, SMOKE TESTS PENDING

The code prerequisite is live and the owner confirmed on 2026-09-12 that Supabase → Authentication → Attack Protection was saved with:
- **Enable Captcha protection: ON**;
- provider: **Cloudflare Turnstile**;
- existing Namdar Turnstile Secret Key entered directly from Cloudflare into Supabase.

No secret value was shared in chat or stored in GitHub.

Readback limitation: the connected Supabase tool does not expose hosted Auth CAPTCHA-setting readback, so the enabled state is owner-confirmed dashboard state. Do not claim provider-side verification beyond that until auth smoke tests pass.

Readiness code already live:
- PR #19 `Prepare customer Auth for Supabase CAPTCHA`;
- feature head `cecab9d0236a8ef804c7b52f6f78741f46a93001`;
- CI `34688813723`: success;
- exact preview `dpl_2rb4eyRExRTMiG1dxgdrf6xv4XHv`: READY;
- production code SHA `72d52d06a09852de8ee5c329adf57f5934e5dcc1`;
- production deployment `dpl_DSmsBZ9DTxg9Dtw9tbyYHWWtpxYw`: READY with `namdar.co.uk` and no alias error;
- canonical `/account.js` and `/account-captcha-guard.js?v=6.4.16-auth-captcha-1` returned HTTP 200.

Live code supplies Turnstile tokens for password login, Magic Link, Google ID-token login, signup, password reset and confirmation resend, and resets the relevant one-time challenge after each Auth request.

## Immediate next action

Run controlled production customer-auth smoke tests after CAPTCHA enablement. Start with one real account login on `https://namdar.co.uk/account`:
1. open My Namdar in a fresh/private browser session;
2. allow the Cloudflare anti-bot check to complete;
3. sign in using the owner's normal customer login method (email/password or Google);
4. confirm the customer portal opens normally.

Then, one at a time, test the other non-destructive auth requests where practical: Google/password alternate login, Magic Link request, password-reset request, and confirmation resend/safe signup only if a suitable test account exists. Do not create persistent synthetic customer data unless necessary; clean it up if used.

## Other open items

- Windows/Edge homepage overflow: confirmed fixed. Same-iPhone final confirmation remains pending.
- Leaked Password Protection: optional/plan-blocked because Supabase is on Free and the feature requires Pro or above.
- After CAPTCHA smoke tests: Stripe, SMS, Resend/legal configuration, cron jobs, double-booking protection, inbound alias behavior and remaining controlled customer-support journey.

## Do not repeat / do not break

- Do not disable Google sign-in.
- Do not ask for or store the Turnstile secret in chat/GitHub.
- Do not tell the owner to enable CAPTCHA again; it is owner-confirmed enabled as of 2026-09-12.
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
