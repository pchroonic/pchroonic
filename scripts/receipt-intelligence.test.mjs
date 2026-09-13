import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {extractReceipt,merchantKey}=require('../lib/receipt-intelligence');

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
