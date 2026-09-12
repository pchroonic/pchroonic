# Namdar project status

Last updated: 2026-09-12 UTC

## Baseline

- Source: `pchroonic/pchroonic`, default branch `main`.
- Current verified product code: `3ea8f45301fcdfe25e5610abefcb71757a22a0d8` from PR #28.
- Continuity-doc sync afterward: `d7c84edd0019d66650a4ecce7c02c6ce89ac5a01`; no product behavior change.
- Production: `https://namdar.co.uk` on Vercel project `namdar-website-starter-1`.
- PR #28 product deployment `dpl_AnnQ2n26h5WDCs239zDcSwxy1GZf` READY; PR #29 docs-only deployment `dpl_Hc2MYZ5BXBpbYFLTNDX96fNuWF3T` READY.
- Supabase: `namdar-production` (`qjigldxjcpnrlyxgmlqq`), Free.
- Resend domain verified; sending/receiving enabled.

## Main product areas

| Area | Status |
| --- | --- |
| Public website | Live; Windows/Edge overflow fixed, same-iPhone final confirmation pending |
| Customer portal | Email + Google auth, customer MFA option, Turnstile/Supabase CAPTCHA live |
| Auth email branding | Reset Password live/verified; remaining prepared templates pending hosted apply/test |
| Sender avatar / BIMI | Paused; no DMARC record added yet |
| Admin/Staff security | Mandatory privileged AAL2/MFA live; Turnstile integration live; full fresh password + CAPTCHA + MFA completion still pending |
| Email inbox | Spam controls + Inbox Security v2 live |
| Address system | Master/directory/OSM fallback live; GetAddress service-area-first database growth live, Automatic OFF; controlled one-postcode guard live; faster manual discovery candidate in progress |
| Support tickets | Customer-only; public inbound email stays in Admin Email inbox |

## Faster manual GetAddress discovery — CANDIDATE

Branch: `perf/getaddress-fast-manual-discovery-20260912`.

Finding: the service-area priority layer currently aims for a deep pending queue (`max(80, requested×6)`) before both manual and cron runs. That is appropriate for automatic daily operation but excessive for the first one-postcode manual verification because Typeahead discovery can make up to 12 sequential calls with an 8-second timeout each.

Candidate change:
- manual queue target = exactly requested paid postcode count, clamped 1–20;
- cron/automatic behavior stays unchanged: minimum target 80, 20-lookups/day → target 120;
- verified covered rows are seeded first, so free Typeahead discovery is skipped when enough known covered candidates already exist;
- current production has 2 verified postcodes classified inside the active service area (aggregate only: 1 Lewisham, 1 Lambeth), so the first manual limit=1 run should not need to fill an 80-row queue first;
- actual postcode values remain private and must not be copied into handoff/chat;
- new `scripts/address-harvest-priority.test.mjs` covers manual limits/clamping and cron queue targets;
- CI workflow runs this regression test.

No DB migration, secret, paid lookup behavior, provider cap, backup format or service-area ordering change.

Status: not production-live until PR/CI/preview/merge/production verification completes.

## Controlled first-run guard — LIVE

PR #28 fixed the manual-run lookup-limit safety gap:
- Admin Manual run postcode limit defaults to 1;
- confirmation states exact requested count;
- API independently validates and defaults omitted manual limit to 1;
- 20/day hard cap, configured cap, provider/local usage and service-area priority stay authoritative;
- no migration/new env var.

Verification completed:
- PR exact head `f39df7c32c6e822015374c452e7afec1bb3c5ea7` passed workflow `34706834723`;
- preview `dpl_CH6BjU8pHxGxtdQrLsHWnU1yiF6T` READY;
- merge `3ea8f45301fcdfe25e5610abefcb71757a22a0d8`;
- product deployment `dpl_AnnQ2n26h5WDCs239zDcSwxy1GZf` READY on `namdar.co.uk`;
- live JS HTTP 200 and contains default `harvestRunLimit=1` + explicit limit request;
- unauthenticated Admin harvest API remains 401;
- post-deploy DB remained Automatic OFF / priority ON / cap 20 / zero runs / queue / GetAddress cache rows;
- release verification consumed no paid lookup.

## GetAddress daily address growth — LIVE CODE, NOT YET ACTIVATED

Goal: use up to 20 daily GetAddress **postcode** lookups to grow reusable local address data while prioritising current service coverage and preserving backups.

Architecture:
- Typeahead discovers postcode candidates before paid retrieval and does not increase lookup usage;
- postcode-only Autocomplete with `all=true` counts as one lookup and can return many addresses;
- active `service_areas` are first priority and read dynamically;
- current coverage: one administrative service area containing Lewisham, Southwark, Lambeth, Wandsworth and Greenwich;
- district-filtered Typeahead builds covered candidates;
- duplicates count only on genuine new queue insert;
- fallback: London/South-East then wider UK;
- queue stores coverage label, priority score, outcode and learned expected yield;
- normalized addresses → `master_addresses` / `getaddress-daily-cache`;
- raw snapshots → `address_harvest_snapshots`;
- run status → `address_harvest_runs`;
- queue → `address_harvest_postcodes`;
- settings/usage → `address_harvest_settings`;
- successful backup → private Supabase Storage `address-harvest-backups` as JSON + CSV;
- Admin exposes automatic toggle, priority, daily cap, manual limit, key status, usage, queue/counters, history and secure exports;
- cron `/api/address-harvest-cron` at 03:30 UTC protected by `CRON_SECRET`.

Production migrations already applied:
- `20260912121339 address_harvest_automation`
- `20260912121442 address_harvest_run_guard`
- `20260912123809 address_harvest_service_area_priority`

Required server-side env:
- `GETADDRESS_API_KEY` required for real harvesting;
- `GETADDRESS_ADMIN_KEY` optional for authoritative provider usage.

Never paste keys into chat/GitHub.

## Current production harvest state

- Automatic OFF.
- Service-area priority ON.
- Daily cap 20.
- No last run/success/error.
- Zero harvest runs.
- Zero queue rows.
- Zero `getaddress-daily-cache` rows.
- No paid provider lookup has been used by current implementation/testing.

## Immediate next action

1. Release the faster manual-discovery candidate safely.
2. Complete fresh Admin password sign-in + interactive Turnstile + MFA/AAL2.
3. Confirm key configured without exposing value.
4. Confirm Automatic OFF, priority ON, daily cap 20, Manual limit 1.
5. Run exactly one postcode.
6. Verify covered-area selection, saved addresses, raw snapshot, run counters, usage, JSON/CSV backups and full export.
7. If clean, deliberately use more remaining daily allowance if desired.
8. Only then enable Automatic.

Do not claim end-to-end provider success until the real one-postcode run passes.

## Auth/security

- Canonical Site URL/redirect allowlist hardened.
- Email + Google intentionally enabled.
- Cloudflare Turnstile/Supabase CAPTCHA live.
- Customer login + password-reset request smoke-tested.
- Privileged Turnstile repair live; fresh Admin password/CAPTCHA/MFA completion still pending interactive user action.
- Privileged browser/API/RLS access requires AAL2.
- Leaked Password Protection unavailable on current Supabase Free plan.

## Auth email branding

- Branded templates committed under `supabase/email-templates/`.
- Reset Password hosted template live/verified in Gmail.
- Sender address `accounts@namdar.co.uk`; display name changed to `Namdar`, awaiting fresh delivery casing verification.
- Remaining Auth templates need hosted apply/test.
- No `_dmarc` record yet; BIMI/DMARC pending sender audit.

## Other open issues / next work

- Recurring production `/api/booking-notifications` 504s observed; separate investigation required.
- Remaining Auth templates + Magic Link.
- DMARC/BIMI after sender audit.
- Same-iPhone overflow confirmation.
- Stripe, SMS, legal, cron/double-booking and customer-support launch checks.

## Handoff rule

Every substantial product/provider change updates `docs/AI_START.md`, `docs/AI_HANDOFF.md`, and this file together. Never store credentials, customer secrets, TOTP codes, SMTP/CAPTCHA/GetAddress keys or one-time Auth links.