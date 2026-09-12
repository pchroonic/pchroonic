# Namdar AI fast resume

Last verified: 2026-09-12 UTC

Read this first. Use `docs/AI_HANDOFF.md` for implementation detail and `docs/PROJECT_STATUS.md` for the roadmap.

## Production baseline

- Repository: `pchroonic/pchroonic`, default `main`.
- Current product merge: `f026803056f07d17ed1c257f1bd1094268a1cb08` from PR #38.
- PR #38 exact head: `1fad0ab7a7f6edd39d0afb0dbd9a04dfc70a622a`.
- GitHub CI `34712880930`: SUCCESS.
- Exact-head preview `dpl_EJMytimDT1XQtcSW8a4wNLMnWCUP`: READY, clean build.
- Production deployment `dpl_EMqepbY1Aw8yqL6hBn2V6RtzJ2MG`: READY on `https://namdar.co.uk`, no alias error.
- No database migration was required for PR #38.
- Service catalog migration remains `20260912182925 service_catalog_activation`.
- Address-data work remains parked; Address API disabled; GetAddress harvesting blocked.

## Current business model — LIVE

**Window Cleaning is Namdar's only live/bookable service.**

Future services remain prepared but planned:
1. Window Cleaning — LIVE
2. Gutter Cleaning — planned
3. Patio & Jet Washing — planned
4. Roof Cleaning — planned
5. Handyman Services — planned
6. 3D Property Tours — planned

Production DB was rechecked after PR #38 and still has exactly that state.

## Window Cleaning Stage 1 optimisation — LIVE

PR #38 is production-live.

Key changes:
- `/api/quote` now gates on the actual submitted `serviceKey` (with `body.service` only as compatibility fallback), closing the prior crafted future-service bypass;
- Window quote complexity/frequency values are normalised server-side before pricing;
- recurring guide-price choices are one-off / 4-week / 8-week / 12-week;
- prior pricing curve is preserved: 4-weekly `.86`, 8-weekly `.90`, 12-weekly `.94`;
- quote UX asks Window-specific window style, condition, access and extra-glass questions;
- structured Window details are submitted for Admin review;
- homepage hero/copy is Window-focused;
- My Namdar recurring Window Cleaning requests use 4/8/12-week options, defaulting to 8-weekly;
- Window Cleaning service page explains inclusions, recurring options, quote factors, access/photo guidance and estimate/final-quote separation;
- regression suite `scripts/window-stage1.test.mjs` is part of CI.

## Production verification

Verified after merge:
- production deployment is READY and aliased to `namdar.co.uk` with no alias error;
- errors-only build log is clean;
- `/services/window-cleaning` returns the new Stage 1 content, including exterior glass/frames/sills and 4/8/12-week requests;
- `/api/public-data` still exposes Window Cleaning as the only live/quotable/public service and only Window pricing;
- `/api/postcode?postcode=SE14%205TD&service=gutters` returns HTTP 409 planned/unavailable;
- equivalent Window Cleaning postcode request returns HTTP 200 covered;
- Supabase `service_catalog` still has Windows live and five future services planned.

The direct crafted quote bypass is regression-tested in CI; current fetch tooling does not provide a convenient arbitrary POST smoke against production without creating a real quote record.

## Immediate next Window Cleaning work

Focus next on operating Stage 1 well and measuring whether it pays off:
1. booking availability / operating-day and route-density rules;
2. conversion funnel measurement from postcode → estimate → accepted final quote → booked → completed;
3. pricing calibration from real completed Window Cleaning jobs once enough data exists;
4. genuine before/after proof and reviews once real work is completed.

Do not activate another service merely because technical readiness exists.

## Do not break

- Window Cleaning only is the current commercial offering.
- New-work service availability must be enforced server-side, never only through hidden UI.
- Existing customer commitments survive service pauses.
- Future services stay prepared but inactive.
- Privileged staff access requires AAL2/MFA.
- Support tickets remain customer-only; public inbound email remains Admin Email inbox.
- Address-data work stays parked unless the user changes focus.
- Never expose provider, Supabase, SMTP, Turnstile, GitHub, cron or API secrets.
