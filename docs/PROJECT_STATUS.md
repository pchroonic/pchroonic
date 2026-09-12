# Namdar project status

Last updated: 2026-09-12 UTC

For fast continuation, read `docs/AI_START.md` first. This file is the broader roadmap/status view.

## Current baseline

- Release documented in `README.md`: v6.4.16.
- Source: GitHub `main` in `pchroonic/pchroonic`.
- Current live product commit: `b1c1eb4e29cd03056799e5fbb1af47cf04fec2b1`.
- Delivery: Vercel project `namdar-website-starter-1`, canonical domain `namdar.co.uk`.
- Data/auth/storage: Supabase `namdar-production` (`qjigldxjcpnrlyxgmlqq`).
- Supabase organization plan: **Free**.
- Application: static multi-page front end plus Vercel Node serverless APIs.

## Continuity system

Namdar has a three-layer AI handoff system:
- `docs/AI_START.md` — fast resume, exact current step and do-not-repeat notes.
- `docs/AI_HANDOFF.md` — detailed technical handoff.
- `docs/PROJECT_STATUS.md` — this broader roadmap/status file.

CI requires all three files to change whenever product-source files change.

## Main product areas

| Area | Status |
| --- | --- |
| Public website | Live; second-stage iPhone horizontal-overflow fix deployed, same-device confirmation pending |
| Customer portal | Session fix + optional customer MFA live |
| Admin workspace | Inbox Security v2 + mandatory privileged MFA/AAL2 live and user smoke-tested |
| Staff PWA | Mandatory privileged MFA/AAL2 live; AAL2 required for offline cached session |
| Server functions | Privileged APIs require AAL2 through central `requireStaff()` wrapper |
| Production DB | Central privileged RLS requires AAL2 |

## Phase 7 — Launch Security & Readiness

### MFA Stage 2 — LIVE AND VERIFIED

MFA Stage 2 is live at browser/Admin/Staff, central Vercel API and Supabase RLS layers. The admin sign-out/sign-in/authenticator/Admin Inbox production smoke test passed on 2026-09-12. Do not repeat unless a future auth change requires regression testing.

References:
- PR #8;
- CI `34656209581`: success;
- preview `dpl_2bfBkHgR4k8SY4hL4AcUrn3NWzzT`: READY;
- main Stage 2 code SHA `ece88931bd5e05b26173b25ff7fa75c46b6b4e63`;
- production `dpl_Jkb8ZavhqrBD6PLpqjAPnEdiGAsW`: READY.

## Mobile homepage overflow — SECOND-STAGE FIX LIVE, IPHONE CONFIRMATION PENDING

The first production fix (PR #12) removed the visible right-side white strip, but the owner's follow-up iPhone screenshot still showed the entire homepage shifted sideways with left-side clipping of the logo, eyebrow, headline and paragraph. The regression therefore remained open.

The second-stage fix is now deployed:
- PR #14: `Harden iPhone homepage horizontal containment`;
- feature SHA `6ae3563725ca280cade0ee6df46d7ed21315c0db`;
- GitHub CI run `34686101782`: success;
- exact preview `dpl_Z3Cas7PhEMoLmz5KVa7RM3p4VPXH`: READY on exact feature SHA with no alias error;
- main merge SHA `b1c1eb4e29cd03056799e5fbb1af47cf04fec2b1`;
- production deployment `dpl_EqLFLD2VK6QMcN8o7YKz4AKvYAuM`: READY on exact merge SHA with `namdar.co.uk` and no alias error.

Second-stage scope:
- load `mobile-overflow-fix.css?v=20260912b` directly in the homepage `<head>` before layout/restoration;
- load cache-busted `conversion.js?v=20260912b`;
- apply mobile root/body `overflow-x:hidden`, `width:100%`, `min-width:0`, and `max-width:100%`;
- constrain header, hero, quote and footer containers/children to viewport width;
- preserve local horizontal scrollers;
- retain quote-grid and native-file-input shrink containment;
- reset any restored mobile horizontal scroll position to x=0 initially, on `pageshow`, and after orientation changes.

Canonical production verification after deployment:
- `/` returned HTTP 200 and includes the mobile stylesheet in `<head>`;
- `/conversion.js?v=20260912b` returned HTTP 200 and includes the x=0 reset logic;
- `/mobile-overflow-fix.css?v=20260912b` returned HTTP 200 and includes the stronger mobile root containment.

No database, Auth, provider, environment-variable or customer-data change was part of this fix.

**Remaining:** same-iPhone confirmation is required before closing the regression. Confirm the page starts flush at the true left edge, text/logo are not clipped, and the document cannot be dragged horizontally.

### First-fix history

- PR #12: `Fix mobile quote horizontal overflow`;
- feature SHA `febd6bbaacee5c08273e4ba7b70d8749dc160313`;
- CI `34685321573`: success;
- preview `dpl_8vbLRZdTAUttgXjhfRw2LBtb8sXq`: READY;
- main merge `285b7c3da8215dc24e543f9a6143e565d10e61a7`;
- production `dpl_CkWNqBc8JkMuWh77BWYJXkXwP3oA`: READY;
- real iPhone follow-up showed remaining left clipping, so PR #12 was only a partial fix.

## Database/Auth verification

Applied migration:
- `20260911230055 require_aal2_for_staff_permissions`

Verified after migration:
- central `private.has_staff_permission()` includes AAL2 requirement;
- `Staff read own access` policy includes AAL2 requirement;
- controlled database test: AAL1 denied, AAL2 allowed for the same active administrator identity;
- post-migration Security Advisor reported no new Stage 2 regression.

## Security advisor state

Existing findings remain:
- INFO: 8 operational/server-only tables have RLS enabled with no authenticated policies; intentional.
- WARN: Supabase Auth **Leaked Password Protection is disabled**.

Namdar is on Supabase Free and leaked-password protection requires Pro or above, so it remains optional/plan-blocked. Do not upgrade without explicit owner approval.

## Applied production migrations relevant to recent security work

- `20260911213820 inbox_spam_controls`
- `20260911213842 inbox_spam_blocklist_fk_index`
- `20260911220343 inbox_security_indexes`
- `20260911220415 harden_invoice_number_function_search_path`
- `20260911230055 require_aal2_for_staff_permissions`

## Outstanding work

1. Obtain same-iPhone confirmation for the live second-stage horizontal-overflow fix; if confirmed, mark the regression closed.
2. Confirm Supabase Auth Site URL is `https://namdar.co.uk` and review redirect allowlist for stale/unintended URLs.
3. Complete provider launch readiness for Stripe, Turnstile, OAuth, SMS, Resend and legal configuration.
4. Verify production cron jobs and intended double-booking protections.
5. Run safe recognized-mailbox/unknown-alias inbound behavior test.
6. Complete controlled customer-support ticket journey when a safe eligible test customer is available.
7. Optional/plan-blocked: enable Leaked Password Protection only if the owner later chooses Supabase Pro or above.

## Handoff maintenance rule

Any substantial product change must update **all three** continuity files in the same change: `docs/AI_START.md`, `docs/AI_HANDOFF.md`, and `docs/PROJECT_STATUS.md`. CI enforces this for product-source changes. Never include credentials or customer data.
