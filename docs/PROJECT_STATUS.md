# Namdar project status

Last updated: 2026-09-12 UTC

For fast continuation, read `docs/AI_START.md` first. This file is the broader roadmap/status view.

## Current baseline

- Release documented in `README.md`: v6.4.16.
- Source: GitHub `main` in `pchroonic/pchroonic`.
- Current live product commit before the second iPhone overflow fix: `285b7c3da8215dc24e543f9a6143e565d10e61a7`.
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
| Public website | Live; second iPhone horizontal-overflow fix in verification |
| Customer portal | Session fix + optional customer MFA live |
| Admin workspace | Inbox Security v2 + mandatory privileged MFA/AAL2 live and user smoke-tested |
| Staff PWA | Mandatory privileged MFA/AAL2 live; AAL2 required for offline cached session |
| Server functions | Privileged APIs require AAL2 through central `requireStaff()` wrapper |
| Production DB | Central privileged RLS requires AAL2 |

## Phase 7 — Launch Security & Readiness

### MFA Stage 2 — LIVE AND VERIFIED

The admin authenticator was successfully enrolled before Stage 2. Production currently has 1 verified admin MFA factor.

Enforcement exists at browser, API and database levels:
- Admin/Staff browser bypass removed.
- Privileged users must enroll/verify TOTP and reach AAL2 before privileged UI loads.
- Central Vercel `requireStaff()` requires AAL2 after the existing validated identity/permission check.
- Central Supabase `private.has_staff_permission()` requires AAL2 for direct-client privileged RLS.
- `Staff read own access` requires AAL2.
- Old AAL1 Staff sessions cannot use privacy-limited offline job snapshots until they reconnect and verify.
- Customer/public access policies and customer support-ticket rules are unchanged.

### User smoke test

Passed on 2026-09-12: signed out of Admin, signed back in, completed authenticator challenge, and Admin → Inbox loaded normally. Do not repeat unless a future auth change needs regression testing.

## Mobile homepage overflow — SECOND FIX IN VERIFICATION

The initial production fix (PR #12) removed the visible right-side white strip, but the owner's follow-up iPhone screenshot still showed the entire homepage shifted sideways with left-side clipping of the logo, eyebrow, headline and paragraph. The mobile regression therefore remains open.

Second branch: `fix/ios-root-overflow-20260912`.

Second-fix scope:
- load `mobile-overflow-fix.css` directly in the homepage `<head>` instead of injecting it after page layout;
- cache-bust the stylesheet and `conversion.js`;
- use explicit `overflow-x:hidden` and width/min/max guards on the mobile root/body;
- constrain mobile header, hero, quote and footer containers and shrinkable children to the viewport;
- preserve intentionally local horizontal scrollers;
- keep quote-grid/native-file-input containment;
- reset any restored mobile horizontal scroll position to x=0 immediately, on `pageshow`, and after orientation changes.

No database, Auth, provider, environment-variable or customer-data change is involved.

Verification status:
- source implementation is present on the second-fix branch;
- PR/CI/exact preview/production promotion are pending at this status update;
- final closure requires same-iPhone owner confirmation after deployment.

### First-fix history

- PR #12: `Fix mobile quote horizontal overflow`.
- Feature SHA: `febd6bbaacee5c08273e4ba7b70d8749dc160313`.
- GitHub CI run `34685321573`: success.
- Preview `dpl_8vbLRZdTAUttgXjhfRw2LBtb8sXq`: READY.
- Main merge SHA: `285b7c3da8215dc24e543f9a6143e565d10e61a7`.
- Production deployment `dpl_CkWNqBc8JkMuWh77BWYJXkXwP3oA`: READY.
- Real iPhone follow-up showed the issue was only partially fixed, so do not mark PR #12 as final resolution.

## Deployment verification

MFA Stage 2:
- Stage 2 feature SHA: `d203c64d9e5da3cca049bcb43e988f7432e2864c`.
- PR #8.
- GitHub CI run `34656209581`: success.
- Preview deployment: `dpl_2bfBkHgR4k8SY4hL4AcUrn3NWzzT`, READY.
- Main Stage 2 code SHA: `ece88931bd5e05b26173b25ff7fa75c46b6b4e63`.
- Production deployment: `dpl_Jkb8ZavhqrBD6PLpqjAPnEdiGAsW`, READY with `namdar.co.uk` and no alias error.

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

1. Complete the second iPhone overflow fix PR/CI/preview/production flow and obtain real-device confirmation.
2. Confirm Supabase Auth Site URL is `https://namdar.co.uk` and review the redirect allowlist for stale/unintended URLs.
3. Complete provider launch readiness for Stripe, Turnstile, OAuth, SMS, Resend and legal configuration.
4. Verify production cron jobs and intended double-booking protections.
5. Run safe recognized-mailbox/unknown-alias inbound behavior test.
6. Complete controlled customer-support ticket journey when a safe eligible test customer is available.
7. Optional/plan-blocked: enable Leaked Password Protection only if the owner later chooses Supabase Pro or above.

## Handoff maintenance rule

Any substantial product change must update **all three** continuity files in the same change: `docs/AI_START.md`, `docs/AI_HANDOFF.md`, and `docs/PROJECT_STATUS.md`. CI enforces this for product-source changes. Never include credentials or customer data.
