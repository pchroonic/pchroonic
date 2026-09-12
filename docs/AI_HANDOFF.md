# Namdar AI handoff

Last verified: 2026-09-12 UTC

Read `docs/AI_START.md` first for the compact current state and immediate next action. Use this file for detailed technical continuity. Never store secret values or private customer data here.

## Source of truth

- Product: Namdar, UK exterior-cleaning and handyman service platform.
- Repository: `pchroonic/pchroonic`, default branch `main`.
- Hosting: Vercel project `namdar-website-starter-1`.
- Canonical domain: `https://namdar.co.uk`.
- Backend: Supabase project `namdar-production` (`qjigldxjcpnrlyxgmlqq`).
- Supabase organization plan: **Free**.
- Current documented release heading: Namdar v6.4.16.

Repository plus verified provider state are the source of truth.

## Fast-resume continuity model

Namdar uses three continuity layers:
- `docs/AI_START.md` — compact current state, exact next action, blockers and do-not-repeat notes.
- `docs/AI_HANDOFF.md` — detailed technical continuity, migrations, deployment checks and implementation decisions.
- `docs/PROJECT_STATUS.md` — broader roadmap and launch status.

CI requires all three to be updated with any product-source change.

## Support model — unchanged

Customer support tickets remain private to signed-in customers with an existing quote, booking, subscription or project. Public visitors use quote/chat/email. External inbound email remains in Admin → Email inbox and does not become a customer support ticket.

## Phase 7 — Launch Security & Readiness

### MFA Stage 2 — LIVE AND USER-VERIFIED

The administrator successfully enrolled TOTP before Stage 2. Production has 1 verified MFA factor for 1 admin user.

Stage 2 remains enforced at browser/Admin/Staff, central Vercel API and direct Supabase RLS layers. Applied production migration: `20260911230055 require_aal2_for_staff_permissions`. User production smoke test passed on 2026-09-12: full Admin sign-out, fresh sign-in, authenticator challenge completed, and Admin → Inbox loaded normally. Do not repeat unless a future auth change requires regression testing.

Stage 2 references:
- feature commit `d203c64d9e5da3cca049bcb43e988f7432e2864c`;
- PR #8;
- GitHub CI `34656209581`: success;
- preview `dpl_2bfBkHgR4k8SY4hL4AcUrn3NWzzT`: READY;
- main code SHA `ece88931bd5e05b26173b25ff7fa75c46b6b4e63`;
- production `dpl_Jkb8ZavhqrBD6PLpqjAPnEdiGAsW`: READY with `namdar.co.uk`.

## Mobile homepage horizontal-overflow regression — SECOND FIX LIVE, SAME-IPHONE CONFIRMATION PENDING

### History

The owner first reported an iPhone screenshot where the homepage could be panned horizontally and a blank strip appeared on the right. PR #12 added shrink-safe quote grids/file-input containment plus a dynamically loaded mobile viewport guard. That production deployment removed the visible right-side blank strip, but a second real-iPhone screenshot showed the entire document still shifted sideways: the logo, eyebrow, headline and paragraph were clipped on the left. PR #12 must therefore be treated as a partial fix, not final resolution.

### Second-stage cause/remediation

The first containment stylesheet was injected by `conversion.js` at the end of the document. iOS Safari can restore an old horizontal scroll position before that late stylesheet arrives. The second-stage fix removes that timing window and also explicitly resets any restored x offset.

Implementation now live:
- `index.html` links `/mobile-overflow-fix.css?v=20260912b` directly in `<head>` immediately after the main stylesheet;
- `index.html` loads cache-busted `conversion.js?v=20260912b`;
- `mobile-overflow-fix.css` uses `overflow-x:hidden` on both `html` and `body.conversion-home` for mobile widths;
- mobile root/body use explicit `width:100%`, `min-width:0`, `max-width:100%`, and horizontal overscroll containment;
- header, main, footer, hero, hero copy/panel/visual, quote section/form/result and key children are constrained to viewport width;
- mobile header brand/menu/actions receive shrink-safe flex constraints;
- quote grid shrink rules and iOS native file-input containment remain;
- local intentionally scrollable strips remain local scroll containers rather than being globally disabled;
- `conversion.js` no longer dynamically creates the stylesheet;
- `conversion.js` adds `resetHorizontalViewport()` to force x=0 while preserving y, on initial execution, next animation frame, `pageshow`, and after orientation changes.

No database migration, Auth change, environment variable, provider configuration or customer-data change was involved.

### Second-stage verification and production promotion

- PR #14: `Harden iPhone homepage horizontal containment`.
- Feature/PR head: `6ae3563725ca280cade0ee6df46d7ed21315c0db`.
- GitHub CI run `34686101782`: completed success.
- Exact Vercel preview: `dpl_Z3Cas7PhEMoLmz5KVa7RM3p4VPXH`, READY on exact feature SHA, `aliasError: null`.
- Production merge SHA: `b1c1eb4e29cd03056799e5fbb1af47cf04fec2b1`.
- Production deployment: `dpl_EqLFLD2VK6QMcN8o7YKz4AKvYAuM`, READY on exact merge SHA, target production, aliases include `namdar.co.uk`, `aliasError: null`.
- Canonical `https://namdar.co.uk/` returned HTTP 200 and contains `/mobile-overflow-fix.css?v=20260912b` in the document `<head>` plus `conversion.js?v=20260912b` at the end of the page.
- Canonical `https://namdar.co.uk/conversion.js?v=20260912b` returned HTTP 200 and contains the mobile x=0 restoration reset.
- Canonical `https://namdar.co.uk/mobile-overflow-fix.css?v=20260912b` returned HTTP 200 and contains the stronger mobile root `overflow-x:hidden` and width/min/max containment.

### Remaining verification

Do **not** mark this regression fully closed until the owner retests on the same iPhone and confirms:
- the page starts flush at the true left edge;
- the brand/headline/body text are no longer clipped;
- the page cannot be dragged horizontally to reveal a gap.

### First-fix history for reference

- PR #12: `Fix mobile quote horizontal overflow`;
- feature SHA `febd6bbaacee5c08273e4ba7b70d8749dc160313`;
- CI `34685321573`: success;
- preview `dpl_8vbLRZdTAUttgXjhfRw2LBtb8sXq`: READY;
- production merge `285b7c3da8215dc24e543f9a6143e565d10e61a7`;
- production deployment `dpl_CkWNqBc8JkMuWh77BWYJXkXwP3oA`: READY;
- real iPhone follow-up proved left-side clipping remained afterward.

## Security advisor state

Existing findings remain:
- INFO: eight server-only operational tables have RLS enabled with no authenticated policies; intentional for tables accessed through service-role server code.
- WARN: **Leaked Password Protection is disabled** in hosted Supabase Auth.

Namdar is on Supabase Free and leaked-password protection requires Pro or above. Treat it as optional/plan-blocked and do not upgrade without explicit owner approval.

## Applied production migrations relevant to current work

- `20260911213820 inbox_spam_controls`
- `20260911213842 inbox_spam_blocklist_fk_index`
- `20260911220343 inbox_security_indexes`
- `20260911220415 harden_invoice_number_function_search_path`
- `20260911230055 require_aal2_for_staff_permissions`

## Remaining launch work

1. Obtain same-iPhone owner confirmation for the second-stage overflow fix; if confirmed, mark the regression closed in all three continuity files.
2. Verify Supabase Auth Site URL is `https://namdar.co.uk` and review redirect allowlist for stale/unintended URLs.
3. Finish launch checks for Stripe, Turnstile, OAuth providers, SMS provider, Resend and legal configuration.
4. Verify booking-notification/account-purge cron jobs and intended double-booking protection.
5. Run safe recognized-mailbox/unknown-alias inbound behavior test.
6. Complete controlled authenticated customer-support ticket test when a safe test customer is available.
7. Optional/plan-blocked: enable Supabase Leaked Password Protection only if the owner later chooses Pro or above.

## Required workflow

1. Read `docs/AI_START.md` first.
2. For substantial work, read this file, `docs/PROJECT_STATUS.md` and `AGENTS.md` completely.
3. Inspect repository/provider state before changing anything.
4. Use branch → PR → CI → Vercel preview/testing → merge → production verification.
5. Update `docs/AI_START.md`, this file and `docs/PROJECT_STATUS.md` in the same substantial product change.
6. Never include credentials or private customer data.

## Next recommended step

Get the owner's same-iPhone confirmation for the live second-stage overflow fix. If confirmed, close the regression in continuity, then resume Supabase Auth Site URL / redirect allowlist verification and the remaining provider launch-readiness checklist.
