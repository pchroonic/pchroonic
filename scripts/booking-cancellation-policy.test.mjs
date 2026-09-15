import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');

test('Terms v2 publishes the fair 48-hour cancellation and deposit policy',()=>{
  const sql=read('supabase/migrations/20260915104500_booking_cancellation_policy.sql');
  assert.match(sql,/Customer cancellation and the 48-hour policy/i);
  assert.match(sql,/More than 48 hours before the appointment/i);
  assert.match(sql,/reasonable direct loss/i);
  assert.match(sql,/whether the appointment can reasonably be filled/i);
  assert.match(sql,/If Namdar cancels/i);
  assert.match(sql,/14-day statutory cancellation period/i);
  assert.match(sql,/does not override that right/i);
});

test('booking schema records durable policy and statutory service-start evidence',()=>{
  const sql=read('supabase/migrations/20260915104500_booking_cancellation_policy.sql');
  for(const field of ['terms_version','booking_policy_version','booking_policy_accepted_at','early_service_requested_at','early_service_acknowledged','cancellation_window_hours','booking_policy_snapshot'])assert.match(sql,new RegExp(`add column if not exists ${field}`));
});

test('customer appointment request visibly requires both policy acknowledgements',()=>{
  const ui=read('account-booking-policy.js');
  assert.match(ui,/6\.4\.34-cancellation-policy-1/);
  assert.match(ui,/Cancellation & deposit policy/);
  assert.match(ui,/bookingPolicyAccept/);
  assert.match(ui,/bookingEarlyServiceRequest/);
  assert.match(ui,/reasonable direct loss/i);
  assert.match(ui,/statutory consumer rights/i);
  assert.match(ui,/bookingPolicyAccepted:true/);
  assert.match(ui,/earlyServiceRequested:true/);
});

test('server rejects booking attempts that bypass policy acceptance and records server-side versions',()=>{
  const api=read('api/booking-core.js');
  assert.match(api,/b\.bookingPolicyAccepted!==true/);
  assert.match(api,/b\.earlyServiceRequested!==true/);
  assert.match(api,/BOOKING_POLICY_VERSION='2026-09-15-v1'/);
  assert.match(api,/legal_documents\?slug=eq\.terms&published=eq\.true&select=version/);
  assert.match(api,/booking_policy_accepted_at:acceptedAt/);
  assert.match(api,/early_service_acknowledged:true/);
  assert.match(api,/statutoryRightsPreserved:true/);
});

test('future Stripe checkout cannot proceed without booking policy evidence',()=>{
  const api=read('api/create-checkout.js');
  assert.match(api,/!booking\.booking_policy_accepted_at/);
  assert.match(api,/booking\.early_service_acknowledged!==true/);
  assert.match(api,/Review and accept the current booking, cancellation and statutory service-start terms/i);
});

test('My Namdar loader ships the policy module at the current version',()=>{
  const account=read('account.js');
  assert.match(account,/6\.4\.34-cancellation-policy-1/);
  assert.match(account,/account-booking-policy\.js/);
});
