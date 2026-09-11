# Namdar project status

Last updated: 2026-09-11 UTC

## Current baseline

- Release documented in `README.md`: v6.4.16.
- Source branch: GitHub `main` in `pchroonic/pchroonic`; homepage hotfix prepared on `hotfix/support-route-js-20260911` until verified.
- Delivery: Vercel project `namdar-website-starter-1` with `namdar.co.uk` assigned.
- Data/auth/storage: Supabase.
- Application shape: static multi-page front end plus Vercel Node serverless APIs.

## Main product areas

| Area | Primary source | Status summary |
| --- | --- | --- |
| Public website | `index.html`, `app.js`, `styles.css`, `services/`, `areas/` | Present; homepage JS hotfix prepared |
| Customer portal | `account.html`, `account.js`, customer APIs | Present |
| Admin workspace | `admin.html`, `admin.js`, admin APIs | Present |
| Staff PWA | `staff.html`, `staff.js`, manifest and service worker | Present |
| Server functions | `api/` | Present |
| Shared server utilities | `lib/server.js` | Present |
| Hosting, headers and cron | `vercel.json` | Present |
| Production database | Supabase | Verify live schema before changes |

## Recently documented capabilities

- v6.4.16: public enquiries separated from relationship-gated customer support tickets.
- v6.4.16 post-release hotfix: repair malformed public `app.js` newsletter handler, route customer-support links to `tab=support`, and add browser-JavaScript syntax checks to CI.
- v6.4.15: external email and website ticket separation.
- v6.4.8: searchable/filterable customer notification centre.
- v6.4: installable staff PWA with privacy-limited offline read-only data.
- v6.3: administrator-only audit log and activity history.
- v6.0: automatic quote, invoice, cancellation, unassigned-job and overdue-job follow-ups.
- v5.x: staff route planning, quote workflow, customer booking changes, reporting, feedback, reminders, billing and job tracking.

## Configuration and data status

- `vercel.json` defines security headers, no-index/no-store rules for private surfaces, staff PWA caching rules, two cron schedules, sitemap rewrite and public work-page rewrite.
- Production migration claims in the README must be treated as historical facts to verify, not commands to rerun.
- The homepage hotfix requires no Supabase migration and no environment-variable change.
- Secret values belong in provider environment settings only.
- The repository currently uses a long release-history README; future work should keep it, while these two handoff files hold the concise current state.

## Verification status

- Repository and Vercel project linkage: verified on 2026-09-11.
- GitHub `main` automatically deploys to Vercel production: verified on 2026-09-11.
- Production commit `7a44dc4` was `READY` and matched GitHub `main` immediately before hotfix work began.
- Canonical homepage returned HTTP 200 and displayed the intended customer-only support copy, but source inspection found a malformed newsletter event-handler expression in `app.js` that could stop public JavaScript parsing.
- Customer portal uses `support` as the support-tab URL slug; public/chat links were still using stale `tickets` URLs. The hotfix corrects this routing in `app.js` and includes a compatibility rewrite for any stale homepage support link.
- `api/ticket-create.js` source enforces authentication, active customer role and an existing quote, booking, subscription or project before ticket creation.
- Production Supabase schema/migration state: not independently verified in this session.
- v6.4.15 inbound email separation: controlled live test passed; inbound email reached Admin → Email inbox and created no new ticket.

## Outstanding work

1. Verify the hotfix branch's JavaScript checks and Vercel preview, then promote the squashed hotfix to `main` and confirm the matching production deployment on `namdar.co.uk`.
2. Complete the live ticket API verification: anonymous ticket requests return 401; then use a controlled eligible test customer to create and follow a ticket in My Namdar. Do not use unrelated real customer credentials merely for testing.
3. Confirm production schema/migration history and preserve a complete migration source set.
4. Confirm production readiness of Stripe, Turnstile, OAuth, SMS, Resend and legal configuration.
5. Confirm intended database-level and application-level double-booking protections.

## Handoff maintenance rule

Any substantial change must update this file and `docs/AI_HANDOFF.md` in the same commit. Replace stale status instead of endlessly appending. Put detailed release history in `README.md` or a dedicated changelog, and never include credentials or customer data.
