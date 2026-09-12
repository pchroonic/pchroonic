# Namdar AI handoff

Last verified: 2026-09-12 UTC

Read `docs/AI_START.md` first.

## Production source of truth
- Repo `pchroonic/pchroonic`, default `main`.
- Main before current candidate: `77ed741f758d037a953ddc1a14f68a65996464e6`.
- Window Cleaning Stage 1 product release: PR #38 merge `f026803056f07d17ed1c257f1bd1094268a1cb08`.
- Canonical production: `https://namdar.co.uk`.
- Supabase: `namdar-production` (`qjigldxjcpnrlyxgmlqq`).
- Only `windows` is live; gutters/jetwash/roof/handyman/tour3d remain planned.
- Privileged staff requires AAL2/MFA.

## Current candidate

Branch: `feat/window-booking-operations-20260912`.
No schema migration is required.

### Why this change
Before this candidate, accepted customers were offered every unused 3-hour window over the next 21 days. There was no operating-day rule, no configurable minimum notice, no daily-capacity rule and no route-density logic. The booking POST only protected against direct time overlap.

For a single-service Window Cleaning Stage 1 operation this could create an inefficient diary even though each individual booking was valid.

### Shared booking operations engine
New `lib/booking-operations.js` provides the customer scheduling source of truth.

Default configuration:
- horizon: 21 days;
- minimum notice: 24 hours;
- operating days: Mon–Sat (`[1,2,3,4,5,6]`);
- windows: 08:00–11:00 / 11:00–14:00 / 14:00–17:00;
- max jobs/day: 3;
- route density enabled;
- route zone based on postcode area prefix.

`sanitizeRules` constrains values server-side, including horizon 7–21 days, notice 0–168h and capacity 1–12.

Configuration loads from existing `site_settings` row `booking_operations`. If missing or unavailable, the safe Stage 1 defaults above are used.

### Route-density behaviour
`postcodeZone()` uses the postcode area, e.g. `SE14 5TD → SE`, `SW2 3HL → SW`.

For each customer day:
- if there are no pending/confirmed jobs, a qualifying customer from any covered route zone can take the first slot;
- once a route zone exists that day, customers from another route zone are not offered that day;
- occupied time windows are removed;
- once daily capacity is reached, the day closes to further customer booking.

Admin/staff can still deliberately schedule or reschedule jobs manually outside customer self-booking rules. This preserves operational override.

### Existing customer workflows preserved
The original handlers were copied intact to:
- `api/customer-quote-action-core.js`
- `api/booking-core.js`

`api/customer-quote-action.js` is now a wrapper:
- POST quote accept/decline/photo actions delegate unchanged;
- GET first runs the existing ownership/expiry/booking logic, then replaces schedulable slots with `availabilityForQuote()` output;
- response includes safe scheduling metadata for future customer UX.

`api/booking.js` is now a wrapper:
- keeps the existing authentication/ownership path;
- re-validates `startsAt`/`endsAt` using `validateSlotForQuote()`;
- returns 409 if the slot no longer complies with notice/day/capacity/route/current-window rules;
- delegates valid requests to the existing booking engine, preserving accepted-quote checks, duplicate/conflict checks, promo/reward use, draft invoice creation and email/staff notifications.

### Admin booking operations
New `api/admin-booking-operations.js`:
- GET requires `bookings` permission and returns rules + 14-day operational preview;
- GET returns `canEdit` so booking staff can be view-only;
- POST requires `settings` permission;
- POST upserts `site_settings.booking_operations` and audit logs `booking_operations.update`.

New `admin-booking-operations.js` injects a Booking operations panel into Admin → Bookings with:
- horizon;
- minimum notice;
- max jobs/day;
- route-density toggle;
- Sun–Sat operating-day controls;
- standard time-window controls;
- 14-day load/route preview.

`admin.js` loads this script with version `6.4.18-booking-ops-1`.

### Recurring customers
Production currently has zero `service_subscriptions` rows. No speculative recurring slot-reservation layer is being added yet. When recurring work becomes actual bookings, it is included in the same active-booking route/capacity context. Build more advanced recurring-route planning from real demand later.

## Tests
New `scripts/booking-operations.test.mjs` checks:
- safe defaults;
- server-side bounds;
- SE/SW/other postcode-area parsing;
- same-zone vs cross-zone day availability;
- daily capacity closure;
- quote/booking wrapper use of the shared engine;
- privileged Admin endpoint/UI structure.

`.github/workflows/ai-handoff-check.yml` now syntax-checks all new booking-operation files/cores/wrappers and runs this test suite.

## Production data checked before implementation
- `bookings`: 2 confirmed Window bookings, both already historical at the time of the change; both in Lewisham.
- `service_subscriptions`: 0 rows.
- service catalog remains Window live + five planned.

## Release workflow
1. Keep these handoff docs current on the candidate branch.
2. Open PR.
3. Require exact-head CI success.
4. Require exact-head Vercel preview READY and clean errors-only build.
5. Check preview/API/Admin surface where accessible.
6. Merge only after gates pass.
7. Persist the default `booking_operations` row in production, verify it and production service state.
8. Sync docs to exact live merge/deployment IDs.

## Parked / non-negotiables
- Do not activate another service.
- Do not resume Code-Point/Open UPRN/GetAddress work automatically.
- Existing accepted work survives service pause.
- Customer booking rules are server-side, not UI-only.
- Admin settings mutations remain AAL2/MFA protected.
- Support tickets stay customer-only.
- Never expose secrets.
