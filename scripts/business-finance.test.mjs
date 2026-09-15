import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');

test('admin loader includes private Business Finance, setup polish and smart receipts',()=>{
  const source=read('admin.js');
  assert.match(source,/admin-business-finance\.js/);
  assert.match(source,/admin-business-finance-polish\.js/);
  assert.match(source,/admin-finance-receipts\.js/);
  assert.match(source,/6\.4\.36-admin-logo-upload-1/);
});

test('public site settings never expose private finance settings',()=>{
  const source=read('api/public-data.js');
  assert.match(source,/publicKeys=new Set\(\['brand','appearance','maintenance','advertising','contact'\]\)/);
  assert.doesNotMatch(source,/finance_private/);
});

test('finance API uses real cash ledger, private expenses and explicit estimate disclaimer',()=>{
  const source=read('api/admin-business-finance.js');
  assert.match(source,/payment_records\?/);
  assert.match(source,/business_expenses\?/);
  assert.match(source,/provider_livemode/);
  assert.match(source,/row\?\.method!=='stripe'\|\|row\?\.provider_livemode===true/);
  assert.match(source,/excludedSandboxStripeRows/);
  assert.match(source,/Management estimate only, not an HMRC assessment/);
});

test('finance UI warns that operational job-cost estimates are not tax expenses',()=>{
  const source=read('admin-business-finance.js');
  assert.match(source,/operational job-cost estimates exist/);
  assert.match(source,/not automatically treated as tax expenses/);
});

test('finance setup polish hides premature tax timeline and irrelevant dates',()=>{
  const source=read('admin-business-finance-polish.js');
  assert.match(source,/Finish finance setup/);
  assert.match(source,/Tax timeline not activated yet/);
  assert.match(source,/financeIncorporationDate/);
  assert.match(source,/limited_company/);
  assert.match(source,/financeVatDate/);
  assert.match(source,/financeVatRegistered/);
  assert.match(source,/defaultValue/);
});

test('expense mutations require settings permission, reads require analytics and validation returns 400',()=>{
  const source=read('api/admin-finance-expenses.js');
  assert.match(source,/requireStaff\(req,'analytics'\)/);
  assert.match(source,/requireStaff\(req,'settings'\)/);
  assert.match(source,/Object\.assign\(new Error\(message\),\{status:400\}\)/);
  assert.doesNotMatch(source,/statusCode:400/);
});

test('private finance settings are stored under a non-public key',()=>{
  const source=read('api/admin-finance-settings.js');
  assert.match(source,/finance_private/);
  assert.match(source,/privateFinancialValuesRedacted:true/);
});
