# Namdar project status

Last updated: 2026-09-13 UTC

## Production baseline
- Repo `pchroonic/pchroonic`, default `main`.
- Current product release: PR #62 `Add intelligent receipt-driven expense ledger`.
- Production deployment `dpl_B4nhdmgLZ13n813rUMWQfJRj2KUN` is READY on `https://namdar.co.uk`.
- Production Admin loader: `6.4.26-intelligent-receipts-1`.
- Supabase production: `qjigldxjcpnrlyxgmlqq`.
- Window Cleaning only live; future services planned; address work parked.

## Payments and finance
- Stripe sandbox checkout/refund flow is verified.
- Customer payment policy remains OFF.
- Sandbox payment records remain excluded from Business Finance.
- Business structure is sole trader first, limited company later from the real incorporation date.
- Confirmed £106 test fixture was removed.

## Intelligent receipts
Smart receipt upload/OCR is live from PR #62. The user chose to test it later. Receipt suggestions remain review-first and do not post expenses automatically.

## Reliability and System Health — IN PROGRESS
Branch: `feat/system-health-reliability-20260913`.
Target Admin loader: `6.4.27-system-health-1`.

Recent production review confirmed intermittent Supabase/PostgREST 504 gateway timeouts are the main meaningful reliability issue, especially around hourly notification/follow-up processing. Routine signed-out session 401s are treated as authentication events rather than system incidents.

Applied migration:
- `20260913154800 system_health_reliability_history`.

New reliability foundation:
- private `system_health_runs` history;
- private `system_health_incidents` lifecycle history;
- grouped incident fingerprints with one open incident at a time;
- hourly notification/follow-up cron instrumentation;
- daily account-purge instrumentation;
- automatic incident recovery when a later run becomes healthy;
- one staff alert when a new incident opens, without repeat-alert spam while it remains open.

New Admin System Health view monitors:
- database availability and latency;
- Stripe configured state and environment mode;
- email readiness;
- scheduled-job configuration;
- hourly notification/follow-up freshness;
- daily account-purge freshness;
- booking and business notification queue backlog/failures;
- private receipt-storage reachability;
- incident history and recent scheduled-run history.

System Health is private to privileged staff with settings access. Operational history begins with this release; older hosting logs are not backfilled into the new tables.

## Immediate next work
1. Complete CI/static checks and open the System Health PR.
2. Require green GitHub CI and a READY exact-head Vercel preview with clean build output.
3. Merge only if clean.
4. Verify production health endpoint and Admin loader `6.4.27-system-health-1`.
5. Open authenticated Admin -> System health and verify live component states.
6. Observe the first actual hourly cron record after deployment rather than fabricating history.
7. Keep customer Stripe policy OFF while reliability work is validated.

## Handoff rule
Every substantial product/provider/data change updates `docs/AI_START.md`, `docs/AI_HANDOFF.md`, and this file.
