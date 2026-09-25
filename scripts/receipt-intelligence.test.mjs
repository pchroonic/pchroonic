import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {extractReceipt,merchantKey}=require('../lib/receipt-intelligence');
const {dbSafeText}=require('../lib/db-safe-text');

test('reads UK receipt supplier date total VAT and card payment',()=>{
  const text=`SCREWFIX\nCroydon Trade Counter\nReceipt 7812-ABCD\n13/09/2026 14:22\nCleaning cloths £12.00\nSqueegee £8.00\nVAT £3.33\nTOTAL £20.00\nVISA CONTACTLESS`;
  const x=extractReceipt(text);
  assert.equal(x.supplier,'SCREWFIX');
  assert.equal(x.expenseDate,'2026-09-13');
  assert.equal(x.amount,20);
  assert.equal(x.vatAmount,3.33);
  assert.equal(x.category,'materials');
  assert.equal(x.paymentMethod,'card');
  assert.equal(x.reference,'7812-ABCD');
  assert.ok(x.overallConfidence>.7);
});

test('recognises parking and warns on mixed-use sensitive categories',()=>{
  const x=extractReceipt(`RINGGO\nParking receipt\n12 Sep 2026\nTOTAL GBP 6.50\nCard payment`);
  assert.equal(x.category,'parking');
  assert.equal(x.amount,6.5);
  assert.equal(x.expenseDate,'2026-09-12');
});

test('flags fines as non-allowable',()=>{
  const x=extractReceipt(`Council Parking Charge Notice\n13/09/2026\nPenalty £80.00\nTOTAL £80.00`);
  assert.equal(x.taxTreatment,'non_allowable');
  assert.ok(x.warnings.some(w=>/fine|penalty/i.test(w)));
});

test('learned merchant rule overrides generic category safely',()=>{
  const first=extractReceipt(`ACME SUPPLIES\n13/09/2026\nTOTAL £24.00`);
  const rule={merchant_key:merchantKey(first.supplier),category:'uniform_ppe',tax_treatment:'allowable',business_use_percent:85,payment_method:'card'};
  const learned=extractReceipt(`ACME SUPPLIES\n14/09/2026\nTOTAL £18.00`,rule);
  assert.equal(learned.category,'uniform_ppe');
  assert.equal(learned.businessUsePercent,85);
  assert.equal(learned.paymentMethod,'card');
  assert.equal(learned.learnedRuleApplied,true);
});

test('merchant keys are stable and strip common company suffixes',()=>{
  assert.equal(merchantKey('Example Cleaning Supplies Ltd UK'),'example cleaning supplies');
});


test('sanitizes Vercel PDF NUL characters and keeps the foreign invoice out of GBP amount fields',()=>{
  const raw=`Page 1 of 1
Invoice
Invoice number YYVCYYP4\u00000004
Date of issue September 24, 2026
Date due September 24, 2026
Vercel Inc. @vercel
$24.00 USD due September 24, 2026
Vercel VAT ID\u0000 519803086
VAT\u0000Code: GBSL200D
Pro
Sep 24\u0000Oct 23, 2026
1 $20.00 20% $20.00
Subtotal $20.00
Standard Rate - UNITED KINGDOM (20% on $20.00) $4.00
Total $24.00
Amount due $24.00 USD`;
  const cleaned=dbSafeText(raw);
  assert.equal(cleaned.includes('\u0000'),false);
  const x=extractReceipt(cleaned);
  assert.equal(x.supplier,'Vercel Inc. @vercel');
  assert.equal(x.expenseDate,'2026-09-24');
  assert.equal(x.reference,'YYVCYYP4-0004');
  assert.equal(x.currency,'USD');
  assert.equal(x.originalAmount,24);
  assert.equal(x.originalVatAmount,4);
  assert.equal(x.amount,null);
  assert.equal(x.vatAmount,null);
  assert.equal(x.category,'software');
  assert.ok(x.warnings.some(w=>/actual GBP amount/i.test(w)));
});

test('database-safe text repairs NUL separators and lone surrogate characters',()=>{
  const cleaned=dbSafeText('ABC\u0000123\u0000 text '+String.fromCharCode(0xD800));
  assert.equal(cleaned.includes('\u0000'),false);
  assert.match(cleaned,/ABC-123\s+text/);
  assert.ok(cleaned.includes('�'));
});
