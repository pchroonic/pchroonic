#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');

test('homepage auth callback never re-enters getSession',()=>{
  const init=app.slice(app.indexOf('async function initSupabase()'),app.indexOf('function initTurnstile'));
  assert.match(init,/onAuthStateChange\(\(event,session\)=>/);
  assert.match(init,/setTimeout\(\(\)=>applyAccountSession\(session\)/);
  const callback=init.slice(init.indexOf('onAuthStateChange'),init.indexOf('await refreshAccountState'));
  assert.doesNotMatch(callback,/getSession\(\)/);
});

test('homepage still performs one normal initial session read outside callback',()=>{
  assert.match(app,/async function refreshAccountState\(\).*await sb\.auth\.getSession\(\)/s);
});

test('homepage loader cache is bumped',()=>{
  assert.match(html,/app\.js\?v=6\.4\.77-homepage-auth-lock/);
});
