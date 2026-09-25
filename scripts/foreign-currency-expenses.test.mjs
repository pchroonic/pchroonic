import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');

test('FX service uses historical reference rates and a staff-protected endpoint',()=>{
  const lib=read('lib/fx-rates.js'),api=read('api/admin-fx-rate.js');
  assert.match(lib,/api\.frankfurter\.dev\/v2/);
  assert.match(lib,/providers=/);
  assert.match(lib,/ECB via Frankfurter/);
  assert.match(lib,/for\(let back=0;back<=7;back\+\+\)/);
  assert.match(api,/requireStaff\(req,'settings'\)/);
  assert.match(api,/convertedAmount/);
});

test('expense ledger stores original foreign values and FX audit metadata',()=>{
  const api=read('api/admin-finance-expenses.js');
  for(const token of ['original_currency','original_amount','original_vat_amount','fx_rate','fx_rate_date','fx_provider','fx_reference_gbp','fx_method']){
    assert.match(api,new RegExp(token));
  }
  assert.match(api,/actual_override/);
  assert.match(api,/auto_reference/);
});

test('business finance form supports automatic foreign amount conversion',()=>{
  const ui=read('admin-business-finance.js');
  assert.match(ui,/expenseCurrency/);
  assert.match(ui,/expenseOriginalAmount/);
  assert.match(ui,/admin-fx-rate/);
  assert.match(ui,/Finding the .* → GBP rate/);
  assert.match(ui,/Edit Amount paid £ if your bank\/card charged a different sterling amount/);
  assert.match(ui,/fxPayload/);
  assert.match(ui,/actual GBP override/);
});

test('Smart Receipt feeds detected foreign currency into the FX workflow',()=>{
  const api=read('api/admin-finance-receipts.js'),ui=read('admin-finance-receipts.js');
  assert.match(api,/enrichForeignFx/);
  assert.match(api,/referenceRate/);
  assert.match(api,/fxReferenceGbp/);
  assert.match(ui,/NamdarExpenseFx/);
  assert.match(ui,/Automatic FX reference|Foreign currency converted to GBP automatically/);
  assert.match(ui,/actual card\/bank charge/);
});

test('foreign currency migration is additive and keeps an audit trail',()=>{
  const migration=read('supabase/migrations/20260925133000_foreign_currency_expense_audit.sql');
  for(const col of ['original_currency','original_amount','original_vat_amount','fx_rate','fx_rate_date','fx_provider','fx_reference_gbp','fx_method']){
    assert.match(migration,new RegExp(col));
  }
  assert.match(migration,/actual_override/);
  assert.match(migration,/auto_reference/);
});

test('Admin loader pins the FX release assets',()=>{
  const loader=read('admin.js');
  assert.match(loader,/6\.4\.58-expense-fx-1/);
});
