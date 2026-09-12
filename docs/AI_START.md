# Namdar AI fast resume

Last verified: 2026-09-12 UTC

Read this first. Use `docs/AI_HANDOFF.md` for implementation detail and `docs/PROJECT_STATUS.md` for the roadmap.

## Current phase

**Phase 7 — Launch Security & Readiness**

## Production product baseline

- Repository: `pchroonic/pchroonic`, default branch `main`.
- Current verified **product code**: `945091c31cab6600916cd07854de3df4ac830d6a` from PR #30.
- PR #30 exact head: `7a55bda84f8b3c6ad4292ec5c618531b19d3b75f`.
- PR #30 GitHub workflow: `34707335676`, passed, including the new address-priority regression tests.
- PR #30 exact-head preview: `dpl_6g5G3cwed7VGyyvhrkTULrKSsw53`, READY with no build error.
- PR #30 product deployment: `dpl_8fZEaFkpCWnqigrguuArba94N6me`, READY and aliased to `https://namdar.co.uk` with no alias error.
- Supabase: `namdar-production` (`qjigldxjcpnrlyxgmlqq`), Free plan.
- Resend: `namdar.co.uk` verified for sending/receiving.
- Privileged Admin/Staff browser, API and RLS access require AAL2/MFA.
- Customer support tickets remain customer-only; public inbound email stays in Admin Email inbox.

Docs-only commits may appear after this product baseline. Treat `945091c3…` as the latest verified product-behavior commit unless a newer handoff explicitly names another product change.

## GetAddress controlled first run — READY FOR INTERACTIVE TEST

The address-growth code, explicit one-postcode manual limit and faster manual service-area discovery are now live. Automatic harvesting remains intentionally OFF.

Latest production database state:
- `enabled = false`
- `prioritize_service_areas = true`
- `daily_lookup_cap = 20`
- `last_run_at = null`
- `last_success_at = null`
- no last error
- zero harvest runs
- zero queue rows
- zero `getaddress-daily-cache` rows

No paid GetAddress lookup has been consumed by implementation, CI, previews or deployment verification.

### Manual-run safety now live

PR #28 introduced:
- separate Admin **Manual run postcode limit**;
- default `1`;
- exact-count confirmation;
- server-side validation;
- omitted manual limit defaults to `1`, not the daily cap.

PR #30 improved the one-postcode path:
- manual service-area queue target = exactly the requested manual postcode count, clamped 1–20;
- cron/automatic queue target remains deep: minimum 80, scaling by the existing 6× multiplier (20 daily lookups → target 120);
- verified covered postcodes are seeded first, so manual testing avoids unnecessary Typeahead calls when enough covered candidates already exist;
- regression tests cover manual `1/5/20`, invalid/hard-max clamping and cron `80/120` targets;
- CI now runs `scripts/address-harvest-priority.test.mjs`.

Production has 2 verified postcodes classified inside the current active service area in aggregate (1 Lewisham, 1 Lambeth). Do not copy the actual postcode values into chat or handoff docs.

### Provider/address strategy

- GetAddress Typeahead discovers postcode candidates; it is rate-limited but does not increase lookup usage.
- Paid retrieval is postcode-only Autocomplete with `all=true`; one postcode query counts as one lookup and can return many addresses.
- Active `service_areas` are read dynamically. Current production coverage is one administrative service area containing Lewisham, Southwark, Lambeth, Wandsworth and Greenwich.
- Covered candidates are first priority, then London/South-East fallback, then wider UK.
- Normalized addresses → `master_addresses` source `getaddress-daily-cache`.
- Raw provider payloads → `address_harvest_snapshots`.
- Run records/counters → `address_harvest_runs`.
- Successful runs create private JSON + CSV backups in Supabase Storage bucket `address-harvest-backups`.
- Vercel cron `/api/address-harvest-cron` runs at 03:30 UTC but respects `enabled=false`, so automatic harvesting is still inactive.

Required server-only secret: `GETADDRESS_API_KEY`. Optional `GETADDRESS_ADMIN_KEY` provides authoritative usage/daily-limit readback. Never paste either into chat or commit them.

## Immediate next action

This is now the only remaining GetAddress activation milestone:

1. Complete fresh Admin password sign-in, interactive Cloudflare Turnstile and mandatory MFA/AAL2.
2. Open Admin → Service Areas → Daily address database growth.
3. Confirm `GETADDRESS_API_KEY` reports **configured** without exposing its value.
4. Confirm Automatic OFF, Service-area priority ON, daily cap 20 and Manual run postcode limit `1`.
5. Run exactly **1 postcode**.
6. Verify the chosen postcode is covered-area priority, addresses are saved correctly, raw snapshot/run counters exist, provider/local usage increments correctly, and private JSON/CSV backups plus full export work.
7. If clean, deliberately use more of the remaining daily allowance if desired.
8. Only after successful controlled verification should Automatic daily harvesting be considered.

Do not claim end-to-end GetAddress success until that real one-postcode run passes.

## Auth/security state

- Supabase Site URL: `https://namdar.co.uk`; redirect allowlist: `https://namdar.co.uk/**`.
- Email + Google sign-in intentionally enabled; do not disable Google without identity migration/recovery.
- Cloudflare Turnstile/Supabase CAPTCHA is live.
- Customer login and password-reset request passed production smoke tests.
- Privileged Admin/Staff CAPTCHA integration is live, but a complete fresh Admin password + CAPTCHA + MFA session still requires interactive user completion.
- Supabase Leaked Password Protection remains unavailable/disabled on the current Free plan.

## Auth email branding

- Branded templates are source-controlled under `supabase/email-templates/`.
- Reset Password is live and verified in Gmail with subject `Reset your Namdar password`.
- SMTP sender remains `accounts@namdar.co.uk`; display name was changed to `Namdar`, awaiting a fresh delivery casing check.
- Remaining prepared Auth templates and Magic Link test are still pending.
- No `_dmarc` record has been added; DMARC/BIMI remains separate work.

## Other open work

- Production runtime logs showed unrelated recurring `/api/booking-notifications` 504 errors; investigate separately from GetAddress.
- Remaining Auth templates + Magic Link.
- DMARC/BIMI after sender audit.
- Same-iPhone homepage overflow confirmation.
- Stripe, SMS, legal, cron/double-booking and controlled customer-support launch checks.

## Do not break

- Never expose GetAddress, Supabase, SMTP, Turnstile, GitHub or cron secrets.
- Do not use or reproduce the previously exposed GitHub PAT.
- Do not make support tickets public.
- Do not move production back to Netlify.
- Do not call GetAddress from browser/client code; its key stays server-side.
- Do not let manual + cron runs exceed configured/local/provider allowance.
- Do not bypass live `service_areas` priority.