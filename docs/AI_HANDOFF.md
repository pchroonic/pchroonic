# Namdar AI handoff

Last verified: 2026-09-12 UTC

Read `docs/AI_START.md` first.

## Production baseline
- Repo `pchroonic/pchroonic`, default `main`.
- Current main before candidate: `6c4171258cd12553d3bd94cabc8d02fdcb5ec262`.
- Live product merge: PR #40 `858500c6c48d05af918c70d5ee087b319b9caf35`.
- Window Cleaning only is live; five future services planned.
- Supabase `namdar-production` (`qjigldxjcpnrlyxgmlqq`).
- Booking operations remain live: 21-day horizon, 24h notice, Mon-Sat, three 3h windows, max 3 jobs/day, postcode-area route density.
- Privileged staff access requires AAL2/MFA.

## Candidate: Window Cleaning conversion and profitability
Branch `feat/window-funnel-profitability-20260912`.

### Funnel architecture
New `funnel-tracking.js` runs before the existing conversion enhancements. It wraps `fetch` only to:
- observe successful `/api/postcode?service=windows` responses and send a minimal postcode-check event;
- append an anonymous in-memory `visitorId` to Window quote POST payloads.

The visitor ID exists only for the current page instance. No localStorage/sessionStorage/cookie is used for analytics.

`api/conversion-event.js`:
- POST only;
- accepts only `eventType=postcode_checked` + `serviceKey=windows`;
- validates `visitorId` length/characters;
- stores only postcode area (`SE`, `SW`, etc.), never full postcode;
- de-duplicates the same visitor/service/area within 5 minutes.

`api/quote.js` keeps all existing service-live and Window input-normalisation checks. On a successful HTTP 201 response only, it upserts `quote_id` → `visitor_id` into `quote_funnel_links`. Link failures are fail-open for the customer quote flow and logged server-side rather than breaking quoting.

`conversion.js` is now a small loader. The previous exact conversion behaviour is preserved byte-for-byte as `conversion-original.js`, then `funnel-tracking.js` is loaded before it.

### Funnel semantics
`api/admin-window-performance.js` uses a covered-postcode visitor cohort for the selected reporting period:
- unique postcode-check visitors;
- unique covered visitors;
- linked Window guide quotes;
- linked quotes with `sent_at` / sent-approved state;
- accepted quotes (`customer_response=accepted`);
- non-cancelled bookings;
- completed bookings.

Each stage returns count, conversion from previous stage and conversion from the top of funnel. Tracking is forward-looking from release activation; historical quotes without anonymous links are not retroactively invented.

### Profitability semantics
Profitability reporting includes all completed Window Cleaning jobs in the selected period, whether or not they predate funnel instrumentation.

Per completed job:
- job value = non-void invoice total when available, else final quote, else guide estimate;
- direct costs = consumables + parking + travel cost + other cost;
- contribution before labour = job value - direct costs;
- actual job minutes = `started_at` to `completed_at` when both exist;
- labour cost = actual hours × configured internal labour cost/hour;
- estimated profit = job value - direct costs - labour cost.

Labour-inclusive profit/margin is returned only when:
- labour cost/hour > 0; and
- every completed job in the selected period has actual timing.

Otherwise the dashboard explicitly shows contribution before labour and readiness/capture percentages instead of presenting a false profit number.

### Cost capture
`booking_job_costs` stores per-booking:
- consumables cost;
- parking cost;
- travel cost;
- other cost;
- travel minutes;
- travel miles;
- notes;
- updated_by / updated_at.

POST `action=save-cost` requires `bookings` permission, verifies the booking belongs to a Window quote, bounds numeric values, upserts the row and audit logs `window_job_costs.update`.

POST `action=save-labour-rate` requires `settings` permission, stores `{labourCostPerHour}` in `site_settings.window_profitability`, and audit logs `window_profitability.labour_rate`.

GET `/api/admin-window-performance?range=30d|90d|ytd|all` requires `analytics` permission.

### Admin UI
`admin-window-performance.js` injects a panel into Admin → Reporting with:
- completed jobs / total job value / direct costs / contribution-or-profit KPIs;
- funnel bars;
- profitability readiness explanation;
- labour-rate input;
- completed-job cost table with save buttons.

`admin.js` loader version becomes `6.4.19-window-performance-1` and loads this panel after existing Admin modules.

### Database foundation
Migration `supabase/migrations/20260912204000_window_funnel_profitability_foundation.sql` creates (if absent) and locks down:
- `conversion_events`;
- `quote_funnel_links`;
- `booking_job_costs`.

Production already had matching empty tables. The migration was applied successfully to production on 2026-09-12 to make the schema reproducible. RLS remains enabled and all direct `anon`/`authenticated` table grants are revoked. Access is through server/service-role paths only.

### Tests / CI
`scripts/window-performance.test.mjs` verifies:
- anonymous visitor IDs / postcode-area validation;
- no persistent browser analytics storage;
- quote-link insertion only on successful quote creation;
- distinction between contribution and labour-inclusive profit;
- Admin cost/rate controls;
- RLS + grant revocations in the migration.

Workflow now syntax-checks new tracking/Admin/API files and runs the new test suite.

## Release sequence
1. handoff docs current;
2. PR opened;
3. exact-head GitHub CI success;
4. exact-head Vercel preview READY + clean errors-only logs;
5. preview/protected endpoint smoke checks;
6. merge main;
7. production deployment READY on `namdar.co.uk`;
8. verify analytics tables remain protected/initial state and service catalog remains Window live only;
9. docs-only live-ID sync if needed.

## Non-negotiables
- Do not activate another service.
- Do not weaken server-side quote/booking gates.
- Do not store full postcode or customer identity in `conversion_events`.
- Do not call contribution “profit” without labour readiness.
- Do not resume address-data imports/GetAddress harvesting.
- Never expose secrets.
