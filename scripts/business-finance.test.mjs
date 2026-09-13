import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');

test('admin loader includes private Business Finance module',()=>{
  const source=read('admin.js');
  assert.match(source,/admin-business-finance\.js/);
  assert.match(source,/6\.4\.24-business-finance-1/);
});

test('public site settings never expose private finance settings',()=>{
  const source=read('api/public-data.js');
  assert.match(source,/publicKeys=new Set\(\['brand','appearance','maintenance','advertising','contact'\]\)/);
  assert.doesNotMatch(source,/finance_private/);
});

test('finance dashboard uses cash ledger, private expenses and explicit estimate disclaimer',()=>{
  const source=read('api/admin-business-finance.js');
  assert.match(source,/payment_records\?/);
  assert.match(source,/business_expenses\?/);
  assert.match(source,/Management estimate only, not an HMRC assessment/);
  assert.match(source,/operational job-cost estimates exist/);
});

test('expense mutations require settings permission and reads require analytics',()=>{
  const source=read('api/admin-finance-expenses.js');
  assert.match(source,/requireStaff\(req,'analytics'\)/);
  assert.match(source,/requireStaff\(req,'settings'\)/);
});

test('private finance settings are stored under a non-public key',()=>{
  const source=read('api/admin-finance-settings.js');
  assert.match(source,/finance_private/);
  assert.match(source,/privateFinancialValuesRedacted:true/);
});
