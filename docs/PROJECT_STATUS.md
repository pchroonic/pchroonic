# Namdar project status

Last updated: 2026-09-12 UTC

## Baseline
- Source: `pchroonic/pchroonic`, default `main`.
- Current main before candidate: `6c4171258cd12553d3bd94cabc8d02fdcb5ec262`.
- Production is READY on `https://namdar.co.uk`.
- Supabase: `namdar-production` (`qjigldxjcpnrlyxgmlqq`).
- Window Cleaning is the only live/quotable service.
- Future services remain planned.
- Address-data imports remain parked.

## Window Cleaning Stage 1 — LIVE foundation
PR #38: Window-specific quote/recurring journey and quote-gate hardening.
PR #40: operational customer booking rules and postcode-area route density.

Live booking defaults: 21 days, 24h notice, Mon–Sat, 08–11 / 11–14 / 14–17, max 3 jobs/day, route density enabled.

## Current candidate — conversion & profitability evidence
Branch: `feat/window-conversion-profitability-20260912`.

### Conversion funnel
New reporting measures consented visitors through:
1. covered postcode check;
2. guide quote request;
3. final quote sent;
4. accepted;
5. booked;
6. completed.

Existing business timestamps remain the source for stages 2–6. New acquisition tracking is limited to the missing postcode-check linkage.

Tracking is consent-aware: only visitors who already chose Namdar's existing marketing/analytics consent receive a session-only anonymous ID. The funnel analytics database stores postcode area letters only, not the full postcode. Non-consenting customers are never blocked from quoting or booking.

Historical Window quotes/bookings remain visible in job economics but are not falsely retro-linked to old postcode checks.

### Profitability calibration
Completed-job reporting adds:
- total and average job value;
- collected payments net of refunds;
- actual work time from start/completion timestamps;
- job value per actual work hour;
- reviewed consumables/parking/travel/other direct costs;
- travel minutes/miles;
- direct contribution and direct margin.

Direct contribution is explicitly **not net profit**. Labour, overhead, tax and other business costs are outside this Stage 1 metric.

Jobs with no cost review are excluded from contribution/margin totals rather than treated as zero cost. Jobs without valid start/completion timestamps are excluded from work-hour productivity calculations.

### Database/security
Migration already applied to production and committed as `20260912204000_window_stage1_conversion_profitability.sql`.

New tables:
- `conversion_events`;
- `quote_funnel_links`;
- `booking_job_costs`.

All use RLS and revoke direct `anon`/`authenticated` access. APIs use the existing server role. Privileged reporting/cost editing remains behind AAL2/MFA permissions.

### Admin/API changes
- `api/funnel-event.js` — privacy-safe postcode events with validation and 30-minute dedupe.
- `api/quote.js` — links successful quotes to consented anonymous visitors without changing quote success/failure semantics.
- `api/admin-window-performance.js` — analytics-permission Stage 1 reporting.
- `api/admin-job-economics.js` — bookings-permission cost/travel capture with audit log.
- `admin-window-performance.js` — injected into Admin → Reporting.
- `admin.js` version `6.4.19-window-performance-1` loads the dashboard module.

### Test coverage
`scripts/window-performance.test.mjs` plus CI checks validate migration security, privacy rules, consent gating, quote linkage, full funnel stages, economics formulas, permissions/audit logging, wording and Window-only fallback state.

## Release checklist for current candidate
- [x] production migration applied
- [x] migration committed to feature branch
- [x] application/API/Admin implementation
- [x] dedicated regression suite added to CI
- [x] all three candidate handoff docs updated
- [ ] PR opened
- [ ] exact-head CI successful
- [ ] exact-head Vercel preview READY / clean
- [ ] preview/API security smoke checks
- [ ] merge to main
- [ ] production verification
- [ ] final docs sync with exact live IDs

## Current live service stages
1. Window Cleaning — LIVE
2. Gutter Cleaning — planned
3. Patio & Jet Washing — planned
4. Roof Cleaning — planned
5. Handyman Services — planned
6. 3D Property Tours — planned

Do not activate Stage 2 simply because technical readiness exists. Use Stage 1 measurements and real completed jobs first.

## Immediate work after release
1. collect real Window Cleaning funnel/job data;
2. ensure completed jobs record Start/Complete and direct costs consistently;
3. calibrate pricing only after enough real observations exist;
4. publish genuine before/after work and reviews;
5. then assess Stage 2.

## Other open work
- fresh privileged password/CAPTCHA/MFA completion pending;
- `/api/booking-notifications` 504 investigation remains separate;
- Stripe, SMS, legal and remaining launch checks;
- address-data pilot remains parked.

## Handoff rule
Every substantial product/provider/data change updates `docs/AI_START.md`, `docs/AI_HANDOFF.md`, and this file. Never store credentials, raw API keys, customer secrets, TOTP codes or one-time Auth links.
