# Namdar AI fast resume

Last verified: 2026-09-12 UTC

Read this first. Use `docs/AI_HANDOFF.md` for implementation detail and `docs/PROJECT_STATUS.md` for the roadmap.

## GetAddress controlled first-run guard — 2026-09-12

Current continuation branch: `fix/getaddress-controlled-manual-run-20260912`.

This change tightens the first real GetAddress verification before automatic harvesting is enabled:
- Admin now has a separate **Manual run postcode limit**, default `1`.
- `Run once now` sends that explicit limit and confirms the exact maximum number of paid postcode lookups requested.
- `api/admin-address-harvest.js` independently validates the manual limit and defaults an omitted manual limit to `1` instead of the daily cap.
- The existing daily cap, provider allowance, local UTC usage accounting, service-area priority and automatic OFF state remain unchanged.
- No database migration or new environment variable is required.
- Production database was rechecked before this change: Automatic OFF, service-area priority ON, daily cap 20, zero harvest runs, zero queued postcodes and zero `getaddress-daily-cache` rows. The first paid run is therefore still cleanly available.
- Current GetAddress documentation was rechecked: Typeahead queries do not increase lookup usage; postcode-only Autocomplete with `all=true` counts as one lookup; the v3 usage endpoint still uses the admin key.

Status: code is on the continuation branch and is **not production-live until PR/CI/preview/merge verification completes**.

Once live, the next provider test is: complete privileged Admin CAPTCHA/MFA, confirm the GetAddress key is configured, keep Automatic OFF, leave the manual limit at `1`, run once, and verify covered-area selection, saved addresses, usage and both backup formats before using the remaining daily allowance.

## Privileged sign-in CAPTCHA repair — 2026-09-12

During the GetAddress continuation, a fresh production Admin password sign-in was rejected with `captcha protection: request disallowed (no captcha_token found)`. Admin and Staff both called password Auth without a CAPTCHA token; only the customer account flow had been integrated.

Repair merged and live in PR #26:
- Shared `privileged-login-captcha.js` renders Turnstile on visible Admin/Staff login forms using the existing public configuration key, forwards `options.captchaToken`, blocks empty/expired tokens and resets after every Auth attempt.
- Library load failures can retry; existing session restoration does not wait for CAPTCHA. MFA/AAL2 guards are preserved.
- Staff public config retains the public site key; the PWA cache version is advanced and includes the new local helper. Provider scripts/tokens are not cached.
- No database migration, new environment variable or provider-security setting change.
- Five focused regression tests pass locally, covering missing tokens/config, expiry/error/timeout, token forwarding/reset, library retry and both page integrations. GitHub CI passed for feature commit `c2d704045a9fa0a8b44800ed08888fc59823b8f9`; Vercel preview `dpl_7u4jVpQmupPThomkVe6SNF9efYev` was READY. Authenticated preview verification was limited by Vercel protection on configuration requests. Production Admin and Staff show the anti-bot component; Admin screenshot confirms the Cloudflare checkbox renders without clipping. Full password/MFA sign-in is pending user completion or permission to solve the interactive CAPTCHA.
- Current verified baseline before repair: GitHub `6f4bfcfb7ad3cf804a1eaad14695860e80c156cf` served by READY production deployment `dpl_28xFc3ZmneevxwWMvxJX3PdyWAhA`, aliased to `namdar.co.uk`.

Current verified production repair: commit `356a73e6aa6d069f7616956f6ae82e4736380f09`, deployment `dpl_E64KTbTy7qMXqLKpQQJLLHuEy6Fe`, READY and aliased to `namdar.co.uk`.

Latest verified `main` before the continuation branch: `ebcf268aa94707aaa5dd74d5d1c374228b71560b`, served by READY production deployment `dpl_6mC9TbE5FCbuBu5S1hz7ARmpPGar`.

Immediate next step: complete the interactive Admin CAPTCHA and secure sign-in/MFA, then check GetAddress key/status and perform the one-postcode controlled manual-run verification. Automatic harvesting has not been enabled. Do not claim the complete login or harvest journey has passed yet.

## Current phase

**Phase 7 — Launch Security & Readiness**

## Production baseline

- Repository: `pchroonic/pchroonic`, default branch `main`.
- Latest verified production GitHub HEAD before this branch: `ebcf268aa94707aaa5dd74d5d1c374228b71560b`.
- Latest verified production deployment before this branch: Vercel `dpl_6mC9TbE5FCbuBu5S1hz7ARmpPGar`, READY on `https://namdar.co.uk`.
- GetAddress feature merge: `35e81842c0104587423397c41414d4610c20053e` from PR #24; privileged CAPTCHA repair merge: `356a73e6aa6d069f7616956f6ae82e4736380f09` from PR #26.
- Supabase: `namdar-production` (`qjigldxjcpnrlyxgmlqq`), Free plan.
- Resend: `namdar.co.uk` verified for sending/receiving.
- MFA Stage 2 is live; privileged Admin/Staff browser, API and RLS access require AAL2.
- Customer support tickets remain customer-only; public inbound email stays in Admin Email inbox.

## Auth/security state

- Supabase Site URL: `https://namdar.co.uk`; redirect allowlist: `https://namdar.co.uk/**`.
- Email + Google sign-in intentionally enabled. Do not disable Google without identity migration/recovery.
- Supabase CAPTCHA is ON using Cloudflare Turnstile. Customer login and password-reset request passed production smoke tests.
- Leaked Password Protection remains unavailable/disabled on the current Supabase plan.

## Auth email branding

- Six branded Auth templates are source-controlled under `supabase/email-templates/`.
- **Reset password is LIVE and verified in Gmail** with subject `Reset your Namdar password` and branded Namdar HTML.
- Supabase SMTP sender remains `accounts@namdar.co.uk`; owner changed display name from `namdar` to `Namdar`. A post-change delivery has not yet independently verified the casing.
- Magic Link and the other prepared Auth templates are not yet confirmed live.
- Gmail sender avatar is separate BIMI/DMARC work. No `_dmarc` DNS record has been added yet; DMARC work remains paused.

## GetAddress daily database growth — CODE LIVE, AUTOMATION OFF

PR #24 is merged and deployed. The production database is intentionally still configured as:
- `enabled = false`
- `prioritize_service_areas = true`
- `daily_lookup_cap = 20`
- zero harvest runs and zero queued postcodes at the latest production recheck.

Design/live behavior:
- GetAddress Typeahead is used to discover postcode candidates before paid address retrieval.
- Each paid retrieval is postcode-only Autocomplete with `all=true`, allowing one paid postcode lookup to save many returned addresses.
- **Active Namdar Service Areas are prioritised first.** The worker reads live `service_areas` at runtime rather than hard-coding boroughs. Current production coverage is Lewisham, Southwark, Lambeth, Wandsworth and Greenwich.
- Service-area discovery builds a deep covered-postcode queue before paid lookups. Duplicate Typeahead discoveries count only when a genuinely new queue row is inserted, preventing false queue-depth inflation.
- Nearby/London & South-East candidates are fallback, with wider UK only after local priority is unavailable.
- `prioritize_service_areas` is an Admin-controlled switch, default ON.
- Queue metadata includes coverage label, priority score, outward code and learned expected yield. Previously harvested address counts teach the worker which outward codes tend to return more addresses per paid lookup.
- Normalized results are stored in existing `master_addresses` as source `getaddress-daily-cache`.
- Raw provider snapshots and run history are stored server-side.
- Successful runs write JSON + CSV copies to private Supabase Storage bucket `address-harvest-backups`.
- Admin Service Areas has automatic ON/OFF, service-area priority ON/OFF, daily cap (max 20), usage/status, covered-area queue/counters, Run once now, recent runs, per-run backups and full CSV/JSON export. The continuation branch adds a separate manual-run limit defaulting to 1.
- Vercel daily cron target: `/api/address-harvest-cron` at `03:30 UTC`, protected by existing `CRON_SECRET`.
- Required secret: `GETADDRESS_API_KEY`. Optional `GETADDRESS_ADMIN_KEY` improves authoritative usage/remaining display. Never paste either into chat or commit them.

Production DB migrations applied safely:
- `20260912121339 address_harvest_automation`
- `20260912121442 address_harvest_run_guard`
- `20260912123809 address_harvest_service_area_priority`

Latest safe production checks:
- `admin-address-harvest.js` returns HTTP 200 on production.
- unauthenticated `/api/address-harvest-cron` returns 401.
- unauthenticated `/api/admin-address-harvest` returns 401.
- automatic mode is OFF; no provider lookup was triggered by deployment/testing.
- production database still has no harvest run, queue item or `getaddress-daily-cache` address.

## Immediate next action

Finish PR/CI/preview/production verification for the controlled manual-run guard. Then complete Admin CAPTCHA/MFA, confirm `GETADDRESS_API_KEY` directly in Admin/Vercel without exposing it, keep Automatic OFF and run exactly **1 postcode**. Verify service-area selection, saved addresses, provider usage and private JSON/CSV backups. Only after that first successful end-to-end check should the remaining daily allowance be used and automatic daily harvesting be considered.

## Other open items

- Apply/test remaining branded Auth emails; Magic Link CAPTCHA test remains pending.
- Continue DMARC/BIMI only after address-harvest activation/testing; no DMARC record added yet.
- Same-iPhone homepage overflow confirmation pending; Windows/Edge desktop is fixed.
- Stripe, SMS, remaining Resend/legal readiness, cron verification and controlled customer-support journey remain open.

## Do not break

- Never expose GetAddress, Supabase, SMTP, Turnstile, GitHub or cron secrets.
- Do not use or reproduce the previously exposed GitHub PAT.
- Do not make support tickets public.
- Do not move production back to Netlify.
- Do not call GetAddress from browser/client code; API key stays server-side.
- Do not let manual + cron runs exceed the configured/local daily cap.
- Do not bypass live `service_areas` when service-area priority is enabled.