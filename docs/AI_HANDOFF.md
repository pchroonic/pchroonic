# Namdar AI handoff

Last verified: 2026-09-13 UTC

Read `docs/AI_START.md` first.

## Production source of truth
- Repo `pchroonic/pchroonic`, default `main`.
- Product release PR #62 `Add intelligent receipt-driven expense ledger`, merge `a6b73927f1649f2ad167cda4410f2f5632b78212`.
- PR #63 docs-only continuity merge `aabcb88d3ee24a92a3af3770e256550f692d32af`.
- Production deployment `dpl_B4nhdmgLZ13n813rUMWQfJRj2KUN` READY on `https://namdar.co.uk`.
- Production Admin loader `6.4.26-intelligent-receipts-1`.
- Supabase production `qjigldxjcpnrlyxgmlqq`.
- Window Cleaning only live; address work parked; AAL2/MFA required for privileged Staff/Admin.

## Existing safety state
- Stripe customer policy OFF; no live Stripe credentials.
- Four retained Stripe rows are sandbox and excluded from finance.
- Business structure: sole trader first, limited company later from real incorporation date.
- Confirmed £106 test fixture removed.
- Smart receipts live; first authenticated receipt test deferred by user.

## Reliability evidence
Vercel 7-day runtime-error review before implementation:
- meaningful current issue: intermittent Supabase/PostgREST 504s, especially `/api/booking-notifications` stages;
- 401 staff/customer sign-in errors are expected auth/session noise, not reliability incidents;
- missing env errors and webhook raw-body errors were tied to older deployments and must not be surfaced as current state.

## System Health branch
Branch: `feat/system-health-reliability-20260913`.
Admin loader target: `6.4.27-system-health-1`.

Applied migration:
- `20260913154800 system_health_reliability_history`.

### Database
`system_health_runs`
- server-only operational run history;
- fields include component, healthy/warning/failing status, summary, source, start/finish, duration and non-secret JSON details;
- RLS enabled, no direct browser policies.

`system_health_incidents`
- grouped incident lifecycle with fingerprint, component, warning/failing severity, open/resolved state, title/message, occurrence count, first/last seen, resolved timestamp and latest run link;
- partial unique index allows only one open incident per fingerprint;
- RLS enabled, no direct browser policies.

### `lib/system-health.js`
Exports:
- `statusFromFailures(failed,total)`;
- `freshnessStatus(lastSeen,warningAfterMs,failingAfterMs,now)`;
- `recordHealthState(...)`;
- incident open/touch/resolve helpers.

Behavior:
- every scheduled-run health record inserts `system_health_runs`;
- warning/failing states open or increment one incident fingerprint;
- first open creates one staff notification with `permission_key='settings'` and target `/admin?tab=health`;
- repeat failures update occurrence count without notification spam;
- healthy run resolves the open incident.

### Notification cron instrumentation
`api/booking-notifications.js` keeps existing four isolated stages and retry logic, then records:
- component `notification_cron`;
- `healthy` when all stages succeed;
- `warning` when some stages degrade/fail;
- `failing` when all stages fail or an authorized scheduled run stops before completion;
- fingerprint `notification-cron-degraded`;
- details contain stage ok/attempt/recovered/failed counts and DB retry counters only, no customer data/secrets.

### Account purge instrumentation
`api/account-purge.js` records component `account_purge`, fingerprint `account-purge-degraded`, counts only, and marks failures without exposing customer IDs in health history.

### Private health API
`api/admin-system-health.js`
- GET only;
- requires `requireStaff(req,'settings')` (therefore AAL2 through wrapped server helper);
- live components:
  - Database latency/availability;
  - Stripe configured + sandbox/live mode only, never secret values;
  - Email provider readiness;
  - CRON_SECRET presence as boolean state only;
  - notification cron freshness (warning after 90m, failing after 150m);
  - account purge freshness (warning after 30h, failing after 42h);
  - booking/business notification queue backlog/stuck/failed counts;
  - private `finance-receipts` bucket reachability via service-role server call;
- returns open/resolved incident history and recent health runs;
- notes explicitly distinguish expected auth 401 noise.

### Admin UI
`admin-system-health.js`
- loaded after existing Admin modules;
- dynamically adds a Settings-only `System health` tab without modifying the large legacy Admin file;
- deep link `/admin?tab=health` works after access sync;
- adds Overview button `Open System Health`;
- component cards show Healthy/Warning/Failing, latency, schedules and last-run age;
- incident history shows open/resolved cycles and occurrence count;
- scheduled-run history table shows recent cron outcomes;
- manual refresh + 60s refresh while tab is open.

### Regression coverage
- `scripts/system-health.test.mjs` tests health classification/freshness and static privacy/security wiring;
- CI syntax checks include new UI/API/helper plus `api/account-purge.js`;
- existing finance/receipt loader assertions updated to `6.4.27-system-health-1`.

## Next verification
1. Open PR only after branch code/docs are complete.
2. Require green GitHub CI.
3. Require exact-head Vercel preview READY and errors-only build clean.
4. Merge, verify production `/api/health` and exact Admin loader.
5. Authenticated Admin -> System health should initially show live components and no fabricated run history.
6. After next hourly :07 cron, verify a `notification_cron` run exists.
7. If a real cron degradation occurs, verify one incident + one staff alert; later healthy run must resolve it.
8. Keep Stripe commercial policy OFF.

## Non-negotiables
- Do not expose env values, Stripe secrets, service-role keys, customer identifiers or raw provider errors in health UI/history.
- Do not count expected 401 auth events as platform incidents.
- Do not backfill runtime logs into Namdar history as if they were recorded live.
- No customer exposure of health/finance/receipt data.
- Sandbox Stripe excluded from business finance; Stripe webhook authoritative.
- Smart receipts remain review-first.
- Window only live; address work parked.
