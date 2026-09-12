# Namdar AI fast resume

Last verified: 2026-09-12 UTC

This is the first file every AI/developer should read. It is intentionally short. Use it to resume quickly, then open the detailed handoff/status only as needed.

## Current phase

**Phase 7 — Launch Security & Readiness**

## Current live baseline

- Repository: `pchroonic/pchroonic`, branch `main`.
- Current live product commit before the second iPhone fix: `285b7c3da8215dc24e543f9a6143e565d10e61a7`.
- Production: `https://namdar.co.uk` on Vercel project `namdar-website-starter-1`.
- Backend/Auth: Supabase `namdar-production` (`qjigldxjcpnrlyxgmlqq`).
- Supabase organization plan: **Free**.
- MFA Stage 2 is LIVE and user smoke-tested successfully on 2026-09-12.
- Admin/Staff privileged browser, API and direct-RLS access require AAL2.
- Applied MFA migration: `20260911230055 require_aal2_for_staff_permissions`.
- Customer support tickets remain customer-only; public inbound email remains Admin Email inbox.

## Mobile horizontal overflow — SECOND FIX IN VERIFICATION

The first mobile containment patch (PR #12) removed the visible right-side white gap, but the owner supplied a second iPhone screenshot showing the whole homepage still shifted sideways: the logo, eyebrow, headline and paragraph were clipped on the left.

That proves the regression was **not fully fixed**. The likely remaining behavior is iOS Safari restoring a prior horizontal scroll position before the dynamically injected containment stylesheet takes effect.

Second fix branch: `fix/ios-root-overflow-20260912`.

Changes on this branch:
- `mobile-overflow-fix.css` is now linked directly from `index.html` in the document `<head>` with a cache-busting query so containment applies before Safari lays out/restores the page;
- mobile root containment now uses `overflow-x:hidden` on both `html` and `body.conversion-home`, plus explicit width/min-width/max-width guards;
- header, hero, quote and footer containers/items are constrained to the mobile viewport;
- quote grid/file-input shrink rules remain in place;
- `conversion.js` no longer injects the stylesheet late;
- `conversion.js` now resets any restored horizontal scroll position to x=0 immediately, on `pageshow`, and after orientation changes;
- `conversion.js` is cache-busted in `index.html`.

No database, Auth, environment-variable, provider or customer-data change is involved.

**Status:** code is on the branch; PR/CI/Vercel preview/production verification and the owner's same-iPhone retest are still required before marking the regression closed.

## Plan-blocked security item

Supabase Security Advisor reports **Leaked Password Protection is disabled**, but the Namdar Supabase organization is on the **Free plan** and the feature requires Pro or above. Treat this as optional/plan-blocked. Do not upgrade without explicit owner approval.

## Immediate next action

1. Complete the second iPhone overflow fix workflow: PR → CI → exact Vercel preview → merge → production verification.
2. Ask the owner to reopen/refresh `namdar.co.uk` on the same iPhone and confirm the page starts flush at the left edge and cannot slide sideways.
3. Only if confirmed, mark the mobile regression closed in all three continuity files.
4. Then resume Supabase Auth Site URL / redirect allowlist verification.

## After that

Continue launch-readiness checks for Stripe, Turnstile, OAuth, SMS, Resend, legal configuration, cron jobs, double-booking protection, inbound alias behavior, and the remaining controlled customer-support test.

## Do not repeat

- Do not claim the first PR #12 fully fixed the iPhone issue; the owner supplied a second screenshot showing left-side clipping remained.
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
