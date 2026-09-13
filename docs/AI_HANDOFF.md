# Namdar AI handoff

Last verified: 2026-09-13 UTC

Read `docs/AI_START.md` first.

## Production source of truth
- Repo `pchroonic/pchroonic`, default `main`.
- Current product release: PR #64 `Add Admin System Health and reliability history`.
- Exact tested head `c840436aeb3363b263135867e11f1551e71cf6f4`; CI `34767328622` SUCCESS.
- Exact preview `dpl_HXjuMhD58ngJBtu2HmXrTXdgk9Mg` READY with clean errors-only build.
- Preview health DB check is unavailable because Preview lacks `SUPABASE_SERVICE_ROLE_KEY`; production has the required env.
- Merge/main HEAD `c9028003b68095b7ef4c9d601980afe359017448`.
- Production deployment `dpl_BsZbTcWLNHYgP9hrCxLUgPsXHLas` READY on `https://namdar.co.uk`.
- Production `/api/health` HTTP 200 after deploy.
- Production Admin loader `6.4.27-system-health-1`, including `admin-system-health.js`.
- Supabase production `qjigldxjcpnrlyxgmlqq`.
- Window Cleaning only live; address work parked; privileged Staff/Admin requires AAL2/MFA.

## Existing safety state
- Stripe customer policy OFF; no live Stripe credentials.
- Four retained Stripe rows are sandbox and excluded from Business Finance.
- Sole trader first, limited company later from real incorporation date.
- £106 confirmed test fixture removed.
- Smart receipts are live; user deferred authenticated receipt testing.

## Reliability evidence
Pre-release Vercel review showed intermittent Supabase/PostgREST 504s as the meaningful reliability problem, particularly in hourly notification/follow-up processing. Routine customer/staff 401s are expected auth/session events and are intentionally not treated as platform incidents. Old missing-env and Stripe raw-body failures belonged to older deployments and are not current incidents.

## System Health — LIVE
Applied migration:
- `20260913154800 system_health_reliability_history`.

### Private schema
`system_health_runs`
- component, healthy/warning/failing status, summary, source, timing, duration, non-secret details;
- RLS enabled, no browser policies.

`system_health_incidents`
- grouped incident fingerprint, component, warning/failing severity, open/resolved state, title/message, occurrence count, first/last seen, resolution and latest run link;
- one open incident per fingerprint via partial unique index;
- RLS enabled, no browser policies.

Initial pre-deploy state was 0 runs / 0 incidents. Do not backfill old logs.

### Runtime recording
`lib/system-health.js`
- health classification + scheduled freshness helpers;
- creates runs;
- warning/failing opens/touches an incident;
- first incident open creates one staff notification with `permission_key='settings'`, high/urgent priority and target `/admin?tab=health`;
- repeats increment occurrence count without notification spam;
- healthy execution resolves matching incident.

`api/booking-notifications.js`
- retains four isolated stages and retry behavior;
- records `notification_cron` after each authorized real run;
- healthy when all stages succeed, warning for partial degradation, failing for total/terminal failure;
- details contain only stage result/retry counters;
- health persistence is awaited before response completion.

`api/account-purge.js`
- records `account_purge` status and counts only;
- no customer IDs in health history;
- persistence is awaited.

### Private health API
`api/admin-system-health.js`
- GET only, `requireStaff(req,'settings')`;
- checks database latency/availability, Stripe configured state + sandbox/live mode, email readiness, cron configuration, latest scheduled-run freshness, notification queues and private `finance-receipts` bucket reachability;
- notification freshness: warning after 90m, failing after 150m;
- account purge freshness: warning after 30h, failing after 42h;
- returns incident history and recent run history;
- never returns provider secret values.

### Admin UI
`admin-system-health.js`
- Settings-only `System health` tab + `/admin?tab=health` deep link;
- component cards, overall state, incident history and scheduled-run history;
- manual refresh and 60-second refresh while visible;
- Overview shortcut `Open System Health`.

### Database/advisor verification
- RLS enabled on both new tables, policy count 0 by design;
- expected component/status/incident indexes present;
- no new System Health missing-FK advisor finding;
- existing project advisor findings are separate work, including leaked-password protection being disabled.

## Pending runtime verification
1. Observe first genuine post-release hourly `notification_cron` run after the :07 schedule.
2. Confirm it inserts exactly one run row.
3. If it is healthy, no incident/alert should be created.
4. If genuinely degraded, one grouped incident + one staff alert should appear; repeat failures only increase count; later healthy run resolves it.
5. User can inspect authenticated Admin -> System health.
6. Keep Stripe commercial policy OFF.

## Non-negotiables
- No env values, provider secrets, customer identifiers or raw private errors in health output/history.
- Expected 401 auth events are not platform incidents.
- No fabricated/backfilled run history.
- No customer exposure of System Health/finance/receipt data.
- Smart receipts remain review-first.
- Sandbox Stripe excluded from finance; Stripe webhook remains authoritative.
- Window only live; address work parked.
