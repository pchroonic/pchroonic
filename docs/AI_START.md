# Namdar AI fast resume

Last verified: 2026-09-12 UTC

Read this first. Use `docs/AI_HANDOFF.md` for implementation detail and `docs/PROJECT_STATUS.md` for roadmap/status.

## Production baseline
- Repo: `pchroonic/pchroonic`, default `main`.
- Current main before this candidate: `6c4171258cd12553d3bd94cabc8d02fdcb5ec262` (docs PR #41).
- Current live product merge: `858500c6c48d05af918c70d5ee087b319b9caf35` (PR #40 booking operations).
- Production is READY on `https://namdar.co.uk`.
- Supabase: `namdar-production` (`qjigldxjcpnrlyxgmlqq`).
- Window Cleaning is the only live/bookable service. Five future services remain planned.
- Address-data work remains parked.
- Privileged staff requires AAL2/MFA.

## Live Window Cleaning operations
Customer self-booking is currently governed by persisted rules: 21-day horizon, 24h notice, Mon-Sat, 08-11 / 11-14 / 14-17 windows, max 3 jobs/day and postcode-area route density. Server-side booking validation remains mandatory.

## Current candidate — Window funnel + profitability
Branch: `feat/window-funnel-profitability-20260912`.

Goal: prove whether Stage 1 Window Cleaning pays off before activating another service.

### Funnel tracking
The customer funnel is measured as:
1. postcode checks;
2. covered postcode checks;
3. guide estimates;
4. final quotes sent;
5. quotes accepted;
6. appointments booked;
7. jobs completed.

`funnel-tracking.js` uses a random **in-memory page ID only**. It does not create an analytics cookie and does not persist the ID to localStorage/sessionStorage. It records only Window Cleaning, postcode area (`SE`, `SW`, etc.) and coverage status. Full postcodes remain only in the normal operational quote/postcode flow.

`api/conversion-event.js` accepts only `postcode_checked` events for Window Cleaning, validates visitor/postcode-area values and de-duplicates rapid repeats.

`api/quote.js` links a successfully created quote to the anonymous page visitor in `quote_funnel_links`; this does not alter quote pricing or customer data.

### Existing analytics foundation formalised
Production already contained three empty server-only tables:
- `conversion_events`;
- `quote_funnel_links`;
- `booking_job_costs`.

Migration `20260912204000_window_funnel_profitability_foundation.sql` formalises that foundation for reproducibility. It has already been applied successfully to production; the tables remain RLS-enabled with direct `anon`/`authenticated` grants revoked.

### Profitability model
`api/admin-window-performance.js` + `admin-window-performance.js` add a Window Cleaning performance panel under Admin → Reporting.

It shows:
- funnel step counts and conversion from previous/top stage;
- completed job value and average job value;
- recorded direct costs and cost-capture rate;
- actual work-time capture from `started_at` → `completed_at`;
- contribution before labour;
- labour-inclusive estimated profit/margin only when a real internal labour cost/hour is configured and completed jobs in the period have actual timing.

The dashboard deliberately does **not** call contribution “profit” when labour data is missing.

Completed Window jobs can record consumables, parking, travel cost, other direct cost, travel minutes/miles and notes. The labour cost/hour setting is stored in `site_settings.window_profitability`. Cost/rate changes are privileged and audit logged.

### Compatibility / safety
- Window Cleaning remains the only live service.
- Quote gate, pricing, reviewed-final-quote flow and booking rules remain unchanged.
- Tracking tables are server-only.
- No customer secrets or full postcode are stored in `conversion_events`.
- Address-data work stays parked.

### Tests / release gate
`scripts/window-performance.test.mjs` checks privacy-minimal browser tracking, quote linkage, RLS/revoked grants, funnel/profitability semantics and Admin cost capture. CI syntax checks all new files plus the preserved `conversion-original.js`.

Release only after exact-head CI succeeds, exact-head Vercel preview is READY/clean, protected Admin API smoke checks pass, then merge and production verify.

## After this candidate
Use real Window jobs to calibrate pricing and route capacity. Add genuine before/after proof and reviews. Do not activate Stage 2 until Window Cleaning performance data supports it.
