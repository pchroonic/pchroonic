# Namdar AI handoff

Last verified: 2026-09-12 UTC

Read `docs/AI_START.md` first for the compact current state and immediate next action. Use this file for detailed technical continuity. Never store secret values or private customer data here.

## Source of truth

- Product: Namdar, UK exterior-cleaning and handyman service platform.
- Repository: `pchroonic/pchroonic`, default branch `main`.
- Hosting: Vercel project `namdar-website-starter-1`.
- Canonical domain: `https://namdar.co.uk`.
- Backend: Supabase project `namdar-production` (`qjigldxjcpnrlyxgmlqq`).
- Current documented release heading: Namdar v6.4.16.

Repository plus verified provider state are the source of truth.

## Fast-resume continuity model

Namdar uses three continuity layers:
- `docs/AI_START.md` — compact current state, exact next action, blockers and do-not-repeat notes.
- `docs/AI_HANDOFF.md` — detailed technical continuity, migrations, deployment checks and implementation decisions.
- `docs/PROJECT_STATUS.md` — broader roadmap and launch status.

CI requires all three to be updated with any product-source change. This is designed so a new ChatGPT/Claude session can resume quickly without rereading the full history unless the task is substantial.

## Support model — unchanged

Customer support tickets remain private to signed-in customers with an existing quote, booking, subscription or project. Public visitors use quote/chat/email. External inbound email remains in Admin → Email inbox and does not become a customer support ticket.

## Phase 7 — Launch Security & Readiness

### MFA Stage 2 — LIVE AND USER-VERIFIED

The administrator successfully enrolled TOTP before Stage 2. Production has 1 verified MFA factor for 1 admin user.

Stage 2 is enforced in three layers:

1. **Browser/Admin/Staff**
   - Admin/Staff no longer have a `Continue for now` bypass.
   - Privileged users with a verified factor must complete the second-factor challenge before privileged UI data loads.
   - Privileged users without a factor must enroll and verify TOTP before continuing.
   - Staff offline mode only accepts an unexpired cached session whose JWT already carries `aal2`; an old `aal1` session must reconnect and verify first.

2. **Vercel server APIs**
   - `lib/server.js` is a small AAL2 wrapper around byte-for-byte preserved `lib/server-original.js`.
   - Wrapped `requireStaff()` first performs the original authenticated user/role/permission check, then requires the already-validated bearer token to carry `aal = aal2`; otherwise privileged server APIs return 403.
   - No new environment variable was required.

3. **Supabase direct-client / RLS**
   - Applied production migration: `20260911230055 require_aal2_for_staff_permissions`.
   - `private.has_staff_permission(...)` requires `(auth.jwt()->>'aal') = 'aal2'` before granting privileged permission.
   - `Staff read own access` on `public.staff_access` also requires AAL2.
   - Customer/public RLS behavior was not changed.

## Stage 2 deployment and smoke-test verification

- Feature commit: `d203c64d9e5da3cca049bcb43e988f7432e2864c`.
- PR: #8, `Enforce AAL2 for privileged Namdar access`.
- GitHub CI run `34656209581`: success.
- Vercel preview: `dpl_2bfBkHgR4k8SY4hL4AcUrn3NWzzT`, READY on exact feature SHA.
- Main Stage 2 code SHA: `ece88931bd5e05b26173b25ff7fa75c46b6b4e63`.
- Production deployment: `dpl_Jkb8ZavhqrBD6PLpqjAPnEdiGAsW`, READY on exact main SHA with `namdar.co.uk` and no alias error.
- Canonical `admin.js` serves `6.4.16-security-mfa-2` and live `admin-mfa-guard.js` has no bypass.
- Database definition checks confirmed both central staff-permission function and staff self-access policy require AAL2.
- Controlled database test using the same active admin identity internally: `aal1` denied, `aal2` allowed.
- **User production smoke test passed on 2026-09-12:** full Admin sign-out, fresh sign-in, authenticator challenge completed, and Admin → Inbox loaded normally. Do not repeat unless a future auth change needs regression testing.

## Migration history note

The branch originally contained a pre-named migration file `20260911231500_require_aal2_for_staff_permissions.sql`. Supabase assigned the actual applied migration version `20260911230055`; repository filename is aligned to `20260911230055_require_aal2_for_staff_permissions.sql` so source history matches production.

## Security advisor state

Post-migration Supabase Security Advisor showed no new Stage 2 regression.

Existing findings:
- INFO: eight server-only operational tables have RLS enabled with no authenticated policies; intentional for tables accessed through service-role server code.
- WARN: **Leaked Password Protection is disabled** in hosted Supabase Auth.

Current Supabase docs state leaked-password protection rejects passwords known in HaveIBeenPwned's Pwned Passwords data and is available on Supabase Pro plan and above. It is configured in the project's hosted Auth settings. The currently connected Supabase tools do not expose a mutation for this hosted Auth setting, so it must be toggled in the Supabase Dashboard, then verified by rerunning Security Advisor. Do not request or store a Supabase personal access token solely for this toggle.

## Applied production migrations relevant to current work

- `20260911213820 inbox_spam_controls`
- `20260911213842 inbox_spam_blocklist_fk_index`
- `20260911220343 inbox_security_indexes`
- `20260911220415 harden_invoice_number_function_search_path`
- `20260911230055 require_aal2_for_staff_permissions`

## Remaining launch work

1. Enable Supabase Auth Leaked Password Protection in the Dashboard and verify the Security Advisor warning clears.
2. Finish launch checks for Stripe, Turnstile, OAuth providers, SMS provider, Resend and legal configuration.
3. Verify Supabase Auth Site URL / redirect allowlist for `https://namdar.co.uk`.
4. Verify booking-notification/account-purge cron jobs and intended double-booking protection.
5. Run safe recognized-mailbox/unknown-alias inbound behavior test.
6. Complete controlled authenticated customer-support ticket test when a safe test customer is available.

## Required workflow

1. Read `docs/AI_START.md` first.
2. For substantial work, read this file, `docs/PROJECT_STATUS.md` and `AGENTS.md` completely.
3. Inspect repository and provider state before changing anything.
4. Use branch → PR → CI → Vercel preview/testing → merge → production verification.
5. Apply database migrations only with verified production intent and record the actual applied migration.
6. Update `docs/AI_START.md`, this file and `docs/PROJECT_STATUS.md` in the same substantial product change.
7. Never include credentials or private customer data.

## Next recommended step

Enable Supabase Auth Leaked Password Protection in the Dashboard, rerun Security Advisor to confirm the warning clears, then continue the provider launch-readiness checklist.
