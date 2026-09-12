# Namdar AI fast resume

Last verified: 2026-09-12 UTC

This is the first file every AI/developer should read. It is intentionally short. Use it to resume quickly, then open the detailed handoff/status only as needed.

## Current phase

**Phase 7 — Launch Security & Readiness**

## Current live baseline

- Repository: `pchroonic/pchroonic`, branch `main`.
- Current live product commit: `b1c1eb4e29cd03056799e5fbb1af47cf04fec2b1`.
- Production: `https://namdar.co.uk` on Vercel project `namdar-website-starter-1`.
- Backend/Auth: Supabase `namdar-production` (`qjigldxjcpnrlyxgmlqq`).
- Supabase organization plan: **Free**.
- MFA Stage 2 is LIVE and user smoke-tested successfully on 2026-09-12.
- Admin/Staff privileged browser, API and direct-RLS access require AAL2.
- Applied MFA migration: `20260911230055 require_aal2_for_staff_permissions`.
- Customer support tickets remain customer-only; public inbound email remains Admin Email inbox.

## Mobile horizontal overflow — SECOND FIX LIVE, SAME-IPHONE CONFIRMATION PENDING

The first mobile containment patch (PR #12) removed the visible right-side white gap, but the owner's second iPhone screenshot showed the whole homepage still shifted sideways with the logo, eyebrow, headline and paragraph clipped on the left. PR #12 was therefore only a partial fix.

Second-stage fix is now live:
- PR #14: `Harden iPhone homepage horizontal containment`;
- feature/PR head: `6ae3563725ca280cade0ee6df46d7ed21315c0db`;
- GitHub CI run `34686101782`: success;
- exact Vercel preview: `dpl_Z3Cas7PhEMoLmz5KVa7RM3p4VPXH`, READY, no alias error;
- production merge SHA: `b1c1eb4e29cd03056799e5fbb1af47cf04fec2b1`;
- production deployment: `dpl_EqLFLD2VK6QMcN8o7YKz4AKvYAuM`, READY with `namdar.co.uk`, no alias error;
- live homepage returned HTTP 200 and includes `/mobile-overflow-fix.css?v=20260912b` directly in the document `<head>`;
- live `conversion.js?v=20260912b` returned HTTP 200 and contains the x=0 Safari restoration reset;
- live `mobile-overflow-fix.css?v=20260912b` returned HTTP 200 and contains explicit mobile root `overflow-x:hidden` plus width/min/max containment.

Second-stage implementation:
- containment CSS loads in `<head>` before Safari layout/scroll restoration;
- mobile `html` and homepage body use `overflow-x:hidden`, `width:100%`, `min-width:0`, and `max-width:100%`;
- header, hero, quote and footer containers/items are constrained to viewport width;
- quote grid/file-input shrink rules remain;
- `conversion.js` resets restored horizontal scroll position to x=0 immediately, on `pageshow`, and after orientation changes;
- stylesheet and JS are cache-busted so the iPhone does not retain the old late-loading fix.

No database, Auth, environment-variable, provider or customer-data change was involved.

**Do not mark the regression fully closed until the owner retests on the same iPhone and confirms the page starts flush at the left edge and cannot slide sideways.**

## Plan-blocked security item

Supabase Security Advisor reports **Leaked Password Protection is disabled**, but the Namdar Supabase organization is on the **Free plan** and the feature requires Pro or above. Treat this as optional/plan-blocked. Do not upgrade without explicit owner approval.

## Immediate next action

1. Ask the owner to fully close/reopen or refresh `namdar.co.uk` on the same iPhone.
2. Confirm the homepage starts at the true left edge: logo/headline/text are not clipped and the page cannot be dragged horizontally.
3. If confirmed, mark the mobile regression closed in all three continuity files.
4. Then resume Supabase Auth Site URL / redirect allowlist verification.

## After that

Continue launch-readiness checks for Stripe, Turnstile, OAuth, SMS, Resend, legal configuration, cron jobs, double-booking protection, inbound alias behavior, and the remaining controlled customer-support test.

## Do not repeat

- Do not claim PR #12 fully fixed the iPhone issue; the follow-up screenshot proved left-side clipping remained.
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
4. Use branch → PR → CI → preview/testing → merge → production verification.

## Automatic continuity rule

Every substantial change must update all three continuity files in the same change:
- `docs/AI_START.md`
- `docs/AI_HANDOFF.md`
- `docs/PROJECT_STATUS.md`

CI is configured to enforce this for product-source changes.
