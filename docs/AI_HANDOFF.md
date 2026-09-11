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

The homepage/support-routing hotfixes, My Namdar session-bootstrap hotfix, and first Admin Email Inbox spam-protection release are live. The inbox has a dedicated Spam/quarantine view, manual restore, exact-sender/domain block rules, an administrator unblock manager, conservative marketing/bot classification, and staff-notification suppression for quarantined mail. A real production administrator action has now exercised the spam/block flow: production contains active block rules and quarantined threads, so the first release is no longer only source/deployment-verified.

A second **Inbox Security v2** hardening pass is being prepared on branch `feature/inbox-security-v2-20260911`. It keeps the same customer-ticket separation and adds defense-in-depth around inbound email:

- only recognized Namdar role aliases (`support`, `bookings`, `accounts`, `billing`, `hello`) and valid reply aliases are accepted; unknown catch-all aliases are ignored instead of becoming Support;
- internally generated `@namdar.co.uk` mail is ignored on inbound to prevent mail loops/system messages polluting the working inbox;
- reply aliases only count as genuine reply context when the token resolves to an existing thread; forged `In-Reply-To` or random reply tokens no longer bypass marketing checks;
- duplicate inbound messages are suppressed by provider email ID and by sender + RFC Message-ID, including the same email delivered to more than one Namdar alias;
- repeated near-identical campaign content from multiple unknown senders is automatically quarantined;
- explicit DMARC failure is quarantined as a sender-authentication security failure; weaker SPF/DKIM failures contribute to conservative scoring rather than automatically blocking known customers;
- dangerous executable/script/macro attachment types are quarantined before staff notification; archive/active-content attachments are tagged with caution metadata;
- Admin gains a separate **Report phishing** action; shared public mail-provider domains are no longer offered as a domain-block UI action;
- blocking a non-shared domain also quarantines existing matching inbox threads, not only future mail.

Resend configuration was checked directly: the single enabled webhook points to `https://namdar.co.uk/api/resend-inbound` and subscribes to `email.received`. Webhook signing is already enforced in `api/resend-inbound.js` using the existing `RESEND_WEBHOOK_SECRET`; never record the secret value in repository docs.

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

Production Supabase was inspected before schema changes. Inbox tables remain server-managed/RLS-protected.

Already-applied migrations with repository source under `supabase/migrations/`:

- `20260911213820 inbox_spam_controls`
- `20260911213842 inbox_spam_blocklist_fk_index`
- `20260911220343 inbox_security_indexes`
- `20260911220415 harden_invoice_number_function_search_path`

The 22:03 migration adds partial indexes used by inbound sender-frequency, RFC Message-ID dedupe, and campaign-subject lookups. The 22:04 migration fixes the Supabase Security Advisor warning for `public.namdar_set_invoice_number()` by pinning its search path to `pg_catalog, public`; the function definition otherwise remains unchanged.

Security Advisor was rerun after the hardening migration: the mutable-search-path warning is gone. Remaining RLS-with-no-policy findings are intentional server-only tables, including `support_inbox_blocklist`. One hosted Auth warning remains: **Leaked Password Protection is disabled**. This is a Supabase Auth dashboard setting, not a database migration.

No new environment variable is required for Inbox Security v2.

## Production data and migration safety

Do not rerun already-applied migrations on production. For future schema changes: inspect actual production schema/history, create a new forward-only migration, preserve its SQL source, check RLS/grants/indexes/data impact, run security/performance advisors, and record whether it was prepared or applied.

## Deployment and verification state

GitHub `main` automatically deploys to Vercel production.

The first Email inbox spam release remains verified live on production code commit `97014ad2c7dbd0cceb7ca8b97f193a3b5ce8e8bc`; its documentation state was synchronized by `57a7fa854853d68d46ac94f73371f4382f7503d5`. Canonical assets are live as `6.4.16-inbox-safety-1`.

For Inbox Security v2, the two production Supabase migrations above are already applied and verified, but the application code is **not yet production-ready** until branch CI, exact Vercel preview, merge, canonical production verification and at least one safe inbound/duplicate-recipient behavior check are complete.

## Known launch checks and cautions

- Enable Supabase Auth **Leaked Password Protection** in the hosted Auth security/password settings; Security Advisor currently warns that it is disabled.
- Verify Stripe, Turnstile, OAuth providers, SMS provider, Resend sending/inbound configuration and legal content before public advertising.
- Confirm Supabase Auth Site URL/redirect allowlist for `https://namdar.co.uk`.
- Verify booking-notification and account-purge cron jobs.
- Confirm intended database and application double-booking protections.
- Test privileged admin/staff APIs with least-privilege accounts after permission changes.
- Keep offline staff data minimal, short-lived and read-only.
- Treat automatic spam classification conservatively; manual block rules are authoritative.

## Required workflow for future AI sessions

1. Read this file, `docs/PROJECT_STATUS.md` and `AGENTS.md`.
2. Inspect source and live provider state before changing anything.
3. Make the smallest safe change.
4. Test adjacent customer/admin/staff paths.
5. Update this file and `docs/PROJECT_STATUS.md` in the same substantial-change commit.
6. State database/migration impact, environment-variable impact, deployment status and remaining verification accurately.

## Next recommended step

Finish `feature/inbox-security-v2-20260911`: run JavaScript/API syntax CI and Vercel preview, merge only if green, verify canonical live assets/API deployment, then perform a safe inbound test to a recognized mailbox plus a deliberate unknown-alias test. Confirm the recognized message reaches Email inbox, the unknown alias is ignored, customer Support tickets remain unchanged, and no real customer data is used for testing.
