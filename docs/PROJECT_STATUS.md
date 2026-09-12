# Namdar project status

Last updated: 2026-09-12 UTC

## GetAddress controlled first-run guard — 2026-09-12

Continuation branch: `fix/getaddress-controlled-manual-run-20260912`.

The existing `Run once now` control could omit a manual lookup limit, allowing the server to fall back to the configured daily cap. The candidate change makes the intended first provider verification explicitly controlled:
- Admin gets a separate Manual run postcode limit, default `1`;
- confirmation states the exact requested number of postcode lookups;
- the server validates the manual limit and defaults an omitted manual limit to `1`;
- the normal 20/day hard maximum, configured daily cap, provider allowance, local UTC usage and service-area priority remain unchanged;
- no database migration or new environment variable.

Before the change, production was rechecked and is still clean for its first paid provider run: Automatic OFF, service-area priority ON, daily cap 20, zero runs, zero queued postcodes and zero `getaddress-daily-cache` addresses.

Current provider documentation was also rechecked: Typeahead queries do not increase lookup usage; postcode-only Autocomplete with `all=true` is one lookup; the v3 usage endpoint remains valid.

Status: candidate branch only until PR/CI/Vercel preview/merge/production verification completes.

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

Latest verified production HEAD before the controlled-run branch: `ebcf268aa94707aaa5dd74d5d1c374228b71560b`, production deployment `dpl_6mC9TbE5FCbuBu5S1hz7ARmpPGar`, READY on `namdar.co.uk`.

Immediate next step: finish the controlled-run guard release, then complete interactive Admin CAPTCHA/MFA, confirm GetAddress key/status and perform a one-postcode manual-run verification. Automatic harvesting remains OFF.

## Baseline

- Source: `pchroonic/pchroonic`, main.
- Latest verified production HEAD before this branch: `ebcf268aa94707aaa5dd74d5d1c374228b71560b`.
- Production: `namdar.co.uk` on Vercel `namdar-website-starter-1`; deployment `dpl_6mC9TbE5FCbuBu5S1hz7ARmpPGar` READY.
- GetAddress feature merge: `35e81842c0104587423397c41414d4610c20053e`; privileged CAPTCHA repair merge: `356a73e6aa6d069f7616956f6ae82e4736380f09`.
- Supabase: `namdar-production` (`qjigldxjcpnrlyxgmlqq`), Free.
- Resend domain verified; sending/receiving enabled.

## Main product areas

| Area | Status |
| --- | --- |
| Public website | Live; Windows/Edge overflow fixed, same-iPhone final confirmation pending |
| Customer portal | Session fix, Google + email auth, customer MFA option, Turnstile/Supabase CAPTCHA live |
| Auth email branding | Reset Password live/verified; remaining prepared templates pending hosted apply/test |
| Sender avatar / BIMI | Paused; no DMARC record added yet |
| Admin/Staff security | Mandatory privileged MFA/AAL2 live; new CAPTCHA integration live, full fresh password/MFA completion still pending |
| Email inbox | Spam controls + Inbox Security v2 live |
| Address system | Existing master/directory/OSM fallback live; GetAddress service-area-first growth code live, automatic harvesting OFF; controlled manual-run guard candidate in progress |

## GetAddress daily address growth — LIVE, NOT YET ACTIVATED

Goal: use up to 20 daily GetAddress postcode lookups to grow Namdar's reusable local address database, while preserving independent backups and giving Admin full control/visibility.

Live architecture:
- Typeahead discovers full postcode candidates before paid address retrieval and does not increase lookup usage;
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
- Admin panel → automatic toggle, service-area priority toggle, daily cap, key-configured state, usage/remaining, covered queue/counters, totals, run-now, history, per-run download, full CSV/JSON export;
- candidate controlled-run guard adds a separate manual-run limit defaulting to 1, while the daily cap remains 20;
- cron → `/api/address-harvest-cron` daily 03:30 UTC with `CRON_SECRET`.

Production migrations:
- `20260912121339 address_harvest_automation`
- `20260912121442 address_harvest_run_guard`
- `20260912123809 address_harvest_service_area_priority`

Latest production verification:
- canonical Vercel production is READY.
- `admin-address-harvest.js` HTTP 200.
- unauthenticated cron endpoint HTTP 401.
- unauthenticated Admin harvest API HTTP 401.
- DB settings: Automatic OFF, service-area priority ON, daily cap 20.
- zero harvest runs, zero queued postcodes and zero GetAddress-cached addresses at the latest recheck; no paid provider lookup has been triggered.

Required production env before first real run:
- `GETADDRESS_API_KEY` required;
- `GETADDRESS_ADMIN_KEY` optional for authoritative provider usage readback.

Keys must be entered directly in Vercel and never pasted into chat or GitHub.

## Auth/security

- Site URL + redirect allowlist hardened to canonical production.
- Email + Google intentionally enabled; unnecessary providers disabled.
- Supabase CAPTCHA enabled with Cloudflare Turnstile.
- Customer login + password-reset request passed post-CAPTCHA production smoke tests.
- Privileged Admin/Staff CAPTCHA integration is live; a full fresh Admin password/MFA completion is still pending interactive user completion.
- Leaked Password Protection remains unavailable/disabled on the current Free plan.

## Auth email branding

- Branded email source merged.
- Reset Password hosted template is live and verified in Gmail with `Reset your Namdar password` subject.
- SMTP sender address remains `accounts@namdar.co.uk`; owner changed sender display to `Namdar`, awaiting a fresh message to verify casing.
- Remaining Auth templates still need apply/test.
- Gmail avatar requires separate DMARC/BIMI path; no `_dmarc` record has been created.

## Next actions

1. Finish the controlled manual-run guard through PR → CI → Vercel preview → merge → production verification.
2. Complete fresh Admin CAPTCHA/MFA sign-in, confirm GetAddress key(s) directly without exposing them, keep Automatic OFF and run exactly 1 postcode.
3. Verify service-area queue/selection, saved addresses, provider usage, run metrics, JSON + CSV backups and full export.
4. If the one-postcode run is clean, use more of the remaining daily allowance; only then switch daily harvesting ON.
5. Apply/test remaining branded Auth emails and Magic Link.
6. Resume DMARC/BIMI safely after sender audit.
7. Same-iPhone overflow confirmation.
8. Continue Stripe, SMS, legal, remaining cron/double-booking and customer-support launch checks.

## Handoff rule

Every substantial product/provider change updates `docs/AI_START.md`, `docs/AI_HANDOFF.md`, and this file together. Never store credentials, customer secrets, TOTP codes, SMTP/CAPTCHA/GetAddress keys or one-time Auth links.