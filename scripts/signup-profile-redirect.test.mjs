#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync(new URL('../account-original.js',import.meta.url),'utf8');

test('incomplete customer accounts route to My details',()=>{
  assert.match(source,/function focusMissingProfileField\(p=\{\}\)/);
  assert.match(source,/showPortalPanel\('profilePanel',\{updateUrl:true\}\)/);
});

test('missing mobile receives first focus',()=>{
  assert.match(source,/const missingPhone=!String\(p\.phone\|\|''\)\.trim\(\)/);
  assert.match(source,/missingPhone\?\$\('#profilePhone'\)/);
});

test('explicit deep links are preserved',()=>{
  assert.match(source,/params\.get\('tab'\)\|\|params\.get\('quote'\)\|\|params\.get\('booking'\)\|\|params\.get\('message'\)/);
});
