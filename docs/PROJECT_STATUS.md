# Namdar project status

Last updated: 2026-09-11 UTC

## Current baseline

- Release documented in `README.md`: v6.4.15.
- Source branch: GitHub `main` in `pchroonic/pchroonic`.
- Delivery: Vercel project `namdar-website-starter-1` with `namdar.co.uk` assigned.
- Data/auth/storage: Supabase.
- Application shape: static multi-page front end plus Vercel Node serverless APIs.

## Main product areas

| Area | Primary source | Status summary |
| --- | --- | --- |
| Public website | `index.html`, `app.js`, `styles.css`, `services/`, `areas/` | Present |
| Customer portal | `account.html`, `account.js`, customer APIs | Present |
| Admin workspace | `admin.html`, `admin.js`, admin APIs | Present |
| Staff PWA | `staff.html`, `staff.js`, manifest and service worker | Present |
| Server functions | `api/` | Present |
| Shared server utilities | `lib/server.js` | Present |
| Hosting, headers and cron | `vercel.json` | Present |
| Production database | Supabase | Verify live schema before changes |

## Recently documented capabilities

- v6.4.15: external email and website ticket separation.
- v6.4.8: searchable/filterable customer notification centre.
- v6.4: installable staff PWA with privacy-limited offline read-only data.
- v6.3: administrator-only audit log and activity history.
- v6.0: automatic quote, invoice, cancellation, unassigned-job and overdue-job follow-ups.
- v5.x: staff route planning, quote workflow, customer booking changes, reporting, feedback, reminders, billing and job tracking.

## Configuration and data status

- `vercel.json` defines security headers, no-index/no-store rules for private surfaces, staff PWA caching rules, two cron schedules, sitemap rewrite and public work-page rewrite.
- Production migration claims in the README must be treated as historical facts to verify, not commands to rerun.
- Secret values belong in provider environment settings only.
- The repository currently uses a long release-history README; future work should keep it, while these two handoff files hold the concise current state.

## Verification status

- Repository and Vercel project linkage: verified on 2026-09-11.
- Current source heading v6.4.15: verified from `README.md` on 2026-09-11.
- GitHub `main` automatically deploys to Vercel production: verified on 2026-09-11.
- Continuity commit `50783b5` reached a `READY` production deployment: verified on 2026-09-11.
- Current production commit for future changes: compare Vercel deployment metadata with GitHub `main` before making a claim.
- Production Supabase schema/migration state: not independently verified in this session.
- v6.4.15 end-to-end email/ticket behaviour: not independently tested in this session.

## Outstanding work

1. Verify the canonical-domain response and repeat the deployment-commit comparison after the next product change.
2. Test the v6.4.15 inbound email, Admin Email inbox, website ticket and feedback-escalation flows without using real customer data.
3. Confirm production schema/migration history and preserve a complete migration source set.
4. Confirm production readiness of Stripe, Turnstile, OAuth, SMS, Resend and legal configuration.
5. Confirm intended database-level and application-level double-booking protections.

## Handoff maintenance rule

Any substantial change must update this file and `docs/AI_HANDOFF.md` in the same commit. Replace stale status instead of endlessly appending. Put detailed release history in `README.md` or a dedicated changelog, and never include credentials or customer data.
