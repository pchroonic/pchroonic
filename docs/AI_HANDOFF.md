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
- PR #65 docs-only live-release continuity merge `6c9942d10e1f5601b6a3a070f918470e12eb06b8`.
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

No old logs are backfilled.

### Runtime recording
`lib/system-health.js`
- creates health runs;
- warning/failing opens or updates one incident;
- first incident open creates one staff notification with `permission_key='settings'`, high/urgent priority and target `/admin?tab=health`;
- repeat failures increment occurrence count without notification spam;
- healthy execution resolves the matching incident.

`api/booking-notifications.js`
- retains four isolated stages and retry behavior;
- records `notification_cron` after each authorized real run;
- health persistence is awaited before response completion.

`api/account-purge.js`
- records `account_purge` status/counts only and awaits persistence;
- no customer IDs are written to health history.

### Private health API/UI
`api/admin-system-health.js` is GET-only and requires `requireStaff(req,'settings')`. It checks database latency/availability, Stripe configured state + sandbox/live mode, email readiness, cron configuration, scheduled-run freshness, notification queues and private receipt Storage reachability. It returns incidents/recent runs but never secret values.

`admin-system-health.js` adds a Settings-only `System health` tab, `/admin?tab=health` deep link, component cards, incident history, run history, manual refresh and 60-second visible-tab refresh.

### First real production run — VERIFIED
The first genuine post-release hourly notification cron ran 2026-09-13 16:07:25–16:07:28 UTC and persisted exactly one `notification_cron` run:
- status `healthy`;
- summary `Notification and follow-up cron completed normally`;
- duration 3336 ms;
- post-job: healthy, attempt 1;
- booking delivery: healthy, attempt 1;
- business scan: healthy, attempt 1;
- business delivery: healthy, attempt 1;
- DB retries 0 / recovered 0 / exhausted 0.

Immediately after that run:
- open incidents: 0;
- total incidents: 0;
- `system_health` staff alerts: 0.

This verifies persistence completes before the cron response and that a healthy run creates no false incident/alert.

### Database/advisor verification
- RLS enabled on both health tables, policy count 0 by design;
- expected component/status/incident indexes present;
- no new System Health missing-FK advisor finding;
- existing project advisor items remain separate work, including leaked-password protection being disabled.

## Next
1. User may inspect authenticated Admin -> System health when convenient.
2. Let real cron history accumulate naturally.
3. When a genuine degradation occurs, verify one grouped incident + one staff alert, repeat-failure count behavior, then healthy-run resolution.
4. Keep Stripe commercial policy OFF.

## Non-negotiables
- No env values, provider secrets, customer identifiers or raw private errors in health output/history.
- Expected 401 auth events are not platform incidents.
- No fabricated/backfilled run history.
- No customer exposure of System Health/finance/receipt data.
- Smart receipts remain review-first.
- Sandbox Stripe excluded from finance; Stripe webhook authoritative.
- Window only live; address work parked.
