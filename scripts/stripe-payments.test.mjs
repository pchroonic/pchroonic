import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {normalizePaymentPolicy,providerReadiness,checkoutPlan,headlinePriceWithAllowance}=require('../lib/payment-policy.js');
const {checkoutIdempotencyKey,verifyStripeSignature,processorDetailsFromBalanceTransaction,readRawBody}=require('../lib/stripe-payments.js');
const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');

test('payment policy is safely disabled by default and needs both provider secrets',()=>{
  const policy=normalizePaymentPolicy({});
  assert.equal(policy.active,false);assert.equal(policy.mode,'optional');assert.equal(policy.depositPercent,20);assert.equal(policy.minimumDeposit,10);assert.equal(policy.headlineAllowanceActive,false);assert.equal(policy.headlineAllowancePercent,1.5);assert.equal(policy.headlineAllowanceFixed,.2);
  assert.deepEqual(providerReadiness((name)=>name==='STRIPE_SECRET_KEY'?'sk_test_x':''),{stripeConfigured:true,webhookConfigured:false,ready:false});
  assert.equal(providerReadiness((name)=>name==='STRIPE_SECRET_KEY'?'sk_test_x':name==='STRIPE_WEBHOOK_SECRET'?'whsec_x':'').ready,true);
});

test('checkout planning supports configurable deposits, full payment and balance',()=>{
  const base={effectiveActive:true,mode:'deposit_required',depositPercent:20,minimumDeposit:10,allowFullPayment:true};
  assert.deepEqual(checkoutPlan({policy:base,total:100,net:0,outstanding:100}),{kind:'deposit',amount:20,required:true});
  assert.deepEqual(checkoutPlan({policy:{...base,mode:'full_required'},total:100,net:0,outstanding:100}),{kind:'full',amount:100,required:true});
  assert.deepEqual(checkoutPlan({policy:base,total:100,net:20,outstanding:80}),{kind:'balance',amount:80,required:true});
});

test('headline payment-cost allowance is part of one normal price, not a checkout surcharge',()=>{
  assert.equal(headlinePriceWithAllowance(50,{headlineAllowanceActive:false}),50);
  assert.equal(headlinePriceWithAllowance(50,{headlineAllowanceActive:true,headlineAllowancePercent:1.5,headlineAllowanceFixed:.2}),50.96);
  const quote=read('api/quote-core.js'),admin=read('admin-payment-settings.js');
  assert.match(quote,/headlinePriceWithAllowance/);assert.match(quote,/service==='windows'/);assert.match(admin,/same headline price applies regardless/i);assert.match(admin,/not a card or Stripe surcharge/i);
  assert.doesNotMatch(quote,/card fee|stripe fee/i);
});

test('Stripe balance transaction details provide exact internal processor cost',()=>{
  const d=processorDetailsFromBalanceTransaction({id:'txn_123',fee:95,net:4905,currency:'gbp'});
  assert.deepEqual(d,{providerFee:.95,providerNet:49.05,providerFeeCurrency:'gbp',providerBalanceTransaction:'txn_123'});
});

test('Stripe webhook signatures require the exact raw body and recent timestamp',()=>{
  const secret='whsec_test_only',raw=Buffer.from('{"id":"evt_test"}'),timestamp=1800000000,signature=crypto.createHmac('sha256',secret).update(Buffer.concat([Buffer.from(`${timestamp}.`),raw])).digest('hex');
  assert.equal(verifyStripeSignature(raw,`t=${timestamp},v1=${signature}`,secret,{nowSeconds:timestamp}),true);
  assert.equal(verifyStripeSignature(Buffer.from('{"id":"changed"}'),`t=${timestamp},v1=${signature}`,secret,{nowSeconds:timestamp}),false);
  assert.equal(verifyStripeSignature(raw,`t=${timestamp},v1=${signature}`,secret,{nowSeconds:timestamp+301}),false);
});

test('raw body reader streams Vercel request before touching lazy body getter',async()=>{
  const raw=Buffer.from('{"id":"evt_stream","type":"checkout.session.completed"}');
  let getterTouched=false;
  const req={
    async *[Symbol.asyncIterator](){yield raw.subarray(0,17);yield raw.subarray(17)},
    get body(){getterTouched=true;throw new Error('Vercel request.body getter must not be accessed before raw stream');}
  };
  const got=await readRawBody(req);
  assert.deepEqual(got,raw);
  assert.equal(getterTouched,false);
});

test('Checkout creation is Window-only, policy-gated and idempotent',()=>{
  const api=read('api/create-checkout.js'),key=checkoutIdempotencyKey({invoiceId:'invoice-private-id',net:0,outstanding:100,kind:'deposit',amount:20});
  assert.match(api,/loadPaymentPolicy/);assert.match(api,/!policy\.ready/);assert.match(api,/!policy\.effectiveActive/);assert.match(api,/quote\.service_key!=='windows'/);assert.match(api,/checkoutIdempotencyKey/);assert.match(api,/createCheckoutSession/);
  assert.ok(key.startsWith('namdar_checkout_'));assert.equal(key.includes('invoice-private-id'),false);
});

test('verified webhook is authoritative, idempotent and records actual processor cost',()=>{
  const webhook=read('api/stripe-webhook.js'),status=read('api/payment-status.js'),migration=read('supabase/migrations/20260913103500_stripe_processor_fee_accounting.sql');
  assert.match(webhook,/verifyStripeSignature/);assert.match(webhook,/bodyParser:false/);assert.match(webhook,/payment_records\?on_conflict=provider_reference/);assert.match(webhook,/resolution=ignore-duplicates/);assert.match(webhook,/syncInvoicePaymentState/);assert.match(webhook,/stripe_refund:/);assert.match(webhook,/retrievePaymentProcessorDetails/);assert.match(webhook,/provider_fee/);assert.match(webhook,/provider_net/);assert.match(webhook,/provider_balance_transaction/);
  assert.match(webhook,/attachProcessorDetails/);assert.match(webhook,/processor-cost data is not ready yet/);assert.match(webhook,/err\.status=503/);
  for(const column of ['provider_payment_id','provider_balance_transaction','provider_fee','provider_net','provider_fee_currency'])assert.match(migration,new RegExp(column));
  assert.doesNotMatch(status,/db\('payment_records',\{method:'POST'/);assert.match(status,/pendingWebhook/);assert.match(status,/provider_reference=eq\./);
});

test('customer billing and PDFs never render internal processor cost fields',()=>{
  const billing=read('api/customer-billing.js'),pdf=read('api/billing-document.js');
  for(const field of ['provider_fee','provider_net','provider_balance_transaction','provider_payment_id']){assert.doesNotMatch(billing,new RegExp(field));assert.doesNotMatch(pdf,new RegExp(field))}
});

test('manual staff payment entry cannot impersonate a Stripe webhook payment',()=>{
  const adminPayments=read('api/admin-payments.js'),admin=read('admin-payment-settings.js');
  assert.match(adminPayments,/method===['"]stripe['"]/);assert.match(adminPayments,/recorded automatically from verified Stripe webhooks/i);assert.match(admin,/paymentMethod option\[value=\\?"stripe/);
});

test('required Window payment policy is enforced server-side before booking confirmation',()=>{
  const booking=read('api/admin-booking-update.js');
  assert.match(booking,/enforcePaymentBeforeConfirmation/);assert.match(booking,/loadPaymentPolicy\(\{db,env\}\)/);assert.match(booking,/paymentRequirementMet/);assert.match(booking,/Create this appointment as Pending/);assert.match(booking,/status==='confirmed'&&current\.status!=='confirmed'/);
});

test('Admin and customer payment surfaces are extensions and do not expose secret values',()=>{
  const adminApi=read('api/admin-payment-settings.js'),admin=read('admin-payment-settings.js'),account=read('account-payments.js');
  assert.match(adminApi,/requireStaff\(req,'settings'\)/);assert.match(adminApi,/!provider\.ready/);assert.match(adminApi,/payments\.settings_update/);assert.match(adminApi,/headline_allowance_active/);assert.doesNotMatch(adminApi,/STRIPE_SECRET_KEY.*return/);
  assert.match(read('admin.js'),/admin-payment-settings\.js/);assert.match(read('account.js'),/account-payments\.js/);assert.match(admin,/Card details are never stored by Namdar/);assert.match(account,/checkout\\\.stripe\\\.com/);
});
