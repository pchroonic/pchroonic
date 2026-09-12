# Namdar AI fast resume

Last verified: 2026-09-12 UTC

Read this first. Use `docs/AI_HANDOFF.md` for implementation detail and `docs/PROJECT_STATUS.md` for the roadmap.

## Production baseline
- Repository: `pchroonic/pchroonic`, default `main`.
- Current main before this candidate: `6c4171258cd12553d3bd94cabc8d02fdcb5ec262`.
- Booking-operations product release: PR #40 merge `858500c6c48d05af918c70d5ee087b319b9caf35`.
- Production is READY on `https://namdar.co.uk`.
- Supabase: `namdar-production` (`qjigldxjcpnrlyxgmlqq`).
- Window Cleaning is the only live/bookable service; five future services remain planned.
- Address-data work remains parked.

## Current candidate — Window Stage 1 conversion & profitability
Branch: `feat/window-conversion-profitability-20260912`.

Goal: measure whether Window Cleaning Stage 1 is working before adding another service.

### Funnel source of truth
Existing records already provide most downstream timestamps:
- quote request: `quotes.created_at`;
- final quote: `quotes.sent_at`;
- acceptance: `quotes.customer_response/customer_responded_at`;
- booking: `bookings.created_at`;
- actual start/completion: `bookings.started_at/completed_at`.

The candidate adds only the missing postcode-to-quote linkage. `conversion.js` uses a session-only anonymous ID **only when the visitor has already chosen the existing `namdar_cookie_choice=marketing` consent**. Successful postcode API responses are posted to `/api/funnel-event`. Analytics stores only the postcode area letters (e.g. SE/SW), never the full postcode.

`api/quote.js` safely links the resulting quote ID to that anonymous visitor in server-only `quote_funnel_links`. Non-consenting visitors use quoting normally and are simply absent from the postcode-to-quote cohort.

### New server-only data
Migration `20260912204000_window_stage1_conversion_profitability.sql` is already applied to production and adds:
- `conversion_events` — privacy-safe postcode-check events;
- `quote_funnel_links` — quote ↔ anonymous visitor link;
- `booking_job_costs` — reviewed direct job costs/travel context.

All three tables have RLS enabled and direct `anon`/`authenticated` grants revoked. No customer-facing direct database access is introduced.

### Admin performance reporting
New `api/admin-window-performance.js` requires Analytics permission/AAL2 and reports a consistent consented visitor cohort:
1. covered postcode check;
2. guide quote requested;
3. final quote sent;
4. final quote accepted;
5. appointment booked;
6. job completed.

Historical Window quotes/bookings remain included in completed-job economics, but are not falsely retro-linked to old postcode checks. The dashboard explicitly states the tracking start limitation.

### Completed-job economics
New `api/admin-job-economics.js` requires Bookings permission/AAL2 and audit logs edits. Admin → Reporting receives `admin-window-performance.js` with:
- completed jobs;
- total/average job value;
- net payments collected for those jobs;
- actual work hours from `started_at → completed_at`;
- job value per actual work hour;
- reviewed direct costs: consumables, parking, travel, other;
- travel minutes/miles;
- direct contribution and direct margin.

**Direct contribution is not net profit.** Labour, overheads, tax and other business costs are not deducted. Jobs without a cost review are excluded from contribution/margin totals instead of being assumed to have £0 cost.

### Tests
`scripts/window-performance.test.mjs` verifies server-only/RLS schema, privacy-safe funnel events, consent-aware session tracking, quote linkage, six funnel stages, permission gates, audited cost capture, direct-contribution wording, and Window-only fallback service state.

CI has been expanded to syntax-check the new modules and run this suite.

## Booking operations still live
Customer self-booking remains: 21-day horizon, 24h notice, Mon–Sat, 08–11 / 11–14 / 14–17, max 3 jobs/day, postcode-area route density enabled. Admin can adjust this via the MFA-protected Booking operations panel.

## Do not break
- Window Cleaning only is the current commercial offering.
- Do not activate Stage 2 until real Stage 1 evidence supports it.
- Customer service/booking availability stays server-side enforced.
- Existing accepted work survives service pauses.
- Privileged staff requires AAL2/MFA.
- Address-data work stays parked unless the user deliberately changes focus.
- Support tickets remain customer-only; public inbound email remains Admin Email inbox.
- Never expose secrets.
