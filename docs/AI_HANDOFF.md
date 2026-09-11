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

A follow-up **inbound-email security hardening** change is being prepared on branch `security/inbound-email-hardening-20260911`. It changes only `api/resend-inbound.js` plus the handoff documentation and requires no schema migration or new environment variable. It adds:
- a 1 MiB maximum webhook payload before parsing/verification to limit memory-abuse requests;
- strict inbound email-ID validation before the Resend retrieval request;
- explicit safe failure when the Resend API key is unavailable;
- security quarantine for automated replies/auto-responders and potential `@namdar.co.uk` mail loops;
- quarantine when Authentication-Results reports DMARC failure together with SPF or DKIM failure for non-reply context;
- quarantine for executable/script/macro-enabled attachment filename types while retaining metadata only;
- exact-sender rate protection plus a global unknown-sender flood threshold;
- duplicate-insert race handling so Resend retries/manual replays return HTTP 200 instead of causing a retry loop;
- retention of limited security-relevant headers (`auto-submitted`, `authentication-results`) for server-side audit context.

The current inbound webhook already requires a valid Resend/Svix signature with a five-minute timestamp window. Production runtime logs on 2026-09-11 showed recent `POST /api/resend-inbound` requests returning HTTP 200, and production Supabase has a unique partial index on `support_inbox_messages.resend_email_id`, so normal duplicate/replay storage is already idempotent. The hardening branch improves race/error handling around those existing protections.

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

Production Supabase was inspected before changing the spam schema. The existing inbox tables were already RLS-enabled and service-role-only.

Two forward-only migrations were applied successfully to `namdar-production` and their SQL source is preserved under `supabase/migrations/`:

- `20260911213820_inbox_spam_controls.sql` / database migration `20260911213820 inbox_spam_controls`
- `20260911213842_inbox_spam_blocklist_fk_index.sql` / database migration `20260911213842 inbox_spam_blocklist_fk_index`

They extend `support_inbox_threads.status` with `spam`, add `spam_reason`, `spam_score`, and `spam_source`, create server-only `support_inbox_blocklist`, revoke browser roles, grant service-role access, and add lookup/status/foreign-key indexes. The follow-up inbound security hardening requires no additional database migration.

The Supabase security advisor reported the blocklist’s “RLS enabled, no policy” state as informational, matching Namdar’s other server-only tables. The performance advisor initially flagged the new `created_by` foreign key; the second migration added the covering index.

## Production data and migration safety

Do not rerun already-applied migrations on production. For future schema changes: inspect actual production schema/history, create a new forward-only migration, preserve the SQL source, check RLS/grants/indexes/data impact, run security/performance advisors, and record whether it was prepared or applied.

## Deployment and verification state

GitHub `main` automatically deploys to Vercel production.

The My Namdar session hotfix remains verified live. The Email inbox spam-protection PR #4 passed GitHub CI and its exact Vercel preview. It was rebased into `main` as commit `97014ad2c7dbd0cceb7ca8b97f193a3b5ce8e8bc`. Production deployment `dpl_8eu3eknmgXXcyChJwugfUjn1raWq` built the exact commit and reached READY. Canonical live requests to `namdar.co.uk` returned HTTP 200 for `admin.js`, `admin-original.js`, `admin-inbox-safety.js`, and `admin-inbox-safety.css`; live `admin.js` serves version `6.4.16-inbox-safety-1`.

The later documentation sync `57a7fa854853d68d46ac94f73371f4382f7503d5` also passed CI and deployed READY with `namdar.co.uk` assigned.

The inbound security hardening branch is **not yet production** until its PR passes CI, exact Vercel preview verification, merge, and canonical production verification. Do not claim the new flood/loop/authentication/attachment safeguards are live before that occurs.

## Known launch checks and cautions

- Verify Stripe, Turnstile, OAuth providers, SMS provider, Resend sending/inbound configuration and legal content before public advertising.
- Keep `RESEND_WEBHOOK_SECRET` configured in Production/Preview where inbound webhook testing is expected; never expose its value in browser code or documentation.
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

Finish `security/inbound-email-hardening-20260911`: run the repository JavaScript/API syntax checks and Vercel preview, merge only if green, verify the exact production deployment and canonical endpoint health, then use a controlled inbound email to confirm legitimate mail still reaches Admin → Email inbox. Separately, use the visible junk conversation to verify Mark spam / Block sender in the live UI. Do not intentionally send executable attachments merely to test quarantine.
