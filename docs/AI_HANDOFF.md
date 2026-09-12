# Namdar AI handoff

Last verified: 2026-09-12 UTC

Read `docs/AI_START.md` first.

## Production source of truth
- Repo `pchroonic/pchroonic`, default `main`.
- Current main after docs PR #37: `80faf13d5ebbc7e00034300bd7eee15af9cb9538`.
- Window-only staged-service release is live from PR #36.
- Canonical production: `https://namdar.co.uk`.
- Supabase: `namdar-production` (`qjigldxjcpnrlyxgmlqq`).
- Only `windows` is live; gutters/jetwash/roof/handyman/tour3d remain planned.
- Privileged staff requires AAL2/MFA.

## Current candidate
Branch: `feat/window-cleaning-stage1-optimisation-20260912`.
No database migration is required.

### Critical quote-gate fix
`api/quote.js` previously checked `body.service` even though the customer quote form sends `serviceKey`. Because the old wrapper defaulted missing `service` to `windows`, a crafted request could pass the outer live-service check and reach `quote-core.js` with another service key.

Candidate fix:
- resolve the gate from `body.serviceKey || body.service`;
- reject missing/unknown keys;
- keep non-live response HTTP 409;
- normalise Window detail/extra/frequency values server-side before delegating to the legacy core.

Window allowed guide-price inputs are now constrained to known UI values rather than trusting arbitrary client multipliers.

### Window quote UX
`conversion.js` keeps Window Cleaning as the sole live service and enhances the quote UI after `app.js` loads:
- exterior-window count;
- window style;
- current condition: maintenance / first Namdar clean / heavy build-up;
- access detail: clear / gated / extension-conservatory / mixed complications;
- extra glass choices tailored to doors, roof lights, conservatories, unusual glass;
- recurrence choices: one-off, 4-weekly, 8-weekly, 12-weekly;
- structured `[Window details]` summary appended to submitted notes for Admin review, then customer textarea restored locally.

The generic pricing engine still produces a guide estimate; the final quote remains reviewed manually before booking.

### Recurring pricing mapping
`quote-core.js` keeps the prior discount curve and adds Stage 1 names:
- one-off `1.00`;
- 4-weekly `.86` (same as legacy monthly);
- 8-weekly `.90` midpoint;
- 12-weekly `.94` (same as legacy quarterly).
Legacy monthly/quarterly keys remain accepted for compatibility.

### My Namdar subscriptions
`subscription-core.js` accepts `4_weekly`, `8_weekly`, `12_weekly` and defaults new recurring requests to `8_weekly`.
`account-service-availability.js` rebuilds the Window-only frequency selector to 4/8/12 weeks and explains that Namdar confirms regular price, first-clean requirements and schedule before activation.

### Window Cleaning service page
`services/window-cleaning.html` now focuses on the actual Stage 1 offer:
- exterior glass, frames and exterior sills;
- one-off and 4/8/12-week requests;
- what affects the final quote;
- first-clean/heavy-build-up review;
- access, extension/conservatory and extra-glass guidance;
- optional private photos;
- no payment at estimate stage and reviewed final quote before booking.

No unsupported insurance, guarantee, equipment or result claims were added.

## Tests
New `scripts/window-stage1.test.mjs` verifies:
- quote gate evaluates `serviceKey`;
- Window input multipliers are normalised server-side;
- 4/8/12-week guide-price keys exist;
- homepage Window-specific questions and notes summary exist;
- My Namdar recurrence options match;
- Window service page documents inclusions and reviewed flow.

CI workflow now runs this suite and syntax-checks all touched JS.

## Release workflow
1. PR from candidate branch.
2. GitHub CI must pass.
3. Exact-head Vercel preview must be READY/clean.
4. Verify preview service page and homepage assets.
5. Merge only after gates pass.
6. Verify production deployment/aliases and key public endpoints.
7. Sync handoff to exact live commit/deployment IDs if necessary.

## Parked work / non-negotiables
- Do not activate another service.
- Do not resume Code-Point/Open UPRN/GetAddress work automatically.
- Existing accepted work survives service pause.
- Support tickets stay customer-only.
- Never expose secrets.
