# Namdar AI handoff

Last verified: 2026-09-12 UTC

Read `docs/AI_START.md` first. This is the detailed technical continuity record. Never store secrets or private customer data here.

## Source of truth

- Product: Namdar UK property services platform.
- Repository: `pchroonic/pchroonic`, default `main`.
- Current verified production code: `3ea8f45301fcdfe25e5610abefcb71757a22a0d8` from merged PR #28.
- Hosting: Vercel project `namdar-website-starter-1`, canonical `https://namdar.co.uk`.
- Current production deployment: `dpl_AnnQ2n26h5WDCs239zDcSwxy1GZf`, READY, no alias error.
- PR #28 exact-head preview: `dpl_CH6BjU8pHxGxtdQrLsHWnU1yiF6T`, READY; GitHub workflow run `34706834723` completed successfully.
- Backend/Auth: Supabase `namdar-production` (`qjigldxjcpnrlyxgmlqq`), Free plan.
- Email: Resend, verified `namdar.co.uk`, sending + receiving enabled.
- Release heading remains v6.4.16.

## GetAddress controlled first-run guard — LIVE

PR #28 `Make first GetAddress manual run explicitly controlled` is merged and deployed.

### Why it was needed

Before PR #28, the Admin `Run once now` client posted only `{action:'run-now'}`. The protected API passed `body.limit || null`, and a missing manual limit could therefore fall back to the configured daily cap in the worker. The intended first real provider verification was supposed to be controlled, so a single Admin click could have been broader than intended.

### Live repair

`admin-address-harvest.js` now:
- adds a separate **Manual run postcode limit** input;
- defaults the manual limit to `1`;
- sets its max from the configured daily cap, hard-capped at 20;
- explains the safe first-run sequence in Admin;
- confirms the exact requested postcode count before running;
- sends the explicit `limit` in the protected request.

`api/admin-address-harvest.js` now:
- independently parses and validates the manual limit;
- rejects values below 1/non-numeric values;
- clamps above the hard `MAX_DAILY_LOOKUPS`;
- defaults an omitted manual `limit` to `1`, not the daily cap;
- records the requested maximum in the audit summary.

The base worker's configured daily cap, local UTC-day usage accounting, optional provider usage remaining, stale/concurrent-run guard and service-area priority remain authoritative. No database migration or new environment variable was required.

### Verification completed

- Exact PR head `f39df7c32c6e822015374c452e7afec1bb3c5ea7` passed GitHub workflow run `34706834723`.
- Exact-head Vercel preview `dpl_CH6BjU8pHxGxtdQrLsHWnU1yiF6T` was READY and its build had no errors. Direct preview content inspection was limited by Vercel preview SSO; do not claim an authenticated preview session was completed.
- PR #28 merged as `3ea8f45301fcdfe25e5610abefcb71757a22a0d8`.
- Production deployment `dpl_AnnQ2n26h5WDCs239zDcSwxy1GZf` completed successfully, is READY and is aliased to `namdar.co.uk` with no alias error.
- Live `https://namdar.co.uk/admin-address-harvest.js` returned HTTP 200 and was directly inspected; it contains `harvestRunLimit`, default `1`, safe-first-run copy, client validation and `{action:'run-now',limit}`.
- Live unauthenticated `/api/admin-address-harvest` still returns HTTP 401 `Please sign in as Namdar staff.`.
- Post-deploy Supabase recheck: `enabled=false`, `prioritize_service_areas=true`, `daily_lookup_cap=20`, `last_run_at=null`, `last_success_at=null`, no error, zero harvest runs, zero queue rows and zero `getaddress-daily-cache` rows.
- Therefore PR #28 deployment/testing itself consumed no paid GetAddress lookup.

## Existing Namdar address architecture

- `api/address-search.js` searches `master_addresses` first, then the OpenStreetMap fallback when local master data has no addresses.
- `api/address-get.js` resolves saved master/directory/profile addresses.
- `api/address-save.js` captures customer corrections into secondary `address_directory`.
- `api/admin-address-master.js` and Admin Service Areas expose dataset status/postcode samples.
- `master_addresses` has unique `(source_dataset, source_record_id)` plus postcode/dataset indexes and RLS.
- `address_dataset_registry` tracks data sources.
- `postcode_directory` stores verified postcode metadata used for coverage and seeding.
- The customer address flow still works without a live paid provider request; GetAddress is an optional server-side cache-growth source.

## GetAddress daily harvesting architecture

PR #24 originally added the automatic database-growth worker. Production migrations already applied:
- `20260912121339 address_harvest_automation`
- `20260912121442 address_harvest_run_guard`
- `20260912123809 address_harvest_service_area_priority`

### Provider contract / strategy

Current GetAddress documentation was rechecked on 2026-09-12:
- Typeahead postcode discovery is non-billable with respect to lookup usage.
- Postcode-only Autocomplete with `all=true` counts as one lookup and can return many address suggestions.
- `GET /v3/usage?api-key={admin-key}` remains the usage/daily-limit endpoint.

Implementation:
- Typeahead discovers postcode candidates first.
- `lib/address-harvest-priority.js` reads live active `service_areas`; never replace this with a hard-coded borough list.
- Current production coverage is one administrative service area containing Lewisham, Southwark, Lambeth, Wandsworth and Greenwich.
- Administrative discovery uses provider district filters; verified postcode metadata can also support include/exclude, administrative, polygon or radius coverage modes.
- Queue metadata stores `priority_score`, `coverage_label`, `outcode` and learned `expected_yield`.
- Prior harvested address counts teach which outward codes yield more addresses among otherwise equal-priority candidates.
- Duplicate Typeahead discoveries only count when a genuinely new queue row is inserted.
- Covered service-area candidates come first, then nearby/London & South-East fallback, then wider UK.
- Normalized addresses are stored in `master_addresses` as source `getaddress-daily-cache`.
- Raw provider payloads go to `address_harvest_snapshots`; run status/counters go to `address_harvest_runs`.
- Successful runs produce raw JSON + normalized CSV in private Supabase Storage bucket `address-harvest-backups`.
- `address_harvest_settings` controls automatic ON/OFF, daily cap, service priority, seed cursors, usage snapshots and last status.
- `address_harvest_postcodes` is the candidate/retry queue.
- All harvest operational tables are server-only with RLS and no browser policies; backup bucket is private.

### API/admin surface

- `/api/address-harvest-cron`: protected by existing `CRON_SECRET`, scheduled daily at `03:30 UTC` in `vercel.json`.
- `/api/admin-address-harvest`: AAL2/settings-staff only; status/settings/manual run.
- `/api/admin-address-harvest-export`: AAL2/settings-staff only; full current dataset or private run backup downloads.
- Admin Service Areas panel shows automatic state, service-area priority, daily cap, manual-run limit, key-configured booleans, usage/remaining, cached rows, queue/counters, recent runs and downloads.

### Safety behavior

- Server never makes a provider request without `GETADDRESS_API_KEY`.
- Automatic cron respects `enabled`; production remains `enabled=false`.
- Manual run can operate while Automatic is OFF but is now explicitly limited.
- Local UTC usage prevents crossing the configured daily cap even when the optional admin usage key is unavailable.
- When `GETADDRESS_ADMIN_KEY` is configured, provider remaining allowance additionally constrains work.
- Provider 429 stops remaining work and leaves the current postcode pending rather than blindly retrying.
- Old transient errors can retry after 24 hours up to 3 attempts.
- Running-job uniqueness + stale-run release prevent overlapping/stuck harvests.

## Server-side secrets

- `GETADDRESS_API_KEY` — required for a real provider run.
- `GETADDRESS_ADMIN_KEY` — optional, for authoritative provider usage/daily-limit readback.
- `CRON_SECRET` — protects scheduled endpoints.

Never expose any secret through `/api/config`, HTML, logs, docs, exports or chat. Never ask the owner to paste these values into chat.

## Real provider activation — STILL PENDING

Do not claim GetAddress end-to-end runtime success yet. No provider lookup has been exercised by this continuation.

Safe next sequence:
1. Complete a fresh Admin password login with interactive Turnstile and mandatory MFA/AAL2.
2. Open Admin → Service Areas → Daily address database growth.
3. Confirm key status says configured; do not expose the value.
4. Confirm Automatic OFF, Service-area priority ON, daily cap 20 and Manual run postcode limit `1`.
5. Run exactly one postcode.
6. Verify: selected postcode is from covered-area priority, address suggestions normalize correctly into `master_addresses`, raw snapshot exists, run counters are correct, usage increments as expected, JSON + CSV private backups exist, and full export works.
7. If the one-postcode run succeeds, additional remaining daily allowance may be used deliberately.
8. Only after successful controlled verification should Automatic daily harvesting be turned ON.

## Auth/CAPTCHA current state

- Site URL `https://namdar.co.uk`; redirect wildcard `https://namdar.co.uk/**`.
- Email + Google intentionally enabled; do not disable Google without migration/recovery.
- Hosted Supabase CAPTCHA uses Cloudflare Turnstile.
- Customer login and password-reset request previously passed production smoke tests.
- Privileged Admin/Staff CAPTCHA integration from PR #26 is live and visibly renders, but a complete fresh password + CAPTCHA + MFA flow still needs interactive user completion.
- Privileged API/browser/RLS access requires AAL2; migration `20260911230055 require_aal2_for_staff_permissions` is live.
- Supabase Leaked Password Protection is unavailable/disabled on the current Free plan.

## Branded Auth email state

- Source templates live under `supabase/email-templates/`.
- Reset Password is live and verified in Gmail as a branded Namdar message with subject `Reset your Namdar password`.
- SMTP sender address remains `accounts@namdar.co.uk`; display name was changed to `Namdar`, awaiting independent fresh-delivery casing verification.
- Other prepared templates are not yet confirmed live.
- Gmail avatar/BIMI work is separate; no `_dmarc` DNS record has been added yet.

## Other observations / remaining work

- Production runtime logs during this continuation showed an unrelated recurring `/api/booking-notifications` Gateway Timeout/504 issue. It was intentionally not mixed into PR #28 and should be investigated separately.
- Apply/test remaining Auth templates and Magic Link.
- Resume DMARC/BIMI after sender audit.
- Same-iPhone overflow confirmation.
- Stripe, SMS, remaining email/legal readiness, cron/double-booking regression checks, inbound alias test and controlled customer-support journey remain open.

## Non-negotiable rules

- Customer support tickets are private to signed-in eligible customers; public inbound email remains Admin Email inbox.
- Privileged Admin/Staff access requires AAL2 in browser, API and RLS.
- No provider/API secrets in GitHub, docs or chat.
- Never use or reproduce the previously exposed GitHub PAT.
- Do not move production back to Netlify.
- Do not bypass live service-area priority logic.

## Required workflow

For substantial work use branch → PR → CI → preview/testing → merge → production verification. Update `docs/AI_START.md`, this file and `docs/PROJECT_STATUS.md` together. Never overclaim a provider/runtime path that has not actually been exercised.