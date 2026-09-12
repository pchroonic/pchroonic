# Namdar project status

Last updated: 2026-09-12 UTC

For fast continuation, read `docs/AI_START.md` first. This file is the broader roadmap/status view.

## Current baseline

- Release documented in `README.md`: v6.4.16.
- Source: GitHub `main` in `pchroonic/pchroonic`.
- Current live runtime product commit: `46a635396ae364fe9b5783bc18c3de2b72025efc`.
- Current continuity main baseline before this docs-only update: `c08a97a22acea924615e10b21da85856bbd14a75`.
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
| Public website | Live; all-width horizontal-overflow fix deployed, desktop confirmed fixed, iPhone confirmation pending |
| Customer portal | Session fix + optional customer MFA live |
| Admin workspace | Inbox Security v2 + mandatory privileged MFA/AAL2 live and user smoke-tested |
| Staff PWA | Mandatory privileged MFA/AAL2 live; AAL2 required for offline cached session |
| Server functions | Privileged APIs require AAL2 through central `requireStaff()` wrapper |
| Production DB | Central privileged RLS requires AAL2 |
| Supabase Auth URLs | Production Site URL/redirect allowlist hardened and owner-verified |

## Phase 7 — Launch Security & Readiness

### MFA Stage 2 — LIVE AND VERIFIED

MFA Stage 2 is live at browser/Admin/Staff, central Vercel API and Supabase RLS layers. The admin sign-out/sign-in/authenticator/Admin Inbox production smoke test passed on 2026-09-12. Do not repeat unless a future auth change needs regression testing.

References:
- PR #8;
- CI `34656209581`: success;
- preview `dpl_2bfBkHgR4k8SY4hL4AcUrn3NWzzT`: READY;
- main Stage 2 code SHA `ece88931bd5e05b26173b25ff7fa75c46b6b4e63`;
- production `dpl_Jkb8ZavhqrBD6PLpqjAPnEdiGAsW`: READY.

## Homepage horizontal overflow — ALL-WIDTH FIX LIVE

The issue was reproduced on iPhone and later on Windows/Edge desktop, proving it was a cross-device document-width / horizontal scroll-restoration problem.

All-width fix:
- PR #16;
- feature SHA `5e05d6d3da1df0ea2049b3c2ca440e2ce304d2c2`;
- GitHub CI `34686741515`: success;
- preview `dpl_9AEFL9yKDgSvZGkAqGuKQnQws88a`: READY;
- production merge SHA `46a635396ae364fe9b5783bc18c3de2b72025efc`;
- production `dpl_Bh1kfnpaShf6JwNnzG6N6YvYP1Qh`: READY with `namdar.co.uk` and no alias error.

Owner verification:
- Windows/Edge desktop: **confirmed fixed on 2026-09-12**.
- iPhone: final confirmation remains pending.

Do not mark the cross-device regression fully closed until the same-iPhone recheck also passes.

## Supabase Auth URL Configuration — COMPLETE

On 2026-09-12 the owner reviewed and cleaned Supabase Authentication → URL Configuration.

Final intended production state:
- Site URL: `https://namdar.co.uk`
- Redirect allowlist: `https://namdar.co.uk/**`

Removed four unnecessary Vercel redirect entries, including the exact project alias and broad wildcard preview patterns. The owner confirmed the changes were saved by replying `done`.

The connected Supabase tools do not currently expose hosted Auth URL-setting readback, so this is owner-verified dashboard state.

Repository search found no `signInWithOAuth`, `signInWithOtp`, or explicit OAuth provider usage in current source. Next Auth review should therefore inspect **Sign In / Providers** and confirm only intentionally used providers are enabled.

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

1. Review Supabase Authentication → Sign In / Providers and verify only intended login providers are enabled.
2. Recheck the same iPhone for the all-width homepage overflow fix; close the regression if it passes.
3. Review Turnstile / Auth attack-protection settings.
4. Complete provider launch readiness for Stripe, SMS, Resend and legal configuration.
5. Verify production cron jobs and intended double-booking protections.
6. Run safe recognized-mailbox/unknown-alias inbound behavior test.
7. Complete controlled customer-support ticket journey when a safe eligible test customer is available.
8. Optional/plan-blocked: enable Leaked Password Protection only if the owner later chooses Supabase Pro or above.

## Handoff maintenance rule

Any substantial product or provider-configuration change must update **all three** continuity files in the same change: `docs/AI_START.md`, `docs/AI_HANDOFF.md`, and `docs/PROJECT_STATUS.md`. CI enforces this for product-source changes. Never include credentials or customer data.
