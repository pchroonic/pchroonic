# Namdar AI handoff

Last verified: 2026-09-12 UTC

Read `docs/AI_START.md` first.

## Production source of truth
- Repo `pchroonic/pchroonic`, default `main`.
- Window performance product release: PR #42, merged as `5249e2b4d2ed0c108a15facac01258d66bf4dece`.
- PR #42 exact head: `ba6e03376364ae571429b5fbded7bc681271aaac`.
- GitHub CI `34716653998`: SUCCESS.
- Exact-head preview `dpl_6nBDUseeU7xSAefFzNQQLk6N9n6Y`: READY / clean errors-only build.
- Production `dpl_5f1vCtVuo2LTFFPzWrqdfXLp8CbV`: READY on `https://namdar.co.uk`, no alias error.
- Supabase `namdar-production` (`qjigldxjcpnrlyxgmlqq`).
- Only `windows` is live; gutters/jetwash/roof/handyman/tour3d remain planned.
- Privileged staff requires AAL2/MFA.

## Window Stage 1 performance — LIVE
Purpose: measure whether Window Cleaning Stage 1 is working before considering another service.

### Existing timestamps reused
Do not duplicate downstream state in analytics tables:
- `quotes.created_at` = guide quote request;
- `quotes.sent_at` = final quote sent;
- `quotes.customer_response/customer_responded_at` = accepted/declined;
- non-cancelled `bookings` = booked;
- `bookings.started_at/completed_at` = actual field work timing/completion.

The new analytics layer supplies the missing covered-postcode → quote acquisition link.

### Consent-aware postcode linkage
`conversion.js` creates a session-only anonymous visitor ID only when `localStorage.namdar_cookie_choice === 'marketing'`. Non-consenting visitors quote/book normally and are not included in the acquisition cohort.

On successful Window postcode checks it posts `/api/funnel-event`. The server stores only postcode-area letters, e.g. `SE`/`SW`; full postcodes are not stored in `conversion_events`.

When the same consented visitor submits `/api/quote`, the existing quote wrapper receives `visitorId`. `api/quote.js` preserves live-service gating and Window input normalization, then links the successful quote ID to the visitor in `quote_funnel_links`. Funnel-link write failure is fail-open for quoting.

`api/funnel-event.js` is now deliberately Window-only:
- POST only;
- `eventType=postcode_checked` only;
- `serviceKey=windows` only;
- validates UUID/anonymous ID;
- derives postcode area server-side;
- de-duplicates identical visitor/area/coverage events for 30 minutes.

### Funnel semantics
`api/admin-window-performance.js` requires Analytics permission/AAL2 and reports a consistent consented visitor cohort for 30d/90d/YTD/all-time:
1. covered postcode check;
2. guide quote requested;
3. final quote sent;
4. final quote accepted;
5. appointment booked;
6. job completed.

Every funnel stage uses unique anonymous visitors from the covered-postcode cohort. Historical quotes/bookings are not retroactively invented into the acquisition funnel.

### Completed-job economics
Economics are independent of acquisition consent and include all completed Window jobs in the selected period:
- job value = invoice total, falling back to final quote then guide estimate;
- collected revenue = linked payments less refunds;
- actual work hours = valid `started_at → completed_at` duration;
- job value per actual work hour;
- direct cost only when a `booking_job_costs` review exists;
- direct contribution = reviewed job value − reviewed direct costs;
- direct margin = direct contribution / reviewed job value.

Jobs without cost review are excluded from direct contribution/margin instead of being assumed to cost £0. Jobs without valid start/completion timestamps are excluded from actual-time productivity metrics.

**Direct contribution is not net profit.** It excludes labour, overheads, tax and other business costs.

### Job-cost capture
`api/admin-job-economics.js` requires Bookings permission/AAL2. It now verifies the booking's quote is `service_key='windows'`, then allows bounded entry of:
- consumables;
- parking;
- travel cost;
- other direct cost;
- travel minutes;
- travel miles;
- note.

It upserts `booking_job_costs` and audit logs the change. Analytics-only staff can view performance but cannot edit job economics.

### Database/security
Committed migrations:
- `supabase/migrations/20260912204000_window_stage1_conversion_profitability.sql`;
- `supabase/migrations/20260912204500_window_stage1_costs_updated_by_index.sql`.

Server-only tables:
1. `conversion_events`
2. `quote_funnel_links`
3. `booking_job_costs`

Production verification after release:
- RLS true on all three;
- direct `anon`/`authenticated` grants: none;
- all three row counts at verification: 0.

Migration history also contains the later idempotent `window_funnel_profitability_foundation` migration from superseded PR #43. It only re-asserted the same empty-table/RLS/index foundation. PR #43 is closed and must not be merged/revived.

### Admin UI
`admin-window-performance.js` is live under Admin → Reporting and follows the existing report range selector. It renders:
- consented six-stage funnel;
- tracking/data-quality notice;
- completed jobs;
- total/average job value;
- collected revenue;
- actual work hours;
- value per work hour;
- reviewed direct costs;
- direct contribution/direct margin;
- completed-job direct-cost/travel editor where permitted.

`admin.js` includes the Window performance module after booking operations.

### Tests / release history
`scripts/window-performance.test.mjs` covers RLS/server-only posture, privacy-safe funnel events, consent-aware session tracking, quote linkage, six funnel stages, direct contribution, permission/audit rules and Window-only state.

One initial PR #42 CI run failed because a test regex expected the literal session key directly in `sessionStorage.getItem(...)`; production code correctly used a `key` variable. The brittle assertion was fixed, not the correct consent code. The final exact-head CI `34716653998` succeeded.

## Production smoke checks
- `/api/admin-window-performance?range=30d` unauthenticated → 401;
- GET `/api/funnel-event` → 405;
- `/conversion.js` live contains marketing-consent gate and session-only ID;
- product deployment `dpl_5f1vCtVuo2LTFFPzWrqdfXLp8CbV` READY with `namdar.co.uk` alias and no alias error;
- service catalog still Window live, five planned.

## Booking operations remain live
21-day horizon, 24h notice, Mon–Sat, 08–11 / 11–14 / 14–17, max 3 jobs/day, postcode-area route density. These remain stored in `site_settings.booking_operations` and editable from MFA-protected Admin.

## Next recommended work
Collect real Window Cleaning data before changing price/service scope. Ensure every completed job gets Start/Complete timestamps and a direct-cost review. Then use value/work-hour, travel, direct contribution and funnel drop-off to calibrate pricing/capacity. Add genuine before/after proof and reviews. Do not activate Stage 2 until the evidence supports it.

## Non-negotiables
- Do not activate another service without deliberate user decision.
- Do not resume address-data work automatically.
- Existing accepted work survives service pause.
- Service and booking restrictions remain server-side enforced.
- Privileged access remains AAL2/MFA protected.
- Support tickets stay customer-only.
- Never expose secrets.
