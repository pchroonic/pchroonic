import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const tracker=fs.readFileSync('funnel-tracking.js','utf8');
const quote=fs.readFileSync('api/quote.js','utf8');
const performance=fs.readFileSync('api/admin-window-performance.js','utf8');
const admin=fs.readFileSync('admin-window-performance.js','utf8');
const migration=fs.readFileSync('supabase/migrations/20260912204000_window_funnel_profitability_foundation.sql','utf8');
const endpoint=require('../api/conversion-event.js');

test('conversion event accepts bounded anonymous visitor ids and postcode areas',()=>{
  assert.equal(endpoint.cleanVisitor('abc_DEF-123'),'abc_DEF-123');
  assert.equal(endpoint.cleanVisitor('bad'),'');
  assert.equal(endpoint.cleanArea('se'),'SE');
  assert.equal(endpoint.cleanArea('SE14'),null);
});

test('browser funnel id is in-memory and not persisted',()=>{
  assert.match(tracker,/randomUUID/);
  assert.doesNotMatch(tracker,/localStorage|sessionStorage|document\.cookie/);
  assert.match(tracker,/\/api\/conversion-event/);
  assert.match(tracker,/visitorId/);
});

test('Window quote wrapper links created quotes to funnel visitors',()=>{
  assert.match(quote,/quote_funnel_links/);
  assert.match(quote,/visitor_id:visitorId/);
  assert.match(quote,/res\.statusCode===201/);
});

test('profitability API separates direct contribution from labour-inclusive profit',()=>{
  assert.match(performance,/contributionBeforeLabour/);
  assert.match(performance,/labourCostPerHour/);
  assert.match(performance,/labourReady/);
  assert.match(performance,/booking_job_costs/);
  assert.match(performance,/customer_response==='accepted'/);
  assert.match(performance,/Final quotes sent/);
});

test('Admin dashboard supports funnel view and actual job cost capture',()=>{
  assert.match(admin,/Window Cleaning funnel & profitability/);
  assert.match(admin,/Internal labour £\/hour/);
  assert.match(admin,/save-cost/);
  assert.match(admin,/Cost capture/);
});

test('analytics foundation stays server-only with RLS',()=>{
  assert.match(migration,/enable row level security/);
  assert.match(migration,/revoke all on public\.conversion_events from anon, authenticated/);
  assert.match(migration,/revoke all on public\.quote_funnel_links from anon, authenticated/);
  assert.match(migration,/revoke all on public\.booking_job_costs from anon, authenticated/);
});
