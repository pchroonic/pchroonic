# Namdar project status

Last updated: 2026-09-12 UTC

## Baseline
- Source: `pchroonic/pchroonic`, default `main`.
- Current product merge: PR #40 `858500c6c48d05af918c70d5ee087b319b9caf35`.
- Production deployment: `dpl_7f4JLEVgLvx27MwoCxMa8T85d3KY`, READY on `https://namdar.co.uk`, no alias error.
- Supabase: `namdar-production` (`qjigldxjcpnrlyxgmlqq`).
- Window Cleaning is the only live/quotable service.
- Future services remain planned.
- Address-data imports remain parked.

## Window Cleaning Stage 1 — LIVE
PR #38 improved the Window-specific quote/recurring journey. PR #40 adds operational customer booking rules and route density.

## Booking operations — LIVE

### Current customer self-booking rules
- booking horizon: 21 days;
- minimum notice: 24 hours;
- operating days: Monday–Saturday;
- windows: 08:00–11:00, 11:00–14:00, 14:00–17:00;
- max jobs/day: 3;
- route density: enabled;
- route zone: postcode area prefix (e.g. SE / SW).

The rules are persisted in `site_settings.booking_operations`, bounded server-side and editable from Admin → Bookings by Admin/staff with Settings permission.

### Route efficiency
An empty customer-booking day can begin in any covered postcode-area zone. Once the first pending/confirmed job establishes that day's route zone, customers in another zone are not offered that day. Occupied windows and daily capacity are also enforced.

Admin manual scheduling remains an override for deliberate operational exceptions. This is Stage 1 route-density grouping, not full drive-time optimization.

### Server enforcement
- `lib/booking-operations.js`: shared operating rules/availability engine.
- `api/customer-quote-action.js`: accepted customers see route-aware available slots.
- `api/booking.js`: submitted customer booking is revalidated against the same rules before the legacy booking flow.
- original workflows preserved in `api/customer-quote-action-core.js` and `api/booking-core.js`.

This prevents raw customer requests from bypassing operating days, notice, route zone, daily capacity or current slot availability.

### Admin controls/security
New Admin → Bookings panel controls horizon, notice, daily capacity, route density, operating days and customer time windows, with a 14-day load/route preview.

Booking-authorized staff can view. Settings-authorized staff/Admin can edit. Existing AAL2/MFA protection applies and API changes are audit logged.

## Release verification
- [x] PR #40 exact head `b7948da451b4d2d7008470c3d05b90928970e732`
- [x] CI `34714162465` SUCCESS
- [x] exact-head preview `dpl_2zJyJxuR5C2gYmr38cWNDunuLMQM` READY / clean
- [x] PR #40 merged as `858500c6c48d05af918c70d5ee087b319b9caf35`
- [x] production `dpl_7f4JLEVgLvx27MwoCxMa8T85d3KY` READY on `namdar.co.uk`
- [x] production Admin operations endpoint unauthenticated → 401
- [x] Admin loader serves `6.4.18-booking-ops-1` and loads new controls
- [x] `booking_operations` production settings persisted/re-read
- [x] zero future active bookings at activation
- [x] service catalog rechecked: Window live, five planned
- [x] no schema migration/DDL required

## Current live service stages
1. Window Cleaning — LIVE
2. Gutter Cleaning — planned
3. Patio & Jet Washing — planned
4. Roof Cleaning — planned
5. Handyman Services — planned
6. 3D Property Tours — planned

Do not activate the next service simply because technical readiness exists.

## Immediate next work
1. conversion funnel measurement: postcode → guide estimate → final quote → accepted → booked → completed;
2. capture job duration/cost/margin to calibrate Window Cleaning pricing;
3. publish genuine before/after portfolio proof and collect reviews;
4. use real recurring demand to decide whether advanced recurring-route reservations are needed;
5. only then consider Stage 2.

## Other open work
- fresh privileged password/CAPTCHA/MFA completion pending;
- `/api/booking-notifications` 504 investigation remains separate;
- Stripe, SMS, legal and remaining launch checks;
- address-data pilot remains parked.

## Handoff rule
Every substantial product/provider/data change updates `docs/AI_START.md`, `docs/AI_HANDOFF.md`, and this file. Never store credentials, raw API keys, customer secrets, TOTP codes or one-time Auth links.
