# Namdar AI fast resume

Last verified: 2026-09-12 UTC

Read this first. Use `docs/AI_HANDOFF.md` for implementation detail and `docs/PROJECT_STATUS.md` for the roadmap.

## Production baseline

- Repository: `pchroonic/pchroonic`, default `main`.
- Current product merge: `858500c6c48d05af918c70d5ee087b319b9caf35` from PR #40.
- PR #40 exact head: `b7948da451b4d2d7008470c3d05b90928970e732`.
- GitHub CI `34714162465`: SUCCESS.
- Exact-head preview `dpl_2zJyJxuR5C2gYmr38cWNDunuLMQM`: READY / clean build.
- Production deployment `dpl_7f4JLEVgLvx27MwoCxMa8T85d3KY`: READY on `https://namdar.co.uk`, no alias error.
- Supabase: `namdar-production` (`qjigldxjcpnrlyxgmlqq`).
- Address-data work remains parked; Address API disabled; GetAddress harvesting blocked.

## Current business model

**Window Cleaning is Namdar's only live/bookable service.**

Future services remain prepared but planned:
1. Window Cleaning — LIVE
2. Gutter Cleaning — planned
3. Patio & Jet Washing — planned
4. Roof Cleaning — planned
5. Handyman Services — planned
6. 3D Property Tours — planned

Do not activate another service until the user deliberately decides Stage 1 has paid off and the next service is operationally ready.

## Window Cleaning Stage 1 — LIVE

PR #38 hardened the quote gate and made quoting Window-specific. PR #40 now makes accepted-quote scheduling operationally realistic.

### Live booking operations rules

`lib/booking-operations.js` is the shared source for customer self-booking availability and validation.

Production `site_settings.booking_operations` is explicitly set to:
- horizon: 21 days;
- minimum notice: 24 hours;
- operating days: Monday–Saturday;
- windows: 08:00–11:00, 11:00–14:00, 14:00–17:00;
- max jobs/day: 3;
- route density: enabled;
- route zone: postcode area prefix.

Rules are bounded server-side and fail safely to the same defaults if the settings row cannot be read.

### Route density

Postcode area is used as the lightweight Stage 1 route zone, e.g. `SE14 → SE`, `SW2 → SW`.

For customer self-booking:
- an empty operating day can start in any covered zone;
- once a pending/confirmed booking exists that day, remaining customer slots stay in the same postcode-area zone;
- occupied windows and daily capacity are enforced;
- Admin manual scheduling remains an override for deliberate exceptions.

This is route-density grouping, not full drive-time optimization.

### Server enforcement

Existing business workflows remain preserved as cores:
- `api/customer-quote-action-core.js`
- `api/booking-core.js`

Wrappers enforce the shared schedule:
- `api/customer-quote-action.js` supplies route-aware available slots after the existing accepted-quote/ownership checks;
- `api/booking.js` re-validates submitted slots before the original booking flow runs.

A crafted booking request cannot bypass operating day, notice, capacity, route-zone or current-window availability rules.

### Admin operations panel

Admin → Bookings now has Booking operations controls for:
- booking horizon;
- minimum notice;
- max jobs/day;
- route-density toggle;
- operating days;
- enabled customer windows;
- next-14-days load/route preview.

Booking-authorized staff can view. Admin/staff with Settings permission can edit. Privileged access remains AAL2/MFA-protected and changes through the endpoint are audit logged.

### Recurring work

Production had zero recurring subscriptions when this release was implemented, so no speculative reservation engine was added. Once recurring work becomes real bookings, it participates in the same route/capacity context. Revisit advanced recurrence routing from real demand.

## Release verification

- PR #40 merged as `858500c6c48d05af918c70d5ee087b319b9caf35`.
- CI `34714162465` passed the new `scripts/booking-operations.test.mjs` suite and syntax checks.
- Exact-head preview `dpl_2zJyJxuR5C2gYmr38cWNDunuLMQM` READY; errors-only build clean.
- Production `dpl_7f4JLEVgLvx27MwoCxMa8T85d3KY` READY and aliased to `namdar.co.uk`; alias error null.
- Production `/api/admin-booking-operations` unauthenticated → HTTP 401.
- Production Admin loader serves `6.4.18-booking-ops-1` and loads `admin-booking-operations.js`.
- `site_settings.booking_operations` persisted and re-read with the rules above.
- There were zero future pending/confirmed bookings during activation, so no scheduled work was displaced.
- Service catalog rechecked: Window Cleaning live; five future services planned.
- No schema migration was required.

## Next recommended work

Stay on Window Cleaning and measure whether Stage 1 pays off:
1. conversion funnel: postcode → estimate → final quote → accepted → booked → completed;
2. actual job duration/cost/margin capture for pricing calibration;
3. genuine before/after proof and customer reviews;
4. only then assess whether to launch Stage 2.

## Do not break

- Window Cleaning only is the current commercial offering.
- New-work service and booking rules remain server-side enforced.
- Existing customer commitments survive service pauses.
- Future services stay prepared but inactive.
- Privileged staff access requires AAL2/MFA.
- Support tickets remain customer-only; public inbound email remains Admin Email inbox.
- Address-data work stays parked unless focus changes.
- Never expose provider, Supabase, SMTP, Turnstile, GitHub, cron or API secrets.
