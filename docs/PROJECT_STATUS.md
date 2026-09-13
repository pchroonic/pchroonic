# Namdar project status

Last updated: 2026-09-13 UTC

## Production baseline
- Repo `pchroonic/pchroonic`, default `main`.
- Current product release: PR #64 `Add Admin System Health and reliability history`.
- Exact tested head `c840436aeb3363b263135867e11f1551e71cf6f4`; CI run `34767328622` SUCCESS.
- Exact preview `dpl_HXjuMhD58ngJBtu2HmXrTXdgk9Mg` READY with clean errors-only build. Preview runtime lacks the production Supabase service-role env, so its DB health endpoint is not representative.
- Merge/main HEAD `c9028003b68095b7ef4c9d601980afe359017448`.
- Production deployment `dpl_BsZbTcWLNHYgP9hrCxLUgPsXHLas` READY on `https://namdar.co.uk`.
- Production `/api/health` is HTTP 200 after release.
- Production Admin loader `6.4.27-system-health-1` loads `admin-system-health.js`.
- Supabase production `qjigldxjcpnrlyxgmlqq`.
- Window Cleaning only live; future services planned; address work parked.

## Payments, finance and receipts
- Stripe sandbox checkout/refund flow verified; commercial customer payment policy OFF.
- Sandbox payment rows excluded from Business Finance.
- Sole trader first, limited company later from the real incorporation date.
- Confirmed £106 test fixture removed.
- Smart receipt workflow live; user deferred its first authenticated receipt test.

## Reliability and System Health — LIVE
Migration:
- `20260913154800 system_health_reliability_history`.

The release adds:
- private `system_health_runs` scheduled-run history;
- private `system_health_incidents` grouped incident lifecycle;
- one-open-incident-per-fingerprint dedupe;
- hourly notification/follow-up health recording;
- daily account-purge health recording;
- one staff alert when a new incident opens;
- repeat-failure count without alert spam;
- automatic incident resolution after later healthy execution;
- private Admin System Health dashboard.

Admin System Health monitors database availability/latency, Stripe readiness and mode, email readiness, cron configuration/freshness, notification queue problems, private receipt storage, incidents and recent scheduled runs.

Security/privacy:
- detailed API requires AAL2 + settings permission;
- no secret values/customer identifiers in health output or persisted details;
- RLS enabled on new tables with no direct browser policies;
- expected signed-out/expired-session 401s are not platform incidents;
- older hosting logs are not backfilled into new history.

Database verification:
- both new tables started at 0 rows before deployment;
- required indexes present;
- no new System Health unindexed-FK advisor finding.

## Runtime verification still pending
1. Observe the first real hourly notification cron after release and confirm one `notification_cron` history row.
2. Healthy run => no incident/alert.
3. Genuine degradation => one grouped incident + one staff alert; repeated failures only increment count; later healthy run resolves it.
4. User can inspect Admin -> System health when convenient.
5. Keep Stripe customer payment policy OFF.

## Handoff rule
Every substantial product/provider/data change updates `docs/AI_START.md`, `docs/AI_HANDOFF.md`, and this file. Never store credentials, raw API keys, customer secrets, TOTP codes, one-time Auth links or unnecessary private financial details in source/docs.
