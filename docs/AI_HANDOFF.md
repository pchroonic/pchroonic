# Namdar AI handoff

Last verified: 2026-09-11 UTC

This is the first file every AI should read after opening the repository. Keep it concise, factual and current. Never store secret values or personal customer data here.

## Source of truth

- Product: Namdar, a UK exterior-cleaning and handyman service platform.
- Repository: `pchroonic/pchroonic`, default branch `main`.
- Hosting project: Vercel project `namdar-website-starter-1`.
- Canonical domain assigned in Vercel: `namdar.co.uk`.
- Backend: Supabase project referred to in the existing documentation as `namdar-production`.
- Current code/release heading: Namdar v6.4.16.

The repository contains the current source. Use Vercel, Supabase and other provider dashboards only to verify live state. Never copy secret values from those services into this file.

## Current release

The latest documented release is v6.4.16. Public visitors no longer create support tickets. They can request a quote, use general chat guidance or email Namdar; inbound email remains in Admin → Email inbox. Ticket creation is private to signed-in customers with an existing quote, booking, subscription or project, enforced in both My Namdar and `api/ticket-create.js`. The public support explanation is fixed product copy and is not overridden by the old admin-managed `ticket_intro` field. Authenticated customer tickets no longer use Turnstile; public sign-in, registration and guest chat still do.

The 2026-09-11 homepage hotfix is live in production. It repairs a malformed newsletter event-handler expression in `app.js`, routes public/chat customer-support links to the portal's actual `support` tab slug instead of the stale `tickets` slug, and adds `node --check` validation for critical browser JavaScript files to the GitHub workflow.

The follow-up support-link hotfix is also live. Customer support-ticket confirmation emails in `api/ticket-create.js` now open `https://namdar.co.uk/account?tab=support` instead of the stale `?tab=tickets` URL. No Supabase migration or environment-variable change was required.

## Architecture at a glance

- Public static pages: root HTML/JavaScript/CSS, service pages under `services/`, and location pages under `areas/`.
- Customer portal: `account.html`, `account.js` and customer-facing serverless endpoints.
- Admin workspace: `admin.html`, `admin.js` and protected admin endpoints under `api/`.
- Staff app: `staff.html`, `staff.js`, `staff.webmanifest` and `staff-sw.js`; this is an installable, privacy-limited PWA.
- Server API: Vercel Node serverless functions under `api/`.
- Shared server logic: `lib/server.js`.
- Hosting/security/cron routing: `vercel.json`.
- Data/auth/storage: Supabase, accessed through public anon credentials in the browser where appropriate and privileged service-role access only on the server.
- Email: Resend-related API flows and inbound handling.
- Payments: Stripe-ready server flows; verify live configuration before enabling or claiming production readiness.

## Major working capabilities documented in the repository

- Public service and area pages, postcode/service-area checks and self-managed address handling.
- Public enquiries are separated from private customer support: quotes/email for visitors, account tickets for eligible signed-in customers.
- Customer accounts, projects, quotes, bookings, billing, support, notifications and account deletion/recovery.
- Admin CRM, diary, quote/booking management, payments, reporting, follow-ups, feedback, audit history, support and email inboxes.
- Staff job workflow, route planning, before/after uploads and installable mobile PWA behaviour.
- Automated booking reminders, business follow-ups and account-purge cron jobs.
- Supabase RLS-backed data access with server-only handling for privileged workflows.

## Production data and migration safety

The README states that multiple v4-v6 migrations have already been applied to the production Supabase project. Do not rerun them on production. Before any schema change:

1. Inspect the actual production schema and migration history.
2. Confirm whether the required SQL file is present in the current checkout. Some README references may describe files that are not present in this repository snapshot.
3. Create a new forward-only migration; do not edit history and assume it can be replayed safely.
4. Check RLS, privileges, indexes, data backfill impact and rollback/recovery strategy.
5. Record whether the migration was only prepared or was actually applied.

## Environment-variable names

Never record values. Existing documentation refers to:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY` or publishable equivalent
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `NAMDAR_FROM_EMAIL`
- `NAMDAR_SUPPORT_EMAIL`
- `NAMDAR_NOTIFY_EMAIL`
- `TURNSTILE_SITE_KEY`
- `TURNSTILE_SECRET_KEY`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `STRIPE_SECRET_KEY`
- `CRON_SECRET`
- optional `OVERPASS_API_URL`

Verify required variables separately in Preview and Production. Do not assume that the presence of a name in this list means it is configured.

## Deployment and verification state

GitHub `main` is connected to automatic Vercel production deployments. The support-email routing hotfix was verified `READY` on `namdar.co.uk` from production commit `89fe0b80` on 2026-09-11. The exact production deployment included the canonical `namdar.co.uk` alias with no alias error.

The live anonymous `POST /api/ticket-create` check returned HTTP 401 with the expected sign-in guidance both before and after the support-email hotfix, and it created no support ticket. A controlled synthetic customer account was confirmed through the real Namdar/Supabase email flow. With no quote, booking, subscription or project, it was ineligible; after adding one clearly marked temporary QA quote, the same relationship predicate used by both `account.js` and `api/ticket-create.js` became eligible. The current automation environment did not safely permit forwarding the temporary authenticated session credential into the production endpoint, so the final authenticated HTTP 201 ticket-creation call remains unverified rather than being overstated.

All temporary QA database artifacts from that check were removed and verified absent: the synthetic auth user/profile, temporary quote, support tickets for that account and stored HTTP test responses are all zero. No real customer data was used or modified.

Documentation-only commits also trigger Vercel automation. A successful build alone is not evidence that database, email, payment, auth or cron workflows were exercised.

## Known launch checks and cautions

- Verify Stripe, Turnstile, OAuth providers, SMS provider, Resend sending/inbound configuration and legal content before a public advertising launch.
- Confirm Supabase Auth site URL and redirect allowlist for `https://namdar.co.uk`.
- Verify the hourly booking-notification cron and daily account-purge cron with `CRON_SECRET` configured.
- Confirm that app-level booking overlap checks and any database-level double-booking protection match the intended business rules.
- Test privileged admin/staff APIs with least-privilege accounts after permission changes.
- Keep offline staff data minimal, short-lived and read-only as designed.

## Required workflow for future AI sessions

1. Read this file, `docs/PROJECT_STATUS.md` and `AGENTS.md` before changing anything.
2. Inspect the relevant code and current provider state rather than trusting an old chat or ZIP filename.
3. Make the smallest safe change that meets the request.
4. Test the affected flow and check for regressions in adjacent customer/admin/staff paths.
5. Update this file and `docs/PROJECT_STATUS.md` in the same commit.
6. State clearly whether Supabase changed, environment variables changed, a migration is required, the change was deployed, and it is production-ready.

## Next recommended step

Complete one browser-based authenticated end-to-end support test with a controlled eligible test customer: create a ticket, confirm it appears in My Namdar and Admin, confirm the customer notification opens `?tab=support`, then remove the test artifacts. Do not use unrelated real customer credentials or data merely for testing.
