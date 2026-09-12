# Namdar project status

Last updated: 2026-09-12 UTC

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

## Baseline

- Source: `pchroonic/pchroonic`, main.
- Production code: `35e81842c0104587423397c41414d4610c20053e`.
- Production: `namdar.co.uk` on Vercel `namdar-website-starter-1`; deployment `dpl_8Ne2Vxse5RWyK2h1JvvZia9upc2m` READY.
- Supabase: `namdar-production` (`qjigldxjcpnrlyxgmlqq`), Free.
- Resend domain verified; sending/receiving enabled.

## Main product areas

| Area | Status |
| --- | --- |
| Public website | Live; Windows/Edge overflow fixed, same-iPhone final confirmation pending |
| Customer portal | Session fix, Google + email auth, customer MFA option, Turnstile/Supabase CAPTCHA live |
| Auth email branding | Reset Password live/verified; remaining prepared templates pending hosted apply/test |
| Sender avatar / BIMI | Paused; no DMARC record added yet |
| Admin/Staff security | Mandatory privileged MFA/AAL2 live and verified |
| Email inbox | Spam controls + Inbox Security v2 live |
| Address system | Existing master/directory/OSM fallback live; GetAddress service-area-first growth code live, automatic harvesting OFF pending key/manual verification |

## GetAddress daily address growth — LIVE, NOT YET ACTIVATED

Goal: use up to 20 daily GetAddress postcode lookups to grow Namdar's reusable local address database, while preserving independent backups and giving Admin full control/visibility.

Live architecture:
- Typeahead discovers full postcode candidates before paid address retrieval;
- one postcode Autocomplete request with `all=true` can return many addresses for one paid postcode lookup;
- **active Namdar Service Areas are first priority**, read dynamically from live `service_areas` so future coverage edits change harvesting automatically;
- current live coverage is Lewisham, Southwark, Lambeth, Wandsworth and Greenwich;
- provider district-filtered Typeahead builds a deep covered-postcode queue before paid lookups;
- duplicate discoveries only count when they actually insert a new queue row, preventing false queue depth;
- if covered candidates are unavailable, fallback remains London/South-East first, then wider UK;
- queue stores coverage label, priority score, outward code and learned expected yield from previously harvested address counts;
- Admin can switch service-area priority ON/OFF independently of the main automatic harvest switch; priority defaults ON while automatic harvesting defaults OFF;
- normalized addresses → `master_addresses` / `getaddress-daily-cache`;
- raw snapshots → `address_harvest_snapshots`;
- run audit/status → `address_harvest_runs`, including covered-area postcode/address counters;
- candidate queue → `address_harvest_postcodes`;
- singleton ON/OFF/cap/provider usage state → `address_harvest_settings`;
- daily JSON + CSV backup → private Supabase Storage `address-harvest-backups`;
- Admin panel → automatic toggle, service-area priority toggle, cap, key-configured state, usage/remaining, covered queue/counters, totals, run-now, history, per-run download, full CSV/JSON export;
- cron → `/api/address-harvest-cron` daily 03:30 UTC with `CRON_SECRET`.

Production migrations:
- `20260912121339 address_harvest_automation`
- `20260912121442 address_harvest_run_guard`
- `20260912123809 address_harvest_service_area_priority`

Production verification after PR #24 merge:
- Vercel production deployment `dpl_8Ne2Vxse5RWyK2h1JvvZia9upc2m` is READY, canonical alias healthy.
- `admin-address-harvest.js` HTTP 200.
- unauthenticated cron endpoint HTTP 401.
- unauthenticated Admin harvest API HTTP 401.
- DB settings: Automatic OFF, service-area priority ON, daily cap 20.
- zero harvest runs and zero queued postcodes after deployment; no GetAddress paid lookup was triggered.

Required production env before first real run:
- `GETADDRESS_API_KEY` required;
- `GETADDRESS_ADMIN_KEY` optional for authoritative provider usage readback.

Keys must be entered directly in Vercel and never pasted into chat or GitHub.

## Auth/security

- Site URL + redirect allowlist hardened to canonical production.
- Email + Google intentionally enabled; unnecessary providers disabled.
- Supabase CAPTCHA enabled with Cloudflare Turnstile.
- Customer login + password-reset request passed post-CAPTCHA production smoke tests.
- Leaked Password Protection remains unavailable/disabled on the current Free plan.

## Auth email branding

- Branded email source merged.
- Reset Password hosted template is live and verified in Gmail with `Reset your Namdar password` subject.
- SMTP sender address remains `accounts@namdar.co.uk`; owner changed sender display to `Namdar`, awaiting a fresh message to verify casing.
- Remaining Auth templates still need apply/test.
- Gmail avatar requires separate DMARC/BIMI path; no `_dmarc` record has been created.

## Next actions

1. Add GetAddress key(s) directly in Vercel, keep Automatic OFF, run one controlled manual harvest and verify the covered-area queue is selected first, saved addresses, provider usage and both backup formats.
2. Only after successful controlled verification switch daily harvesting ON.
3. Apply/test remaining branded Auth emails and Magic Link.
4. Resume DMARC/BIMI safely after sender audit.
5. Same-iPhone overflow confirmation.
6. Continue Stripe, SMS, legal, remaining cron/double-booking and customer-support launch checks.

## Handoff rule

Every substantial product/provider change updates `docs/AI_START.md`, `docs/AI_HANDOFF.md`, and this file together. Never store credentials, customer secrets, TOTP codes, SMTP/CAPTCHA/GetAddress keys or one-time Auth links.
