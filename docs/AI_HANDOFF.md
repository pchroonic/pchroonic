# Namdar AI handoff

Last verified: 2026-09-12 UTC

Read `docs/AI_START.md` first. This is the detailed technical continuity record. Never store secrets or private customer data here.

## Source of truth

- Product: Namdar UK property services platform.
- Repository: `pchroonic/pchroonic`, default `main`.
- Main before current GetAddress branch: `bd2b9e56d5f50a7eac2d19c3e98cb8976374449e`.
- Hosting: Vercel project `namdar-website-starter-1`, canonical `https://namdar.co.uk`.
- Backend/Auth: Supabase `namdar-production` (`qjigldxjcpnrlyxgmlqq`), Free plan.
- Email: Resend, verified `namdar.co.uk`, sending + receiving enabled, eu-west-1.
- Release heading remains v6.4.16.

## Non-negotiable product/security rules

- Customer support tickets are private to signed-in customers with an eligible Namdar relationship. Public inbound email remains Admin Email inbox.
- Privileged Admin/Staff access requires MFA/AAL2 in browser, API and RLS. Migration `20260911230055 require_aal2_for_staff_permissions` is live.
- Google sign-in is intentional and must not be disabled without migration/recovery.
- No provider/API secrets in GitHub, docs or chat.

## Auth/CAPTCHA current state

- Site URL `https://namdar.co.uk`; only redirect wildcard `https://namdar.co.uk/**` remains.
- Email + Google enabled; phone, anonymous sign-in, manual linking and other shown providers disabled.
- Hosted Supabase CAPTCHA is ON with Cloudflare Turnstile.
- PR #19 readiness code supplies CAPTCHA tokens to password login, Magic Link, Google ID token, signup, password reset and confirmation resend.
- Production smoke tests passed: fresh/private customer login; password-reset request/delivery.
- Magic Link and other non-destructive Auth smoke tests remain pending.

## Branded Auth email state

Source templates under `supabase/email-templates/` merged in `bd2b9e56d5f50a7eac2d19c3e98cb8976374449e`.

Current hosted state:
- Reset Password subject/HTML manually saved in Supabase and later verified in Gmail as branded Namdar email with subject `Reset your Namdar password`.
- Initial immediate test after saving still used old template because hosted Auth configuration had not propagated; a later test confirmed new content.
- Owner changed SMTP display name from `namdar` to `Namdar`; sender address stays `accounts@namdar.co.uk`. No post-change message has yet verified casing.
- Other five prepared templates are not yet confirmed live.
- Gmail raw message before sender-name change showed DKIM pass for `@namdar.co.uk` and SPF pass for `send.namdar.co.uk`.
- Sender avatar is not controlled by HTML. BIMI/DMARC work is paused; Cloudflare currently has no `_dmarc` record. Do not add enforcement until sender audit is complete.

## Existing Namdar address architecture

- `api/address-search.js` searches `master_addresses` first, then OpenStreetMap fallback when local master has no result.
- `api/address-get.js` resolves a saved master/directory/profile address.
- `api/address-save.js` captures customer-profile corrections into secondary `address_directory`.
- `api/admin-address-master.js` and Admin Service Areas expose dataset status and postcode samples.
- `master_addresses` has unique `(source_dataset, source_record_id)` plus postcode/dataset indexes and RLS.
- `address_dataset_registry` tracks data sources.
- `postcode_directory` provides verified known postcode seeds.

Before this feature production contained only a handful of address records, so daily accumulation materially improves local coverage.

## GetAddress daily harvest — FEATURE IMPLEMENTATION

Feature branch: `feature/getaddress-daily-harvest-20260912`.

### Provider strategy

Official GetAddress behavior used by the design:
- Typeahead postcode queries are rate-limited but do not increase lookup usage.
- Autocomplete query containing only a postcode with `all=true` counts as one lookup and returns all suggestions for that postcode.
- GetAddress says returned address data may be cached/saved.

Therefore one daily credit can save many addresses. Namdar targets up to 20 **postcodes** per day, not merely 20 individual addresses.

### Server-side secrets

- `GETADDRESS_API_KEY` — required for harvesting.
- `GETADDRESS_ADMIN_KEY` — optional; used only for provider `/v3/usage` authoritative usage/daily-limit readback.
- Existing `CRON_SECRET` protects the scheduled endpoint.
- Keys are server-side only. Never expose them through `/api/config`, Admin HTML, logs, exports or docs.

### Database/storage

Applied production migrations:
- `20260912121339 address_harvest_automation`
- `20260912121442 address_harvest_run_guard`

Created:
- `address_harvest_settings`: singleton ON/OFF, cap 1–20, postcode seed cursor, provider usage snapshots, last run/success/error.
- `address_harvest_runs`: operational run history/status/counters and backup paths.
- `address_harvest_postcodes`: candidate queue and retry state.
- `address_harvest_snapshots`: raw provider JSON per run/postcode.
- private Storage bucket `address-harvest-backups` accepting JSON/CSV.
- dataset registry row `getaddress-daily-cache`.
- partial unique index allows only one `running` harvest per UTC day; code releases stale >30-minute runs before starting another.

All new public-schema operational tables have RLS enabled, no anon/authenticated privileges, and service-role access only. Backup bucket is private.

### Worker behavior

`lib/address-harvest.js`:
- Never runs without server API key.
- Automatic cron respects `enabled`; manual Run once can operate while automatic is OFF.
- Local UTC-day usage is always counted so Namdar cannot exceed its configured daily cap even without admin usage key.
- If admin usage key exists, provider remaining allowance also constrains the run.
- Seeds verified `postcode_directory` first, then rotating UK postcode-area/district Typeahead terms, prioritising London/surrounding areas.
- Each selected postcode is looked up once with Autocomplete `all=true` and a structured template.
- Suggestions normalize into existing `master_addresses`, source `getaddress-daily-cache`; suggestion ID is source record ID.
- Raw response is preserved in snapshots.
- Successful run creates JSON raw backup + normalized CSV in private Storage.
- Provider 429 stops remaining work and leaves current postcode pending rather than spending blindly.
- Old transient errors can retry after 24h up to 3 attempts.

### API/admin surface

- `api/address-harvest-cron.js`: CRON_SECRET-protected scheduled GET.
- `api/admin-address-harvest.js`: AAL2/settings staff only; status, toggle/cap settings and manual run.
- `api/admin-address-harvest-export.js`: AAL2/settings staff only; full current dataset CSV/JSON or private per-run backup download.
- `admin-address-harvest.js`: dynamically injects management panel into existing Service Areas beside master-address tools. Shows ON/OFF, cap, key configured booleans, usage/remaining, total cached rows, last run/error, recent runs, Run once, and secure downloads.
- `admin.js` loader adds the extension rather than modifying large `admin-original.js`.
- CI syntax checks include all new JS.
- `vercel.json` schedules `/api/address-harvest-cron` at `30 3 * * *` UTC.

### Safe enablement sequence

1. Merge/deploy with automation OFF.
2. Owner adds `GETADDRESS_API_KEY` directly in Vercel Production env. Optional `GETADDRESS_ADMIN_KEY` may also be added; never paste keys into chat.
3. Redeploy if Vercel requires it for env changes.
4. Open Admin → Service areas → Daily address database growth. Confirm key status configured and Automatic OFF.
5. Run once manually. Verify run counters, master sample, CSV/JSON private backups and full export.
6. Check GetAddress provider usage independently if desired.
7. Only after successful test switch Automatic daily harvest ON.

## Other recent production migrations

- `20260911213820 inbox_spam_controls`
- `20260911213842 inbox_spam_blocklist_fk_index`
- `20260911220343 inbox_security_indexes`
- `20260911220415 harden_invoice_number_function_search_path`
- `20260911230055 require_aal2_for_staff_permissions`
- `20260912121339 address_harvest_automation`
- `20260912121442 address_harvest_run_guard`

## Remaining launch work

- Finish GetAddress PR, preview, production deployment and controlled manual run, then enable only with owner approval.
- Apply/test remaining branded Auth templates and Magic Link flow.
- Resume DMARC/BIMI sender-avatar work; no `_dmarc` record has been added.
- Same-iPhone overflow confirmation.
- Stripe, SMS, remaining email/legal readiness, cron/double-booking regression checks, inbound alias test and controlled customer-support journey.

## Required workflow

For substantial work use branch → PR → CI → preview/testing → merge → production verification. Update `docs/AI_START.md`, this file and `docs/PROJECT_STATUS.md`. Never overclaim a provider/runtime path that has not been exercised.
