# Namdar AI fast resume

Last verified: 2026-09-12 UTC

Read this first. Use `docs/AI_HANDOFF.md` for implementation detail and `docs/PROJECT_STATUS.md` for roadmap/status.

## Production baseline
- Repository: `pchroonic/pchroonic`, default `main`.
- Current product main before this docs sync: `5249e2b4d2ed0c108a15facac01258d66bf4dece` from PR #42.
- PR #42 exact head: `ba6e03376364ae571429b5fbded7bc681271aaac`.
- GitHub CI run `34716653998`: SUCCESS.
- Exact-head Vercel preview: `dpl_6nBDUseeU7xSAefFzNQQLk6N9n6Y`, READY / clean errors-only build.
- Product production deployment: `dpl_5f1vCtVuo2LTFFPzWrqdfXLp8CbV`, READY on `https://namdar.co.uk`, `aliasError: null`.
- Supabase: `namdar-production` (`qjigldxjcpnrlyxgmlqq`).
- Window Cleaning is the only live/bookable service; five future services remain planned.
- Address-data work remains parked.
- Privileged staff requires AAL2/MFA.

## Window Stage 1 conversion & direct-contribution reporting — LIVE
PR #42 is production-live. It measures whether Window Cleaning is working before Namdar considers another service.

### Consented acquisition funnel
Admin → Reporting now measures a consistent consented visitor cohort:
1. covered postcode check;
2. guide quote requested;
3. final quote sent;
4. final quote accepted;
5. appointment booked;
6. job completed.

`conversion.js` creates a session-only anonymous funnel ID only when the visitor has already chosen the site's existing `namdar_cookie_choice=marketing` consent. Non-consenting visitors can quote/book normally and are simply absent from this acquisition cohort.

`api/funnel-event.js` is Window-only, POST-only, validates anonymous IDs, derives postcode area server-side and stores only area letters such as `SE`/`SW`, never the full postcode. It de-duplicates repeated events for 30 minutes.

`api/quote.js` preserves the service-live gate and Window input normalization, then links successful tracked quotes to the anonymous visitor in server-only `quote_funnel_links`. Tracking failure does not break quoting.

Historical quotes are not falsely backfilled into the acquisition funnel.

### Completed-job economics
Admin → Reporting also uses all completed Window jobs in the selected period to show:
- total and average job value;
- collected payments net of refunds;
- actual work hours from `started_at → completed_at`;
- job value per actual work hour;
- reviewed consumables, parking, travel and other direct costs;
- travel minutes/miles;
- direct contribution and direct margin for cost-reviewed jobs.

**Direct contribution is not net profit.** Labour, overheads, tax and other business costs are excluded. Jobs without a direct-cost review are not treated as £0-cost jobs.

`api/admin-job-economics.js` requires Bookings permission/AAL2, explicitly rejects non-Window bookings, bounds values and audit logs edits.

### Database/security
Production has the Stage 1 analytics foundation:
- `conversion_events`;
- `quote_funnel_links`;
- `booking_job_costs`.

All three have RLS enabled and no direct `anon`/`authenticated` table grants. At release verification all three contained 0 rows, so no synthetic tracking/economic data was invented.

Committed migrations:
- `20260912204000_window_stage1_conversion_profitability.sql`;
- `20260912204500_window_stage1_costs_updated_by_index.sql`.

Production migration history also contains the later idempotent `window_funnel_profitability_foundation` lock-down from the superseded PR #43 path; PR #43 was closed unmerged. Do not revive that duplicate implementation.

### Release verification
- unauthenticated production `/api/admin-window-performance?range=30d` → HTTP 401;
- production GET `/api/funnel-event` → HTTP 405;
- production `conversion.js` contains marketing-consent gating + session-only visitor ID;
- analytics tables: RLS true, no anon/auth grants;
- service catalog: `windows` live; gutters/jetwash/roof/handyman/tour3d planned.

## Booking operations remain live
Customer self-booking remains server-enforced: 21-day horizon, 24h notice, Mon–Sat, 08–11 / 11–14 / 14–17, max 3 jobs/day, postcode-area route density enabled. Admin can adjust this via the MFA-protected Booking operations panel.

## Next best work
1. collect real Window funnel and completed-job data;
2. make sure every completed job uses Start/Complete and gets a direct-cost review;
3. calibrate Window pricing and daily capacity from real value/work-hour, route/travel and direct contribution;
4. add genuine before/after proof and customer reviews;
5. assess Stage 2 only when the evidence supports it.

## Do not break
- Window Cleaning only is the current commercial offering.
- Do not activate Stage 2 until the user deliberately decides Stage 1 evidence supports it.
- Customer service/booking availability stays server-side enforced.
- Existing accepted work survives service pauses.
- Privileged staff requires AAL2/MFA.
- Address-data work stays parked unless the user deliberately changes focus.
- Support tickets remain customer-only; public inbound email remains Admin Email inbox.
- Never expose secrets.
