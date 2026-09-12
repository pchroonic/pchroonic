# Namdar AI fast resume

Last verified: 2026-09-12 UTC

Read this first. Use `docs/AI_HANDOFF.md` for implementation detail and `docs/PROJECT_STATUS.md` for the roadmap.

## Production baseline

- Repository: `pchroonic/pchroonic`, default `main`.
- Current main before this candidate: `77ed741f758d037a953ddc1a14f68a65996464e6` from docs PR #39.
- Current live Window Stage 1 product merge: `f026803056f07d17ed1c257f1bd1094268a1cb08` from PR #38.
- Production is READY on `https://namdar.co.uk`.
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

## Window Cleaning Stage 1 optimisation — LIVE

PR #38 is live. It hardened the quote service gate, added Window-specific quote questions and introduced one-off / 4-week / 8-week / 12-week Window Cleaning choices. The final quote remains reviewed before booking.

## Current candidate — booking operations

Branch: `feat/window-booking-operations-20260912`.

Goal: make customer appointment availability reflect how a small Window Cleaning operation can actually run, while preserving the existing quote, invoice, promo/reward and notification workflows.

### Shared booking-rules engine

New `lib/booking-operations.js` reads `site_settings.key = booking_operations` and fails safely to defaults when no row exists.

Stage 1 defaults:
- booking horizon: 21 days;
- minimum notice: 24 hours;
- operating days: Monday–Saturday;
- customer windows: 08:00–11:00, 11:00–14:00, 14:00–17:00;
- daily customer capacity: 3 jobs;
- route density: enabled.

Rules are bounded server-side; customer horizon cannot exceed the existing 21-day booking-core limit.

### Route density

Route zone is derived from the postcode area prefix, e.g. `SE14` → `SE`, `SW2` → `SW`.

For customer self-booking:
- an empty operating day can start in any covered postcode zone;
- once a pending/confirmed booking exists on that day, remaining customer slots stay in the same postcode-area zone;
- daily capacity and occupied windows are also enforced;
- Admin manual scheduling remains available for deliberate exceptions.

This is a simple Stage 1 route-density rule, not full drive-time optimization.

### Server enforcement

Existing handlers are preserved as cores:
- `api/customer-quote-action-core.js`
- `api/booking-core.js`

Wrappers now apply shared operating rules:
- `api/customer-quote-action.js` replaces accepted-quote slot availability with route-aware/current-rule slots;
- `api/booking.js` re-validates the submitted slot against the same rules before delegating to the existing booking engine.

A crafted booking request therefore cannot bypass operating days, notice, capacity, route zone or available-window checks.

### Admin operations controls

New:
- `api/admin-booking-operations.js`
- `admin-booking-operations.js`

Admin → Bookings receives a Booking operations panel with:
- horizon;
- minimum notice;
- max jobs/day;
- route-density toggle;
- operating-day toggles;
- enabled customer-window toggles;
- next-14-days load/route preview.

Booking-authorized staff can view the panel. Only Admin/staff with Settings permission can edit. Existing AAL2/MFA enforcement applies and changes are audit logged.

No schema migration is required: configuration uses the existing `site_settings` table.

## Recurring work

There are currently no active recurring subscriptions in production. Do not build a speculative recurring reservation engine yet. Once recurring requests become real bookings, they automatically participate in the same route-density and capacity rules. Calibrate a more advanced recurring-route strategy from real demand.

## Candidate tests / release gates

`scripts/booking-operations.test.mjs` covers:
- default/bounded rules;
- postcode-area routing;
- route-zone filtering;
- daily-capacity closure;
- shared wrappers;
- privileged Admin controls.

CI is configured to syntax-check all new wrappers/cores/Admin files and run the new suite.

Release only after:
1. all three handoff docs are current;
2. PR opened;
3. exact-head GitHub CI succeeds;
4. exact-head Vercel preview is READY with clean errors-only build;
5. preview/Admin/API smoke checks pass where possible;
6. merge to main;
7. production deployment and service-catalog state are verified;
8. persist the chosen `booking_operations` defaults and sync docs to exact live IDs.

## Do not break

- Window Cleaning only is the current commercial offering.
- New-work service availability remains server-side enforced.
- Existing customer commitments survive service pauses.
- Future services stay prepared but inactive.
- Privileged staff access requires AAL2/MFA.
- Support tickets remain customer-only; public inbound email remains Admin Email inbox.
- Address-data work stays parked unless focus changes.
- Never expose provider, Supabase, SMTP, Turnstile, GitHub, cron or API secrets.
