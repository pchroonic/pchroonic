# Namdar project status

Last updated: 2026-09-12 UTC

## Baseline

- Source: `pchroonic/pchroonic`, default branch `main`.
- Current verified production code: `3ea8f45301fcdfe25e5610abefcb71757a22a0d8` from PR #28.
- Production: `https://namdar.co.uk` on Vercel project `namdar-website-starter-1`.
- Current production deployment: `dpl_AnnQ2n26h5WDCs239zDcSwxy1GZf`, READY with no alias error.
- Supabase: `namdar-production` (`qjigldxjcpnrlyxgmlqq`), Free plan.
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
| Address system | Master/directory/OSM fallback live; GetAddress service-area-first database growth live, Automatic OFF; controlled one-postcode manual-run guard live |
| Support tickets | Customer-only; public inbound email stays in Admin Email inbox |

## GetAddress controlled first-run guard — LIVE

PR #28 fixed the manual-run safety gap and is deployed to production.

Live behavior:
- Admin has a separate **Manual run postcode limit**, default `1`.
- The manual limit is capped by the configured daily limit/hard maximum.
- Admin confirmation states the requested number of postcode lookups.
- The protected API validates the limit and defaults a missing manual limit to `1`, rather than allowing the worker to fall back to the daily cap.
- Existing local/provider usage controls, concurrency protection and live service-area priority remain unchanged.
- No database migration or new environment variable was required.

Verification:
- PR exact head `f39df7c32c6e822015374c452e7afec1bb3c5ea7` passed GitHub workflow run `34706834723`.
- Exact-head Vercel preview `dpl_CH6BjU8pHxGxtdQrLsHWnU1yiF6T` was READY with a clean build.
- PR #28 merged as `3ea8f45301fcdfe25e5610abefcb71757a22a0d8`.
- Production `dpl_AnnQ2n26h5WDCs239zDcSwxy1GZf` is READY on `namdar.co.uk`.
- Live `admin-address-harvest.js` HTTP 200 and directly contains the `harvestRunLimit` default `1` control and safe-first-run logic.
- Unauthenticated `/api/admin-address-harvest` remains HTTP 401.
- Post-deploy DB check: Automatic OFF, service-area priority ON, daily cap 20, no last run/success/error, zero runs, zero queue rows and zero GetAddress-cached addresses.
- No paid GetAddress lookup was consumed by release verification.

## GetAddress daily address growth — LIVE CODE, NOT YET ACTIVATED

Goal: use up to 20 daily GetAddress **postcode** lookups to grow Namdar's reusable local address database while prioritising current service coverage and preserving private backups.

Architecture:
- Typeahead discovers postcode candidates before paid retrieval and does not increase lookup usage.
- Postcode-only Autocomplete with `all=true` counts as one lookup and can return many addresses.
- Active `service_areas` are first priority and are read dynamically at runtime.
- Current production coverage is one administrative service area containing Lewisham, Southwark, Lambeth, Wandsworth and Greenwich.
- District-filtered Typeahead builds a deep covered-postcode queue before paid work.
- Duplicate discoveries only count when a new queue row is genuinely inserted.
- Covered candidates come first; fallback remains London/South-East, then wider UK.
- Queue metadata stores coverage label, priority score, outward code and learned expected yield.
- Normalized addresses → `master_addresses` / `getaddress-daily-cache`.
- Raw snapshots → `address_harvest_snapshots`.
- Run audit/status → `address_harvest_runs`.
- Candidate queue → `address_harvest_postcodes`.
- Settings/usage state → `address_harvest_settings`.
- Successful run backup → private Supabase Storage `address-harvest-backups` as JSON + CSV.
- Admin panel exposes automatic toggle, service-area priority, daily cap, manual-run limit, key status, usage/remaining, queue/counters, run history and secure exports.
- Cron → `/api/address-harvest-cron` daily at 03:30 UTC, protected by `CRON_SECRET`.

Production migrations already applied:
- `20260912121339 address_harvest_automation`
- `20260912121442 address_harvest_run_guard`
- `20260912123809 address_harvest_service_area_priority`

Required server-side env:
- `GETADDRESS_API_KEY` required for a real harvest;
- `GETADDRESS_ADMIN_KEY` optional for authoritative provider usage readback.

Never paste these keys into chat or GitHub.

## Immediate next action

The one-postcode provider test is the next address milestone. Automatic must remain OFF until it passes.

1. Complete fresh Admin password sign-in + interactive Turnstile + MFA/AAL2.
2. Open Admin → Service Areas → Daily address database growth.
3. Confirm GetAddress key configured without revealing the value.
4. Confirm Automatic OFF, service-area priority ON, daily cap 20 and Manual run limit `1`.
5. Run exactly one postcode.
6. Verify covered-area selection, saved addresses, raw snapshot, run counters, provider/local usage, private JSON/CSV backups and full export.
7. If clean, deliberately use more of the remaining daily allowance if desired.
8. Only then consider enabling Automatic daily harvesting.

No end-to-end provider success should be claimed before this run is performed.

## Auth/security

- Site URL and redirect allowlist are pinned to canonical production.
- Email + Google intentionally enabled; unnecessary providers disabled.
- Supabase CAPTCHA enabled with Cloudflare Turnstile.
- Customer login + password-reset request passed post-CAPTCHA production smoke tests.
- Privileged Admin/Staff Turnstile repair is live; full fresh Admin password/CAPTCHA/MFA completion remains pending interactive user action.
- Privileged browser/API/RLS access requires AAL2.
- Supabase Leaked Password Protection remains unavailable/disabled on the current Free plan.

## Auth email branding

- Branded source templates are committed under `supabase/email-templates/`.
- Reset Password hosted template is live and verified in Gmail with subject `Reset your Namdar password`.
- SMTP sender remains `accounts@namdar.co.uk`; display name was changed to `Namdar`, awaiting fresh delivery verification.
- Remaining Auth templates still need hosted apply/test.
- Gmail avatar needs separate DMARC/BIMI work; no `_dmarc` record has been created.

## Other open issues / next work

- Investigate recurring production `/api/booking-notifications` Gateway Timeout/504 errors observed during the GetAddress continuation. This was not changed in PR #28.
- Apply/test remaining branded Auth templates and Magic Link.
- Resume DMARC/BIMI safely after sender audit.
- Same-iPhone overflow confirmation.
- Continue Stripe, SMS, legal, remaining cron/double-booking and customer-support launch checks.

## Handoff rule

Every substantial product/provider change updates `docs/AI_START.md`, `docs/AI_HANDOFF.md`, and this file together. Never store credentials, customer secrets, TOTP codes, SMTP/CAPTCHA/GetAddress keys or one-time Auth links.