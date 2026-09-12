# Namdar AI handoff

Last verified: 2026-09-12 UTC

Read `docs/AI_START.md` first for compact state. Use this file for detailed technical continuity. Never store secrets or private customer data here.

## Source of truth

- Product: Namdar, UK exterior-cleaning and handyman service platform.
- Repository: `pchroonic/pchroonic`, default branch `main`.
- Hosting: Vercel project `namdar-website-starter-1`, canonical `https://namdar.co.uk`.
- Backend/Auth: Supabase `namdar-production` (`qjigldxjcpnrlyxgmlqq`), organization plan Free.
- Current documented release heading: v6.4.16.
- Current `main` before the CAPTCHA-readiness branch: `5a5c4f5e8578290ecda6ac16cafdb697f7ad4910`.

Repository plus verified provider/deployment state are the source of truth. If older notes conflict with code/live state, correct the notes.

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

References:
- PR #8;
- CI `34656209581`: success;
- preview `dpl_2bfBkHgR4k8SY4hL4AcUrn3NWzzT`: READY;
- main code SHA `ece88931bd5e05b26173b25ff7fa75c46b6b4e63`;
- production `dpl_Jkb8ZavhqrBD6PLpqjAPnEdiGAsW`: READY.

Do not repeat unless a later auth change requires regression testing.

## Homepage horizontal overflow — LIVE

PR #16 implemented all-width document containment and x=0 restoration after the issue was reproduced on both iPhone and Windows/Edge desktop.

References:
- feature SHA `5e05d6d3da1df0ea2049b3c2ca440e2ce304d2c2`;
- CI `34686741515`: success;
- preview `dpl_9AEFL9yKDgSvZGkAqGuKQnQws88a`: READY;
- production runtime SHA `46a635396ae364fe9b5783bc18c3de2b72025efc`;
- production `dpl_Bh1kfnpaShf6JwNnzG6N6YvYP1Qh`: READY.

Owner verification:
- Windows/Edge desktop: confirmed fixed on 2026-09-12.
- same-iPhone final check: pending. Do not mark cross-device regression fully closed until that passes.

## Supabase Auth URL Configuration — COMPLETE

Owner reviewed Supabase → Authentication → URL Configuration and saved:
- Site URL: `https://namdar.co.uk`
- Redirect allowlist: `https://namdar.co.uk/**`

Removed four unnecessary Vercel exact/wildcard redirect entries. This is owner-verified dashboard state; current Supabase connector does not expose hosted Auth URL-setting readback.

Do not repeat unless a redirect/login problem appears.

## Supabase Sign In / Providers — REVIEWED

Owner supplied screenshots on 2026-09-12. Intended dashboard state:
- new user signup: enabled;
- confirm email: enabled;
- manual linking: disabled;
- anonymous sign-in: disabled;
- Email provider: enabled;
- Google provider: enabled;
- Phone provider: disabled;
- Apple, Azure, Bitbucket, Discord, Facebook, Figma, GitHub, GitLab, Kakao, Keycloak, LinkedIn/OIDC, Notion, Twitch, X/Twitter, Slack, Spotify, WorkOS, Zoom and other shown providers: disabled;
- no custom providers configured.

### Important correction to earlier handoff notes

Older notes incorrectly said current Namdar source had no OAuth/provider usage. Full source inspection proves otherwise:
- `account-original.js` uses Google Identity Services and `sb.auth.signInWithIdToken({provider:'google', ...})`;
- generic `[data-oauth]` buttons also call `signInWithOAuth` when a provider is enabled;
- `api/auth-providers.js` reads hosted Auth settings and exposes Google/Apple/Facebook availability to the portal;
- the live account flow also uses `signInWithOtp` for email Magic Links.

Privacy-safe production identity aggregation also showed at least one current customer identity relies on Google without a separate email/password identity. No identifying customer data is recorded here.

**Do not disable Google** without first providing a safe account-migration/recovery path.

## Supabase Attack Protection / CAPTCHA — CURRENTLY OFF, CODE READINESS IN PROGRESS

Owner screenshot of Supabase → Authentication → Attack Protection on 2026-09-12 showed:
- `Enable Captcha protection`: OFF;
- `Prevent use of leaked passwords`: DISABLED/plan-blocked.

Do not enable hosted Supabase CAPTCHA until the code-readiness patch below is deployed and verified.

### Existing Namdar Turnstile implementation

Production `/api/config` confirms the public Turnstile site-key configuration is present. The live customer portal:
- loads Cloudflare Turnstile;
- renders separate login and registration challenges;
- already passes `captchaToken` to `signInWithPassword`;
- already passes `captchaToken` to `signInWithOtp` Magic Link requests;
- already passes `captchaToken` to `signUp`.

Gap found before enabling Supabase CAPTCHA:
- `resetPasswordForEmail` did not pass a CAPTCHA token;
- confirmation `resend` did not pass a CAPTCHA token;
- Google `signInWithIdToken` did not pass a CAPTCHA token even though current `auth-js` credentials support `options.captchaToken`;
- Turnstile widget IDs were not retained, so a used one-time token was not explicitly reset/refreshed after an Auth request.

Current Supabase documentation says hosted CAPTCHA protects sign-in, sign-up and password-reset forms, supports Cloudflare Turnstile, and requires the frontend to provide the CAPTCHA token. Supabase also recommends resetting the challenge after an Auth request so tokens are not reused.

### CAPTCHA readiness implementation

Feature branch: `security/auth-captcha-readiness-20260912`.

Files changed/planned:
- new `account-captcha-guard.js` compatibility overlay;
- `account.js` loader version updated to `6.4.16-auth-captcha-1` and loads the new guard immediately after byte-preserved `account-original.js`;
- `.github/workflows/ai-handoff-check.yml` syntax-checks the new guard;
- all three continuity files updated.

`account-original.js` remains byte-for-byte unchanged.

`account-captcha-guard.js`:
- overrides the existing `initTurnstile()` so login/register widget IDs are retained;
- keeps the existing visual challenge containers and callbacks;
- patches the created Supabase Auth client without exposing secrets;
- requires the appropriate existing Turnstile token when a Namdar Turnstile site key is configured;
- injects tokens into `signInWithPassword`, `signInWithOtp`, `signInWithIdToken`, `signUp`, `resetPasswordForEmail`, and `resend`;
- resets/clears the relevant Turnstile challenge after each Auth request, including failed attempts.

No database migration and no environment-variable change are required for this code patch.

### Promotion state

At the time of this handoff edit, branch implementation exists but PR/CI/Vercel preview/merge/production verification are still pending. Do not claim Supabase CAPTCHA itself is enabled yet.

### Required owner action after code is live

In Supabase → Authentication → Attack Protection:
1. switch **Enable Captcha protection** ON;
2. select **Cloudflare Turnstile**;
3. obtain the existing Namdar Turnstile **Secret Key** from the Cloudflare dashboard and paste it directly into Supabase;
4. Save changes.

Never ask the owner to paste the Turnstile secret into chat. Never commit it to GitHub or documentation.

After enabling, run controlled production Auth checks for:
- password sign-in;
- Magic Link request;
- password-reset request;
- Google sign-in;
- signup/confirmation path using a safe synthetic account if practical, followed by cleanup.

## Leaked Password Protection — PLAN-BLOCKED

Supabase Security Advisor / Attack Protection shows leaked-password prevention disabled. Namdar is on Supabase Free and the feature requires Pro or above. Treat this as optional/plan-blocked. Do not upgrade or incur cost without explicit owner approval.

## Applied recent production migrations

- `20260911213820 inbox_spam_controls`
- `20260911213842 inbox_spam_blocklist_fk_index`
- `20260911220343 inbox_security_indexes`
- `20260911220415 harden_invoice_number_function_search_path`
- `20260911230055 require_aal2_for_staff_permissions`

## Remaining launch work

1. Finish CAPTCHA readiness PR → CI → exact Vercel preview → merge → production verification.
2. Then guide owner through enabling Supabase CAPTCHA with Cloudflare Turnstile secret entered directly in the dashboard; run Auth smoke tests.
3. Recheck the same iPhone for homepage overflow and close the regression if it passes.
4. Finish Stripe, SMS, Resend and legal launch configuration.
5. Verify production cron jobs and intended double-booking protections.
6. Run safe recognized-mailbox/unknown-alias inbound behavior test.
7. Complete controlled authenticated customer-support journey when a safe eligible test customer is available.
8. Optional/plan-blocked: leaked-password protection only if owner later chooses Pro or above.

## Required workflow

For substantial work: read `AGENTS.md`, `docs/AI_START.md`, this file, `docs/PROJECT_STATUS.md` and relevant source. Use branch → PR → CI → preview/testing → merge → production verification. Update all three continuity files in the same substantial change. Never include credentials, private customer data, TOTP codes or CAPTCHA secrets.

## Next recommended step

Finish promotion of `security/auth-captcha-readiness-20260912`. Only after the production code is verified should the owner enable hosted Supabase CAPTCHA and enter the Cloudflare Turnstile secret directly into Supabase.
