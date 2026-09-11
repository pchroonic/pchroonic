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

## Current release and post-release work

v6.4.16 keeps public enquiries separate from private customer support tickets. Public visitors can request a quote, use general chat guidance or email Namdar. Support-ticket creation is private to signed-in customers with an existing quote, booking, subscription or project. External inbound email remains in Admin → Email inbox and does not become a customer support ticket.

The homepage/support-routing hotfixes and the My Namdar session-bootstrap hotfix are live. The customer portal currently uses `account.js` as a small loader, preserves the previous portal source in `account-original.js`, and applies `account-auth-hotfix.js` so Supabase auth-state work runs outside the auth lock and session restoration fails safely rather than showing an endless spinner.

A post-release **Admin Email Inbox spam-protection upgrade** is being prepared on branch `feature/inbox-spam-controls-20260911`. It preserves the existing Admin code as `admin-original.js`; `admin.js` becomes a small loader and `admin-inbox-safety.js`/`admin-inbox-safety.css` add the inbox controls. The protected server endpoints `api/support-inbox.js` and `api/resend-inbound.js` implement the enforcement.

The inbox upgrade provides:
- a dedicated Spam/quarantine view that is excluded from Open and unread working counts;
- “Mark as spam” and “Not spam / restore” actions;
- administrator-only exact-sender and domain block rules, plus an unblock manager;
- protection against blocking major shared email-provider domains such as Gmail/Outlook/Yahoo as a whole;
- conservative automatic quarantine for obvious unknown-sender SEO/link-building/cold-marketing mail and high-frequency unknown senders;
- bypass of automatic marketing heuristics for known customers and genuine reply threads;
- no staff notification for quarantined mail.

Important limitation: Namdar’s application-level blocklist cannot stop a remote sender from attempting SMTP delivery to the Resend receiving address. A blocked message may still reach Resend, but Namdar quarantines it before it enters the working inbox or creates a staff notification.

## Architecture at a glance

- Public website: root HTML/JavaScript/CSS, `services/`, `areas/`.
- Customer portal: `account.html`, `account.js`, `account-original.js`, `account-auth-hotfix.js`, customer APIs.
- Admin workspace: `admin.html`; during the inbox-safety upgrade `admin.js` is a loader, `admin-original.js` preserves the current dashboard source, and `admin-inbox-safety.js`/`.css` extend the Email inbox.
- Staff app: `staff.html`, `staff.js`, `staff.webmanifest`, `staff-sw.js`.
- Server API: Vercel Node serverless functions under `api/`.
- Shared server utilities: `lib/server.js`.
- Hosting/security/cron: `vercel.json`.
- Data/auth/storage: Supabase; privileged service-role access remains server-side only.
- Email: Resend outbound and inbound receiving/webhook flows.
- Payments: Stripe-ready server flows; verify live configuration before claiming launch readiness.

## Inbox spam schema and migration state

Production Supabase was inspected before changing the schema. The existing inbox tables were already RLS-enabled and service-role-only.

Two new forward-only migrations were applied successfully to `namdar-production` and their SQL source is preserved under `supabase/migrations/`:

- `20260911213820_inbox_spam_controls.sql` / database migration `20260911213820 inbox_spam_controls`
- `20260911213842_inbox_spam_blocklist_fk_index.sql` / database migration `20260911213842 inbox_spam_blocklist_fk_index`

They:
- extend `support_inbox_threads.status` with `spam`;
- add `spam_reason`, `spam_score`, and `spam_source`;
- create server-only `support_inbox_blocklist` with RLS enabled and no browser policies;
- revoke `anon`/`authenticated` access and grant the service role;
- add blocklist lookup/status indexes and the foreign-key covering index flagged by the Supabase performance advisor.

No environment variable was added or changed.

The Supabase security advisor reported the blocklist’s “RLS enabled, no policy” state as informational, matching Namdar’s other server-only tables. The performance advisor initially flagged the new `created_by` foreign key; the second migration added the covering index.

## Production data and migration safety

Do not rerun already-applied migrations on production. For future schema changes:
1. inspect actual production schema and migration history;
2. create a new forward-only migration;
3. preserve its SQL source;
4. check RLS, grants, indexes, data impact and rollback/recovery;
5. run security/performance advisors;
6. record whether the migration was prepared or actually applied.

## Environment-variable names

Never record values. Existing documentation refers to `SUPABASE_URL`, Supabase public/anon/publishable key, `SUPABASE_SERVICE_ROLE_KEY`, Resend settings, Turnstile settings, OpenAI settings, Stripe settings, `CRON_SECRET`, and optional Overpass configuration. The spam-protection upgrade adds no new environment variable.

## Deployment and verification state

GitHub `main` automatically deploys to Vercel production.

The My Namdar session hotfix was merged as commit `4a5d15bd305412b1ba244aa8444b875471ee2866`. Vercel production deployment `dpl_Fyn26yMHhCMXao8JvS8dLF3DGLsv` was verified READY with the canonical `namdar.co.uk` alias and no alias error. Canonical live requests returned HTTP 200 for `account.js`, `account-original.js`, and `account-auth-hotfix.js`. Documentation commit `54fb8d4179b53860939d2e57c082dc30f4413632` also passed CI and deployed READY.

For the inbox spam upgrade, the **database migrations are already applied** and verified. The application code is not production-ready until the feature branch passes JavaScript/server syntax checks, Vercel preview verification, merge, and canonical production verification. Do not claim the UI/filtering/webhook behavior is live before that occurs.

## Known launch checks and cautions

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

Finish the Email inbox spam-protection branch: run CI and Vercel preview, verify the Spam filter and blocklist UI source, merge to `main`, verify the matching production deployment and live assets, then let the administrator mark the visible junk conversation as spam or block its exact sender. Do not block a broad shared email domain merely to test the feature.
