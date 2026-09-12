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

## Homepage document-level horizontal overflow — ALL-WIDTH FIX LIVE, OWNER CONFIRMATION PENDING

### Reproduction history

The owner first reported the public homepage shifting sideways on iPhone, with a blank strip visible on the right. PR #12 added shrink-safe quote-form grids/native file-input containment and a mobile viewport guard. That removed the visible right-side strip, but a follow-up iPhone screenshot still showed the whole document offset horizontally, with left-side brand/headline/body content clipped.

PR #14 moved the containment stylesheet into the document `<head>`, strengthened mobile root containment and added a mobile x=0 scroll-restoration reset. It deployed successfully, but on 2026-09-12 the owner then supplied a Windows/Edge desktop screenshot of `namdar.co.uk` showing the same class of failure at desktop width:
- a document-level horizontal scrollbar was visible at the bottom;
- the scrollbar was already positioned to the right;
- the left portion of the header and hero was off-screen;
- a large blank region appeared on the right side of the viewport.

Therefore the regression is **not iPhone-only**. Treat it as one cross-device homepage document-width / horizontal scroll-restoration bug.

### All-width implementation now live

Runtime files changed:
- `mobile-overflow-fix.css`;
- `conversion.js`.

The live containment now applies at all viewport widths:
- `html` and `body.conversion-home` use `width:100%`, `min-width:0`, `max-width:100%`, `overflow-x:hidden`, and `overscroll-behavior-x:none` globally;
- top-level homepage `site-header`, `main`, `footer`, `hero` and quote containers are bounded by the viewport;
- desktop hero grid columns use `minmax(0, 1.05fr) minmax(0, .95fr)` rather than plain fractional tracks;
- direct children of key homepage flex/grid containers use `min-width:0`;
- images/video/canvas/svg are capped at `max-width:100%` on the public homepage;
- quote shell/field rows/service choices/progress retain shrink-safe `minmax(0,...)` tracks;
- native file-input containment remains;
- intentional nested horizontal scrollers remain local and capped to the viewport.

`conversion.js` resets the homepage horizontal viewport position to x=0 at **all viewport widths**:
- immediately on execution;
- on the next animation frame;
- on `pageshow`;
- after resize;
- after orientation change;
while preserving the current vertical scroll position.

No database migration, Auth change, environment variable, provider configuration or customer-data change was involved.

### All-width verification and production promotion

- PR #16: `Fix homepage horizontal overflow across all widths`.
- Feature/PR head: `5e05d6d3da1df0ea2049b3c2ca440e2ce304d2c2`.
- GitHub CI run `34686741515`: completed success.
- Exact Vercel preview: `dpl_9AEFL9yKDgSvZGkAqGuKQnQws88a`, READY on exact feature SHA, `aliasError: null`.
- Production merge SHA: `46a635396ae364fe9b5783bc18c3de2b72025efc`.
- Production deployment: `dpl_Bh1kfnpaShf6JwNnzG6N6YvYP1Qh`, READY on exact merge SHA, target production, aliases include `namdar.co.uk`, `aliasError: null`.
- Canonical `https://namdar.co.uk/mobile-overflow-fix.css?v=20260912b` returned HTTP 200 and contains the all-width root containment plus shrink-safe desktop hero tracks.
- Canonical `https://namdar.co.uk/conversion.js?v=20260912b` returned HTTP 200 and contains all-width x=0 restoration reset plus resize handling.

### Remaining verification

Do **not** mark this regression fully closed until the owner confirms both:
- on the Windows/Edge desktop used for the screenshot, the bottom document-level horizontal scrollbar is gone, the page begins at the true left edge, and the large blank right-side area no longer appears;
- on the same iPhone, the page starts flush at the left edge and cannot be dragged sideways.

### Prior fix history

First fix:
- PR #12: `Fix mobile quote horizontal overflow`;
- feature SHA `febd6bbaacee5c08273e4ba7b70d8749dc160313`;
- CI `34685321573`: success;
- preview `dpl_8vbLRZdTAUttgXjhfRw2LBtb8sXq`: READY;
- production merge `285b7c3da8215dc24e543f9a6143e565d10e61a7`;
- production deployment `dpl_CkWNqBc8JkMuWh77BWYJXkXwP3oA`: READY;
- real iPhone follow-up proved left-side clipping remained.

Second fix:
- PR #14: `Harden iPhone homepage horizontal containment`;
- feature SHA `6ae3563725ca280cade0ee6df46d7ed21315c0db`;
- CI `34686101782`: success;
- preview `dpl_Z3Cas7PhEMoLmz5KVa7RM3p4VPXH`: READY;
- production merge `b1c1eb4e29cd03056799e5fbb1af47cf04fec2b1`;
- production deployment `dpl_EqLFLD2VK6QMcN8o7YKz4AKvYAuM`: READY with `namdar.co.uk`, no alias error;
- later Windows/Edge screenshot proved document-level horizontal overflow still existed at desktop width.

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

1. Obtain owner confirmation on both Windows desktop and iPhone for the live all-width overflow fix; if both pass, mark the regression closed in all three continuity files.
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

Get the owner's desktop and iPhone confirmation for the live all-width fix. If both pass, close the regression in continuity, then resume Supabase Auth Site URL / redirect allowlist verification and the remaining launch-readiness checklist.
