# Namdar AI handoff

Last verified: 2026-09-12 UTC

Read `docs/AI_START.md` first. This is the detailed technical continuity record. Never store secrets or private customer data here.

## Source of truth

- Product: Namdar UK property services platform.
- Repository: `pchroonic/pchroonic`, default `main`.
- Current verified product code: `3ea8f45301fcdfe25e5610abefcb71757a22a0d8` from PR #28.
- Continuity-doc sync merged afterward as `d7c84edd0019d66650a4ecce7c02c6ce89ac5a01`; product behavior remained PR #28.
- Hosting: Vercel project `namdar-website-starter-1`, canonical `https://namdar.co.uk`.
- PR #28 product deployment: `dpl_AnnQ2n26h5WDCs239zDcSwxy1GZf`, READY.
- PR #29 docs-only deployment: `dpl_Hc2MYZ5BXBpbYFLTNDX96fNuWF3T`, READY; no product behavior change.
- Backend/Auth: Supabase `namdar-production` (`qjigldxjcpnrlyxgmlqq`), Free plan.
- Email: Resend, verified `namdar.co.uk`, sending + receiving enabled.

## Manual service-area discovery optimization — CANDIDATE

Branch: `perf/getaddress-fast-manual-discovery-20260912`.

### Finding

During the final pre-provider audit, `lib/address-harvest-priority.js` was found to use the same deep queue target for both manual and automatic runs:

- old target: `Math.max(80, requested * 6)` for every priority run;
- therefore a one-postcode manual test attempted to prepare an 80-postcode covered queue before the one paid lookup.

Typeahead discovery itself does not increase lookup usage, but the current implementation permits up to 12 sequential discovery calls with an 8-second timeout each. That behavior is useful for daily automatic harvesting but unnecessary for the controlled one-postcode verification and increases wall time/rate-limit exposure.

Production database aggregate checks also confirmed there are already 2 verified postcodes inside the active administrative service area: one classified to Lewisham and one to Lambeth. Actual postcode values must not be copied into docs/chat.

### Candidate repair

- Added pure `queueTargetForRun(trigger, requested)`.
- Manual target = the requested manual postcode count, clamped to 1–20.
- Cron/automatic target retains existing deep-queue behavior: minimum 80; with requested 20 the target remains 120 via the 6× multiplier.
- `runHarvest` now uses `queueTargetForRun(options.trigger, requested)` before `seedServiceAreaQueue`.
- Because `seedKnownCovered()` runs first, a one-postcode manual request can stop discovery immediately when at least one verified covered postcode already exists.
- No change to paid Autocomplete behavior, daily cap, usage guards, service-area ordering, retry logic, backup logic, database schema or secrets.

Regression test added: `scripts/address-harvest-priority.test.mjs`.
It covers:
- manual 1 → 1;
- manual 5 → 5;
- manual 20 → 20;
- manual values above 20 clamp to 20;
- manual 0/invalid normalize to 1;
- cron 1/10 → 80;
- cron 20 → 120.

GitHub CI workflow now runs this test after syntax-checking `lib/address-harvest-priority.js`.

Status: candidate only until branch → PR → CI → Vercel preview → merge → production verification is complete.

## GetAddress controlled first-run guard — LIVE

PR #28 `Make first GetAddress manual run explicitly controlled` is merged and deployed.

### Live behavior

`admin-address-harvest.js`:
- separate **Manual run postcode limit** input;
- defaults to `1`;
- UI max follows configured daily cap, hard-capped at 20;
- confirms exact requested count;
- sends explicit `limit`.

`api/admin-address-harvest.js`:
- independently validates manual `limit`;
- rejects invalid/below-1;
- clamps above `MAX_DAILY_LOOKUPS`;
- defaults omitted manual limit to `1`, not daily cap;
- audit log records requested maximum.

Base worker safeguards remain authoritative: configured cap, local UTC usage, optional provider remaining allowance, run-concurrency guard and service-area priority.

### PR #28 verification

- Exact head `f39df7c32c6e822015374c452e7afec1bb3c5ea7` passed workflow `34706834723`.
- Exact-head preview `dpl_CH6BjU8pHxGxtdQrLsHWnU1yiF6T` was READY with a clean build. Preview content itself was protected by Vercel SSO, so do not claim authenticated preview inspection.
- Merge: `3ea8f45301fcdfe25e5610abefcb71757a22a0d8`.
- Product deployment: `dpl_AnnQ2n26h5WDCs239zDcSwxy1GZf`, READY on `namdar.co.uk`, no alias error.
- Live `admin-address-harvest.js` was directly fetched HTTP 200 and contains default `harvestRunLimit=1`, safe-first-run guidance and explicit `{action:'run-now',limit}`.
- Live unauthenticated `/api/admin-address-harvest` returns 401.
- Post-deploy DB: Automatic OFF, priority ON, cap 20, zero runs, zero queue rows and zero `getaddress-daily-cache` rows.
- No paid provider lookup has been used by implementation/release verification.

## Existing address architecture

- `api/address-search.js`: `master_addresses` first, OpenStreetMap fallback when local master has no addresses.
- `api/address-get.js`: resolves saved master/directory/profile addresses.
- `api/address-save.js`: captures customer corrections into `address_directory`.
- `api/admin-address-master.js` + Admin Service Areas expose dataset status/postcode samples.
- `master_addresses` unique `(source_dataset, source_record_id)` + indexes + RLS.
- `postcode_directory` stores verified postcode/location metadata.
- Customer address flow still works without a live paid provider request; GetAddress is an optional server-side reusable-cache growth source.

## GetAddress harvesting architecture

Production migrations already applied:
- `20260912121339 address_harvest_automation`
- `20260912121442 address_harvest_run_guard`
- `20260912123809 address_harvest_service_area_priority`

Provider behavior rechecked 2026-09-12:
- Typeahead queries are rate limited but do not increase lookup usage.
- Postcode-only Autocomplete with `all=true` counts as one lookup and can return many addresses.
- `/v3/usage?api-key={admin-key}` remains the usage endpoint.

Priority/data flow:
- active `service_areas` read at runtime; do not hard-code boroughs;
- current area is one administrative service area containing Lewisham, Southwark, Lambeth, Wandsworth and Greenwich;
- administrative Typeahead uses provider district filters;
- queue metadata includes priority score, coverage label, outcode and learned expected yield;
- duplicate discovery only counts when a new queue row is inserted;
- covered candidates first, then London/South-East fallback, then wider UK;
- normalized results → `master_addresses` source `getaddress-daily-cache`;
- raw payloads → `address_harvest_snapshots`;
- run status/counters → `address_harvest_runs`;
- queue → `address_harvest_postcodes`;
- settings/usage → `address_harvest_settings`;
- successful runs → private Supabase Storage `address-harvest-backups` JSON + CSV.

API/admin:
- `/api/address-harvest-cron`: `CRON_SECRET` protected, Vercel cron 03:30 UTC.
- `/api/admin-address-harvest`: AAL2/settings staff only.
- `/api/admin-address-harvest-export`: AAL2/settings staff only.
- Admin panel shows automatic state, service-area priority, daily cap, manual limit, configured-key booleans, usage/remaining, queue/counters, recent runs and secure downloads.

Safety:
- no provider calls without `GETADDRESS_API_KEY`;
- Automatic cron respects `enabled`; production remains OFF;
- manual runs can operate while Automatic OFF;
- local UTC usage prevents configured cap overrun;
- optional `GETADDRESS_ADMIN_KEY` further constrains against provider remaining allowance;
- 429 stops work and returns postcode to pending;
- transient failures retry after 24h up to 3 attempts;
- partial unique running-job guard + stale release prevent overlap.

## Real provider activation — STILL PENDING

Do not claim end-to-end provider success yet.

Next sequence after the manual-discovery optimization is released:
1. Fresh Admin password login + interactive Turnstile + mandatory MFA/AAL2.
2. Open Admin → Service Areas → Daily address database growth.
3. Confirm key shows configured without exposing its value.
4. Confirm Automatic OFF, priority ON, daily cap 20, Manual limit `1`.
5. Run exactly one postcode.
6. Verify covered-area choice, normalized rows, raw snapshot, run counters, usage, JSON/CSV backup and full export.
7. Deliberately use additional remaining allowance only after the first run is clean.
8. Turn Automatic ON only after successful controlled verification.

## Server-side secrets

- `GETADDRESS_API_KEY` required for real provider run.
- `GETADDRESS_ADMIN_KEY` optional usage readback.
- `CRON_SECRET` protects scheduled endpoints.

Never expose secrets through config endpoints, HTML, logs, docs, exports or chat. Never ask the owner to paste them into chat.

## Auth/CAPTCHA

- canonical Site URL `https://namdar.co.uk`, redirect wildcard `https://namdar.co.uk/**`;
- Email + Google intentionally enabled;
- Supabase CAPTCHA uses Cloudflare Turnstile;
- customer login/password reset smoke tests passed;
- privileged Turnstile integration from PR #26 is live, but a complete fresh Admin password + CAPTCHA + MFA flow still requires interactive user completion;
- privileged browser/API/RLS access requires AAL2;
- Leaked Password Protection unavailable on current Free plan.

## Other remaining work

- Production runtime logs showed unrelated recurring `/api/booking-notifications` 504s; not mixed into GetAddress changes.
- Remaining Auth templates + Magic Link test.
- DMARC/BIMI after sender audit; no `_dmarc` record yet.
- Same-iPhone overflow confirmation.
- Stripe, SMS, legal, cron/double-booking checks, inbound alias test and controlled customer-support journey.

## Non-negotiable rules

- Support tickets remain customer-only; public inbound mail stays in Admin Email inbox.
- Privileged access requires AAL2.
- No secrets in GitHub/docs/chat.
- Never use/reproduce the previously exposed GitHub PAT.
- Do not move production back to Netlify.
- Do not bypass live service-area priority.

## Required workflow

For substantial work use branch → PR → CI → preview/testing → merge → production verification. Update `docs/AI_START.md`, this file and `docs/PROJECT_STATUS.md` together. Never overclaim a provider/runtime path that has not been exercised.