#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const src=fs.readFileSync(new URL('../api/admin-getaddress-status.js',import.meta.url),'utf8');

test('GetAddress admin diagnostic is staff-only and server-side',()=>{
  assert.match(src,/requireStaff\(req,'settings'\)/);
  assert.match(src,/GETADDRESS_ADMIN_KEY/);
  assert.doesNotMatch(src,/console\.log\([^\n]*adminKey/);
});

test('diagnostic reads only safe subscription and usage endpoints',()=>{
  assert.match(src,/\/v2\/subscription/);
  assert.match(src,/\/v3\/usage/);
  assert.match(src,/safeSubscription/);
  assert.match(src,/safeUsage/);
});
