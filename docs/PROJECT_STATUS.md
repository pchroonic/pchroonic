# Namdar project status

Last updated: 2026-09-12 UTC

For fast continuation, read `docs/AI_START.md` first. This file is the broader roadmap/status view.

## Current baseline

- Release documented in `README.md`: v6.4.16.
- Source: GitHub `main` in `pchroonic/pchroonic`.
- Delivery: Vercel project `namdar-website-starter-1`, canonical domain `namdar.co.uk`.
- Data/auth/storage: Supabase `namdar-production` (`qjigldxjcpnrlyxgmlqq`).
- Supabase organization plan: **Free**.
- Application: static multi-page front end plus Vercel Node serverless APIs.

## Continuity system

Namdar has a three-layer AI handoff system:
- `docs/AI_START.md` — fast resume, exact current step and do-not-repeat notes.
- `docs/AI_HANDOFF.md` — detailed technical handoff.
- `docs/PROJECT_STATUS.md` — this broader roadmap/status file.

CI requires all three files to change whenever product-source files change, reducing the chance that ChatGPT/Claude finishes work without recording the next step.

## Main product areas

| Area | Status |
| --- | --- |
| Public website | Live; mobile quote horizontal-overflow hotfix in verification |
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

Passed on 2026-09-12:
- signed out of Admin completely;
- signed back in normally;
- authenticator challenge appeared and was completed;
- Admin → Inbox loaded normally.

This smoke test is complete and should not be repeated unless a future auth change needs regression testing.

## Mobile homepage overflow hotfix — IN VERIFICATION

The owner reported on 2026-09-12 that the homepage quote form on iPhone could slide horizontally and show a blank white gap on the right. The screenshot showed the left edge clipped by a similar amount, confirming document-level horizontal overflow/panning rather than ordinary right padding.

Branch: `fix/mobile-quote-overflow-20260912`.

Current patch:
- new `mobile-overflow-fix.css` with shrink-safe quote grid tracks (`minmax(0,1fr)`), `min-width:0` on quote containers/items, and max-width constraints on controls;
- explicit iOS/native file-input containment;
- homepage-only mobile `overflow-x:clip` / horizontal overscroll guard with a hidden fallback for older engines;
- `conversion.js` loads the isolated CSS on the homepage, preserving existing conversion interactions and intentionally scrollable components.

The exact Safari/iPhone issue was not reproduced in Chromium, so final verification requires PR/CI/Vercel preview plus the owner's real-device recheck after production deployment. No database, Auth, provider, environment or customer-data change is part of this patch.

## Deployment verification

MFA Stage 2:
- Stage 2 feature SHA: `d203c64d9e5da3cca049bcb43e988f7432e2864c`.
- PR #8.
- GitHub CI run `34656209581`: success.
- Preview deployment: `dpl_2bfBkHgR4k8SY4hL4AcUrn3NWzzT`, READY on exact feature SHA.
- Main Stage 2 code SHA: `ece88931bd5e05b26173b25ff7fa75c46b6b4e63`.
- Production deployment: `dpl_Jkb8ZavhqrBD6PLpqjAPnEdiGAsW`, READY with `namdar.co.uk` and no alias error.
- Live `admin.js` serves `6.4.16-security-mfa-2`.
- Live Admin MFA guard contains no `Continue for now` bypass.

Mobile overflow hotfix:
- branch implementation exists; PR/CI/Vercel preview/production IDs are still pending at this point in the workflow.

## Database/Auth verification

Applied migration:
- `20260911230055 require_aal2_for_staff_permissions`

Verified after migration:
- central `private.has_staff_permission()` definition includes AAL2 requirement;
- `Staff read own access` policy includes AAL2 requirement;
- controlled database test: AAL1 denied, AAL2 allowed for the same active administrator identity;
- post-migration Security Advisor reported no new Stage 2 security regression.

Migration filename is aligned in source to the actual applied version `20260911230055_require_aal2_for_staff_permissions.sql`.

## Security advisor state

Existing findings remain:
- INFO: 8 operational/server-only tables have RLS enabled with no authenticated policies. These remain intentionally inaccessible through ordinary authenticated Data API access.
- WARN: Supabase Auth **Leaked Password Protection is disabled**.

Supabase documentation states leaked-password protection is available on **Pro plan and above**. The Namdar Supabase organization was verified on 2026-09-12 to be on the **Free plan**, so the warning cannot be cleared without an upgrade. This is now treated as an optional plan-blocked hardening item rather than an active launch blocker. Do not upgrade without explicit owner approval.

## Applied production migrations relevant to recent security work

- `20260911213820 inbox_spam_controls`
- `20260911213842 inbox_spam_blocklist_fk_index`
- `20260911220343 inbox_security_indexes`
- `20260911220415 harden_invoice_number_function_search_path`
- `20260911230055 require_aal2_for_staff_permissions`

## Outstanding work

1. Finish mobile quote overflow hotfix PR/preview/production verification and obtain the owner's iPhone confirmation.
2. Confirm Supabase Auth Site URL is `https://namdar.co.uk` and review the redirect allowlist for stale/unintended URLs.
3. Complete provider launch readiness for Stripe, Turnstile, OAuth, SMS, Resend and legal configuration.
4. Verify production cron jobs and intended double-booking protections.
5. Run safe recognized-mailbox/unknown-alias inbound behavior test.
6. Complete controlled customer-support ticket journey when a safe eligible test customer is available.
7. Optional/plan-blocked: enable Leaked Password Protection only if the owner later chooses Supabase Pro or above.

## Handoff maintenance rule

Any substantial product change must update **all three** continuity files in the same change: `docs/AI_START.md`, `docs/AI_HANDOFF.md`, and `docs/PROJECT_STATUS.md`. CI enforces this for product-source changes. Never include credentials or customer data.
