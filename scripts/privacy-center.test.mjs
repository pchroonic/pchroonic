import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');

test('privacy request store is private and tracks the one-month response target',()=>{
  const sql=read('supabase/migrations/20260915083000_privacy_centre.sql');
  assert.match(sql,/create table if not exists public\.privacy_requests/);
  assert.match(sql,/due_at timestamptz not null default \(now\(\) \+ interval '1 month'\)/);
  assert.match(sql,/alter table public\.privacy_requests enable row level security/);
  assert.doesNotMatch(sql,/create policy[\s\S]*privacy_requests/i);
});

test('published privacy information covers lawful bases retention rights transfers and ICO complaints without pretending launch readiness is complete',()=>{
  const sql=read('supabase/migrations/20260915083000_privacy_centre.sql');
  assert.match(sql,/lawful bases/i);
  assert.match(sql,/How long we keep information/i);
  assert.match(sql,/International transfers/i);
  assert.match(sql,/Your data-protection rights/i);
  assert.match(sql,/Information Commissioner's Office \(ICO\)/i);
  assert.match(sql,/formal legal name and postal correspondence address will be added/i);
  assert.match(sql,/estimate does not itself create a booking or final price/i);
});

test('customer privacy requests require an authenticated active customer',()=>{
  const api=read('api/customer-privacy.js');
  assert.match(api,/requireCustomer\(req\)/);
  assert.match(api,/privacy_requests\?customer_id=eq/);
  assert.match(api,/identity_status:'verified'/);
  assert.match(api,/status:'received'/);
  assert.match(api,/several privacy requests open/i);
});

test('self-service data copy is authenticated, includes customer payment-policy evidence and excludes private provider fields',()=>{
  const api=read('api/customer-data-export.js');
  assert.match(api,/requireCustomer\(req\)/);
  assert.match(api,/Content-Disposition/);
  assert.match(api,/formal subject access response/i);
  assert.match(api,/payment_policy_revision/);
  assert.match(api,/payment_policy_locked_at/);
  assert.match(api,/payment_policy_snapshot/);
  assert.match(api,/deposit_required/);
  for(const forbidden of ['admin_notes','staff_notes','guest_token','confirmation_token','unsubscribe_token','provider_payment_id','provider_balance_transaction','provider_fee','recorded_by'])assert.doesNotMatch(api,new RegExp(forbidden));
});

test('Admin privacy operations require the legal permission and create audit records',()=>{
  const api=read('api/admin-privacy.js'),legal=read('api/admin-legal.js');
  assert.match(api,/requireStaff\(req,'legal'\)/);
  assert.match(api,/privacy\.request_create/);
  assert.match(api,/privacy\.request_update/);
  assert.match(api,/response summary before completing or refusing/i);
  assert.match(legal,/requireStaff\(req,'legal'\)/);
  assert.match(legal,/sanitizeLegalHtml/);
  assert.match(legal,/version:nextVersion/);
  assert.match(legal,/legal\.publish/);
});

test('My Namdar and Admin keep the privacy centres in the current release loader',()=>{
  const account=read('account.js'),admin=read('admin.js'),customer=read('account-privacy-center.js'),staff=read('admin-privacy-center.js');
  assert.match(account,/6\.4\.35-payment-policy-engine-1/);
  assert.match(account,/account-privacy-center\.js/);
  assert.match(admin,/6\.4\.35-payment-policy-engine-1/);
  assert.match(admin,/admin-privacy-center\.js/);
  assert.match(customer,/Privacy & data/);
  assert.match(customer,/customer-data-export/);
  assert.match(customer,/customer-privacy/);
  assert.match(staff,/Privacy & GDPR/);
  assert.match(staff,/Controller legal identity & postal address/);
  assert.match(staff,/ICO data-protection fee self-assessment/);
});

test('cookie settings can be reopened and optional advertising can be withdrawn',()=>{
  const controls=read('privacy-controls.js'),journey=read('booking-journey.js'),legalPage=read('legal-page.js');
  assert.match(controls,/Cookie settings/);
  assert.match(controls,/Essential only/);
  assert.match(controls,/Allow optional advertising/);
  assert.match(controls,/previous==='marketing'&&choice==='essential'/);
  assert.match(controls,/location\.reload\(\)/);
  assert.match(journey,/privacy-controls\.js/);
  assert.match(legalPage,/privacy-controls\.js/);
});
