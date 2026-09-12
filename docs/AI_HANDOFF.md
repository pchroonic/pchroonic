# Namdar AI handoff

Last verified: 2026-09-12 UTC

Read `docs/AI_START.md` first.

## Production source of truth
- Repo `pchroonic/pchroonic`, default `main`.
- Current product merge: `f026803056f07d17ed1c257f1bd1094268a1cb08` from PR #38.
- PR #38 exact head: `1fad0ab7a7f6edd39d0afb0dbd9a04dfc70a622a`.
- GitHub CI `34712880930`: SUCCESS.
- Exact-head preview `dpl_EJMytimDT1XQtcSW8a4wNLMnWCUP`: READY / clean build.
- Production `dpl_EMqepbY1Aw8yqL6hBn2V6RtzJ2MG`: READY on `https://namdar.co.uk`, no alias error.
- No database migration was required for PR #38.
- Supabase: `namdar-production` (`qjigldxjcpnrlyxgmlqq`).
- Only `windows` is live; gutters/jetwash/roof/handyman/tour3d remain planned.
- Privileged staff requires AAL2/MFA.

## Window Cleaning Stage 1 — LIVE

PR #38 improved the Window Cleaning journey and fixed a service-gate weakness without activating any future service.

### Critical quote-gate fix
Before PR #38, `api/quote.js` checked `body.service` although the real customer form sends `serviceKey`. The wrapper also defaulted a missing service to `windows`, so a crafted request could pass the outer live-service gate and reach the legacy core with another service key.

Live fix:
- gate resolves `body.serviceKey || body.service`;
- missing/unknown keys are rejected;
- non-live services return HTTP 409;
- Window detail/extra/frequency values are normalised server-side before delegation.

This closes the direct future-service quote bypass and prevents arbitrary client-supplied lower Window multipliers.

### Window quote UX
`conversion.js` keeps Window Cleaning as the sole live service and now asks:
- exterior-window count;
- window style;
- current condition: maintenance / first Namdar clean / heavy build-up;
- access detail: clear / gated / extension-conservatory / mixed complications;
- extra glass: doors, roof lights, conservatories, unusual glass;
- recurrence: one-off, 4-weekly, 8-weekly, 12-weekly.

A structured `[Window details]` block is submitted in quote notes for Admin review. The generic pricing engine still produces only a guide estimate; the final quote remains deliberately reviewed before booking.

### Recurring pricing mapping
`quote-core.js` supports:
- one-off `1.00`;
- 4-weekly `.86`;
- 8-weekly `.90`;
- 12-weekly `.94`.

The 4- and 12-week multipliers preserve the old monthly/quarterly pricing curve; 8-weekly is the midpoint. Legacy monthly/quarterly keys remain accepted for compatibility.

### My Namdar subscriptions
`subscription-core.js` accepts `4_weekly`, `8_weekly`, `12_weekly` and defaults new recurring requests to `8_weekly`.
`account-service-availability.js` shows those three Window-only frequencies and explains that Namdar confirms regular price, first-clean requirements and schedule before activation.

### Window Cleaning service page
`services/window-cleaning.html` now describes the actual live Stage 1 offer:
- exterior glass, frames and exterior sills;
- one-off and 4/8/12-week requests;
- factors affecting the final quote;
- first-clean/heavy-build-up review;
- access, extension/conservatory and extra-glass guidance;
- optional private photos;
- no payment at estimate stage and reviewed final quote before booking.

No unsupported insurance, guarantee, equipment or result claims were added.

## Tests / verification
`scripts/window-stage1.test.mjs` is live in CI and verifies:
- quote gate evaluates `serviceKey`;
- Window input multipliers are normalised server-side;
- 4/8/12-week guide-price keys exist;
- homepage Window-specific questions and notes summary exist;
- My Namdar recurrence options match;
- Window service page documents inclusions and reviewed flow.

Release verification:
- CI `34712880930` succeeded on exact head `1fad0ab...`.
- Exact-head preview `dpl_EJMytimDT1XQtcSW8a4wNLMnWCUP` READY; errors-only build clean.
- Product PR #38 merged as `f026803056f07d17ed1c257f1bd1094268a1cb08`.
- Production `dpl_EMqepbY1Aw8yqL6hBn2V6RtzJ2MG` READY and aliased to `namdar.co.uk`; alias error null.
- Production Window service page returns 200 with new Stage 1 content.
- Production `/api/public-data` still shows Window Cleaning only as live/quotable/public and only Window pricing.
- Production Gutter postcode/service request returns 409 planned/unavailable.
- Equivalent Window postcode request returns 200 covered.
- Supabase catalog rechecked: Windows live; five future services planned.

The direct crafted quote path is covered by CI regression tests. Current fetch tooling does not provide a convenient arbitrary POST smoke without creating a real quote record in production.

## Next recommended Stage 1 milestone
Focus on operational profitability rather than adding another service:
1. define booking availability / operating days / route-density rules;
2. measure the funnel: postcode → guide estimate → final quote → accepted → booked → completed;
3. calibrate pricing from actual completed job duration/cost/margin once enough real jobs exist;
4. add genuine before/after work and reviews as evidence accumulates.

## Parked / non-negotiables
- Do not activate another service.
- Do not resume Code-Point/Open UPRN/GetAddress work automatically.
- Existing accepted work survives service pause.
- Support tickets stay customer-only.
- Never expose secrets.
