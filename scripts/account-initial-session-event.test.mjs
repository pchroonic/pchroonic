#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const src=fs.readFileSync(new URL('../account-original.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../account.html',import.meta.url),'utf8');

test('account startup resolves the first session from INITIAL_SESSION instead of blocking on getSession',()=>{
  const init=src.slice(src.indexOf('async function init()'),src.indexOf('async function renderState'));
  assert.match(init,/event==='INITIAL_SESSION'/);
  assert.match(init,/const initialSession=new Promise/);
  assert.doesNotMatch(init,/await sb\.auth\.getSession\(\)/);
});

test('auth state callback defers async portal rendering to avoid callback deadlocks',()=>{
  const init=src.slice(src.indexOf('async function init()'),src.indexOf('async function renderState'));
  assert.match(init,/onAuthStateChange\(\(event,sessionNow\)=>/);
  assert.match(init,/setTimeout\(\(\)=>\{\(async\(\)=>/);
  assert.doesNotMatch(init,/onAuthStateChange\(async/);
});

test('initial auth wait is bounded and loader is cache-busted',()=>{
  assert.match(src,/resolveInitial\(null\).*5000/s);
  assert.match(html,/account-original\.js\?v=6\.4\.88-postcode-first/);
});
