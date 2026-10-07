import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {normalizeSalesVatSettings,validateSalesVatSettings,salesVatEffective,snapshotFromNet,snapshotFromGross}=require('../lib/sales-vat');
const {headlinePriceWithAllowance}=require('../lib/payment-policy');

test('sales VAT stays off by default',()=>{
  const s=normalizeSalesVatSettings({});
  assert.equal(s.vatRegistered,false);
  assert.equal(s.vatRatePercent,20);
  assert.equal(salesVatEffective(s,new Date('2026-10-07T12:00:00Z')),false);
  assert.deepEqual(snapshotFromNet(100,s,new Date('2026-10-07T12:00:00Z')).grossAmount,100);
});

test('VAT activation requires registration date and number',()=>{
  const bad=validateSalesVatSettings({vatRegistered:true,vatRatePercent:20});
  assert.equal(bad.ok,false);
  assert.match(bad.errors.join(' '),/registration date/i);
  assert.match(bad.errors.join(' '),/registration number/i);
});

test('future VAT registration does not activate early',()=>{
  const s={vatRegistered:true,vatRegistrationDate:'2026-11-01',vatRegistrationNumber:'GB 123 4567 89',vatRatePercent:20};
  assert.equal(salesVatEffective(s,new Date('2026-10-07T12:00:00Z')),false);
  assert.equal(salesVatEffective(s,new Date('2026-11-01T12:00:00Z')),true);
});

test('20 percent VAT snapshot converts net and gross consistently',()=>{
  const p={vatRegistered:true,vatRegistrationDate:'2026-10-01',vatRegistrationNumber:'GB 123 4567 89',vatRatePercent:20,revision:3};
  const net=snapshotFromNet(100,p,new Date('2026-10-07T12:00:00Z'));
  assert.equal(net.netAmount,100);
  assert.equal(net.vatAmount,20);
  assert.equal(net.grossAmount,120);
  assert.equal(net.registrationNumber,'GB 123 4567 89');
  const gross=snapshotFromGross(120,net);
  assert.equal(gross.netAmount,100);
  assert.equal(gross.vatAmount,20);
  assert.equal(gross.grossAmount,120);
});

test('processing allowance accounts for fee charged on VAT-inclusive total',()=>{
  const policy={headlineAllowanceActive:true,headlineAllowancePercent:1.5,headlineAllowanceFixed:.2};
  const preVat=headlinePriceWithAllowance(100,policy,20);
  assert.equal(preVat,102.04);
  const vat=snapshotFromNet(preVat,{vatRegistered:true,vatRegistrationDate:'2026-10-01',vatRegistrationNumber:'GB 123 4567 89',vatRatePercent:20},new Date('2026-10-07T12:00:00Z'));
  assert.equal(vat.grossAmount,122.45);
  const stripeFee=Number((vat.grossAmount*.015+.2).toFixed(2));
  const afterVatAndFee=Number((vat.grossAmount-vat.vatAmount-stripeFee).toFixed(2));
  assert.equal(afterVatAndFee,100);
});
