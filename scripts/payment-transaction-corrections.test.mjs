import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');

test('payment correction schema keeps original rows and records who voided them',()=>{
  const migration=read('supabase/migrations/20261005193000_payment_transaction_corrections.sql');
  for(const column of ['voided_at','voided_by','void_reason'])assert.match(migration,new RegExp(column));
  assert.match(migration,/foreign key \(voided_by\) references public\.profiles\(id\)/i);
  assert.match(migration,/where voided_at is null/i);
  assert.doesNotMatch(migration,/delete from public\.payment_records/i);
});

test('invoice state ignores voided transactions without deleting audit history',()=>{
  const server=read('lib/server-original.js');
  assert.match(server,/select=id,direction,amount,paid_at,voided_at/);
  assert.match(server,/activePayments=\(payments\|\|\[\]\)\.filter\(p=>!p\.voided_at\)/);
  assert.match(server,/payments:activePayments,allPayments:payments/);
});

test('admin can correct manual transactions but provider transactions stay authoritative',()=>{
  const api=read('api/admin-payments.js'),ui=read('admin-original.js');
  assert.match(api,/action==='void_transaction'/);
  assert.match(api,/Only a Namdar administrator can correct a recorded transaction/);
  assert.match(api,/payment\.method==='stripe'\|\|payment\.provider_reference\|\|payment\.provider_payment_id/);
  assert.match(api,/Stripe\/provider transactions cannot be voided locally/);
  assert.match(api,/voided_at:now,voided_by:staff\.user\.id,void_reason:reason/);
  assert.match(api,/payment\.transaction_void/);
  assert.match(ui,/data-void-transaction/);
  assert.match(ui,/Void \/ correct/);
  assert.match(ui,/No money is moved by this correction/);
});

test('customer billing, reports and finance exclude corrected transactions',()=>{
  for(const path of ['api/customer-billing.js','api/admin-reporting.js','api/admin-business-finance.js']){
    assert.match(read(path),/payment_records\?[^'\`]*voided_at=is\.null/);
  }
  assert.match(read('api/payment-status.js'),/voided_at=is\.null/);
  assert.match(read('api/stripe-webhook.js'),/voided_at=is\.null/);
});

test('billing PDFs distinguish a voided transaction from a valid receipt',()=>{
  const route=read('api/billing-document.js'),invoicePdf=read('lib/invoice-pdf.js');
  assert.match(route,/VOIDED TRANSACTION/);
  assert.match(route,/This transaction was corrected and no longer affects the invoice balance/);
  assert.match(invoicePdf,/activePayments=\(payments\|\|\[\]\)\.filter\(p=>!p\.voided_at\)/);
});

test('admin assets are cache-busted for payment transaction corrections',()=>{
  assert.match(read('admin.js'),/6\.4\.96-transaction-corrections-1/);
  assert.match(read('admin.html'),/admin\.js\?v=6\.4\.96-transaction-corrections-1/);
});
