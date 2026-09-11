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

The homepage/support-routing hotfixes and the My Namdar session-bootstrap hotfix are live. The customer portal uses `account.js` as a small loader, preserves the previous portal source in `account-original.js`, and applies `account-auth-hotfix.js` so Supabase auth-state work runs outside the auth lock and session restoration fails safely rather than showing an endless spinner.

The **Admin Email Inbox spam-protection upgrade is live in production**. It preserves the existing Admin dashboard source in `admin-original.js`; `admin.js` is a small loader and `admin-inbox-safety.js` / `admin-inbox-safety.css` add the inbox controls. The protected server endpoints `api/support-inbox.js` and `api/resend-inbound.js` enforce spam and block rules.

The inbox upgrade provides:
- a dedicated Spam/quarantine view excluded from Open and unread working counts;
- “Mark as spam” and “Not spam / restore” actions;
- administrator-only exact-sender and domain block rules, plus an unblock manager;
- protection against blocking major shared email-provider domains such as Gmail, Outlook and Yahoo as a whole;
- conservative automatic quarantine for obvious unknown-sender SEO/link-building/cold-marketing mail and high-frequency unknown senders;
- bypass of automatic marketing heuristics for known customers and genuine reply threads;
- no staff notification for quarantined mail.

Important limitation: Namdar’s application-level blocklist cannot stop a remote sender from attempting SMTP delivery to the Resend receiving address. A blocked message may still reach Resend, but Namdar quarantines it before it enters the working inbox or creates a staff notification.

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

## Inbox spam schema and migration state

Production Supabase was inspected before changing the schema. The existing inbox tables were already RLS-enabled and service-role-only.

Two forward-only migrations were applied successfully to `namdar-production` and their SQL source is preserved under `supabase/migrations/`:

- `20260911213820_inbox_spam_controls.sql` / database migration `20260911213820 inbox_spam_controls`
- `20260911213842_inbox_spam_blocklist_fk_index.sql` / database migration `20260911213842 inbox_spam_blocklist_fk_index`

They extend `support_inbox_threads.status` with `spam`, add `spam_reason`, `spam_score`, and `spam_source`, create server-only `support_inbox_blocklist`, revoke browser roles, grant service-role access, and add lookup/status/foreign-key indexes. No environment variable was added or changed.

The Supabase security advisor reported the blocklist’s “RLS enabled, no policy” state as informational, matching Namdar’s other server-only tables. The performance advisor initially flagged the new `created_by` foreign key; the second migration added the covering index.

## Production data and migration safety

Do not rerun already-applied migrations on production. For future schema changes: inspect actual production schema/history, create a new forward-only migration, preserve the SQL source, check RLS/grants/indexes/data impact, run security/performance advisors, and record whether it was prepared or applied.

## Deployment and verification state

GitHub `main` automatically deploys to Vercel production.

The My Namdar session hotfix remains verified live. The Email inbox spam-protection PR #4 passed GitHub CI and its exact Vercel preview. It was rebased into `main` as commit `97014ad2c7dbd0cceb7ca8b97f193a3b5ce8e8bc`. Production deployment `dpl_8eu3eknmgXXcyChJwugfUjn1raWq` built the exact commit and reached READY. Canonical live requests to `namdar.co.uk` returned HTTP 200 for `admin.js`, `admin-original.js`, `admin-inbox-safety.js`, and `admin-inbox-safety.css`; live `admin.js` serves version `6.4.16-inbox-safety-1`.

The database migrations are applied, application code is deployed, and no environment-variable change is required. A real administrator browser action using the visible junk conversation has not yet been exercised after deployment, so Mark spam / Block sender still needs one live UI confirmation rather than being overstated as end-to-end tested.

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

Refresh Admin → Email inbox and use the visible junk conversation to verify either **Mark as spam** or **Block sender**. Confirm it leaves Open, appears under Spam, no longer contributes to unread/working counts, and customer Support tickets remain unchanged. Do not block a broad shared email domain merely to test the feature.
