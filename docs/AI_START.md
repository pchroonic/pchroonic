# Namdar AI fast resume

Last verified: 2026-09-12 UTC

Read this first. Use `docs/AI_HANDOFF.md` for implementation detail and `docs/PROJECT_STATUS.md` for the roadmap.

## Current phase

**Phase 7 — Launch Security & Readiness**

## Production baseline

- Repository: `pchroonic/pchroonic`, default branch `main`.
- Main before the GetAddress harvest feature: `bd2b9e56d5f50a7eac2d19c3e98cb8976374449e`.
- Production: `https://namdar.co.uk` on Vercel project `namdar-website-starter-1`.
- Supabase: `namdar-production` (`qjigldxjcpnrlyxgmlqq`), Free plan.
- Resend: `namdar.co.uk` verified for sending/receiving.
- MFA Stage 2 is live; privileged Admin/Staff browser, API and RLS access require AAL2.
- Customer support tickets remain customer-only; public inbound email stays in Admin Email inbox.

## Auth/security state

- Supabase Site URL: `https://namdar.co.uk`; redirect allowlist: `https://namdar.co.uk/**`.
- Email + Google sign-in intentionally enabled. Do not disable Google: at least one customer identity depends on it.
- Supabase CAPTCHA is ON using Cloudflare Turnstile. Customer login and password-reset request passed production smoke tests.
- Leaked Password Protection remains plan-blocked on Supabase Free.

## Auth email branding

- Six branded Auth templates are source-controlled under `supabase/email-templates/` from merged commit `bd2b9e56d5f50a7eac2d19c3e98cb8976374449e`.
- **Reset password is LIVE and verified in Gmail** with subject `Reset your Namdar password` and branded Namdar HTML.
- Supabase SMTP sender remains `accounts@namdar.co.uk`; owner changed display name from `namdar` to `Namdar`. A post-change delivery has not yet independently verified the casing.
- Magic Link and the other prepared Auth templates are not yet confirmed live.
- Gmail sender avatar is separate BIMI/DMARC work. No `_dmarc` DNS record has been added yet; DMARC work is paused while the address-harvest feature is implemented.

## GetAddress daily database growth — IN PROGRESS

User requested an automatic system that spends up to 20 GetAddress lookups/day to grow Namdar's address database, preserves backups, can be switched on/off, monitored, manually run, and exported.

Design:
- GetAddress Typeahead is used only to discover postcode candidates; official docs say these search queries do not consume lookup usage.
- Each paid lookup is a postcode-only Autocomplete query with `all=true`; official docs say that counts as one lookup and can return all suggestions for that postcode.
- **Active Namdar Service Areas are prioritised first.** The worker reads live `service_areas` at runtime rather than hard-coding boroughs. Current production coverage is administrative coverage for Lewisham, Southwark, Lambeth, Wandsworth and Greenwich.
- Service-area Typeahead uses provider district filters to build a deep covered-postcode queue before paid lookups. Nearby/London & South-East candidates are fallback, with wider UK only after local priority is unavailable.
- `prioritize_service_areas` is an Admin-controlled switch, default ON. Automatic harvesting itself remains default OFF.
- Queue metadata includes coverage label, priority score, outward code and learned expected yield. Previously harvested address counts teach the worker which outward codes tend to return more addresses per paid lookup.
- Normalized results are stored in existing `master_addresses` as source `getaddress-daily-cache`.
- Raw provider snapshots and run history are stored server-side.
- Every successful run writes JSON + CSV copies to private Supabase Storage bucket `address-harvest-backups`.
- Admin Service Areas gets ON/OFF, service-area priority ON/OFF, daily cap (max 20), usage/status, covered-area queue/counters, Run once now, recent runs, per-run backups, and full CSV/JSON export.
- Vercel daily cron target: `/api/address-harvest-cron` at `03:30 UTC`, protected by existing `CRON_SECRET`.
- Required secret: `GETADDRESS_API_KEY`. Optional `GETADDRESS_ADMIN_KEY` improves authoritative usage/remaining display. Never paste either into chat or commit them.
- Automation defaults **OFF** so migrations/deployment cannot spend credits by themselves.

Production DB migrations already applied safely:
- `20260912121339 address_harvest_automation`
- `20260912121442 address_harvest_run_guard`
- `20260912123809 address_harvest_service_area_priority`

They created/extended server-only RLS operational state and a private backup bucket; no GetAddress lookup is made by the migrations.

Feature branch: `feature/getaddress-daily-harvest-20260912`, PR #24.

## Immediate next action

Finish priority code + docs on PR #24 → CI/Vercel preview → verify disabled/no-key behavior → merge/deploy. Then have the owner add `GETADDRESS_API_KEY` directly in Vercel Environment Variables, optionally `GETADDRESS_ADMIN_KEY`, test one manual run, inspect covered-area queue, addresses and backups, and only then turn automatic daily harvesting ON.

## Other open items

- Apply/test remaining branded Auth emails; Magic Link CAPTCHA test remains pending.
- Continue DMARC/BIMI only after address-harvest work; no DMARC record added yet.
- Same-iPhone homepage overflow confirmation pending; Windows/Edge desktop is fixed.
- Stripe, SMS, remaining Resend/legal readiness, cron verification and controlled customer-support journey remain open.

## Do not break

- Never expose GetAddress, Supabase, SMTP, Turnstile, GitHub or cron secrets.
- Do not use or reproduce the previously exposed GitHub PAT.
- Do not make support tickets public.
- Do not move production back to Netlify.
- Do not call GetAddress from browser/client code; API key stays server-side.
- Do not let manual + cron runs exceed the configured/local daily cap.
- Do not bypass live `service_areas` when service-area priority is enabled.
