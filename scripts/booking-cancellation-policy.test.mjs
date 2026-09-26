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
  assert.match(ui,/6\.4\.93-payment-handoff-1/);
  assert.match(ui,/Booking, cancellation & payment terms/);
  assert.match(ui,/bookingPolicyAccept/);
  assert.match(ui,/bookingEarlyServiceRequest/);
  assert.match(ui,/reasonable direct loss/i);
  assert.match(ui,/statutory consumer rights/i);
  assert.match(ui,/bookingPolicyAccepted:true/);
  assert.match(ui,/earlyServiceRequested:true/);
});

test('appointment screen keeps terms compact and requires review before payment',()=>{
  const html=read('account.html'),ui=read('account-booking-policy.js'),css=read('booking-policy.css'),checkout=read('api/create-checkout.js');
  assert.match(html,/account-booking-policy\.js\?v=6\.4\.93-payment-handoff-1/);
  assert.match(ui,/bookingTermsCompact/);
  assert.match(ui,/Review & accept terms/);
  assert.match(ui,/bookingTermsDialog/);
  assert.match(ui,/Accept & continue/);
  assert.match(ui,/before any Stripe payment can be started/i);
  assert.match(ui,/openTermsDialog\(\)/);
  assert.match(css,/\.booking-terms-compact\{/);
  assert.match(css,/\.booking-terms-dialog\{/);
  assert.match(checkout,/!booking\.booking_policy_accepted_at/);
  assert.match(checkout,/booking\.early_service_acknowledged!==true/);
});

test('accepted quote and booking-change dialogs stay within the viewport',()=>{
  const html=read('account.html'),css=read('styles.css');
  assert.match(html,/styles\.css\?v=6\.4\.93-payment-handoff-1/);
  assert.match(html,/id="quoteScheduleDialog"[\s\S]*?class="modal-card wide"/);
  assert.match(html,/id="bookingChangeDialog"[\s\S]*?class="modal-card wide"/);
  assert.match(css,/#quoteScheduleDialog\.modal,#bookingChangeDialog\.modal\{max-width:820px;width:min\(820px,calc\(100% - 32px\)\);overflow:hidden\}/);
  assert.match(css,/#quoteScheduleDialog \.modal-card\.wide,#bookingChangeDialog \.modal-card\.wide\{width:100%;max-width:none;overflow-x:hidden\}/);
  assert.match(css,/@media\(max-width:650px\)\{#quoteScheduleDialog\.modal,#bookingChangeDialog\.modal\{width:calc\(100% - 16px\);max-width:calc\(100% - 16px\)\}/);
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

test('required-payment booking opens Stripe immediately and remains recoverable from My Bookings',()=>{
  const ui=read('account-booking-policy.js'),jobs=read('api/customer-jobs.js'),account=read('account-original.js'),styles=read('styles.css');
  assert.match(ui,/openRequiredPayment/);
  assert.match(ui,/api\('\/api\/create-checkout'/);
  assert.match(ui,/requiredAmount>.004/);
  assert.match(ui,/Opening secure payment/);
  assert.match(ui,/Use the Pay button in My Bookings to continue/);
  assert.match(jobs,/depositRequired:Number\(b\.deposit_required\|\|0\)/);
  assert.match(account,/data-booking-pay/);
  assert.match(account,/Payment required/);
  assert.match(account,/Pay \$\{money\(depositRequired\)\} deposit/);
  assert.match(styles,/\.customer-booking-payment-required\{/);
  assert.match(styles,/\.customer-job-status\.payment_required/);
});

test('My Namdar loader ships the policy module at the current version',()=>{
  const account=read('account.js');
  assert.match(account,/6\.4\.35-payment-policy-engine-1/);
  assert.match(account,/account-booking-policy\.js/);
});
