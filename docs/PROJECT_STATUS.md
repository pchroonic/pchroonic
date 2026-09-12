# Namdar project status

Last updated: 2026-09-12 UTC

## Baseline

- Source: `pchroonic/pchroonic`, default branch `main`.
- Current verified **product behavior**: `945091c31cab6600916cd07854de3df4ac830d6a` from PR #30.
- PR #30 exact head `7a55bda84f8b3c6ad4292ec5c618531b19d3b75f` passed workflow `34707335676`.
- PR #30 preview `dpl_6g5G3cwed7VGyyvhrkTULrKSsw53` READY.
- PR #30 production deployment `dpl_8fZEaFkpCWnqigrguuArba94N6me` READY on `https://namdar.co.uk`, no alias error.
- Supabase: `namdar-production` (`qjigldxjcpnrlyxgmlqq`), Free.
- Resend domain verified; sending/receiving enabled.

Docs-only merges may have a newer SHA/deployment without changing product behavior. Use the product-behavior commit above for runtime continuity unless a later handoff names another product change.

## Main product areas

| Area | Status |
| --- | --- |
| Public website | Live; Windows/Edge overflow fixed, same-iPhone final confirmation pending |
| Customer portal | Email + Google auth, customer MFA option, Turnstile/Supabase CAPTCHA live |
| Auth email branding | Reset Password live/verified; remaining prepared templates pending hosted apply/test |
| Sender avatar / BIMI | Paused; no DMARC record added yet |
| Admin/Staff security | Mandatory privileged AAL2/MFA live; Turnstile integration live; full fresh password + CAPTCHA + MFA completion still pending |
| Email inbox | Spam controls + Inbox Security v2 live |
| Address system | Master/directory/OSM fallback live; GetAddress service-area-first growth live; controlled limit + faster manual discovery live; Automatic OFF |
| Support tickets | Customer-only; public inbound email stays in Admin Email inbox |

## GetAddress controlled one-postcode path — LIVE, READY FOR REAL TEST

Two safety/performance releases are now live:

### PR #28 — explicit manual lookup limit
- Admin Manual run postcode limit defaults to 1.
- Exact requested-count confirmation.
- Protected API validates independently.
- Missing manual limit defaults to 1 instead of daily cap.
- 20/day hard maximum, configured cap, local/provider usage and service priority stay authoritative.

### PR #30 — faster manual covered-postcode discovery
- Manual service-area queue target = requested count, clamped 1–20.
- Cron/automatic queue warming remains deep: minimum 80; a 20-lookup run targets 120.
- Verified covered postcodes seed first, so manual runs skip unnecessary Typeahead discovery once enough candidates exist.
- New regression suite `scripts/address-harvest-priority.test.mjs` runs in CI.
- Tests cover manual 1/5/20, invalid/hard-max normalization and cron 80/120 targets.

Why: previously a one-postcode manual run could try to prepare an 80-postcode queue first. Typeahead is non-billable, but up to 12 sequential discovery calls could add avoidable latency/rate-limit exposure.

Production has 2 verified postcodes classified in the active service area in aggregate (1 Lewisham, 1 Lambeth). Actual postcode values remain private.

PR #30 verification:
- exact head `7a55bda84f8b3c6ad4292ec5c618531b19d3b75f`;
- GitHub workflow `34707335676` success;
- preview `dpl_6g5G3cwed7VGyyvhrkTULrKSsw53` READY, no build errors;
- merge `945091c31cab6600916cd07854de3df4ac830d6a`;
- production `dpl_8fZEaFkpCWnqigrguuArba94N6me` READY, aliased to `namdar.co.uk`;
- post-deploy DB still Automatic OFF / priority ON / cap 20 / zero runs / zero queue / zero GetAddress cache rows;
- no paid lookup consumed.

No migration, env/secret, backup-format or paid-provider behavior change.

## GetAddress daily address growth architecture

Goal: use up to 20 daily GetAddress **postcode** lookups to grow reusable local address data while prioritising active service coverage and preserving private backups.

- Typeahead discovers postcode candidates and does not increase lookup usage.
- Postcode-only Autocomplete with `all=true` counts as one lookup and can return many addresses.
- Active `service_areas` are read dynamically.
- Current area: one administrative service area containing Lewisham, Southwark, Lambeth, Wandsworth and Greenwich.
- Administrative Typeahead uses provider district filters.
- Queue records priority score, coverage label, outcode and learned expected yield.
- Covered candidates first; fallback London/South-East then wider UK.
- Normalized results → `master_addresses` source `getaddress-daily-cache`.
- Raw provider snapshots → `address_harvest_snapshots`.
- Run status/counters → `address_harvest_runs`.
- Candidate/retry queue → `address_harvest_postcodes`.
- Settings/usage → `address_harvest_settings`.
- Successful backups → private Supabase Storage `address-harvest-backups` JSON + CSV.
- Admin shows automatic toggle, priority, daily cap, manual limit, configured-key state, usage, queue/counters, history and secure exports.
- Cron `/api/address-harvest-cron` runs daily at 03:30 UTC and is protected by `CRON_SECRET`.

Production migrations already applied:
- `20260912121339 address_harvest_automation`
- `20260912121442 address_harvest_run_guard`
- `20260912123809 address_harvest_service_area_priority`

Server env:
- `GETADDRESS_API_KEY` required for real harvest;
- `GETADDRESS_ADMIN_KEY` optional usage readback.

Never paste keys into chat/GitHub.

## Current production harvest state

- Automatic OFF.
- Service-area priority ON.
- Daily cap 20.
- No last run/success/error.
- Zero harvest runs.
- Zero queue rows.
- Zero `getaddress-daily-cache` rows.
- No paid provider lookup used by implementation/testing/deployment.

## Immediate next action

The engineering path is ready. The next step is interactive/runtime verification:

1. Fresh Admin password sign-in + Cloudflare Turnstile + MFA/AAL2.
2. Open Admin → Service Areas → Daily address database growth.
3. Confirm GetAddress key configured without exposing value.
4. Confirm Automatic OFF, priority ON, daily cap 20, Manual limit 1.
5. Run exactly one postcode.
6. Verify covered-area selection, normalized saved addresses, raw snapshot, run counters, provider/local usage, JSON/CSV backups and full export.
7. If clean, use more remaining daily allowance deliberately if desired.
8. Only then consider Automatic ON.

Do not claim end-to-end provider success until this real run passes.

## Auth/security

- Canonical Site URL/redirect allowlist hardened.
- Email + Google intentionally enabled.
- Cloudflare Turnstile/Supabase CAPTCHA live.
- Customer login + password-reset request smoke-tested.
- Privileged Turnstile repair live; fresh Admin password/CAPTCHA/MFA completion still requires interactive user action.
- Privileged browser/API/RLS access requires AAL2.
- Leaked Password Protection unavailable on current Supabase Free plan.

## Auth email branding

- Branded templates source-controlled under `supabase/email-templates/`.
- Reset Password hosted template live/verified in Gmail.
- Sender address `accounts@namdar.co.uk`; display name changed to `Namdar`, fresh casing check pending.
- Remaining Auth templates + Magic Link need hosted apply/test.
- No `_dmarc` record yet; BIMI/DMARC pending sender audit.

## Other open issues / next work

- Recurring production `/api/booking-notifications` 504s observed; investigate separately.
- Remaining Auth templates + Magic Link.
- DMARC/BIMI after sender audit.
- Same-iPhone overflow confirmation.
- Stripe, SMS, legal, cron/double-booking and controlled customer-support launch checks.

## Handoff rule

Every substantial product/provider change updates `docs/AI_START.md`, `docs/AI_HANDOFF.md`, and this file together. Never store credentials, customer secrets, TOTP codes, SMTP/CAPTCHA/GetAddress keys or one-time Auth links.