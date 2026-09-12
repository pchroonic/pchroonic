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

## Homepage document-level horizontal overflow — ALL-WIDTH FIX LIVE

The owner first reported the public homepage shifting sideways on iPhone. PR #12 and PR #14 improved mobile containment, but a later Windows/Edge desktop screenshot proved the same document-level overflow existed at desktop width too.

The all-width fix from PR #16 is live:
- feature SHA `5e05d6d3da1df0ea2049b3c2ca440e2ce304d2c2`;
- GitHub CI `34686741515`: success;
- exact preview `dpl_9AEFL9yKDgSvZGkAqGuKQnQws88a`: READY;
- production runtime merge SHA `46a635396ae364fe9b5783bc18c3de2b72025efc`;
- production deployment `dpl_Bh1kfnpaShf6JwNnzG6N6YvYP1Qh`: READY with `namdar.co.uk`, no alias error;
- canonical CSS/JS both returned HTTP 200 with all-width containment and x=0 restoration logic.

Live behavior:
- root/body containment and `overflow-x:hidden` apply at all widths;
- top-level homepage layout is bounded to the viewport;
- desktop hero tracks are shrink-safe `minmax(0,...)` columns;
- key grid/flex children use `min-width:0`;
- quote/file-input containment remains;
- intentional nested scrollers stay local;
- homepage horizontal scroll position resets to x=0 on load, pageshow, resize and orientation change.

Owner verification:
- **Windows/Edge desktop confirmed fixed on 2026-09-12** after production deployment. The owner reported `fixed`.
- Same-iPhone final verification is still pending. Do not mark the cross-device regression fully closed until that device check also passes.

No database migration, Auth change, environment variable, provider configuration or customer-data change was involved in the overflow fix.

## Supabase Auth URL Configuration — OWNER-VERIFIED COMPLETE

On 2026-09-12 the owner opened Supabase → Authentication → URL Configuration and supplied a screenshot showing:
- Site URL already set to `https://namdar.co.uk`;
- redirect allowlist containing the production Namdar wildcard plus four Vercel preview/alias patterns.

The owner then removed the four Vercel entries and confirmed `done` after saving.

Final intended production Auth URL state:
- Site URL: `https://namdar.co.uk`
- Redirect allowlist: `https://namdar.co.uk/**`

Removed entries:
- `https://namdar-website-starter-1-pooyamdi-8267.vercel.app/`
- `https://namdar-website-starter-1-pooyamdi-8267.vercel.app/**`
- `https://namdar-*-website-starter-1-pooyamdi-8267.vercel.app`
- `https://namdar-*-website-starter-1-pooyamdi-8267.vercel.app/**`

Reason: production authentication should return only to the canonical Namdar domain; broad Vercel preview wildcards were unnecessary and increased the trusted redirect surface.

The connected Supabase tools currently do not expose hosted Auth URL configuration readback/mutation. Therefore this setting is **owner-verified from the dashboard**, not connector-verified. Do not repeatedly ask the owner to redo this cleanup unless a redirect/login issue appears.

## Auth provider code audit

Repository search on 2026-09-12 found no `signInWithOAuth`, no `signInWithOtp`, and no explicit OAuth provider configuration in current Namdar source. The next Auth review should therefore inspect Supabase → Authentication → Sign In / Providers and verify that only providers intentionally used by the live Namdar login flow are enabled. Do not enable new providers merely because they are available in Supabase.

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

1. Inspect Supabase Authentication → Sign In / Providers and verify only intended providers are enabled.
2. Recheck the same iPhone for the all-width overflow fix; if it passes, close the regression in continuity.
3. Review Turnstile / Auth attack-protection settings.
4. Finish launch checks for Stripe, SMS provider, Resend and legal configuration.
5. Verify booking-notification/account-purge cron jobs and intended double-booking protection.
6. Run safe recognized-mailbox/unknown-alias inbound behavior test.
7. Complete controlled authenticated customer-support ticket test when a safe test customer is available.
8. Optional/plan-blocked: enable Supabase Leaked Password Protection only if the owner later chooses Pro or above.

## Required workflow

1. Read `docs/AI_START.md` first.
2. For substantial work, read this file, `docs/PROJECT_STATUS.md` and `AGENTS.md` completely.
3. Inspect repository/provider state before changing anything.
4. Use branch → PR → CI → Vercel preview/testing → merge → production verification for code changes.
5. Update `docs/AI_START.md`, this file and `docs/PROJECT_STATUS.md` in the same substantial product/provider change.
6. Never include credentials or private customer data.

## Next recommended step

Ask the owner for a screenshot of **Supabase → Authentication → Sign In / Providers**. Verify only the providers actually used by Namdar are enabled; current source contains no OAuth or OTP sign-in calls. Then continue to Turnstile/attack-protection review.
