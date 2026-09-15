import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');

test('smart receipt API is staff protected and review-first',()=>{
  const api=read('api/admin-finance-receipts.js');
  assert.match(api,/requireStaff\(req,'analytics'\)/);
  assert.match(api,/requireStaff\(req,'settings'\)/);
  assert.match(api,/action==='prepare'/);
  assert.match(api,/action==='analyze'/);
  assert.match(api,/status:'review'/);
  assert.match(api,/sha256/);
  assert.match(api,/duplicateExpenses/);
});

test('expense save attaches receipt and learns reviewed merchant choices',()=>{
  const api=read('api/admin-finance-expenses.js');
  assert.match(api,/receiptId/);
  assert.match(api,/status:'attached'/);
  assert.match(api,/source='receipt'|row\.source='receipt'/);
  assert.match(api,/learnMerchant/);
  assert.match(api,/business_expense_merchant_rules/);
});

test('browser receipt reader keeps OCR local and requires review before save',()=>{
  const ui=read('admin-finance-receipts.js');
  assert.match(ui,/tesseract\.js@7\.0\.0/);
  assert.match(ui,/pdfjs-dist@4\.10\.38/);
  assert.match(ui,/OCR runs in this browser/);
  assert.match(ui,/Review every suggested field/);
  assert.match(ui,/possible duplicate/i);
  assert.match(ui,/finance-receipts/);
});

test('admin loader and CSP keep receipt workflow dependencies',()=>{
  const loader=read('admin.js'),vercel=read('vercel.json');
  assert.match(loader,/6\.4\.36-admin-logo-upload-1/);
  assert.match(loader,/admin-finance-receipts\.js/);
  assert.match(vercel,/connect-src[^\n]*cdn\.jsdelivr\.net/);
  assert.match(vercel,/worker-src[^\n]*cdn\.jsdelivr\.net/);
});
