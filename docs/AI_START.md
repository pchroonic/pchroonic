# Namdar AI fast resume

Last verified: 2026-09-12 UTC

Read this first. Use `docs/AI_HANDOFF.md` for implementation detail and `docs/PROJECT_STATUS.md` for the roadmap.

## Current phase

**Phase 7 — Launch Security & Readiness**

## Controlled manual discovery optimization — CANDIDATE

Current branch: `perf/getaddress-fast-manual-discovery-20260912`.

A final pre-provider audit found that manual runs and automatic runs were using the same deep service-area queue target. Even a one-postcode manual verification therefore aimed for at least 80 pending covered postcodes before the paid lookup. That Typeahead discovery is non-billable, but it can add unnecessary latency and provider rate-limit exposure to the first controlled test.

Candidate behavior:
- manual run queue target = exactly the requested postcode limit;
- automatic/cron queue target remains deep: minimum 80, scaling by the existing 6× multiplier (20 daily lookups → target 120);
- service-area priority, paid lookup limits, provider/local usage guards and Automatic OFF state are unchanged;
- regression tests cover manual `1`, `5`, `20`, hard-max clamping and cron `80/120` behavior;
- CI now runs the new address-harvest priority test.

Live production already has 2 verified postcodes inside the current service area (aggregate only: one Lewisham and one Lambeth), so after this candidate ships, the first one-postcode manual run should be able to seed enough known covered candidates without first trying to fill an 80-postcode Typeahead queue. Do not expose the actual saved postcodes in handoff/chat.

Status: candidate branch only until PR → CI → Vercel preview → merge → production verification completes.

## Production baseline

- Repository: `pchroonic/pchroonic`, default branch `main`.
- Current verified **product code**: `3ea8f45301fcdfe25e5610abefcb71757a22a0d8` (PR #28 controlled GetAddress manual-run guard).
- Continuity-doc sync merged afterward as `d7c84edd0019d66650a4ecce7c02c6ce89ac5a01`; it did not change product behavior.
- PR #28 product-code deployment: Vercel `dpl_AnnQ2n26h5WDCs239zDcSwxy1GZf`, READY on `https://namdar.co.uk` with no alias error.
- PR #29 docs-only deployment: `dpl_Hc2MYZ5BXBpbYFLTNDX96fNuWF3T`, READY on `namdar.co.uk`; product code is unchanged from PR #28.
- Exact-head PR #28 preview: `dpl_CH6BjU8pHxGxtdQrLsHWnU1yiF6T`, READY; GitHub workflow run `34706834723` passed.
- Supabase: `namdar-production` (`qjigldxjcpnrlyxgmlqq`), Free plan.
- Resend: `namdar.co.uk` verified for sending/receiving.
- Privileged Admin/Staff browser, API and RLS access require AAL2/MFA.
- Customer support tickets remain customer-only; public inbound email stays in Admin Email inbox.

## GetAddress daily database growth — LIVE CODE, AUTOMATION OFF

The GetAddress database-growth feature and its controlled first-run guard are live. Production is intentionally still configured as:
- `enabled = false`
- `prioritize_service_areas = true`
- `daily_lookup_cap = 20`
- `last_run_at = null`
- zero harvest runs
- zero queued postcodes
- zero `getaddress-daily-cache` addresses

Latest post-deploy verification confirmed deployment/testing has consumed **no paid GetAddress lookup**.

### Controlled manual run guard now live

PR #28 fixed a first-run safety gap: the previous Admin `Run once now` request did not send a lookup limit, so an omitted limit could fall back to the daily cap.

Live behavior now:
- Admin → Service Areas → Daily address database growth has a separate **Manual run postcode limit**.
- It defaults to `1` and its UI max follows the configured daily cap.
- The confirmation states the exact maximum postcode count requested.
- `api/admin-address-harvest.js` validates the limit independently and defaults an omitted manual limit to `1`, not the daily cap.
- Existing local UTC usage accounting, provider usage allowance, daily cap, run-concurrency guard and service-area priority remain authoritative.
- No database migration or new environment variable was required.

Production verification after PR #28:
- live `admin-address-harvest.js` returns HTTP 200 and contains `harvestRunLimit` with default `1` plus the safe-first-run guidance;
- unauthenticated `/api/admin-address-harvest` returns 401 `Please sign in as Namdar staff.`;
- production DB remained Automatic OFF / priority ON / cap 20 / zero runs / zero queue / zero GetAddress-cached rows.

### Provider strategy

- GetAddress Typeahead discovers postcode candidates before paid address retrieval.
- Typeahead queries do not increase lookup usage.
- Each paid retrieval is postcode-only Autocomplete with `all=true`; one postcode request counts as one lookup and can return/save many addresses.
- Active Namdar `service_areas` are prioritised at runtime. Current production coverage is one administrative service area containing Lewisham, Southwark, Lambeth, Wandsworth and Greenwich.
- Nearby/London & South-East candidates are fallback, then wider UK.
- Normalized results go to `master_addresses` as `getaddress-daily-cache`.
- Raw provider snapshots and run history remain server-side.
- Successful runs write private JSON + CSV backups to Supabase Storage bucket `address-harvest-backups`.
- Vercel cron target is `/api/address-harvest-cron` at `03:30 UTC`, protected by `CRON_SECRET`; because `enabled=false`, automatic harvesting remains off.

Required server-only secret: `GETADDRESS_API_KEY`. Optional `GETADDRESS_ADMIN_KEY` improves authoritative usage/remaining readback. Never paste either into chat or commit them.

## Immediate next action

1. Finish the manual-discovery optimization through PR/CI/preview/production verification.
2. Complete fresh Admin password sign-in, interactive Cloudflare CAPTCHA and mandatory MFA/AAL2.
3. Open Admin → Service Areas → Daily address database growth.
4. Confirm `GETADDRESS_API_KEY` shows configured without exposing its value.
5. Confirm Automatic OFF, Service-area priority ON and Manual run postcode limit = `1`.
6. Run exactly **1 postcode**.
7. Verify covered-area selection, saved addresses, provider/local usage, run metrics, raw snapshot, private JSON/CSV backups and full export.
8. Only after success should additional daily allowance be used or Automatic daily harvesting be considered.

Do not claim the full privileged-login or real GetAddress provider journey has passed until the interactive CAPTCHA/MFA and one-postcode run are completed.

## Auth/security state

- Supabase Site URL: `https://namdar.co.uk`; redirect allowlist: `https://namdar.co.uk/**`.
- Email + Google sign-in intentionally enabled. Do not disable Google without identity migration/recovery.
- Supabase CAPTCHA is ON using Cloudflare Turnstile.
- Customer login and password-reset request passed production smoke tests.
- Privileged Admin/Staff CAPTCHA integration is live, but a complete fresh Admin password + CAPTCHA + MFA session still requires interactive user completion.
- Leaked Password Protection remains unavailable/disabled on the current Supabase Free plan.

## Auth email branding

- Six branded Auth templates are source-controlled under `supabase/email-templates/`.
- Reset Password is live and verified in Gmail with subject `Reset your Namdar password` and branded Namdar HTML.
- Supabase SMTP sender remains `accounts@namdar.co.uk`; owner changed display name from `namdar` to `Namdar`, but a fresh delivery still needs to verify casing.
- Magic Link and remaining prepared templates are not yet confirmed live.
- Gmail sender avatar is separate BIMI/DMARC work; no `_dmarc` record has been added yet.

## Other open items

- Apply/test remaining branded Auth emails and Magic Link.
- Resume DMARC/BIMI only after sender audit; no DMARC record exists yet.
- Same-iPhone homepage overflow confirmation pending; Windows/Edge desktop is fixed.
- Stripe, SMS, remaining email/legal readiness, cron/double-booking regression checks and controlled customer-support journey remain open.
- Production runtime logs also showed an unrelated recurring `/api/booking-notifications` 504 issue; it has not been changed as part of the GetAddress work and should be investigated separately.

## Do not break

- Never expose GetAddress, Supabase, SMTP, Turnstile, GitHub or cron secrets.
- Do not use or reproduce the previously exposed GitHub PAT.
- Do not make support tickets public.
- Do not move production back to Netlify.
- Do not call GetAddress from browser/client code; its key stays server-side.
- Do not let manual + cron runs exceed configured/local/provider allowance.
- Do not bypass live `service_areas` when service-area priority is enabled.