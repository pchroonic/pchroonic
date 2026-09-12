# Namdar AI fast resume

Last verified: 2026-09-12 UTC

This is the first file every AI/developer should read. It is intentionally short. Use it to resume quickly, then open the detailed handoff/status only as needed.

## Current phase

**Phase 7 — Launch Security & Readiness**

## Current live baseline

- Repository: `pchroonic/pchroonic`, branch `main`.
- Current live product commit before the all-width overflow fix: `b1c1eb4e29cd03056799e5fbb1af47cf04fec2b1`.
- Production: `https://namdar.co.uk` on Vercel project `namdar-website-starter-1`.
- Backend/Auth: Supabase `namdar-production` (`qjigldxjcpnrlyxgmlqq`).
- Supabase organization plan: **Free**.
- MFA Stage 2 is LIVE and user smoke-tested successfully on 2026-09-12.
- Admin/Staff privileged browser, API and direct-RLS access require AAL2.
- Applied MFA migration: `20260911230055 require_aal2_for_staff_permissions`.
- Customer support tickets remain customer-only; public inbound email remains Admin Email inbox.

## Homepage horizontal overflow — ALL-WIDTH FIX IN VERIFICATION

The owner first reported the homepage shifting horizontally on iPhone. PR #12 and PR #14 improved mobile containment, but on 2026-09-12 the owner supplied a Windows/Edge desktop screenshot showing the same document-level problem at desktop width: a horizontal page scrollbar was present, the page had been scrolled to the right, left-side header/hero content was missing, and a large blank area appeared on the right.

This proves the bug is not iPhone-only. Treat it as one cross-device homepage overflow/scroll-restoration regression.

Current fix branch: `fix/homepage-horizontal-overflow-all-widths-20260912`.

Changes on the branch:
- homepage `html` and `body.conversion-home` now use width/min/max containment and `overflow-x:hidden` at **all viewport widths**;
- top-level homepage header/main/footer/hero/quote containers are capped to the viewport;
- desktop hero grid now uses shrink-safe `minmax(0, ...)` columns and key grid/flex children get `min-width:0`;
- quote-grid/native-file-input containment remains;
- intentionally horizontally scrollable inner components remain local scroll containers;
- `conversion.js` now resets homepage horizontal scroll position to x=0 on all viewport widths, including initial load, `pageshow`, resize and orientation change.

No database, Auth, environment-variable, provider or customer-data change is involved.

**Status:** code exists on the branch. PR/CI/exact Vercel preview/production verification and owner rechecks on desktop + iPhone are still required before closing the regression.

## Plan-blocked security item

Supabase Security Advisor reports **Leaked Password Protection is disabled**, but Namdar is on the Supabase **Free plan** and the feature requires Pro or above. Treat it as optional/plan-blocked. Do not upgrade without explicit owner approval.

## Immediate next action

1. Complete the all-width overflow fix workflow: PR → CI → exact Vercel preview → merge → production verification.
2. Ask the owner to refresh/reopen `namdar.co.uk` on the same Windows desktop and same iPhone.
3. Confirm there is no document-level horizontal scrollbar/drag, the page begins at the true left edge, and no large blank right-side area appears.
4. Only after both checks pass, mark the regression closed in all three continuity files.
5. Then resume Supabase Auth Site URL / redirect allowlist verification.

## After that

Continue launch-readiness checks for Stripe, Turnstile, OAuth, SMS, Resend, legal configuration, cron jobs, double-booking protection, inbound alias behavior, and the remaining controlled customer-support test.

## Do not repeat

- Do not describe this as iPhone-only; the owner reproduced document-level horizontal overflow on Windows desktop too.
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
