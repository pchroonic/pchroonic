# Namdar AI handoff

Last verified: 2026-09-11 UTC

This is the first file every AI should read after opening the repository. Keep it concise, factual and current. Never store secret values or personal customer data here.

## Source of truth

- Product: Namdar, a UK exterior-cleaning and handyman service platform.
- Repository: `pchroonic/pchroonic`, default branch `main`.
- Hosting: Vercel project `namdar-website-starter-1`.
- Canonical domain: `https://namdar.co.uk`.
- Backend: Supabase project `namdar-production`.
- Current documented release heading: Namdar v6.4.16.

Repository plus verified provider state are the source of truth.

## Live baseline

Customer support tickets remain private to signed-in customers with an existing quote, booking, subscription or project. Public visitors use quote/chat/email paths. External inbound email remains in Admin → Email inbox and does not become a customer support ticket.

The homepage/support-routing fixes, My Namdar session-bootstrap fix, Email inbox spam protection and Inbox Security v2 are live. Inbox Security v2 includes recognized-mailbox allowlisting, mail-loop suppression, validated reply context, provider/RFC Message-ID dedupe, repeated-campaign quarantine, sender-authentication signals, risky-attachment quarantine/caution metadata, Report phishing, and safe sender/domain blocking.

## Phase 7 — Launch Security & Readiness

A staged MFA security upgrade is prepared on branch `feature/security-mfa-phase-20260911`.

Production was checked before implementation: there are currently **zero verified MFA factors** in `auth.mfa_factors`, so no existing user is relying on an MFA factor today.

Stage 1 behavior prepared in this branch:

- **Customers:** MFA remains optional. If a customer has a verified factor and signs in at `aal1`, My Namdar blocks portal loading and requires the second factor before continuing.
- **Admin/Staff dashboard:** verified MFA is challenged before privileged dashboard data loads. Accounts without MFA receive an authenticator-enrollment gate. During this rollout there is a visible **Continue for now** escape path so existing privileged users are not unexpectedly locked out. The prompt returns next session until MFA is enrolled.
- **Staff PWA:** uses the same staged privileged MFA behavior when online. The existing privacy-limited offline snapshot remains usable while offline; no new personal data is cached.
- Current large account/admin/staff sources are preserved. `account.js`, `admin.js`, and `staff.js` are small loaders; new guard files layer MFA behavior without rewriting unrelated application logic.
- Staff service-worker cache version is bumped and now includes `staff-original.js` and `staff-mfa-guard.js`.

Important limitation: Stage 1 is a browser/application gate. Full API/database AAL2 enforcement is a later hardening step and must be audited carefully because Admin, Staff and My Namdar currently include direct Supabase browser queries as well as server APIs. Do not claim server/RLS MFA enforcement is complete.

## Supabase/Auth security state

Applied production inbox/security migrations remain:

- `20260911213820 inbox_spam_controls`
- `20260911213842 inbox_spam_blocklist_fk_index`
- `20260911220343 inbox_security_indexes`
- `20260911220415 harden_invoice_number_function_search_path`

Supabase Security Advisor no longer reports the prior mutable-search-path warning. Remaining RLS-with-no-policy findings are intentional server-only operational tables.

One hosted Auth warning remains: **Leaked Password Protection is disabled**. Supabase documentation says this feature rejects known breached passwords and is available on Pro plans and above. The current connector cannot mutate that hosted Auth dashboard setting; do not claim it is enabled until verified in the dashboard.

No database migration and no new environment variable are required for Phase 7 Stage 1.

## Deployment and verification state

GitHub `main` automatically deploys to Vercel production.

Current verified live security baseline before the MFA branch:
- Inbox Security v2 PR #5 merged to `main` as `c3d788dfd61751faf888197801b0fce587d97d38`.
- Production deployment `dpl_CA4tTdYrtjxvxQR6jor1cs3Lvjwn` reached READY with `namdar.co.uk` and no alias error.
- Final handoff sync `1dc4b2535c6b16c99137e484d23d691643542082` passed CI and deployed READY.

Phase 7 Stage 1 is **not production-ready until** its branch passes JavaScript CI, an exact Vercel preview, PR merge, and canonical production verification. Do not describe the new MFA behavior as live before those checks complete.

## Known launch checks and cautions

- Enable Supabase Auth Leaked Password Protection in the hosted Auth settings.
- After Stage 1 is live, enroll the administrator with a TOTP authenticator and preferably a backup factor before removing the temporary privileged-user bypass.
- Then add audited AAL2 enforcement to privileged server APIs and direct-data paths/RLS.
- Verify Stripe, Turnstile, OAuth providers, SMS provider, Resend configuration and legal content before public advertising.
- Confirm Supabase Auth Site URL/redirect allowlist for `https://namdar.co.uk`.
- Verify booking-notification and account-purge cron jobs.
- Confirm database/application double-booking protections.
- Keep offline staff data minimal, short-lived and read-only.

## Required workflow for future AI sessions

1. Read this file, `docs/PROJECT_STATUS.md` and `AGENTS.md`.
2. Inspect source and live provider state before changing anything.
3. Make the smallest safe change.
4. Test adjacent customer/admin/staff paths.
5. Update this file and `docs/PROJECT_STATUS.md` in the same substantial-change commit.
6. State DB/migration impact, env-var impact, deployment status and remaining verification accurately.

## Next recommended step

Finish `feature/security-mfa-phase-20260911`: run CI and exact Vercel preview, merge only if green, verify the new guard assets on `namdar.co.uk`, then have the administrator enroll TOTP from the staged security prompt. After a successful AAL2 login is demonstrated, plan removal of the temporary Admin/Staff bypass and server/RLS enforcement as a separate audited change.
