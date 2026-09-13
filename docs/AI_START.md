# Namdar AI fast resume

Last verified: 2026-09-13 UTC

Read this first. Use `docs/AI_HANDOFF.md` for implementation detail and `docs/PROJECT_STATUS.md` for roadmap/status.

## Production baseline
- Repository: `pchroonic/pchroonic`, default `main`.
- Current product release: PR #64 `Add Admin System Health and reliability history`.
- Exact tested PR head: `c840436aeb3363b263135867e11f1551e71cf6f4`.
- GitHub CI run `34767328622`: SUCCESS.
- Exact-head preview `dpl_HXjuMhD58ngJBtu2HmXrTXdgk9Mg`: READY; errors-only build clean.
- Preview `/api/health` cannot exercise DB because Preview lacks `SUPABASE_SERVICE_ROLE_KEY`; runtime logs confirmed environment configuration, not a code regression.
- PR #64 merge/main HEAD: `c9028003b68095b7ef4c9d601980afe359017448`.
- Production deployment: `dpl_BsZbTcWLNHYgP9hrCxLUgPsXHLas`, READY on `https://namdar.co.uk`.
- Production `/api/health`: HTTP 200 with database, Stripe, email, reminders and followups healthy after deploy.
- Production Admin loader: `6.4.27-system-health-1`, including `admin-system-health.js`.
- Supabase production: `namdar-production` (`qjigldxjcpnrlyxgmlqq`).
- Window Cleaning only live; future services planned; address work parked.
- Privileged Staff/Admin requires AAL2/MFA.

## Stripe / finance safety
- Stripe sandbox deposit -> balance -> refund flow verified.
- Four retained Stripe rows are sandbox and excluded from Business Finance.
- Customer payment policy OFF; no live Stripe credentials.
- Sole trader first, limited company later from the real incorporation date.
- Confirmed £106 test fixture removed.

## Intelligent receipts — LIVE / user deferred test
PR #62 smart receipt workflow is live. It is private, OCR/review-first, duplicate-aware and never auto-posts an expense. The user chose to test it later.

## System Health — LIVE
Migration: `20260913154800 system_health_reliability_history`.

Private server-only tables:
- `system_health_runs` for actual scheduled-run history;
- `system_health_incidents` for grouped open/resolved incidents;
- RLS enabled with no direct browser policies;
- one open incident per fingerprint.

Live behavior:
- hourly notification/follow-up cron records healthy/warning/failing results and DB retry metrics;
- daily account-purge cron records results;
- cron health persistence is awaited before the response finishes;
- first warning/failing incident sends one staff/settings alert to `/admin?tab=health`;
- repeat failures increment the same incident without alert spam;
- later healthy execution resolves the incident;
- history begins with this release; older Vercel logs are not backfilled.

Private Admin `System health` view monitors:
- database availability and latency;
- Stripe configured state + sandbox/live mode only;
- email readiness;
- cron configuration;
- scheduled-job freshness;
- booking/business notification queue backlog/failures;
- private receipt Storage reachability;
- incident history and scheduled-run history.

Important interpretation:
- intermittent Supabase/PostgREST 504s were the primary recent reliability issue motivating this release;
- expected signed-out/expired-session 401s are authentication events, not platform incidents;
- no secrets or customer identifiers are exposed in health history/UI.

## Current verification state
- New health tables were 0 runs / 0 incidents before production deployment by design.
- Both tables have RLS enabled, zero browser policies and expected indexes.
- Supabase advisors show no new System Health missing-FK issue. Existing project-wide advisor items remain separate work.
- Await/observe the first real hourly `:07` notification cron record; never fabricate run history.

## Next action
1. Confirm the first real post-release `notification_cron` row appears after an actual scheduled run.
2. User can open authenticated Admin -> System health to inspect live component cards.
3. If a genuine degradation occurs, verify one grouped incident + one staff alert; a later healthy run should resolve it.
4. Keep Stripe commercial policy OFF.

## Do not break
- No secrets/customer identifiers in health API/UI/history.
- Expected auth 401s are not platform failures.
- No fabricated/backfilled operational history.
- No customer exposure of operational health, finance or receipt data.
- Smart receipts remain review-first.
- Sandbox Stripe never enters revenue/tax reporting.
- No separate consumer card surcharge; verified Stripe webhook remains authoritative.
- Window Cleaning only until deliberate activation of later services; address work stays parked.
