# Namdar AI fast resume

Last verified: 2026-09-12 UTC

This is the first file every AI/developer should read. It is intentionally short. Use it to resume quickly, then open the detailed handoff/status only as needed.

## Current phase

**Phase 7 — Launch Security & Readiness**

## Current live baseline

- Repository: `pchroonic/pchroonic`, branch `main`.
- Current live product commit: `46a635396ae364fe9b5783bc18c3de2b72025efc`.
- Production: `https://namdar.co.uk` on Vercel project `namdar-website-starter-1`.
- Backend/Auth: Supabase `namdar-production` (`qjigldxjcpnrlyxgmlqq`).
- Supabase organization plan: **Free**.
- MFA Stage 2 is LIVE and user smoke-tested successfully on 2026-09-12.
- Admin/Staff privileged browser, API and direct-RLS access require AAL2.
- Applied MFA migration: `20260911230055 require_aal2_for_staff_permissions`.
- Customer support tickets remain customer-only; public inbound email remains Admin Email inbox.

## Homepage horizontal overflow — ALL-WIDTH FIX LIVE, OWNER CONFIRMATION PENDING

The owner first reported homepage horizontal shifting on iPhone, then reproduced the same document-level failure on Windows/Edge desktop: a horizontal page scrollbar, left-side content off-screen, and a large blank area on the right. The bug is cross-device, not iPhone-only.

The all-width fix is now live:
- PR #16: `Fix homepage horizontal overflow across all widths`;
- feature/PR head: `5e05d6d3da1df0ea2049b3c2ca440e2ce304d2c2`;
- GitHub CI run `34686741515`: success;
- exact Vercel preview: `dpl_9AEFL9yKDgSvZGkAqGuKQnQws88a`, READY, no alias error;
- production merge SHA: `46a635396ae364fe9b5783bc18c3de2b72025efc`;
- production deployment: `dpl_Bh1kfnpaShf6JwNnzG6N6YvYP1Qh`, READY with `namdar.co.uk`, no alias error;
- live `/mobile-overflow-fix.css?v=20260912b` returned HTTP 200 with all-width root containment and shrink-safe desktop hero columns;
- live `/conversion.js?v=20260912b` returned HTTP 200 with x=0 restoration reset for all viewport widths.

Implementation now live:
- `html` and `body.conversion-home` use `width:100%`, `min-width:0`, `max-width:100%`, `overflow-x:hidden`, and horizontal overscroll containment at all viewport widths;
- top-level homepage header/main/footer/hero/quote containers are capped to the viewport;
- desktop hero grid uses shrink-safe `minmax(0,...)` tracks and key grid/flex children use `min-width:0`;
- quote-grid/native-file-input containment remains;
- intentional nested horizontal scrollers remain local;
- `conversion.js` resets restored horizontal position to x=0 on load, `pageshow`, resize and orientation change.

No database, Auth, environment-variable, provider or customer-data change was involved.

**Do not mark the regression fully closed until the owner confirms on both the Windows desktop and the same iPhone that the page begins at the true left edge and there is no document-level horizontal scrolling or blank right-side area.**

## Plan-blocked security item

Supabase Security Advisor reports **Leaked Password Protection is disabled**, but Namdar is on the Supabase **Free plan** and the feature requires Pro or above. Treat it as optional/plan-blocked. Do not upgrade without explicit owner approval.

## Immediate next action

1. Ask the owner to hard-refresh/reopen `namdar.co.uk` on the Windows desktop shown in the screenshot and confirm the bottom document-level horizontal scrollbar is gone and the full left side is visible.
2. Recheck the same iPhone and confirm the page cannot slide sideways.
3. Only if both pass, mark the regression closed in all three continuity files.
4. Then resume Supabase Auth Site URL / redirect allowlist verification.

## After that

Continue launch-readiness checks for Stripe, Turnstile, OAuth, SMS, Resend, legal configuration, cron jobs, double-booking protection, inbound alias behavior, and the remaining controlled customer-support test.

## Do not repeat

- Do not describe this regression as iPhone-only; it was also reproduced on Windows/Edge desktop.
- Do not claim PR #12 or PR #14 fully closed the overflow regression.
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
