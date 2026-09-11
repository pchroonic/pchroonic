# Namdar project status

Last updated: 2026-09-11 UTC

## Current baseline

- Release documented in `README.md`: v6.4.16.
- Source branch: GitHub `main` in `pchroonic/pchroonic`.
- Delivery: Vercel project `namdar-website-starter-1` with `namdar.co.uk` assigned.
- Data/auth/storage: Supabase.
- Application shape: static multi-page front end plus Vercel Node serverless APIs.

## Main product areas

| Area | Primary source | Status summary |
| --- | --- | --- |
| Public website | `index.html`, `app.js`, `styles.css`, `services/`, `areas/` | Present; homepage JS hotfix live |
| Customer portal | `account.html`, `account.js`, `account-original.js`, `account-auth-hotfix.js`, customer APIs | Present; session-bootstrap hotfix live |
| Admin workspace | `admin.html`, `admin.js`, admin APIs | Present |
| Staff PWA | `staff.html`, `staff.js`, manifest and service worker | Present |
| Server functions | `api/` | Present; support-email routing hotfix live |
| Shared server utilities | `lib/server.js` | Present |
| Hosting, headers and cron | `vercel.json` | Present |
| Production database | Supabase | Live project verified healthy; schema history still needs dedicated review |

## Recently documented capabilities

- v6.4.16: public enquiries separated from relationship-gated customer support tickets.
- v6.4.16 post-release homepage hotfix: repaired malformed public `app.js` newsletter handler, routed runtime customer-support links to `tab=support`, and added browser-JavaScript syntax checks to CI.
- v6.4.16 support-email follow-up: customer ticket confirmation email now opens `account?tab=support` instead of the stale `account?tab=tickets` path.
- v6.4.16 account-session hotfix: preserves the previous portal source as `account-original.js`, defers Supabase auth-state callbacks outside the auth lock, adds an eight-second fail-safe for `getSession()`, and prevents the “Restoring your secure session” screen from remaining indefinitely.
- v6.4.15: external email and website ticket separation.
- v6.4.8: searchable/filterable customer notification centre.
- v6.4: installable staff PWA with privacy-limited offline read-only data.
- v6.3: administrator-only audit log and activity history.
- v6.0: automatic quote, invoice, cancellation, unassigned-job and overdue-job follow-ups.
- v5.x: staff route planning, quote workflow, customer booking changes, reporting, feedback, reminders, billing and job tracking.

## Configuration and data status

- `vercel.json` defines security headers, no-index/no-store rules for private surfaces, staff PWA caching rules, two cron schedules, sitemap rewrite and public work-page rewrite.
- Production migration claims in the README must be treated as historical facts to verify, not commands to rerun.
- The homepage, support-email routing and account-session hotfixes require no Supabase migration and no environment-variable change.
- Secret values belong in provider environment settings only.
- The repository currently uses a long release-history README; future work should keep it, while these two handoff files hold the concise current state.

## Verification status

- Repository and Vercel project linkage: verified on 2026-09-11.
- GitHub `main` automatically deploys to Vercel production: verified on 2026-09-11.
- Homepage/support-routing hotfix: GitHub checks passed and production commit `1714c694` was verified `READY` on `namdar.co.uk`.
- Support-ticket confirmation email routing hotfix: GitHub checks and Vercel preview passed; production commit `89fe0b80` was verified `READY` with the `namdar.co.uk` alias and no alias error.
- My Namdar session restore: a live screenshot showed `/account` stuck on “Restoring your secure session”. The canonical production `/api/config` endpoint was independently verified HTTP 200, so current production configuration was not the cause. Source inspection matched Supabase's documented async `onAuthStateChange` deadlock condition because the callback awaited portal code that can perform further Supabase session/API work.
- The account-session hotfix passed GitHub `AI handoff and JavaScript checks`, including syntax checks for `account.js`, `account-original.js` and `account-auth-hotfix.js`. The exact hotfix commit also built to a READY Vercel preview before merge.
- The hotfix was merged to `main` as commit `4a5d15bd305412b1ba244aa8444b875471ee2866`. Production deployment `dpl_Fyn26yMHhCMXao8JvS8dLF3DGLsv` was verified `READY`, targeted production, included `namdar.co.uk` with no alias error, and canonical live requests returned HTTP 200 for `account.js`, `account-original.js` and `account-auth-hotfix.js`.
- The live account loader identifies the deployed patch as `6.4.16-session-hotfix-1`. A final browser symptom check remains because an already-open pre-hotfix tab may retain an old Supabase auth lock until it is closed or reloaded.
- Live anonymous `POST /api/ticket-create`: verified HTTP 401 with expected sign-in guidance before and after the latest support hotfix; no QA support ticket was created.
- `api/ticket-create.js` source independently enforces authentication, active customer role and an existing quote, booking, subscription or project before ticket creation.
- The customer portal uses the same quote/booking/subscription/project relationship threshold to reveal the customer ticket form.
- A controlled synthetic customer account was confirmed through the real Supabase/Namdar email flow. It had no qualifying relationship initially; one clearly marked temporary QA quote made the relationship predicate eligible. The automation environment did not permit safely forwarding the temporary authenticated session credential into the live endpoint, so a full authenticated HTTP 201 ticket creation is still pending rather than claimed as complete.
- Temporary QA cleanup is complete and verified: synthetic auth user/profile, temporary quote, support tickets for that account and stored HTTP test responses are all absent. No real customer data was used or modified.
- Production Supabase project health and the relevant relationship tables were inspected; full migration-history reconciliation remains outstanding.
- v6.4.15 inbound email separation: controlled live test passed; inbound email reached Admin → Email inbox and created no new ticket.

## Outstanding work

1. Confirm in the user's browser that `/account` now opens normally or exits to the recoverable sign-in state instead of remaining indefinitely on the session-restoring spinner. Close older Namdar tabs once before the first post-hotfix reload if needed.
2. Complete one browser-based authenticated end-to-end ticket test with a controlled eligible customer: create a ticket, confirm it appears in My Namdar and Admin, verify the notification route, then remove test artifacts.
3. Confirm production schema/migration history and preserve a complete migration source set.
4. Confirm production readiness of Stripe, Turnstile, OAuth, SMS, Resend and legal configuration.
5. Confirm intended database-level and application-level double-booking protections.

## Handoff maintenance rule

Any substantial change must update this file and `docs/AI_HANDOFF.md` in the same commit. Replace stale status instead of endlessly appending. Put detailed release history in `README.md` or a dedicated changelog, and never include credentials or customer data.
