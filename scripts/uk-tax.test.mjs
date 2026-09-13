import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const tax=require('../lib/uk-tax.js');

test('detects UK tax year around 6 April',()=>{
  assert.equal(tax.taxYearFor('2026-04-05T12:00:00Z'),'2025-26');
  assert.equal(tax.taxYearFor('2026-04-06T00:00:00Z'),'2026-27');
});

test('2026-27 sole trader estimate uses incremental income tax plus Class 4 NI',()=>{
  const r=tax.estimateSoleTrader({taxYear:'2026-27',businessProfit:30000,otherTaxableIncome:0,taxReserved:1000});
  assert.equal(r.incomeTaxFromBusiness,3486);
  assert.equal(r.class4NationalInsurance,1045.8);
  assert.equal(r.estimatedLiability,4531.8);
  assert.equal(r.reserveGap,3531.8);
  assert.equal(r.paymentsOnAccountMayApply,true);
  assert.equal(r.potentialPaymentOnAccount,2265.9);
});

test('other taxable income consumes allowance and bands before business profit',()=>{
  const r=tax.estimateSoleTrader({taxYear:'2026-27',businessProfit:10000,otherTaxableIncome:30000});
  assert.equal(r.incomeTaxFromBusiness,2000);
  assert.equal(r.class4NationalInsurance,0);
});

test('personal allowance tapers above 100k and reaches zero at 125140',()=>{
  const rules=tax.rulesFor('2026-27');
  assert.equal(tax.personalAllowance(100000,rules),12570);
  assert.equal(tax.personalAllowance(110000,rules),7570);
  assert.equal(tax.personalAllowance(125140,rules),0);
});

test('losses produce no current tax estimate and are flagged for specialist treatment',()=>{
  const r=tax.estimateSoleTrader({taxYear:'2026-27',businessProfit:-2500});
  assert.equal(r.estimatedLiability,0);
  assert.equal(r.lossNotModelled,true);
});

test('MTD thresholds remain explicit rather than inferring obligation from current turnover alone',()=>{
  assert.deepEqual(tax.mtdThresholds().map(x=>x.qualifyingIncomeOver),[50000,30000,20000]);
});
