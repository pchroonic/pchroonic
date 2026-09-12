# Namdar AI fast resume

Last verified: 2026-09-12 UTC

This is the first file every AI/developer should read. It is intentionally short. Use it to resume quickly, then open the detailed handoff/status only as needed.

## Current phase

**Phase 7 — Launch Security & Readiness**

## Current live baseline

- Repository: `pchroonic/pchroonic`, branch `main`.
- Current live product commit: `285b7c3da8215dc24e543f9a6143e565d10e61a7`.
- Production: `https://namdar.co.uk` on Vercel project `namdar-website-starter-1`.
- Backend/Auth: Supabase `namdar-production` (`qjigldxjcpnrlyxgmlqq`).
- Supabase organization plan: **Free**.
- MFA Stage 2 is LIVE and user smoke-tested successfully on 2026-09-12: sign out → sign in → authenticator challenge → Admin/Inbox loaded normally.
- Admin/Staff privileged browser, API and direct-RLS access require AAL2.
- Applied MFA migration: `20260911230055 require_aal2_for_staff_permissions`.
- Customer support tickets remain customer-only; public inbound email remains Admin Email inbox.

## Mobile quote overflow fix — LIVE, REAL-DEVICE CONFIRMATION PENDING

The owner reported an iPhone/mobile homepage regression on 2026-09-12: the quote form could be dragged horizontally, exposing a blank strip on the right.

The fix is now live on production:
- PR #12: `Fix mobile quote horizontal overflow`;
- feature/PR head: `febd6bbaacee5c08273e4ba7b70d8749dc160313`;
- GitHub CI run `34685321573`: success;
- exact Vercel preview: `dpl_8vbLRZdTAUttgXjhfRw2LBtb8sXq`, READY;
- production merge SHA: `285b7c3da8215dc24e543f9a6143e565d10e61a7`;
- production deployment: `dpl_CkWNqBc8JkMuWh77BWYJXkXwP3oA`, READY with `namdar.co.uk`, no alias error;
- canonical `https://namdar.co.uk/conversion.js` and `/mobile-overflow-fix.css?v=20260912` both returned HTTP 200 after deployment.

The patch:
- makes quote/form CSS grid tracks shrink safely with `minmax(0,1fr)` and `min-width:0`;
- constrains native form controls, especially the iOS file input, to the form width;
- adds a homepage-only mobile horizontal viewport guard using `overflow-x:clip` with an older-browser fallback;
- keeps intentionally horizontally scrollable components independent;
- is loaded by the existing homepage-only `conversion.js` through `mobile-overflow-fix.css`.

Local 390px Chromium regression checks passed, but the exact Safari/iPhone symptom was not reproducible in Chromium. **Do not mark the regression fully closed until the owner confirms on the same iPhone that the page no longer slides sideways or reveals the right-side gap.**

No database, Auth, environment-variable, provider or customer-data change was involved.

## Plan-blocked security item

Supabase Security Advisor reports **Leaked Password Protection is disabled**, but Supabase documentation states this feature is available on **Pro plan and above**. The Namdar Supabase organization is currently on the **Free plan**, so this warning cannot be cleared without a paid upgrade.

Do not upgrade Supabase or incur a paid plan change without the owner's explicit approval. Treat Leaked Password Protection as an optional plan-blocked hardening item, not an active blocker for the current Free-plan launch checklist.

## Immediate next action

1. Ask the owner to hard-refresh/reopen `namdar.co.uk` on the same iPhone and verify the quote page can no longer slide horizontally or expose a blank right-side gap.
2. If confirmed, mark the mobile regression closed in all three continuity files.
3. Then resume Supabase Auth production URL configuration:
   - Site URL should be `https://namdar.co.uk`;
   - review the redirect allowlist for stale or unintended test/preview URLs.

Current connected Supabase tools do not expose hosted Auth configuration mutation/readback for the URL settings, so that step may require the Supabase Dashboard.

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
