# Namdar project status

Last updated: 2026-09-12 UTC

## Baseline
- Repo `pchroonic/pchroonic`, default `main`.
- Current main before candidate: `6c4171258cd12553d3bd94cabc8d02fdcb5ec262`.
- Current live product: PR #40 booking operations.
- Production: `https://namdar.co.uk` READY.
- Supabase: `namdar-production` (`qjigldxjcpnrlyxgmlqq`).
- Window Cleaning is the only live/quotable/bookable service.
- Future services remain planned.
- Address-data work remains parked.

## Live Stage 1 operations
Customer self-booking is server-enforced with 21-day horizon, 24h notice, Mon-Sat, 08-11 / 11-14 / 14-17 windows, max 3 jobs/day and postcode-area route density. Admin can intentionally override scheduling.

## Current candidate — conversion + profitability
Branch `feat/window-funnel-profitability-20260912`.

### Funnel
Forward-looking Window Cleaning funnel:
1. postcode checks;
2. covered checks;
3. guide estimates;
4. final quotes sent;
5. accepted quotes;
6. appointments booked;
7. completed jobs.

The browser identifier is random and in-memory only. It is not stored in cookies/localStorage/sessionStorage. `conversion_events` stores only visitor ID, Window service, postcode area and coverage status. `quote_funnel_links` links the subsequent quote to that anonymous page journey.

### Profitability
Admin → Reporting gains Window-specific Stage 1 metrics:
- completed jobs;
- completed job value and average job value;
- direct costs and cost-capture rate;
- actual job hours/minutes from work timestamps;
- contribution before labour;
- estimated profit and margin only when labour cost/hour is configured and time capture is complete.

Completed jobs can record consumables, parking, travel cost, other cost, travel minutes/miles and notes. Labour cost/hour is configurable in Admin and stored under `site_settings.window_profitability`.

### Security / data
- `conversion_events`, `quote_funnel_links`, `booking_job_costs` are RLS-enabled server-only tables.
- direct grants to `anon` and `authenticated` are revoked.
- no full postcode/customer identity is added to conversion analytics.
- privileged performance reads/writes remain behind existing AAL2/MFA staff APIs.
- cost/rate changes are audit logged.

### Database migration
`20260912204000_window_funnel_profitability_foundation.sql` formalises the three pre-existing empty production tables and indexes. It has been successfully applied to production; no customer data was migrated or backfilled.

### Code
New/changed:
- `funnel-tracking.js`
- `conversion-original.js` (preserved previous conversion behaviour)
- `conversion.js` loader
- `api/conversion-event.js`
- `api/quote.js` anonymous quote linkage
- `api/admin-window-performance.js`
- `admin-window-performance.js`
- `admin.js` loader v6.4.19-window-performance-1
- `scripts/window-performance.test.mjs`
- CI workflow coverage

## Candidate release gates
- [x] production database foundation formalised/applied
- [x] product code implemented on feature branch
- [x] regression test added
- [x] all three handoff docs updated
- [ ] PR opened
- [ ] exact-head CI success
- [ ] exact-head Vercel preview READY / clean
- [ ] protected endpoint + asset smoke checks
- [ ] merge main
- [ ] production deployment READY / alias clean
- [ ] service catalog rechecked: Window live only
- [ ] final handoff live IDs synced

## Current service stages
1. Window Cleaning — LIVE
2. Gutter Cleaning — planned
3. Patio & Jet Washing — planned
4. Roof Cleaning — planned
5. Handyman Services — planned
6. 3D Property Tours — planned

Do not activate Stage 2 from technical readiness alone.

## Next after this release
1. gather real Window Cleaning funnel and job-cost data;
2. calibrate pricing and daily capacity from actual job duration/travel/margin;
3. add genuine before/after work and collect customer reviews;
4. assess Stage 2 only after enough evidence exists.

## Other open work
- fresh privileged password/CAPTCHA/MFA completion;
- `/api/booking-notifications` 504 investigation remains separate;
- Stripe, SMS, legal/launch checks;
- address-data pilot remains parked.
