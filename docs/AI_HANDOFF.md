# Namdar AI handoff

Last verified: 2026-09-12 UTC

Read `docs/AI_START.md` first.

## Production source of truth
- Repo `pchroonic/pchroonic`, default `main`.
- Current product merge: `858500c6c48d05af918c70d5ee087b319b9caf35` from PR #40.
- PR #40 exact head: `b7948da451b4d2d7008470c3d05b90928970e732`.
- CI `34714162465`: SUCCESS.
- Exact-head preview `dpl_2zJyJxuR5C2gYmr38cWNDunuLMQM`: READY / clean.
- Production `dpl_7f4JLEVgLvx27MwoCxMa8T85d3KY`: READY on `https://namdar.co.uk`, no alias error.
- Supabase `namdar-production` (`qjigldxjcpnrlyxgmlqq`).
- Only `windows` is live; gutters/jetwash/roof/handyman/tour3d remain planned.
- Privileged staff access requires AAL2/MFA.

## Window Cleaning booking operations — LIVE

Before PR #40, accepted customers could see every unused 3-hour window over 21 days, without operating-day, notice, capacity or route-density rules. PR #40 adds a shared operational boundary while preserving the existing quote/booking business logic.

### Shared rules engine
`lib/booking-operations.js` loads `site_settings.booking_operations` and safely falls back to the same Stage 1 defaults if unavailable.

Live production rules:
- 21-day horizon;
- 24h minimum notice;
- Mon–Sat operating days;
- 08:00–11:00 / 11:00–14:00 / 14:00–17:00 windows;
- max 3 jobs/day;
- route density enabled;
- route zone = postcode area prefix.

Values are sanitized server-side. Horizon is bounded to 7–21 days, notice 0–168h and capacity 1–12.

### Route-density logic
`postcodeZone()` maps postcodes to their area, e.g. SE14 → SE and SW2 → SW.

Customer self-booking behaviour:
- first booking can establish the route zone for an otherwise empty operating day;
- once a pending/confirmed booking exists in that zone, customers in another zone do not see that day;
- overlapping windows are unavailable;
- max daily capacity closes the day when reached.

This is a simple Stage 1 density strategy, not a drive-time optimizer. Admin manual scheduling remains an intentional override.

### Preserved cores and wrappers
Original handlers are preserved as:
- `api/customer-quote-action-core.js`
- `api/booking-core.js`

Live wrappers:
- `api/customer-quote-action.js`: POST actions delegate unchanged; GET keeps existing ownership/expiry logic and replaces schedulable slots with shared route-aware availability.
- `api/booking.js`: validates the submitted customer slot against shared rules before delegating to the original booking engine.

The original accepted-quote checks, duplicate/conflict handling, promo/reward consumption, draft invoice creation and notifications remain intact.

### Admin controls
`api/admin-booking-operations.js`:
- GET requires `bookings` permission and returns rules + 14-day preview;
- returns `canEdit` so booking-only staff are view-only;
- POST requires `settings` permission;
- changes are audit logged as `booking_operations.update`.

`admin-booking-operations.js` is loaded from `admin.js` version `6.4.18-booking-ops-1` and injects controls in Admin → Bookings for horizon, notice, capacity, route density, operating days and time windows, plus a 14-day load/route preview.

### Production configuration
`site_settings.booking_operations` was explicitly seeded after deployment with the live rules above. This was DML into the existing settings table; no schema migration or DDL was required.

At release verification there were zero future pending/confirmed bookings, so activation could not displace existing scheduled work. There were also zero recurring subscription rows, so a speculative recurring reservation engine was deliberately not introduced.

### Tests and verification
`scripts/booking-operations.test.mjs` verifies defaults/bounds, postcode zones, same-zone filtering, cross-zone rejection, daily capacity, shared wrappers and privileged Admin controls.

Release checks:
- exact-head CI `34714162465`: SUCCESS;
- exact-head preview `dpl_2zJyJxuR5C2gYmr38cWNDunuLMQM`: READY, clean errors-only build;
- PR #40 merge `858500c6c48d05af918c70d5ee087b319b9caf35`;
- production `dpl_7f4JLEVgLvx27MwoCxMa8T85d3KY`: READY on `namdar.co.uk`, aliasError null;
- unauthenticated `/api/admin-booking-operations` returns 401;
- production `admin.js` loads the new booking operations asset;
- persisted settings re-read successfully;
- service catalog still Window live + five planned.

## Next recommended Stage 1 milestone
1. build/verify conversion funnel metrics from postcode through completed job;
2. capture actual Window Cleaning job duration/cost/margin for pricing calibration;
3. publish genuine before/after proof and collect reviews;
4. assess Stage 2 only after evidence shows Window Cleaning is working.

## Parked / non-negotiables
- Do not activate another service without deliberate user decision.
- Do not resume address-data imports/GetAddress harvesting automatically.
- Existing accepted work survives service pause.
- Customer service/booking restrictions remain server-side enforced.
- Privileged settings remain AAL2/MFA protected.
- Support tickets stay customer-only.
- Never expose secrets.
