#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const src=fs.readFileSync(new URL('../account-original.js',import.meta.url),'utf8');

test('fresh sign-in clears stale recovery UI before authenticating',()=>{
  assert.match(src,/setAuthSuccess\(''\);setBusy\(btn,true,'Signing in…'\);setAuthStatus\('Signing in…'\)/);
});

test('editing login fields clears only the stale session-recovery warning',()=>{
  assert.match(src,/startsWith\('We could not restore your secure session'\)/);
  assert.match(src,/\['#loginEmail','#loginPassword'\]/);
});
