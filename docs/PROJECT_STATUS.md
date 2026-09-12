# Namdar project status

Last updated: 2026-09-12 UTC

## Baseline
- Source: `pchroonic/pchroonic`, default `main`.
- Main before current candidate: `77ed741f758d037a953ddc1a14f68a65996464e6`.
- Current live product merge: PR #38 `f026803056f07d17ed1c257f1bd1094268a1cb08`.
- Production: `https://namdar.co.uk` on Vercel.
- Supabase: `namdar-production` (`qjigldxjcpnrlyxgmlqq`).
- Window Cleaning is the only live/quotable service.
- Future services remain planned.
- Address-data imports remain parked.

## Window Cleaning Stage 1 — LIVE
The Window-specific quote journey, recurring 4/8/12-week choices, hardened service gate and improved service page are live from PR #38.

## Active candidate — booking operations
Branch: `feat/window-booking-operations-20260912`.
No schema migration required.

### Customer availability rules
Default Stage 1 rules:
- 21-day booking horizon;
- at least 24 hours' notice;
- Monday–Saturday operating days;
- customer windows 08:00–11:00 / 11:00–14:00 / 14:00–17:00;
- maximum 3 customer jobs/day;
- route-density enabled.

The values are configurable in Admin and bounded server-side.

### Route efficiency
Customer self-booking now groups a day by postcode-area route zone. An empty day can start in any qualifying zone; once the day has a pending/confirmed booking, customers in another postcode-area zone are not offered that day. Existing occupied windows and daily capacity are also enforced.

This is intentionally simple Stage 1 route density. It does not claim to solve drive-time routing. Admin manual scheduling remains an override for deliberate exceptions.

### Server-side enforcement
New shared engine: `lib/booking-operations.js`.

Original flows are preserved as:
- `api/customer-quote-action-core.js`
- `api/booking-core.js`

Wrappers:
- `api/customer-quote-action.js` returns route-aware available slots after existing accepted-quote/ownership checks;
- `api/booking.js` re-validates the submitted slot before the original booking logic runs.

This prevents raw requests from bypassing operating days, notice, capacity, route density and current slot availability.

### Admin operations panel
Admin → Bookings gets controls for:
- horizon;
- minimum notice;
- max jobs/day;
- route density;
- operating days;
- customer booking windows;
- next-14-days load/route preview.

Booking permission can view. Settings permission/Admin can edit. Existing AAL2/MFA protection applies. Changes are audit logged.

Configuration is stored in the existing `site_settings` row `booking_operations`; safe defaults work even before the row is persisted.

### Recurring work
There are currently no production recurring subscription rows, so no speculative recurring reservation layer is being introduced. Actual recurring bookings will participate in the same route/capacity context. Revisit advanced recurrence routing after real demand exists.

## Candidate verification checklist
- [x] shared booking-rules engine added
- [x] customer available-slot wrapper added
- [x] booking POST re-validation added
- [x] Admin operations API/UI added
- [x] admin loader updated
- [x] regression test suite added
- [x] CI workflow updated
- [x] all three candidate handoff docs updated
- [ ] PR opened
- [ ] exact-head CI passed
- [ ] exact-head Vercel preview READY / clean
- [ ] preview/API/Admin smoke checked where possible
- [ ] merged to main
- [ ] default production booking rules persisted/verified
- [ ] production deployment READY on `namdar.co.uk`
- [ ] service catalog rechecked: Window live + five planned
- [ ] final live-state handoff sync completed

## Current live service stages
1. Window Cleaning — LIVE
2. Gutter Cleaning — planned
3. Patio & Jet Washing — planned
4. Roof Cleaning — planned
5. Handyman Services — planned
6. 3D Property Tours — planned

Do not activate the next service simply because technical readiness exists.

## Next after booking operations
1. conversion funnel measurement from postcode → estimate → accepted final quote → booked → completed;
2. pricing calibration from actual completed Window Cleaning job duration/cost/margin;
3. genuine before/after portfolio proof and reviews;
4. only then consider the next service stage.

## Other open work
- fresh privileged password/CAPTCHA/MFA completion pending;
- `/api/booking-notifications` 504 investigation remains separate;
- Stripe, SMS, legal and remaining launch checks;
- address-data pilot remains parked.

## Handoff rule
Every substantial product/provider/data change updates `docs/AI_START.md`, `docs/AI_HANDOFF.md`, and this file. Never store credentials, raw API keys, customer secrets, TOTP codes or one-time Auth links.
