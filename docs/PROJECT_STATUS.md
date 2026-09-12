# Namdar project status

Last updated: 2026-09-12 UTC

## Baseline
- Source: `pchroonic/pchroonic`, default `main`.
- Current product merge: `f026803056f07d17ed1c257f1bd1094268a1cb08` from PR #38.
- Production deployment: `dpl_EMqepbY1Aw8yqL6hBn2V6RtzJ2MG`, READY on `https://namdar.co.uk`, no alias error.
- Supabase: `namdar-production` (`qjigldxjcpnrlyxgmlqq`).
- Window Cleaning is the only live/quotable service.
- Future services are prepared but planned.
- Address-data imports remain parked.

## Window Cleaning Stage 1 optimisation — LIVE

PR #38 is released. No database migration was required.

### Customer journey
- Homepage is specifically Window Cleaning focused while it is the sole live service.
- Quote asks for window count/style, current condition, access detail and extra glass.
- Recurrence choices: one-off / 4 weeks / 8 weeks / 12 weeks.
- Quote notes include a structured Window-details summary for Admin review.
- Service page explains inclusions, recurrence, quote factors, access/photos and estimate-vs-final-quote flow.

### Pricing / recurring model
Current guide-price frequency multipliers:
- one-off 1.00
- 4-weekly .86
- 8-weekly .90
- 12-weekly .94

The final price still requires Namdar review before booking.

### Security hardening
The quote availability wrapper bug is fixed: it now evaluates the actual submitted `serviceKey` rather than incorrectly defaulting a missing `body.service` to Window Cleaning.

Window detail/extra/frequency multipliers are also normalised server-side, so client requests cannot supply arbitrary lower values.

### My Namdar
Recurring Window Cleaning requests offer 4/8/12-week cycles and default to 8-weekly. Namdar confirms price, first-clean requirements and schedule before activation.

## Release verification
- [x] all three candidate handoff docs updated
- [x] PR #38 opened
- [x] exact-head CI `34712880930` passed including `scripts/window-stage1.test.mjs`
- [x] exact-head preview `dpl_EJMytimDT1XQtcSW8a4wNLMnWCUP` READY / clean
- [x] PR #38 merged as `f026803056f07d17ed1c257f1bd1094268a1cb08`
- [x] production `dpl_EMqepbY1Aw8yqL6hBn2V6RtzJ2MG` READY on `namdar.co.uk`
- [x] production Window service page returns new Stage 1 content
- [x] public data still exposes Window Cleaning only and Window pricing only
- [x] Gutter postcode/service request still returns HTTP 409
- [x] Window postcode/service request still returns HTTP 200 in covered area
- [x] Supabase service catalog rechecked: Window live, five future services planned
- [x] no schema migration or DDL introduced by this release

## Current live service stages
1. Window Cleaning — LIVE
2. Gutter Cleaning — planned
3. Patio & Jet Washing — planned
4. Roof Cleaning — planned
5. Handyman Services — planned
6. 3D Property Tours — planned

Do not activate the next service simply because technical readiness exists.

## Immediate next work
1. define operational booking days, capacity and route-density rules for Window Cleaning;
2. add/verify conversion measurement from postcode check through completed job;
3. calibrate pricing from real Window Cleaning job duration/cost/margin once enough data exists;
4. publish genuine before/after portfolio proof and reviews once real jobs are completed.

## Other open work
- fresh privileged password/CAPTCHA/MFA completion pending;
- `/api/booking-notifications` 504 investigation;
- Stripe, SMS, legal and remaining launch checks;
- address-data pilot remains parked.

## Handoff rule
Every substantial product/provider/data change updates `docs/AI_START.md`, `docs/AI_HANDOFF.md`, and this file. Never store credentials, raw API keys, customer secrets, TOTP codes or one-time Auth links.
