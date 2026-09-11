# Namdar AI handoff

Last verified: 2026-09-11 UTC

This is the first file every AI should read after opening the repository. Keep it concise, factual and current. Never store secret values or personal customer data here.

## Source of truth

- Product: Namdar, a UK exterior-cleaning and handyman service platform.
- Repository: `pchroonic/pchroonic`, default branch `main`.
- Hosting: Vercel project `namdar-website-starter-1`.
- Canonical domain: `https://namdar.co.uk`.
- Backend: Supabase project `namdar-production` (`qjigldxjcpnrlyxgmlqq`).
- Current documented release heading: Namdar v6.4.16.

Repository plus verified provider state are the source of truth.

## Live baseline

Customer support tickets remain private to signed-in customers with an existing quote, booking, subscription or project. Public visitors use quote/chat/email paths. External inbound email remains in Admin → Email inbox and does not become a customer support ticket.

Homepage/support-routing fixes, My Namdar session bootstrap, Email inbox spam protection and Inbox Security v2 remain live.

## Phase 7 — Launch Security & Readiness

### MFA Stage 1 — live

The administrator completed TOTP enrollment successfully. Production was then verified directly: there is **1 verified MFA factor for 1 admin user**.

Current production still contains the Stage 1 browser rollout behavior until Stage 2 is merged:
- customers who opt into MFA must complete it before My Namdar data loads;
- Admin/Staff with verified MFA are challenged before privileged browser data loads;
- Admin/Staff without MFA still have the temporary `Continue for now` rollout escape path;
- Staff PWA keeps privacy-limited offline snapshots.

### MFA Stage 2 — prepared on `feature/security-mfa-stage2-20260911`

Stage 2 is designed to remove reliance on the browser prompt alone:
- `lib/server.js` becomes a thin security wrapper around byte-for-byte preserved `lib/server-original.js`;
- the wrapped `requireStaff()` first performs the existing authenticated role/permission check, then requires the already-verified Supabase JWT claim `aal = aal2`; otherwise privileged server APIs return 403;
- Admin and Staff MFA guards remove the temporary bypass: privileged users with no factor must enroll TOTP; users with a verified factor must complete the second-factor challenge;
- Staff offline mode only accepts an unexpired cached session whose JWT already carries `aal2`; an old `aal1` session must reconnect and verify first;
- planned migration `20260911231500_require_aal2_for_staff_permissions.sql` changes central `private.has_staff_permission()` so existing privileged RLS policies require AAL2, and also requires AAL2 for a staff member to read their own `staff_access` row.

Important: at this handoff point the Stage 2 migration is **not yet applied** and the Stage 2 branch is **not yet production**. Do not claim Stage 2 is live until CI/preview pass, the PR is merged, production is READY on the merged SHA, the migration is applied, and verification is completed.

## Why the Stage 2 approach is safe

- Customer/public RLS conditions are not changed.
- Service-role server database calls continue to bypass RLS as intended.
- `private.has_staff_permission(...)` is already the central predicate used by privileged direct-client RLS policies, so adding AAL2 there hardens many tables without duplicating new policies everywhere.
- The API wrapper checks AAL2 only after the existing `base.requireStaff()` has authenticated the token and confirmed role/permission, so an unverified JWT payload cannot grant access.
- No new environment variable is required.

## Supabase/Auth security state

Applied production migrations before Stage 2 remain:
- `20260911213820 inbox_spam_controls`
- `20260911213842 inbox_spam_blocklist_fk_index`
- `20260911220343 inbox_security_indexes`
- `20260911220415 harden_invoice_number_function_search_path`

Supabase Security Advisor still reports **Leaked Password Protection disabled**. This hosted Auth setting must be enabled and verified separately.

## Deployment and verification state

Stage 1 production code is on `main`; handoff/status were last synced at `bc1e33477e074ce6992afad5401640eff8bd7889`, with Vercel production READY on that documentation-only commit.

Stage 2 pre-change checks completed:
- user confirmed successful live administrator TOTP setup;
- production database verified 1 admin user with 1 verified MFA factor;
- current `private.has_staff_permission()` was inspected and currently checks staff role/permissions but not AAL;
- representative sensitive APIs (`support-inbox`, `admin-users`, reporting, payments, address directory, staff jobs/actions/notifications/presence, ticket staff paths) were confirmed to use central `requireStaff()`;
- current RLS policies were audited and privileged policies predominantly use `private.has_staff_permission(...)`.

## Known launch checks and cautions

After Stage 2 is live:
- verify an AAL2 administrator can still load Admin, Inbox, reports and a write action;
- verify an `aal1` privileged session is rejected by both server API and direct RLS paths (use a controlled test, not a real customer session);
- enable Supabase Auth Leaked Password Protection;
- verify Stripe, Turnstile, OAuth providers, SMS provider, Resend configuration and legal content before public advertising;
- confirm Supabase Auth Site URL/redirect allowlist for `https://namdar.co.uk`;
- verify booking-notification/account-purge cron jobs and intended double-booking protection.

## Required workflow

1. Read this file, `docs/PROJECT_STATUS.md` and `AGENTS.md`.
2. Inspect repository and provider state before changing anything.
3. Use branch → PR → CI → Vercel preview → merge → production verification.
4. Apply database migrations only with verified production intent and record the actual applied migration.
5. Update this file and `docs/PROJECT_STATUS.md` in the same substantial-change commit.
6. Never include credentials or private customer data.

## Next recommended step

Open the Stage 2 PR, wait for JavaScript/handoff CI and the exact Vercel preview SHA to pass, merge to `main`, verify production, then apply the AAL2 RLS migration and run the post-deployment checks before marking Stage 2 live.
