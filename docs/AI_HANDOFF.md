# Namdar AI handoff

Last verified: 2026-09-12 UTC

Read `docs/AI_START.md` first. This is the detailed technical continuity record. Never store secrets or private customer data here.

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

## Source of truth

- Product: Namdar UK property services platform.
- Repository: `pchroonic/pchroonic`, default `main`.
- Current production code: `35e81842c0104587423397c41414d4610c20053e` from merged PR #24.
- Hosting: Vercel project `namdar-website-starter-1`, canonical `https://namdar.co.uk`.
- Production deployment for GetAddress release: `dpl_8Ne2Vxse5RWyK2h1JvvZia9upc2m`, READY with no alias error.
- Backend/Auth: Supabase `namdar-production` (`qjigldxjcpnrlyxgmlqq`), Free plan.
- Email: Resend, verified `namdar.co.uk`, sending + receiving enabled, eu-west-1.
- Release heading remains v6.4.16.

## Non-negotiable product/security rules

- Customer support tickets are private to signed-in customers with an eligible Namdar relationship. Public inbound email remains Admin Email inbox.
- Privileged Admin/Staff access requires MFA/AAL2 in browser, API and RLS. Migration `20260911230055 require_aal2_for_staff_permissions` is live.
- Google sign-in is intentional and must not be disabled without migration/recovery.
- No provider/API secrets in GitHub, docs or chat.
- Never use or reproduce the previously exposed GitHub PAT.

## Auth/CAPTCHA current state

- Site URL `https://namdar.co.uk`; only redirect wildcard `https://namdar.co.uk/**` remains.
- Email + Google enabled; unnecessary providers disabled.
- Hosted Supabase CAPTCHA is ON with Cloudflare Turnstile.
- Customer login and password-reset request passed production smoke tests after CAPTCHA rollout.
- Magic Link and other non-destructive Auth smoke tests remain pending.
- Supabase Leaked Password Protection remains unavailable/disabled on current Free plan.

## Branded Auth email state

Source templates live under `supabase/email-templates/`.

Current hosted state:
- Reset Password is live and verified in Gmail as branded Namdar email with subject `Reset your Namdar password`.
- Owner changed SMTP display name from `namdar` to `Namdar`; sender address remains `accounts@namdar.co.uk`. Fresh delivery still needs to independently verify display-name casing.
- Other prepared templates are not yet confirmed live.
- Gmail raw message previously showed DKIM pass for `@namdar.co.uk` and SPF pass for `send.namdar.co.uk`.
- Sender avatar is separate BIMI/DMARC work. No `_dmarc` record has been added; do not introduce enforcement until sender audit is complete.

## Existing Namdar address architecture

- `api/address-search.js` searches `master_addresses` first, then OpenStreetMap fallback when local master has no addresses.
- `api/address-get.js` resolves saved master/directory/profile addresses.
- `api/address-save.js` captures customer-profile corrections into secondary `address_directory`.
- `api/admin-address-master.js` and Admin Service Areas expose dataset status and postcode samples.
- `master_addresses` has unique `(source_dataset, source_record_id)` plus postcode/dataset indexes and RLS.
- `address_dataset_registry` tracks data sources.
- `postcode_directory` stores verified known postcode metadata used by coverage and seeding.

## GetAddress daily harvest — LIVE CODE, AUTOMATION OFF

PR #24 `Add automatic GetAddress address harvesting` merged into `main` as `35e81842c0104587423397c41414d4610c20053e` and deployed to production as `dpl_8Ne2Vxse5RWyK2h1JvvZia9upc2m`.

### Provider strategy

The implementation is designed around GetAddress behavior established during implementation:
- Typeahead postcode search is used for candidate discovery before paid address retrieval.
- Postcode-only Autocomplete with `all=true` is used for the paid lookup so a single postcode lookup can return/save many suggestions.
- Returned addresses are cached in Namdar for reuse.

The goal is therefore up to 20 **postcode lookups** per UTC day, not merely 20 individual addresses.

### Service-area-first priority

The user explicitly requested maximum useful value from the allowance and that Namdar cover current service areas first.

Implementation:
- `lib/address-harvest-priority.js` is the priority layer used by both manual and cron harvesting.
- It reads active `service_areas` at runtime. Do not replace this with a fixed borough list.
- Current production coverage is one administrative service area containing Lewisham, Southwark, Lambeth, Wandsworth and Greenwich.
- For administrative coverage, Typeahead postcode discovery uses provider district filters to find full postcode candidates inside selected councils/boroughs.
- For future coverage modes, verified `postcode_directory` rows can be evaluated against include/exclude rules, administrative codes/names, polygon geometry or radius.
- Covered candidates are given queue precedence before generic fallback candidates.
- Queue metadata records `priority_score`, `coverage_label`, `outcode` and `expected_yield`.
- Yield learning uses prior harvested `address_count` by outward code so historically higher-yield covered outcodes can be chosen earlier among equal-priority candidates.
- Queue discovery aims to remain several times deeper than the daily paid cap (20/day) so the full daily allowance is not blocked by a thin candidate list.
- Duplicate Typeahead results count only when they genuinely insert new queue rows; this was explicitly fixed before merge so duplicates cannot falsely satisfy the covered-queue target.
- If service-area candidates are unavailable, fallback order continues with London/surrounding areas before wider UK discovery.
- Admin setting `prioritize_service_areas` defaults ON and can be switched off independently. Overall automatic harvest `enabled` defaults OFF.
- Admin shows covered-area queue depth, covered postcodes harvested and covered addresses saved.
- Run history records `service_area_postcodes_harvested` and `service_area_addresses_collected`.

### Server-side secrets

- `GETADDRESS_API_KEY` — required for real harvesting.
- `GETADDRESS_ADMIN_KEY` — optional; used for authoritative provider usage/daily-limit readback when available.
- Existing `CRON_SECRET` protects the scheduled endpoint.
- Keys are server-side only. Never expose them through `/api/config`, Admin HTML, logs, exports or docs, and never ask the owner to paste them into chat.

### Database/storage

Applied production migrations:
- `20260912121339 address_harvest_automation`
- `20260912121442 address_harvest_run_guard`
- `20260912123809 address_harvest_service_area_priority`

Created/extended:
- `address_harvest_settings`: singleton automatic ON/OFF, cap 1–20, generic seed cursor, service seed cursor, service-area priority toggle, provider usage snapshots and last run/success/error.
- `address_harvest_runs`: operational run history/status/counters, covered-area counters and backup paths.
- `address_harvest_postcodes`: candidate queue/retry state plus priority score, coverage label, outward code and learned expected yield.
- `address_harvest_snapshots`: raw provider JSON per run/postcode.
- private Storage bucket `address-harvest-backups` accepting JSON/CSV.
- dataset registry row `getaddress-daily-cache`.
- partial unique running-job guard prevents concurrent harvest runs; stale >30-minute runs are released by code before a new run.
- priority queue index supports service-area/yield metadata.

All harvest operational tables have RLS enabled, no anon/authenticated privileges, and service-role-only access. The backup bucket is private. Supabase advisor `RLS enabled, no policy` INFO findings for these tables are intentional because they are server-only.

### Base worker behavior

`lib/address-harvest.js`:
- Never makes provider calls without server API key.
- Automatic cron respects `enabled`; manual Run once can operate while automatic is OFF after key setup.
- Local UTC-day usage accounting prevents exceeding configured cap even without admin usage key.
- If admin usage key exists, provider remaining allowance also constrains work.
- Seeds known postcode candidates and generic rotating fallback discovery.
- Each selected postcode is retrieved once with Autocomplete `all=true` and a structured template.
- Suggestions normalize into existing `master_addresses`, source `getaddress-daily-cache`; provider suggestion ID is source record ID when available.
- Raw response is preserved in snapshots.
- Successful work creates JSON raw backup + normalized CSV in private Storage.
- Provider 429 stops remaining work and leaves current postcode pending rather than retrying blindly.
- Old transient errors can retry after 24h up to 3 attempts.

`lib/address-harvest-priority.js` runs first when service-area priority is ON:
- uses Typeahead search + live service-area filters to prefill covered candidates before paid retrieval;
- follows live service coverage rather than a fixed list;
- keeps the useful covered queue genuinely full by counting only actual new inserts;
- records priority/yield metadata;
- annotates completed run metrics for covered-area postcodes/addresses;
- falls back safely to base worker if service priority is disabled, automatic mode is disabled, or GetAddress key is absent.

### API/admin surface

- `api/address-harvest-cron.js`: `CRON_SECRET`-protected scheduled GET; uses priority worker.
- `api/admin-address-harvest.js`: AAL2/settings staff only; status, automatic toggle, service-area priority toggle, cap and manual run.
- `api/admin-address-harvest-export.js`: AAL2/settings staff only; full current dataset CSV/JSON or private per-run backup download.
- `admin-address-harvest.js`: management panel injected into Service Areas beside master-address tools. Shows automatic state, priority state, cap, key configured booleans, usage/remaining, cached rows, covered queue/counters, last run/error, recent runs, Run once, and secure downloads.
- `admin.js` loader includes the extension instead of modifying large `admin-original.js`.
- CI syntax checks include all harvest JS including `lib/address-harvest-priority.js`.
- `vercel.json` schedules `/api/address-harvest-cron` at `30 3 * * *` UTC.

### Production verification after merge

Verified on 2026-09-12:
- PR #24 exact final feature head `80b89b2fab0f263ee54ebe985481e30d568bfa81` passed GitHub workflow run `34694744806`.
- Exact-head Vercel preview `dpl_42PaXBY5HGAdF4GdLjAoTbWH13FP` was READY and build log showed no error.
- Merge commit `35e81842c0104587423397c41414d4610c20053e` deployed as production `dpl_8Ne2Vxse5RWyK2h1JvvZia9upc2m`, READY and aliased to `namdar.co.uk` with no alias error.
- Production `admin-address-harvest.js` HTTP 200.
- Production unauthenticated `/api/address-harvest-cron` HTTP 401 `Unauthorized`.
- Production unauthenticated `/api/admin-address-harvest` HTTP 401 `Please sign in as Namdar staff.`
- DB settings after deploy: `enabled=false`, `prioritize_service_areas=true`, `daily_lookup_cap=20`, no last run/success/error.
- `address_harvest_runs` count = 0 and candidate queue count = 0 immediately after deploy.
- Therefore deployment/testing consumed no GetAddress paid lookup.
- Supabase security/performance advisors showed no new critical harvest issue. New priority index is reported unused because harvesting has intentionally not run yet.

A real provider-key controlled manual run remains required before claiming end-to-end GetAddress behavior, actual provider yield, or backup runtime success.

### Safe activation sequence

1. Owner adds `GETADDRESS_API_KEY` directly in Vercel Production Environment Variables. Optional `GETADDRESS_ADMIN_KEY` may also be added. Never paste keys into chat.
2. Redeploy if Vercel requires it for environment changes.
3. Open Admin → Service areas → Daily address database growth. Confirm key configured, Automatic OFF, Service-area priority ON and active coverage shown.
4. Run once manually while Automatic remains OFF.
5. Verify covered-area queue/counters, provider usage, master address sample, run metrics, private JSON/CSV backups and full export.
6. Only after successful controlled test switch Automatic daily harvest ON.

## Other recent production migrations

- `20260911213820 inbox_spam_controls`
- `20260911213842 inbox_spam_blocklist_fk_index`
- `20260911220343 inbox_security_indexes`
- `20260911220415 harden_invoice_number_function_search_path`
- `20260911230055 require_aal2_for_staff_permissions`
- `20260912121339 address_harvest_automation`
- `20260912121442 address_harvest_run_guard`
- `20260912123809 address_harvest_service_area_priority`

## Remaining launch work

- Configure GetAddress key(s) directly in Vercel, perform one controlled manual run, then enable daily mode only with owner approval.
- Apply/test remaining branded Auth templates and Magic Link flow.
- Resume DMARC/BIMI sender-avatar work; no `_dmarc` record has been added.
- Same-iPhone overflow confirmation.
- Stripe, SMS, remaining email/legal readiness, cron/double-booking regression checks, inbound alias test and controlled customer-support journey.

## Required workflow

For substantial work use branch → PR → CI → preview/testing → merge → production verification. Update `docs/AI_START.md`, this file and `docs/PROJECT_STATUS.md`. Never overclaim a provider/runtime path that has not been exercised.
