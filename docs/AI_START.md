# Namdar AI fast resume

Last verified: 2026-09-12 UTC

Read this first. Use `docs/AI_HANDOFF.md` for implementation detail and `docs/PROJECT_STATUS.md` for the roadmap.

## Privileged sign-in CAPTCHA repair — 2026-09-12

During the GetAddress continuation, a fresh production Admin password sign-in was rejected with `captcha protection: request disallowed (no captcha_token found)`. Admin and Staff both called password Auth without a CAPTCHA token; only the customer account flow had been integrated.

Prepared repair:
- Shared `privileged-login-captcha.js` renders Turnstile on visible Admin/Staff login forms using the existing public configuration key, forwards `options.captchaToken`, blocks empty/expired tokens and resets after every Auth attempt.
- Library load failures can retry; existing session restoration does not wait for CAPTCHA. MFA/AAL2 guards are preserved.
- Staff public config retains the public site key; the PWA cache version is advanced and includes the new local helper. Provider scripts/tokens are not cached.
- No database migration, new environment variable or provider-security setting change.
- Five focused regression tests pass locally, covering missing tokens/config, expiry/error/timeout, token forwarding/reset, library retry and both page integrations. Live authenticated success remains unverified pending preview and production testing.
- Current verified baseline before repair: GitHub `6f4bfcfb7ad3cf804a1eaad14695860e80c156cf` served by READY production deployment `dpl_28xFc3ZmneevxwWMvxJX3PdyWAhA`, aliased to `namdar.co.uk`.

Immediate next step: finish preview/CI and production verification of this repair, then resume GetAddress key/status and controlled manual-run checks. Automatic harvesting has not been changed by this session.

## Current phase

**Phase 7 — Launch Security & Readiness**

## Production baseline

- Repository: `pchroonic/pchroonic`, default branch `main`.
- Current production code commit: `35e81842c0104587423397c41414d4610c20053e` (PR #24 GetAddress daily harvest).
- Production deployment: Vercel `dpl_8Ne2Vxse5RWyK2h1JvvZia9upc2m`, READY and aliased to `https://namdar.co.uk`.
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
- zero harvest runs and zero queued postcodes at post-deploy verification.

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
- Admin Service Areas has automatic ON/OFF, service-area priority ON/OFF, daily cap (max 20), usage/status, covered-area queue/counters, Run once now, recent runs, per-run backups and full CSV/JSON export.
- Vercel daily cron target: `/api/address-harvest-cron` at `03:30 UTC`, protected by existing `CRON_SECRET`.
- Required secret: `GETADDRESS_API_KEY`. Optional `GETADDRESS_ADMIN_KEY` improves authoritative usage/remaining display. Never paste either into chat or commit them.

Production DB migrations applied safely:
- `20260912121339 address_harvest_automation`
- `20260912121442 address_harvest_run_guard`
- `20260912123809 address_harvest_service_area_priority`

Post-deploy safe checks passed:
- `admin-address-harvest.js` returns HTTP 200 on production.
- unauthenticated `/api/address-harvest-cron` returns 401.
- unauthenticated `/api/admin-address-harvest` returns 401.
- automatic mode is OFF; no provider lookup was triggered by deployment/testing.

## Immediate next action

Owner adds `GETADDRESS_API_KEY` directly in Vercel Production Environment Variables, optionally `GETADDRESS_ADMIN_KEY`. Do **not** paste keys into chat. Then perform one controlled manual run with Automatic still OFF, verify service-area candidates are selected first, inspect saved addresses/backups/provider usage, and only then switch automatic daily harvesting ON.

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
