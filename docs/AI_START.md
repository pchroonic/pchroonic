# Namdar AI fast resume

Last verified: 2026-09-12 UTC

Read this first. It is the compact current-state/next-action record; use `docs/AI_HANDOFF.md` for technical detail.

## Current phase

**Phase 7 — Launch Security & Readiness**

## Current live baseline

- Repository: `pchroonic/pchroonic`, default branch `main`.
- Current `main` before the branded-email branch: `f9192284d2f2844d3b2940408fb3cda363758b9c`.
- Current live product code baseline: `72d52d06a09852de8ee5c329adf57f5934e5dcc1`.
- Production: `https://namdar.co.uk` on Vercel project `namdar-website-starter-1`.
- Supabase: `namdar-production` (`qjigldxjcpnrlyxgmlqq`), Free plan.
- Resend domain `namdar.co.uk`: verified, sending and receiving enabled.
- MFA Stage 2 is live and owner-verified; privileged Admin/Staff browser, API and RLS access require AAL2.
- Customer support tickets remain customer-only; public inbound email remains Admin Email inbox.

## Auth URLs / providers — COMPLETE

- Site URL: `https://namdar.co.uk`
- Redirect allowlist: `https://namdar.co.uk/**`
- Email and Google are intentionally enabled.
- Confirm email + signup enabled.
- Phone, anonymous sign-in, manual linking and other shown providers disabled.

Do not disable Google: at least one current customer identity relies on Google without a separate password identity.

## Supabase CAPTCHA / Turnstile — ENABLED, TESTING IN PROGRESS

Hosted Supabase CAPTCHA is owner-confirmed ON using the existing Cloudflare Turnstile widget/secret entered directly in Supabase. No secret was shared or stored.

Readiness code is live from PR #19 and passes Turnstile tokens for password login, Magic Link, Google login, signup, password reset and confirmation resend.

### Production smoke tests

Passed on 2026-09-12:
- fresh/private-session real customer login after CAPTCHA enablement → portal opened normally;
- password-reset request after CAPTCHA enablement → Resend delivered the reset email to the owner successfully.

The reset email delivery also exposed an email-branding issue: the hosted Supabase Auth template is still the plain default HTML and the SMTP sender display appears as lowercase `namdar` from `accounts@namdar.co.uk`.

Magic Link delivery is still a separate pending test; do not mark it passed based on the password-reset screenshot.

## Auth email branding — SOURCE PREPARED, NOT LIVE YET

Feature branch: `feature/branded-auth-emails-20260912`.

Source-controlled hosted-Supabase templates prepared under `supabase/email-templates/`:
- `reset-password.html`
- `magic-link.html`
- `confirm-signup.html`
- `change-email.html`
- `reauthentication.html`
- `invite.html`
- `README.md` with subjects/apply workflow.

Design uses Namdar dark green/lime/paper branding and an HTML-built `N / NAMDAR` lockup, so the brand remains visible even when remote images are blocked. It adds clearer security wording, consistent CTA buttons and `support@namdar.co.uk` / `namdar.co.uk` footer details.

Recommended sender presentation when applying hosted SMTP settings:
- display name: `Namdar`
- sender: `accounts@namdar.co.uk`

These source files do **not** automatically change hosted Supabase templates. Do not call them live until they are copied into Supabase → Authentication → Emails / Email Templates and a controlled delivered email is verified.

## Gmail sender avatar / profile image — SEPARATE EMAIL-IDENTITY TASK

The blank/generic Gmail sender avatar is not controlled by the HTML email body. A durable cross-client Namdar sender logo is a separate DMARC + BIMI/email-identity task; Gmail logo display may require an eligible brand certificate path such as CMC/VMC.

Do not tighten DMARC to `quarantine` or `reject` until all legitimate Namdar senders are audited for SPF/DKIM alignment. Resend currently reports the Namdar sending domain verified with DKIM/SPF.

## Immediate next action

1. Finish branded-email branch review/CI/merge; this is source backup only and does not change hosted email yet.
2. In Supabase hosted Email Templates, apply the branded **Reset password** subject + HTML first and change SMTP sender display name from `namdar` to `Namdar` if the dashboard still shows lowercase.
3. Send one controlled password-reset test and verify the delivered rendering/sender in Gmail and Resend.
4. If good, apply the same branded set to Magic Link, Confirm signup, Change email, Reauthentication and Invite.
5. Then audit DMARC/current sender alignment before planning BIMI/Gmail brand-avatar setup.

Never ask the owner for a Supabase access token, SMTP password or any one-time Auth link just to apply these templates; use the Dashboard manually if connected tooling cannot edit hosted Auth templates.

## Other open items

- Magic Link CAPTCHA delivery test remains pending.
- Windows/Edge homepage overflow: confirmed fixed. Same-iPhone final confirmation remains pending.
- Leaked Password Protection: optional/plan-blocked because Supabase is Free and the feature requires Pro or above.
- After email/CAPTCHA work: Stripe, SMS, Resend/legal configuration, cron jobs, double-booking protection, inbound alias behavior and remaining controlled customer-support journey.

## Do not repeat / do not break

- Do not disable Google sign-in.
- Do not ask for or store Turnstile/SMTP/Supabase secrets in chat/GitHub.
- Do not store or quote live password-reset links/tokens from delivered emails.
- Do not tell the owner to enable CAPTCHA again; it is owner-confirmed enabled.
- Do not mark Magic Link passed from a reset-password delivery.
- Do not redo MFA Stage 2 or migration `20260911230055` unless a later change requires regression work.
- Do not upgrade Supabase without explicit owner approval.
- Do not make support tickets public.
- Do not move production back to Netlify.

## Resume protocol

For simple continuation: read this file, verify current `main` HEAD/live state, then inspect only relevant code/docs.

For substantial production/security work: read `AGENTS.md`, this file, `docs/AI_HANDOFF.md`, `docs/PROJECT_STATUS.md` and relevant code; use branch → PR → CI → preview/testing → merge → production verification.

Every substantial change must update all three continuity files: `docs/AI_START.md`, `docs/AI_HANDOFF.md`, and `docs/PROJECT_STATUS.md`.
