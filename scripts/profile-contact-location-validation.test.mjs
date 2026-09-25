#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync(new URL('../account.html',import.meta.url),'utf8');
const js=fs.readFileSync(new URL('../account-original.js',import.meta.url),'utf8');

test('mobile entry supports international prefix selection and OTP verification',()=>{
  assert.match(html,/id="profilePhoneCode"/);
  assert.match(html,/UK \+44/);
  assert.match(html,/id="profilePhoneVerify"/);
  assert.match(html,/id="profilePhoneOtp"/);
  assert.match(js,/x\.startsWith\('00'\)/);
  assert.match(js,/type:'phone_change'/);
  assert.match(js,/phone_verified:true/);
});

test('location and property selectors require an explicit choice',()=>{
  assert.match(html,/id="profileRegion" required/);
  assert.match(html,/id="profileDistrict" required/);
  assert.match(html,/id="profilePropertyType" required><option value="">Select property type/);
  assert.match(html,/id="profileRegionOther"/);
  assert.match(html,/id="profileDistrictOther"/);
  assert.match(html,/id="profilePropertyTypeOther"/);
  assert.match(js,/Select area \/ region/);
  assert.match(js,/Other \/ not listed/);
});

test('postcode edits invalidate stale location verification and map',()=>{
  assert.match(js,/Postcode changed — press Find address to verify it again/);
  assert.match(js,/frame\.removeAttribute\('src'\)/);
  assert.match(js,/fillRegion\(prefix,'',''\)/);
});

test('provider failures are distinguished from genuine zero address results',()=>{
  assert.match(js,/lookup\.providerAvailable===false/);
  assert.match(js,/address lookup service is temporarily unavailable/i);
});
