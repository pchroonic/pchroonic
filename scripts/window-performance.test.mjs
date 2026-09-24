import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read=p=>readFile(new URL(`../${p}`,import.meta.url),'utf8');

test('performance schema is server-only and RLS protected',async()=>{
  const sql=await read('supabase/migrations/20260912204000_window_stage1_conversion_profitability.sql');
  for(const table of ['conversion_events','quote_funnel_links','booking_job_costs'])assert.match(sql,new RegExp(`alter table public\\.${table} enable row level security`,'i'));
  assert.match(sql,/revoke all on table public\.conversion_events from anon, authenticated/i);
  assert.match(sql,/revoke all on table public\.quote_funnel_links from anon, authenticated/i);
  assert.match(sql,/revoke all on table public\.booking_job_costs from anon, authenticated/i);
});

test('public funnel endpoint keeps the expanded Analytics v2 event stream privacy-safe',async()=>{
  const src=await read('api/funnel-event.js');
  assert.match(src,/EVENTS=new Set/);
  for(const event of ['quote_started','postcode_checked','quote_submitted','quote_accepted','booking_submitted','checkout_started','payment_confirmed']){
    assert.match(src,new RegExp(`['"]${event}['"]`));
  }
  assert.match(src,/EVENTS\.has\(eventType\)/);
  assert.match(src,/non_production_host/);
  assert.match(src,/visitorId\(b\.sessionId\|\|b\.visitorId\)/);
  assert.match(src,/match\(\/\^\[A-Z\]\{1,2\}/);
  assert.match(src,/eventType===['"]postcode_checked['"]\?30:10/);
  assert.doesNotMatch(src,/body:\{[^}]*postcode:/s,'full postcode must not be written to conversion_events');
});

test('funnel tracking is consent-aware and session-only',async()=>{
  const src=await read('conversion.js');
  assert.match(src,/namdar_cookie_choice['"]\)!==['"]marketing['"]/);
  assert.match(src,/['"]namdar_stage1_funnel_visitor['"]/);
  assert.match(src,/sessionStorage\.getItem\(key\)/);
  assert.match(src,/sessionStorage\.setItem\(key,id\)/);
  assert.match(src,/eventType:['"]postcode_checked['"]/);
  assert.match(src,/visitorId/);
});

test('quote wrapper links tracked visitors without weakening service gate',async()=>{
  const src=await read('api/quote.js');
  assert.match(src,/serviceByKey\(db,key\)/);
  assert.match(src,/if\(!isLive\(service\)\)/);
  assert.match(src,/quote_funnel_links\?on_conflict=quote_id/);
  assert.match(src,/safeVisitor/);
});

test('performance API reports full Stage 1 funnel and contribution after processor costs',async()=>{
  const src=await read('api/admin-window-performance.js');
  for(const key of ['postcode','quote','final','accepted','booked','completed'])assert.match(src,new RegExp(`stage\\('${key}'`));
  assert.match(src,/provider_fee/);assert.match(src,/paymentProcessingFee/);assert.match(src,/processorState/);assert.match(src,/economicsReady/);assert.match(src,/directContribution=round\(reviewedValue-directCosts\)/);
  assert.match(src,/valuePerWorkHour/);
  assert.match(src,/trackingStartNote/);
  assert.match(src,/requireStaff\(req,['"]analytics['"]\)/);
});

test('job economics edits require bookings permission, Window scope and audit logging',async()=>{
  const src=await read('api/admin-job-economics.js');
  assert.match(src,/requireStaff\(req,['"]bookings['"]\)/);
  assert.match(src,/service_key/);
  assert.match(src,/windows/);
  assert.match(src,/booking_job_costs\?on_conflict=booking_id/);
  assert.match(src,/auditLog/);
});

test('admin labels direct contribution as not net profit and shows Stripe processing cost',async()=>{
  const src=await read('admin-window-performance.js');
  assert.match(src,/not net profit/i);
  assert.match(src,/labour, overheads, tax/i);
  assert.match(src,/Stripe processing/i);
  assert.match(src,/admin-job-economics/);
});

test('Window Cleaning remains sole live fallback service',async()=>{
  const src=await read('conversion.js');
  assert.match(src,/status:key===['"]windows['"]\?['"]live['"]:['"]planned['"]/);
});
