# Namdar AI fast resume

Last verified: 2026-09-12 UTC

This is the first file every AI/developer should read. It is intentionally short. Use it to resume quickly, then open the detailed handoff/status only as needed.

## Current phase

**Phase 7 — Launch Security & Readiness**

## Current live baseline

- Repository: `pchroonic/pchroonic`, branch `main`.
- Latest verified product/security code baseline: `ece88931bd5e05b26173b25ff7fa75c46b6b4e63`.
- Production: `https://namdar.co.uk` on Vercel project `namdar-website-starter-1`.
- Backend/Auth: Supabase `namdar-production` (`qjigldxjcpnrlyxgmlqq`).
- Supabase organization plan: **Free**.
- MFA Stage 2 is LIVE and user smoke-tested successfully on 2026-09-12: sign out → sign in → authenticator challenge → Admin/Inbox loaded normally.
- Admin/Staff privileged browser, API and direct-RLS access require AAL2.
- Applied MFA migration: `20260911230055 require_aal2_for_staff_permissions`.
- Customer support tickets remain customer-only; public inbound email remains Admin Email inbox.

## Plan-blocked security item

Supabase Security Advisor reports **Leaked Password Protection is disabled**, but Supabase documentation states this feature is available on **Pro plan and above**. The Namdar Supabase organization is currently on the **Free plan**, so this warning cannot be cleared without a paid upgrade.

Do not upgrade Supabase or incur a paid plan change without the owner's explicit approval. Treat Leaked Password Protection as an optional plan-blocked hardening item, not an active blocker for the current Free-plan launch checklist.

## Immediate next action

Verify Supabase Auth production URL configuration:
1. Confirm the Site URL is `https://namdar.co.uk`.
2. Confirm the redirect allowlist contains only intended Namdar production/auth callback URLs and no stale test/preview URLs that should not remain.
3. Record the verified settings without storing secrets.

Current connected Supabase tools do not expose hosted Auth configuration mutation/readback for these settings, so this may require the Supabase Dashboard.

## After that

Continue launch-readiness checks for Stripe, Turnstile, OAuth, SMS, Resend, legal configuration, cron jobs, double-booking protection, inbound alias behavior, and the remaining controlled customer-support test.

## Do not repeat

- Do not repeat the MFA Stage 2 smoke test unless a future auth change requires regression testing; it passed on 2026-09-12.
- Do not rebuild MFA Stage 1/2; it is already live.
- Do not reapply migration `20260911230055`.
- Do not repeatedly ask to enable Leaked Password Protection while Supabase remains on Free; it requires Pro or above.
- Do not upgrade Supabase without explicit owner approval.
- Do not make support tickets public.
- Do not move Namdar back to Netlify; production is Vercel.
- Do not expose or commit secrets, access tokens, customer data, passwords or TOTP codes.

## Resume protocol

For a simple continuation/status task:
1. Read this file.
2. Verify the current `main` HEAD and the relevant live provider state before acting.
3. Read only the relevant sections of `docs/AI_HANDOFF.md`, `docs/PROJECT_STATUS.md`, README and code.

For any substantial production/code/database/security change:
1. Read this file.
2. Read `docs/AI_HANDOFF.md` and `docs/PROJECT_STATUS.md` completely.
3. Read `AGENTS.md` and relevant README/code.
4. Use branch → PR → CI → preview/testing → merge → production verification.

## Automatic continuity rule

Every substantial change must update all three continuity files in the same change:
- `docs/AI_START.md` — short current state + exact next action.
- `docs/AI_HANDOFF.md` — detailed technical continuity.
- `docs/PROJECT_STATUS.md` — broader roadmap/status.

CI is configured to fail product-source changes that do not update all three. The owner should not need to remind the AI to maintain them.
