# Namdar AI fast resume

Last verified: 2026-09-13 UTC

Read this first. Use `docs/AI_HANDOFF.md` for implementation detail and `docs/PROJECT_STATUS.md` for roadmap/status.

## Production baseline
- Repository: `pchroonic/pchroonic`, default `main`.
- Current product release: PR #62 `Add intelligent receipt-driven expense ledger`, merge `a6b73927f1649f2ad167cda4410f2f5632b78212`.
- PR #63 is docs-only continuity sync, merge `aabcb88d3ee24a92a3af3770e256550f692d32af`.
- Production deployment: `dpl_B4nhdmgLZ13n813rUMWQfJRj2KUN`, READY on `https://namdar.co.uk`.
- Production Admin loader: `6.4.26-intelligent-receipts-1`.
- Supabase production: `namdar-production` (`qjigldxjcpnrlyxgmlqq`).
- Window Cleaning is the only live service. Future services remain planned. Address work remains parked.
- Privileged Staff/Admin requires AAL2/MFA.

## Stripe / finance safety
- Stripe sandbox normal signed-in deposit -> balance -> refund flow is fully verified.
- Four retained Stripe rows are sandbox and excluded from Business Finance.
- `site_settings.payments` absent; customer online-payment policy OFF; no live Stripe credentials.
- Namdar finance mode: sole trader first, limited company later from the real incorporation date.
- Old £106 Window fixture was confirmed test data and fully removed.
- Clean finance state before System Health work: £0 outstanding, £0 rolling invoice turnover, 0 expenses, 0 receipts, 0 merchant rules.

## Intelligent Expense Receipts — LIVE / receipt test deferred by user
PR #62 added private review-first smart receipts: JPG/PNG/WebP/PDF up to 10 MB, SHA-256 duplicate checks, local browser OCR, PDF text/OCR fallback, supplier/date/total/VAT/category/tax suggestions, private storage, receipt attachment and learned merchant rules. Nothing posts automatically; staff reviews before saving. Receipt pixels are not sent to a third-party AI provider in v1.

## Reliability / System Health — IN PROGRESS
User chose reliability and monitoring as the next priority.

Branch: `feat/system-health-reliability-20260913`.

Live evidence gathered before implementation:
- Vercel 7-day error groups show the main real reliability issue is intermittent Supabase/PostgREST `504 Gateway Timeout`, especially the hourly `/api/booking-notifications` pipeline.
- Common staff/customer 401s are expected auth/session events and must not be treated as platform incidents.
- Historical missing-env and old Stripe raw-body errors came from older deployments; do not present them as current incidents.

Applied Supabase migration:
- `20260913154800 system_health_reliability_history`.

New private server-only tables:
- `system_health_runs`: component/status/summary/timing/details history;
- `system_health_incidents`: grouped open/resolved incidents with occurrence counts and latest run;
- RLS enabled with no direct browser policies;
- one open incident per fingerprint via partial unique index.

Code on branch:
- `lib/system-health.js`: health classification, freshness checks, persistent runs, grouped incidents, recovery resolution and one staff alert per incident;
- `api/booking-notifications.js`: records hourly notification/follow-up health; degraded/failing runs open or touch `notification-cron-degraded`; healthy run resolves it;
- `api/account-purge.js`: records daily purge health similarly;
- `api/admin-system-health.js`: AAL2 + settings-protected live checks for DB, Stripe config/mode, email, cron config, notification cron freshness, purge freshness, notification queues and private receipt Storage;
- `admin-system-health.js`: private Admin System Health tab, live component cards, incident history, scheduled-run history and 60-second refresh while open;
- Admin loader target on branch: `6.4.27-system-health-1`.

Health incidents create a deduped high/urgent staff notification linking to `/admin?tab=health`. Expected auth 401s are explicitly described as noise rather than incidents.

## Next action
1. Finish branch CI/static checks and continuity docs.
2. Open PR for System Health.
3. Require green GitHub CI + READY exact-head Vercel preview + clean errors-only build.
4. Merge only if green; verify production loader `6.4.27-system-health-1` and `/api/health`.
5. Open authenticated Admin -> System health and verify live checks.
6. Wait for/observe the next hourly notification cron so the first persistent run appears; do not fabricate history.
7. Confirm real degradation opens one incident + one staff alert and later healthy execution resolves the incident.
8. Keep Stripe commercial policy OFF.

## Do not break
- No secrets in health API/UI/history.
- No customer exposure of operational health, finance or receipt data.
- Expected 401 auth events are not platform failures.
- System Health history is recorded from this release onward; do not backfill old Vercel logs as if Namdar recorded them.
- Receipt suggestions remain review-first.
- Sandbox Stripe activity never enters revenue/tax reporting.
- No separate consumer card surcharge; verified Stripe webhook remains authoritative.
- Window Cleaning only until deliberate next-stage activation; address work stays parked.
