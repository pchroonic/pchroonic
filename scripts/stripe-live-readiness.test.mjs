import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {stripeKeyMode,providerReadiness}=require('../lib/payment-policy.js');
const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const makeEnv=values=>(key,fallback='')=>Object.prototype.hasOwnProperty.call(values,key)?values[key]:fallback;

test('Stripe key mode recognises live, test, restricted and missing keys without exposing secrets',()=>{
  assert.equal(stripeKeyMode('sk_live_example'),'live');
  assert.equal(stripeKeyMode('rk_live_example'),'live');
  assert.equal(stripeKeyMode('sk_test_example'),'test');
  assert.equal(stripeKeyMode('rk_test_example'),'test');
  assert.equal(stripeKeyMode(''),'unconfigured');
  assert.equal(stripeKeyMode('not-a-stripe-key'),'unknown');
});

test('production refuses test Stripe keys even when a webhook secret exists',()=>{
  const p=providerReadiness(makeEnv({VERCEL_ENV:'production',STRIPE_SECRET_KEY:'sk_test_example',STRIPE_WEBHOOK_SECRET:'whsec_example'}));
  assert.equal(p.stripeConfigured,true);assert.equal(p.webhookConfigured,true);assert.equal(p.stripeMode,'test');assert.equal(p.testReady,true);assert.equal(p.liveReady,false);assert.equal(p.ready,false);
  assert.match(p.activationBlockReason,/test-mode key/i);
});

test('production accepts only recognised live Stripe keys with a webhook',()=>{
  const live=providerReadiness(makeEnv({VERCEL_ENV:'production',STRIPE_SECRET_KEY:'sk_live_example',STRIPE_WEBHOOK_SECRET:'whsec_example'}));
  assert.equal(live.stripeMode,'live');assert.equal(live.liveReady,true);assert.equal(live.ready,true);assert.equal(live.activationBlockReason,'');
  const unknown=providerReadiness(makeEnv({VERCEL_ENV:'production',STRIPE_SECRET_KEY:'secret_example',STRIPE_WEBHOOK_SECRET:'whsec_example'}));
  assert.equal(unknown.stripeMode,'unknown');assert.equal(unknown.ready,false);assert.match(unknown.activationBlockReason,/recognised live Stripe secret key/i);
});

test('preview/test environments can exercise Stripe test keys without making production live-ready',()=>{
  const p=providerReadiness(makeEnv({VERCEL_ENV:'preview',STRIPE_SECRET_KEY:'sk_test_example',STRIPE_WEBHOOK_SECRET:'whsec_example'}));
  assert.equal(p.testReady,true);assert.equal(p.liveReady,false);assert.equal(p.ready,true);assert.equal(p.production,false);
});

test('Admin payment controls surface mode and use the provider activation block reason',()=>{
  const api=read('api/admin-payment-settings.js'),ui=read('admin-payment-settings.js'),loader=read('admin.js');
  assert.match(api,/stripeMode:provider\.stripeMode/);assert.match(api,/activationBlockReason:provider\.activationBlockReason/);assert.match(api,/provider\.activationBlockReason\|\|/);
  assert.match(ui,/Stripe mode:/);assert.match(ui,/TEST only/);assert.match(ui,/Production live-ready:/);assert.match(ui,/Production activation requires a recognised Stripe LIVE secret key/);
  assert.match(loader,/6\.4\.44-stripe-live-readiness-1/);assert.match(loader,/admin-payment-settings\.js\?v=\$\{paymentV\}/);
});
