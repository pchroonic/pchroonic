#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const config=fs.readFileSync(new URL('../api/config.js',import.meta.url),'utf8');
const js=fs.readFileSync(new URL('../account-original.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../account.html',import.meta.url),'utf8');

test('phone verification is disabled by default behind one environment flag',()=>{
  assert.match(config,/NAMDAR_PHONE_VERIFICATION_ENABLED/);
  assert.match(config,/phoneVerificationEnabled:/);
  assert.match(config,/phoneVerificationMode: 'supabase_sms'/);
  assert.match(config,/env\('NAMDAR_PHONE_VERIFICATION_ENABLED',''\)/);
});

test('unverified phone does not block account completion while SMS is off',()=>{
  assert.match(js,/phoneVerificationOn\(\)&&!p\.phone_verified/);
  assert.match(js,/function phoneVerificationOn\(\)\{return config\.phoneVerificationEnabled===true\}/);
});

test('all SMS send and verify actions are guarded by the feature flag',()=>{
  const sendProfile=js.slice(js.indexOf("$('#profilePhoneVerify').onclick"),js.indexOf("$('#profilePhoneConfirm').onclick"));
  const confirmProfile=js.slice(js.indexOf("$('#profilePhoneConfirm').onclick"),js.indexOf("$('#sendPhoneCode').onclick"));
  const sendSecurity=js.slice(js.indexOf("$('#sendPhoneCode').onclick"),js.indexOf("$('#verifyPhoneCode').onclick"));
  const confirmSecurity=js.slice(js.indexOf("$('#verifyPhoneCode').onclick"),js.indexOf("$('#enableMfa').onclick"));
  for(const block of [sendProfile,confirmProfile,sendSecurity,confirmSecurity]) assert.match(block,/if\(!phoneVerificationOn\(\)\)/);
});

test('disabled UI is honest and does not promise an SMS',()=>{
  assert.match(html,/SMS verification will become available when Namdar enables its SMS provider/);
  assert.match(js,/SMS verification coming soon/);
  assert.match(js,/Your mobile number can be saved now\. SMS verification is prepared but currently switched off\./);
});

test('phone verification release is cache-busted',()=>{
  assert.match(html,/account-original\.js\?v=6\.4\.87-phone-verification-ready/);
});
