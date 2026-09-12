# Namdar project status

Last updated: 2026-09-12 UTC

## Baseline
- Source: `pchroonic/pchroonic`, default `main`.
- Current main after docs PR #37: `80faf13d5ebbc7e00034300bd7eee15af9cb9538`.
- Production: `https://namdar.co.uk` on Vercel.
- Supabase: `namdar-production` (`qjigldxjcpnrlyxgmlqq`).
- Window Cleaning is the only live/quotable service.
- Future services are prepared but planned.
- Address-data imports remain parked.

## Active candidate — Window Cleaning Stage 1 optimisation
Branch: `feat/window-cleaning-stage1-optimisation-20260912`.
No migration required.

### Customer journey
- Homepage becomes more specifically Window Cleaning focused.
- Quote asks for window count/style, current condition, access detail and extra glass.
- Recurrence choices: one-off / 4 weeks / 8 weeks / 12 weeks.
- Quote notes include a structured Window-details summary for Admin review.
- Service page explains inclusions, recurrence, quote factors, access/photos and estimate-vs-final-quote flow.

### Pricing / recurring model
Existing guide-price curve is retained and renamed for practical Window Cleaning cycles:
- one-off 1.00
- 4-weekly .86
- 8-weekly .90
- 12-weekly .94

Final price still requires Namdar review before booking.

### Security hardening
A bug was found in the live quote availability wrapper: it checked `body.service` while the actual form sends `serviceKey`. Candidate fixes the gate to inspect the submitted service key and normalises Window complexity multipliers server-side.

This is important because UI hiding is not the business-rule boundary.

### My Namdar
Recurring Window Cleaning requests now offer 4/8/12-week cycles and default to 8-weekly. Namdar still confirms price/schedule before activation.

## Candidate verification checklist
- [ ] all three handoff docs updated
- [ ] PR opened
- [ ] CI passes including `scripts/window-stage1.test.mjs`
- [ ] exact-head Vercel preview READY / clean
- [ ] preview homepage/service-page smoke checked
- [ ] future-service quote gate confirmed fixed by tests and, where possible, HTTP smoke
- [ ] merged to main
- [ ] production deployment READY on `namdar.co.uk`
- [ ] final live-state handoff sync completed if IDs change

## Current live service stages
1. Window Cleaning — LIVE
2. Gutter Cleaning — planned
3. Patio & Jet Washing — planned
4. Roof Cleaning — planned
5. Handyman Services — planned
6. 3D Property Tours — planned

Do not activate the next service simply because technical readiness exists.

## Other open work
- pricing calibration from real Window Cleaning jobs once data exists;
- operational booking-slot rules and route density;
- genuine before/after portfolio proof once jobs complete;
- conversion/funnel measurement;
- fresh privileged password/CAPTCHA/MFA completion;
- `/api/booking-notifications` 504 investigation;
- Stripe, SMS, legal and launch checks;
- address-data pilot remains parked.

## Handoff rule
Every substantial product/provider/data change updates `docs/AI_START.md`, `docs/AI_HANDOFF.md`, and this file. Never store credentials, raw API keys, customer secrets, TOTP codes or one-time Auth links.
