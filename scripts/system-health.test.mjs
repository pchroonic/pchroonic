import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {statusFromFailures,freshnessStatus}=require('../lib/system-health');
const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');

test('cron health classification distinguishes healthy warning and failing',()=>{
  assert.equal(statusFromFailures(0,4),'healthy');
  assert.equal(statusFromFailures(1,4),'warning');
  assert.equal(statusFromFailures(4,4),'failing');
});

test('freshness monitor warns before treating a scheduled job as stale',()=>{
  const now=1_000_000;
  assert.equal(freshnessStatus(new Date(now-10_000).toISOString(),20_000,40_000,now).status,'healthy');
  assert.equal(freshnessStatus(new Date(now-30_000).toISOString(),20_000,40_000,now).status,'warning');
  assert.equal(freshnessStatus(new Date(now-50_000).toISOString(),20_000,40_000,now).status,'failing');
  assert.equal(freshnessStatus(null,20_000,40_000,now).reason,'no_history');
});

test('system health API is private and does not return provider secrets',()=>{
  const api=read('api/admin-system-health.js');
  assert.match(api,/requireStaff\(req,'settings'\)/);
  assert.match(api,/finance-receipts/);
  assert.match(api,/system_health_incidents/);
  assert.match(api,/system_health_runs/);
  assert.doesNotMatch(api,/stripeSecret\s*[,}]/);
  assert.doesNotMatch(api,/serviceRoleKey\s*[,}]/);
});

test('scheduled jobs record persistent health and open deduped incidents',()=>{
  const notifications=read('api/booking-notifications.js'),purge=read('api/account-purge.js'),helper=read('lib/system-health.js');
  assert.match(notifications,/recordHealthState/);
  assert.match(notifications,/notification-cron-degraded/);
  assert.match(purge,/recordHealthState/);
  assert.match(purge,/account-purge-degraded/);
  assert.match(helper,/system_health_runs/);
  assert.match(helper,/system_health_incidents/);
  assert.match(helper,/staff_notifications/);
  assert.match(helper,/target_path:'\/admin\?tab=health'/);
});

test('health history tables are server only with open-incident dedupe',()=>{
  const migration=read('supabase/migrations/20260913154800_system_health_reliability_history.sql');
  assert.match(migration,/alter table public\.system_health_runs enable row level security/i);
  assert.match(migration,/alter table public\.system_health_incidents enable row level security/i);
  assert.match(migration,/where status='open'/i);
  assert.doesNotMatch(migration,/create policy/i);
});

test('Admin loader keeps System Health in current release',()=>{
  const loader=read('admin.js'),ui=read('admin-system-health.js');
  assert.match(loader,/6\.4\.33-privacy-centre-1/);
  assert.match(loader,/admin-system-health\.js/);
  assert.match(ui,/System Health/);
  assert.match(ui,/Refresh health/);
  assert.match(ui,/Incident history/);
  assert.match(ui,/Scheduled-run history/);
});
