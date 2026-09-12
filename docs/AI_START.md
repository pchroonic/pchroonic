# Namdar AI fast resume

Last verified: 2026-09-12 UTC

Read this first. Use `docs/AI_HANDOFF.md` for implementation detail and `docs/PROJECT_STATUS.md` for the roadmap.

## Production baseline

- Repository: `pchroonic/pchroonic`, default `main`.
- Current main after docs PR #37: `80faf13d5ebbc7e00034300bd7eee15af9cb9538`.
- Window-only staged-service product release: PR #36 merge `cbd189da5a1516238aa11b0d796ea865816892b4`.
- Production is READY on `https://namdar.co.uk`.
- Supabase migration live: `20260912182925 service_catalog_activation`.
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

## Current candidate — Stage 1 Window Cleaning optimisation

Branch: `feat/window-cleaning-stage1-optimisation-20260912`.

Goal: make the Window Cleaning customer journey and recurring-clean request flow materially better without activating any future service or resuming address-data work.

Changes in the candidate:
- fixes a service-gate bug in `/api/quote`: the wrapper previously read `body.service` while the real form sends `serviceKey`, which could let a crafted future-service quote reach the legacy core;
- Window quote inputs are normalised server-side so client-supplied complexity multipliers cannot be arbitrarily lowered;
- recurring quote choices become one-off / 4-week / 8-week / 12-week;
- existing pricing curve is preserved: legacy monthly `.86` maps to 4-weekly, legacy quarterly `.94` maps to 12-weekly, and 8-weekly uses midpoint `.90`;
- quote UX now asks Window-specific condition and access questions and records a structured Window-details summary in the quote notes for Admin review;
- generic extra-complexity wording becomes Window-specific extra-glass wording;
- homepage hero/copy is more specifically about Window Cleaning;
- My Namdar recurring Window Cleaning requests use 4/8/12-week options, defaulting to 8-weekly;
- Window Cleaning service page now explains inclusions, recurring options, factors affecting price, access/photo guidance and estimate/final-quote separation;
- regression suite `scripts/window-stage1.test.mjs` covers quote gate, input normalisation, recurrence frequencies and page/customer-portal behaviour.

No database migration is required for this candidate.

## Window-only service enforcement

`service_catalog.status` remains the server-side source of truth.

New work is gated for:
- `/api/quote`;
- `/api/postcode?service=...`;
- `/api/subscription` POST.

The candidate specifically fixes the `/api/quote` key mismatch so the gate now evaluates the actual submitted `serviceKey`.

Existing accepted quotes/bookings remain valid if a service is later paused.

## Release gates for this candidate

1. Update all three handoff docs on the branch.
2. Open a PR from `feat/window-cleaning-stage1-optimisation-20260912`.
3. Require GitHub CI success including `scripts/window-stage1.test.mjs`.
4. Require exact-head Vercel preview READY with clean build.
5. Smoke-test preview Window quote UI/service page and verify a direct future-service quote is blocked where possible.
6. Merge only after gates pass.
7. Verify production deployment on `namdar.co.uk` and sync docs to exact live IDs if needed.

## Do not break

- Window Cleaning only is the current commercial offering.
- New-work service availability must be enforced server-side, never only through hidden UI.
- Existing customer commitments survive service pauses.
- Future services stay prepared but inactive.
- Privileged staff access requires AAL2/MFA.
- Support tickets remain customer-only; public inbound email remains Admin Email inbox.
- Address-data work stays parked unless the user changes focus.
- Never expose provider, Supabase, SMTP, Turnstile, GitHub, cron or API secrets.
