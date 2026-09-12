# Namdar AI handoff

Last verified: 2026-09-12 UTC

Read `docs/AI_START.md` first. This is the detailed technical continuity record. Never store secrets or private customer data here.

## Source of truth

- Product: Namdar UK property services platform.
- Repository: `pchroonic/pchroonic`, default `main`.
- Current verified **product behavior commit**: `945091c31cab6600916cd07854de3df4ac830d6a` from merged PR #30.
- PR #30 exact head: `7a55bda84f8b3c6ad4292ec5c618531b19d3b75f`.
- PR #30 GitHub workflow `34707335676` passed, including address-priority regression tests.
- Exact-head Vercel preview `dpl_6g5G3cwed7VGyyvhrkTULrKSsw53` was READY with a clean build.
- Product deployment `dpl_8fZEaFkpCWnqigrguuArba94N6me` is READY, aliased to `https://namdar.co.uk`, no alias error.
- Backend/Auth: Supabase `namdar-production` (`qjigldxjcpnrlyxgmlqq`), Free plan.
- Email: Resend, verified `namdar.co.uk`, sending + receiving enabled.

Docs-only merges may follow the product commit. Do not mistake a later docs-only SHA/deployment for a new behavior change.

## GetAddress manual discovery optimization — LIVE

PR #30 `Speed up controlled GetAddress manual discovery` is merged and deployed.

### Problem found

The priority layer previously used the same deep service-area queue target for manual and automatic runs:

`Math.max(80, requested * 6)`

So a one-postcode manual verification could try to prepare an 80-postcode covered queue before making the single paid lookup. Typeahead discovery itself does not increase lookup usage, but `seedServiceAreaQueue()` can make up to 12 sequential Typeahead calls with an 8-second timeout each. That is useful queue warming for automatic operation, but unnecessary latency/rate-limit exposure for a controlled one-postcode test.

### Live repair

`lib/address-harvest-priority.js` now exports and uses `queueTargetForRun(trigger, requested)`:
- manual run target = requested postcode count, clamped to 1–20;
- cron/automatic target = existing deep behavior, minimum 80 with 6× scaling;
- cron requested 20 still targets 120;
- verified covered postcodes are seeded before Typeahead discovery, so a manual run stops discovery as soon as enough covered pending candidates exist.

Production currently has 2 verified postcodes classified within the active service area in aggregate: one Lewisham and one Lambeth. Never copy actual postcode values into docs/chat.

Regression file: `scripts/address-harvest-priority.test.mjs`.
CI assertions include:
- manual 1 → 1;
- manual 5 → 5;
- manual 20 → 20;
- over-limit manual input → 20;
- zero/invalid manual input → 1;
- cron 1/10 → 80;
- cron 20 → 120.

`.github/workflows/ai-handoff-check.yml` now runs this test in addition to syntax checks.

No migration, secret, backup-format, paid Autocomplete behavior, service-area ordering, usage guard or automatic-enable change.

### PR #30 verification

- exact head `7a55bda84f8b3c6ad4292ec5c618531b19d3b75f`;
- workflow `34707335676` success;
- exact-head preview `dpl_6g5G3cwed7VGyyvhrkTULrKSsw53` READY; build errors filter empty;
- merge commit `945091c31cab6600916cd07854de3df4ac830d6a`;
- production `dpl_8fZEaFkpCWnqigrguuArba94N6me` READY on `namdar.co.uk`, no alias error;
- post-deploy production DB remained `enabled=false`, `prioritize_service_areas=true`, cap 20, null last run/success/error, zero run rows, zero queue rows and zero `getaddress-daily-cache` rows;
- therefore no paid provider lookup was consumed by this release.

## Controlled manual-run guard — LIVE

PR #28 previously fixed the paid-limit safety gap.

Live Admin/client behavior:
- separate **Manual run postcode limit** input;
- default 1;
- max follows configured daily cap, hard maximum 20;
- exact requested-count confirmation;
- request sends `{action:'run-now', limit}`.

Live server behavior:
- protected Admin API validates manual limit;
- invalid/below-1 values rejected;
- above-hard-max values clamped;
- omitted manual limit defaults to 1 rather than the configured daily cap;
- audit summary records the requested maximum.

The base worker still enforces configured cap, local UTC usage, optional provider remaining allowance and concurrency/stale-run guards.

PR #28 product deployment was `dpl_AnnQ2n26h5WDCs239zDcSwxy1GZf`; live static JS was fetched directly and confirmed to contain the limit=1 UI/logic. Unauthenticated `/api/admin-address-harvest` remains HTTP 401.

## Existing address architecture

- `api/address-search.js`: private `master_addresses` first, OpenStreetMap fallback when no local master addresses exist.
- `api/address-get.js`: resolves master/directory/profile saved addresses.
- `api/address-save.js`: captures customer corrections in secondary `address_directory`.
- `postcode_directory`: verified known postcode/location metadata used for coverage/seeding.
- `master_addresses`: reusable normalized address cache; unique `(source_dataset, source_record_id)` and RLS.
- Customer address flow works even without a live paid GetAddress request; GetAddress is an optional server-side cache-growth source.

## GetAddress harvesting architecture

Production migrations already applied:
- `20260912121339 address_harvest_automation`
- `20260912121442 address_harvest_run_guard`
- `20260912123809 address_harvest_service_area_priority`

Provider behavior rechecked on 2026-09-12:
- Typeahead queries are rate-limited but do not increase lookup usage.
- Postcode-only Autocomplete with `all=true` counts as one lookup and can return many address suggestions.
- `/v3/usage?api-key={admin-key}` remains the usage/daily-limit endpoint.

Priority/data flow:
- active `service_areas` are read dynamically; never replace this with a hard-coded borough list;
- current active area is administrative and contains Lewisham, Southwark, Lambeth, Wandsworth and Greenwich;
- administrative discovery uses GetAddress district filters;
- covered queue metadata includes priority score, coverage label, outcode and learned expected yield;
- duplicate Typeahead rows count only if a new queue row is inserted;
- covered candidates first, then London/South-East fallback, then wider UK;
- normalized addresses → `master_addresses` source `getaddress-daily-cache`;
- raw provider payload → `address_harvest_snapshots`;
- run status/counters → `address_harvest_runs`;
- candidate/retry state → `address_harvest_postcodes`;
- singleton settings/usage → `address_harvest_settings`;
- successful run backups → private Supabase Storage bucket `address-harvest-backups` as JSON + CSV.

API/admin:
- `/api/address-harvest-cron`: `CRON_SECRET` protected, Vercel daily 03:30 UTC;
- `/api/admin-address-harvest`: AAL2/settings-staff only;
- `/api/admin-address-harvest-export`: AAL2/settings-staff only;
- Admin Service Areas panel exposes automatic toggle, service-area priority, daily cap, manual-run limit, configured-key booleans, usage/remaining, queue/counters, recent runs and secure exports.

Safety:
- no provider request without `GETADDRESS_API_KEY`;
- automatic cron respects `enabled` and production remains OFF;
- manual run can operate while Automatic OFF;
- local UTC usage prevents exceeding configured daily cap;
- optional `GETADDRESS_ADMIN_KEY` adds authoritative provider remaining allowance;
- 429 stops work and leaves the current postcode pending;
- old transient errors retry after 24h up to 3 attempts;
- running-job uniqueness + stale release prevent overlap.

## Production harvest state — STILL CLEAN

Latest post-PR #30 check:
- Automatic OFF;
- priority ON;
- cap 20;
- no last run/success/error;
- zero runs;
- zero queued postcodes;
- zero GetAddress-cached addresses.

Implementation, testing and deployment have still used no paid GetAddress lookup.

## Real provider activation — NEXT AND STILL PENDING

Do not claim end-to-end provider success yet.

Next sequence:
1. Complete fresh Admin password sign-in with interactive Cloudflare Turnstile and mandatory MFA/AAL2.
2. Open Admin → Service Areas → Daily address database growth.
3. Confirm `GETADDRESS_API_KEY` reports configured without exposing its value.
4. Confirm Automatic OFF, service-area priority ON, daily cap 20, Manual limit 1.
5. Run exactly one postcode.
6. Verify covered-area selection, normalized `master_addresses` rows, raw snapshot, run counters, usage accounting, JSON/CSV private backups and full export.
7. If clean, deliberately use additional remaining daily allowance if desired.
8. Only then consider switching Automatic ON.

## Server-side secrets

- `GETADDRESS_API_KEY` — required for real provider run.
- `GETADDRESS_ADMIN_KEY` — optional authoritative usage readback.
- `CRON_SECRET` — protects scheduled endpoints.

Never expose values through config endpoints, browser code, logs, docs, exports or chat. Never ask the owner to paste them into chat.

## Auth/CAPTCHA current state

- canonical Site URL `https://namdar.co.uk`; redirect wildcard `https://namdar.co.uk/**`;
- Email + Google intentionally enabled;
- Cloudflare Turnstile/Supabase CAPTCHA live;
- customer login/password-reset request smoke tests passed;
- privileged Turnstile integration from PR #26 is live, but a complete fresh Admin password + CAPTCHA + MFA journey still requires interactive user completion;
- privileged browser/API/RLS access requires AAL2;
- Leaked Password Protection unavailable on current Supabase Free plan.

## Auth email branding

- source under `supabase/email-templates/`;
- Reset Password live/verified with subject `Reset your Namdar password`;
- SMTP address `accounts@namdar.co.uk`; display name changed to `Namdar`, fresh casing verification pending;
- remaining Auth templates/Magic Link still need hosted apply/test;
- no `_dmarc` record yet; BIMI/DMARC remains separate work.

## Other remaining work

- recurring production `/api/booking-notifications` 504s observed; investigate separately from GetAddress;
- remaining Auth templates + Magic Link;
- DMARC/BIMI after sender audit;
- same-iPhone overflow confirmation;
- Stripe, SMS, legal, cron/double-booking checks, inbound alias test and controlled customer-support journey.

## Non-negotiable rules

- Support tickets remain customer-only; public inbound email stays Admin Email inbox.
- Privileged access requires AAL2.
- No secrets in GitHub/docs/chat.
- Never use/reproduce the previously exposed GitHub PAT.
- Do not move production back to Netlify.
- Do not bypass live service-area priority.

## Required workflow

For substantial work use branch → PR → CI → preview/testing → merge → production verification. Update `docs/AI_START.md`, this file and `docs/PROJECT_STATUS.md` together. Never overclaim a provider/runtime path that has not actually been exercised.