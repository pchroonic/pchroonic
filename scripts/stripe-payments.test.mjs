import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {normalizePaymentPolicy,providerReadiness,checkoutPlan}=require('../lib/payment-policy.js');
const {checkoutIdempotencyKey,verifyStripeSignature}=require('../lib/stripe-payments.js');
const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');

test('payment policy is safely disabled by default and needs both provider secrets',()=>{
  const policy=normalizePaymentPolicy({});
  assert.equal(policy.active,false);assert.equal(policy.mode,'optional');assert.equal(policy.depositPercent,20);assert.equal(policy.minimumDeposit,10);
  assert.deepEqual(providerReadiness((name)=>name==='STRIPE_SECRET_KEY'?'sk_test_x':''),{stripeConfigured:true,webhookConfigured:false,ready:false});
  assert.equal(providerReadiness((name)=>name==='STRIPE_SECRET_KEY'?'sk_test_x':name==='STRIPE_WEBHOOK_SECRET'?'whsec_x':'').ready,true);
});

test('checkout planning supports configurable deposits, full payment and balance',()=>{
  const base={effectiveActive:true,mode:'deposit_required',depositPercent:20,minimumDeposit:10,allowFullPayment:true};
  assert.deepEqual(checkoutPlan({policy:base,total:100,net:0,outstanding:100}),{kind:'deposit',amount:20,required:true});
  assert.deepEqual(checkoutPlan({policy:{...base,mode:'full_required'},total:100,net:0,outstanding:100}),{kind:'full',amount:100,required:true});
  assert.deepEqual(checkoutPlan({policy:base,total:100,net:20,outstanding:80}),{kind:'balance',amount:80,required:true});
});

test('Stripe webhook signatures require the exact raw body and recent timestamp',()=>{
  const secret='whsec_test_only',raw=Buffer.from('{"id":"evt_test"}'),timestamp=1800000000,signature=crypto.createHmac('sha256',secret).update(Buffer.concat([Buffer.from(`${timestamp}.`),raw])).digest('hex');
  assert.equal(verifyStripeSignature(raw,`t=${timestamp},v1=${signature}`,secret,{nowSeconds:timestamp}),true);
  assert.equal(verifyStripeSignature(Buffer.from('{"id":"changed"}'),`t=${timestamp},v1=${signature}`,secret,{nowSeconds:timestamp}),false);
  assert.equal(verifyStripeSignature(raw,`t=${timestamp},v1=${signature}`,secret,{nowSeconds:timestamp+301}),false);
});

test('Checkout creation is Window-only, policy-gated and idempotent',()=>{
  const api=read('api/create-checkout.js'),key=checkoutIdempotencyKey({invoiceId:'invoice-private-id',net:0,outstanding:100,kind:'deposit',amount:20});
  assert.match(api,/loadPaymentPolicy/);assert.match(api,/!policy\.ready/);assert.match(api,/!policy\.effectiveActive/);assert.match(api,/quote\.service_key!=='windows'/);assert.match(api,/checkoutIdempotencyKey/);assert.match(api,/createCheckoutSession/);
  assert.ok(key.startsWith('namdar_checkout_'));assert.equal(key.includes('invoice-private-id'),false);
});

test('verified webhook is authoritative and idempotent; browser status cannot create payments',()=>{
  const webhook=read('api/stripe-webhook.js'),status=read('api/payment-status.js');
  assert.match(webhook,/verifyStripeSignature/);assert.match(webhook,/bodyParser:false/);assert.match(webhook,/payment_records\?on_conflict=provider_reference/);assert.match(webhook,/resolution=ignore-duplicates/);assert.match(webhook,/syncInvoicePaymentState/);assert.match(webhook,/stripe_refund:/);
  assert.doesNotMatch(status,/db\('payment_records',\{method:'POST'/);assert.match(status,/pendingWebhook/);assert.match(status,/provider_reference=eq\./);
});

test('Admin and customer payment surfaces are extensions and do not expose secret values',()=>{
  const adminApi=read('api/admin-payment-settings.js'),admin=read('admin-payment-settings.js'),account=read('account-payments.js');
  assert.match(adminApi,/requireStaff\(req,'settings'\)/);assert.match(adminApi,/!provider\.ready/);assert.match(adminApi,/payments\.settings_update/);assert.doesNotMatch(adminApi,/STRIPE_SECRET_KEY.*return/);
  assert.match(read('admin.js'),/admin-payment-settings\.js/);assert.match(read('account.js'),/account-payments\.js/);assert.match(admin,/Card details are never stored by Namdar/);assert.match(account,/checkout\.stripe\.com/);
});
