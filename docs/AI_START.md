# Namdar AI fast resume

Last verified: 2026-09-12 UTC

This is the first file every AI/developer should read. It is intentionally short. Use it to resume quickly, then open the detailed handoff/status only as needed.

## Current phase

**Phase 7 — Launch Security & Readiness**

## Current live baseline

- Repository: `pchroonic/pchroonic`, branch `main`.
- Current main continuity baseline: `c08a97a22acea924615e10b21da85856bbd14a75`.
- Current live runtime product commit: `46a635396ae364fe9b5783bc18c3de2b72025efc`.
- Production: `https://namdar.co.uk` on Vercel project `namdar-website-starter-1`.
- Backend/Auth: Supabase `namdar-production` (`qjigldxjcpnrlyxgmlqq`).
- Supabase organization plan: **Free**.
- MFA Stage 2 is LIVE and user smoke-tested successfully on 2026-09-12.
- Admin/Staff privileged browser, API and direct-RLS access require AAL2.
- Applied MFA migration: `20260911230055 require_aal2_for_staff_permissions`.
- Customer support tickets remain customer-only; public inbound email remains Admin Email inbox.

## Homepage horizontal overflow

The all-width homepage containment fix is live from PR #16 / production runtime SHA `46a635396ae364fe9b5783bc18c3de2b72025efc`.

Owner verification:
- Windows/Edge desktop: **CONFIRMED FIXED on 2026-09-12**. The owner reported `fixed` after the all-width production deployment.
- iPhone: final same-device confirmation is still pending. Do not call the cross-device regression fully closed until the iPhone check also passes.

## Supabase Auth URL Configuration — COMPLETE

Owner verified the Supabase Dashboard URL Configuration page and then applied the cleanup on 2026-09-12.

Final intended production configuration:
- Site URL: `https://namdar.co.uk`
- Redirect allowlist: `https://namdar.co.uk/**`

Removed from the allowlist:
- `https://namdar-website-starter-1-pooyamdi-8267.vercel.app/`
- `https://namdar-website-starter-1-pooyamdi-8267.vercel.app/**`
- `https://namdar-*-website-starter-1-pooyamdi-8267.vercel.app`
- `https://namdar-*-website-starter-1-pooyamdi-8267.vercel.app/**`

The owner confirmed `done` after saving the dashboard changes. Connected Supabase tools do not expose hosted Auth URL-setting readback, so treat this as owner-verified dashboard state rather than connector-verified state.

## Plan-blocked security item

Supabase Security Advisor reports **Leaked Password Protection is disabled**, but Namdar is on the Supabase **Free plan** and the feature requires Pro or above. Treat it as optional/plan-blocked. Do not upgrade without explicit owner approval.

## Immediate next action

Open **Supabase → Authentication → Sign In / Providers** and review which login providers are enabled.

Repository code search on 2026-09-12 found no `signInWithOAuth`, `signInWithOtp`, or explicit OAuth provider usage in the current Namdar source. Therefore do not enable extra providers just because Supabase offers them. Verify that only providers actually intended for Namdar are enabled and that Email/password behavior matches the live login flow.

Ask the owner for a screenshot of the **Sign In / Providers** page before changing anything.

## After that

Continue launch-readiness checks for Turnstile/attack protection, Stripe, SMS, Resend, legal configuration, cron jobs, double-booking protection, inbound alias behavior, and the remaining controlled customer-support test.

## Do not repeat

- Do not re-open the Supabase URL Configuration cleanup unless an auth redirect problem appears; the owner completed it on 2026-09-12.
- Do not describe the overflow regression as iPhone-only; it was also reproduced on Windows/Edge desktop.
- Do not repeat the MFA Stage 2 smoke test unless a future auth change requires regression testing.
- Do not rebuild MFA Stage 1/2; it is already live.
- Do not reapply migration `20260911230055`.
- Do not upgrade Supabase without explicit owner approval.
- Do not make support tickets public.
- Do not move Namdar back to Netlify; production is Vercel.
- Do not expose or commit secrets, access tokens, customer data, passwords or TOTP codes.

## Resume protocol

For a simple continuation/status task:
1. Read this file.
2. Verify current `main` HEAD and relevant live provider state before acting.
3. Read only the relevant sections of `docs/AI_HANDOFF.md`, `docs/PROJECT_STATUS.md`, README and code.

For any substantial production/code/database/security change:
1. Read this file.
2. Read `docs/AI_HANDOFF.md` and `docs/PROJECT_STATUS.md` completely.
3. Read `AGENTS.md` and relevant README/code.
4. Use branch → PR → CI → Vercel preview/testing → merge → production verification.

## Automatic continuity rule

Every substantial change must update all three continuity files in the same change:
- `docs/AI_START.md`
- `docs/AI_HANDOFF.md`
- `docs/PROJECT_STATUS.md`

CI is configured to enforce this for product-source changes.
