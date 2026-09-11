# Namdar AI handoff

Last verified: 2026-09-11 UTC

This is the first file every AI should read after opening the repository. Keep it concise, factual and current. Never store secret values or personal customer data here.

## Source of truth

- Product: Namdar, a UK exterior-cleaning and handyman service platform.
- Repository: `pchroonic/pchroonic`, default branch `main`.
- Hosting project: Vercel project `namdar-website-starter-1`.
- Canonical domain: `https://namdar.co.uk`.
- Backend: Supabase project `namdar-production`.
- Current documented release heading: Namdar v6.4.16.

The repository plus verified provider state are the source of truth. Never copy secret values from providers into repository documentation.

## Current release and live post-release work

v6.4.16 keeps public enquiries separate from private customer support tickets. Public visitors can request a quote, use general chat guidance or email Namdar. Support-ticket creation is private to signed-in customers with an existing quote, booking, subscription or project. External inbound email remains in Admin → Email inbox and does not become a customer support ticket.

The homepage/support-routing hotfixes, My Namdar session-bootstrap hotfix and Admin Email Inbox spam-protection release are live. The inbox has a dedicated Spam/quarantine view, manual restore, exact-sender/domain block rules, an administrator unblock manager, conservative marketing/bot classification and staff-notification suppression for quarantined mail. Production contains active block rules and quarantined threads, confirming the real Admin spam/block flow has been exercised.

**Inbox Security v2 is live in production.** It keeps customer tickets separate and adds defense-in-depth around inbound email:

- only recognized Namdar aliases (`support`, `bookings`, `accounts`, `billing`, `hello`) and valid reply aliases are accepted; unknown catch-all aliases are ignored;
- internal `@namdar.co.uk` inbound is ignored to prevent mail loops/system-message pollution;
- reply aliases count as reply context only when the token resolves to an existing thread; forged/random reply context does not bypass filtering;
- duplicates are suppressed by provider email ID and sender + RFC Message-ID, including the same message delivered to multiple Namdar aliases;
- repeated near-identical campaigns from multiple unknown senders are quarantined;
- explicit DMARC failure is a security quarantine; weaker SPF/DKIM failures contribute to conservative scoring;
- dangerous executable/script/macro attachment types trigger quarantine; archive/active-content attachments carry caution metadata;
- Admin includes **Report phishing** and safer shared-domain blocking behavior;
- blocking a private/non-shared domain quarantines existing matching threads as well as future mail.

Resend receiving remains protected by signed Svix/Resend webhook verification with a five-minute timestamp window. Never record the webhook secret value in repository docs.

## Architecture at a glance

- Public website: root HTML/JavaScript/CSS, `services/`, `areas/`.
- Customer portal: `account.html`, `account.js`, `account-original.js`, `account-auth-hotfix.js`, customer APIs.
- Admin workspace: `admin.html`, `admin.js` loader, `admin-original.js`, `admin-inbox-safety.js`, `admin-inbox-safety.css`, protected admin APIs.
- Staff app: `staff.html`, `staff.js`, `staff.webmanifest`, `staff-sw.js`.
- Server API: Vercel Node serverless functions under `api/`.
- Shared server utilities: `lib/server.js`.
- Hosting/security/cron: `vercel.json`.
- Data/auth/storage: Supabase; privileged service-role access remains server-side only.
- Email: Resend outbound and inbound receiving/webhook flows.
- Payments: Stripe-ready server flows; verify live configuration before claiming launch readiness.

## Inbox/security schema and migration state

Already-applied production migrations with repository source under `supabase/migrations/`:

- `20260911213820 inbox_spam_controls`
- `20260911213842 inbox_spam_blocklist_fk_index`
- `20260911220343 inbox_security_indexes`
- `20260911220415 harden_invoice_number_function_search_path`

The inbox-security indexes support sender-frequency, RFC Message-ID dedupe and campaign-subject lookups. The invoice-number function search path is pinned to `pg_catalog, public`; Supabase Security Advisor no longer reports the mutable-search-path warning.

Security Advisor was rerun after Security v2 deployment. Remaining RLS-with-no-policy findings are intentional server-only operational tables. One hosted Auth warning remains: **Leaked Password Protection is disabled**. This is a hosted Supabase Auth setting, not a database migration, and has not been enabled by the current tools.

No new environment variable was required for Inbox Security v2.

## Deployment and verification state

GitHub `main` automatically deploys to Vercel production.

Inbox Security v2 PR #5 passed GitHub CI on feature commit `5aab371098e40ce664aa19b4f71ce5dd312c9f06` (workflow run `34652942698`). Exact preview deployment `dpl_6nLof8eSFXEVePbB1VEB4VsEHKre` reached READY. PR #5 was merged to `main` as `c3d788dfd61751faf888197801b0fce587d97d38`. Production deployment `dpl_CA4tTdYrtjxvxQR6jor1cs3Lvjwn` is READY, targets production, includes the `namdar.co.uk` alias and has no alias error.

A safe post-deployment end-to-end test for recognized-mailbox versus unknown-alias behavior is still recommended; do not claim that exact behavior has been exercised until tested. Do not send executable attachments merely to test quarantine.

A duplicate concurrent hardening PR #6 was closed without merge because PR #5 already contained the broader implementation.

## Known launch checks and cautions

- Enable Supabase Auth **Leaked Password Protection** in the hosted Auth security/password settings; Security Advisor currently warns that it is disabled.
- Verify Stripe, Turnstile, OAuth providers, SMS provider, Resend sending/inbound configuration and legal content before public advertising.
- Confirm Supabase Auth Site URL/redirect allowlist for `https://namdar.co.uk`.
- Verify booking-notification and account-purge cron jobs.
- Confirm intended database and application double-booking protections.
- Test privileged admin/staff APIs with least-privilege accounts after permission changes.
- Keep offline staff data minimal, short-lived and read-only.
- Treat automatic spam/security classification conservatively; quarantine and restore are preferred to destructive deletion.

## Required workflow for future AI sessions

1. Read this file, `docs/PROJECT_STATUS.md` and `AGENTS.md`.
2. Inspect source and live provider state before changing anything.
3. Make the smallest safe change.
4. Test adjacent customer/admin/staff paths.
5. Update this file and `docs/PROJECT_STATUS.md` in the same substantial-change commit.
6. State database/migration impact, environment-variable impact, deployment status and remaining verification accurately.

## Next recommended step

Enable Supabase Auth Leaked Password Protection in the hosted Auth dashboard, then perform one safe inbound test to a recognized mailbox plus an unknown-alias test. Confirm the recognized message reaches Email inbox, the unknown alias is ignored, customer Support tickets remain unchanged and no real customer data is used for testing.
