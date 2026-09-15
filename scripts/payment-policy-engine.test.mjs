import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {
  normalizePaymentPolicy,validatePaymentPolicy,resolveDepositRule,snapshotPaymentPolicy,paymentPolicyFromSnapshot,
  paymentRequirementMet,checkoutPlan,overdueStage,commercialLatePaymentPreview
}=require('../lib/payment-policy.js');
const {overdueReminderSchedule}=require('../lib/business-followup-batched.js');
const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');

const tiered={
  active:true,mode:'deposit_required',depositStrategy:'tiered',allowFullPayment:true,balanceDueHours:0,revision:7,
  depositBands:[
    {minAmount:0,maxAmount:100,percent:20,minimumDeposit:10},
    {minAmount:100,maxAmount:250,percent:25,minimumDeposit:25},
    {minAmount:250,maxAmount:500,percent:35,minimumDeposit:60},
    {minAmount:500,maxAmount:null,percent:50,minimumDeposit:150}
  ],
  overdue:{reminderDays:[1,3,7,14],bookingHoldAfterDays:7,finalReviewAfterDays:21}
};

test('tiered deposits can rise with job value and remain editable policy data',()=>{
  assert.deepEqual(resolveDepositRule(tiered,80),{strategy:'tiered',percent:20,minimumDeposit:10,bandMin:0,bandMax:100,amount:16});
  assert.equal(resolveDepositRule(tiered,200).amount,50);
  assert.equal(resolveDepositRule(tiered,400).amount,140);
  assert.equal(resolveDepositRule(tiered,800).amount,400);
  const valid=validatePaymentPolicy(tiered);assert.equal(valid.ok,true);assert.equal(valid.policy.depositBands.length,4);
});

test('tier validation blocks gaps overlaps and decreasing protection',()=>{
  const bad=validatePaymentPolicy({...tiered,depositBands:[{minAmount:0,maxAmount:100,percent:40,minimumDeposit:20},{minAmount:110,maxAmount:null,percent:20,minimumDeposit:10}]});
  assert.equal(bad.ok,false);assert.match(bad.errors.join(' '),/gap or overlap/i);assert.match(bad.errors.join(' '),/cannot decrease/i);
});

test('booking snapshot freezes deposit balance timing and overdue rules against later Admin changes',()=>{
  const snap=snapshotPaymentPolicy(tiered,400);
  assert.equal(snap.revision,7);assert.equal(snap.depositAmount,140);assert.equal(snap.initialPaymentAmount,140);assert.equal(snap.balanceDueHours,0);assert.equal(snap.overdue.bookingHoldAfterDays,7);assert.equal(snap.consumerMonetaryLateFees,false);
  const changed=normalizePaymentPolicy({...tiered,revision:8,depositBands:[{minAmount:0,maxAmount:null,percent:90,minimumDeposit:500}],overdue:{reminderDays:[1],bookingHoldAfterDays:1,finalReviewAfterDays:2}});
  const contract=paymentPolicyFromSnapshot({...changed,effectiveActive:true},snap);
  assert.equal(contract.revision,7);assert.equal(contract.lockedDepositAmount,140);assert.equal(contract.overdue.bookingHoldAfterDays,7);assert.equal(contract.mode,'deposit_required');
});

test('required deposit checks actual money paid, not merely a part-paid status',()=>{
  const contract=paymentPolicyFromSnapshot({...normalizePaymentPolicy(tiered),effectiveActive:true},snapshotPaymentPolicy(tiered,400));
  assert.equal(paymentRequirementMet(contract,'deposit_paid',{net:1,total:400}),false);
  assert.equal(paymentRequirementMet(contract,'deposit_paid',{net:139.99,total:400}),false);
  assert.equal(paymentRequirementMet(contract,'deposit_paid',{net:140,total:400}),true);
});

test('after completion or due date checkout can require the full outstanding balance',()=>{
  const contract=paymentPolicyFromSnapshot({...normalizePaymentPolicy(tiered),effectiveActive:true},snapshotPaymentPolicy(tiered,400));
  assert.deepEqual(checkoutPlan({policy:contract,total:400,net:0,outstanding:400}),{kind:'deposit',amount:140,required:true});
  assert.deepEqual(checkoutPlan({policy:contract,total:400,net:140,outstanding:260}),{kind:'balance',amount:260,required:true});
  assert.deepEqual(checkoutPlan({policy:contract,total:400,net:0,outstanding:400,forceBalance:true}),{kind:'balance',amount:400,required:true});
});

test('consumer overdue stages escalate operationally without automatic monetary penalties',()=>{
  const snapshot=snapshotPaymentPolicy(tiered,400),now=new Date('2026-10-30T12:00:00Z');
  assert.deepEqual(overdueStage({dueAt:'2026-10-28T12:00:00Z',snapshot,now}).bookingHold,false);
  assert.equal(overdueStage({dueAt:'2026-10-20T12:00:00Z',snapshot,now}).bookingHold,true);
  assert.equal(overdueStage({dueAt:'2026-10-01T12:00:00Z',snapshot,now}).recoveryReview,true);
  assert.equal(snapshot.consumerMonetaryLateFees,false);
});

test('B2B statutory late-payment calculation is preview-only and never auto-posted',()=>{
  const small=commercialLatePaymentPreview({principal:500,daysLate:30,baseRatePercent:4}),mid=commercialLatePaymentPreview({principal:5000,daysLate:30,baseRatePercent:4}),large=commercialLatePaymentPreview({principal:12000,daysLate:30,baseRatePercent:4});
  assert.equal(small.annualRatePercent,12);assert.equal(small.recoveryCost,40);assert.equal(mid.recoveryCost,70);assert.equal(large.recoveryCost,100);assert.equal(small.automatic,false);assert.equal(small.reviewRequired,true);
});

test('new-policy overdue reminders use the frozen schedule while legacy invoices keep the old schedule',()=>{
  const snap=snapshotPaymentPolicy(tiered,400);
  assert.deepEqual(overdueReminderSchedule({payment_policy_snapshot:snap}).map(x=>x.days),[1,3,7,14]);
  assert.deepEqual(overdueReminderSchedule({}).map(x=>x.days),[1,8,15,29]);
});

test('database migration and Terms preserve non-retroactivity and prohibit automatic consumer penalties',()=>{
  const sql=read('supabase/migrations/20260915111500_flexible_payment_policy_engine.sql');
  for(const field of ['payment_policy_revision','payment_policy_locked_at','payment_policy_snapshot','deposit_required'])assert.match(sql,new RegExp(`add column if not exists ${field}`));
  assert.match(sql,/Payment due dates and overdue balances/i);assert.match(sql,/does not silently increase/i);assert.match(sql,/automatically add a consumer late-payment penalty/i);assert.match(sql,/<strong>not<\/strong> automatically/i);assert.match(sql,/Business-to-business late-payment rights are separate/i);
});

test('customer booking freezes the presented revision and can hold a new appointment for a materially overdue prior balance',()=>{
  const booking=read('api/booking-core.js'),quoteAction=read('api/customer-quote-action.js'),ui=read('account-booking-policy.js');
  assert.match(booking,/paymentPolicyRevision/);assert.match(booking,/payment_policy_snapshot:paymentSnapshot/);assert.match(booking,/payment_policy_locked_at:acceptedAt/);assert.match(booking,/overdueHoldForCustomer/);assert.match(booking,/materially overdue/i);
  assert.match(quoteAction,/paymentCommitment/);assert.match(quoteAction,/snapshotPaymentPolicy/);
  assert.match(ui,/paymentPolicyRevision:presentedPaymentRevision/);assert.match(ui,/later Namdar settings change will not retrospectively increase/i);assert.match(ui,/No automatic consumer penalty/i);
});

test('checkout, invoice and Admin confirmation use the frozen booking policy instead of a future deposit setting',()=>{
  const checkout=read('api/create-checkout.js'),server=read('lib/server.js'),adminBooking=read('api/admin-booking-update.js');
  assert.match(checkout,/paymentPolicyFromSnapshot/);assert.match(checkout,/forceBalance/);assert.match(server,/payment_policy_snapshot/);assert.match(server,/balanceDueAt/);assert.match(adminBooking,/paymentPolicyFromSnapshot/);assert.match(adminBooking,/lockedDepositAmount/);
});

test('release loaders and Admin settings expose flexible policy controls while commercial payments remain opt-in',()=>{
  const account=read('account.js'),admin=read('admin.js'),settings=read('admin-payment-settings.js'),api=read('api/admin-payment-settings.js');
  assert.match(account,/6\.4\.35-payment-policy-engine-1/);assert.match(admin,/6\.4\.35-payment-policy-engine-1/);assert.match(settings,/Increase deposit by job value/);assert.match(settings,/Pause new appointments after/);assert.match(settings,/automatically disabled/i);assert.match(api,/policy_revision/);assert.match(api,/consumer_monetary_late_fees:false/);
  assert.match(read('lib/payment-policy.js'),/active:false/);
});
