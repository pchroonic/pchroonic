#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync(new URL('../account.html',import.meta.url),'utf8');
const js=fs.readFileSync(new URL('../account-original.js',import.meta.url),'utf8');
const watchdog=fs.readFileSync(new URL('../account-boot-watchdog.js',import.meta.url),'utf8');

test('account watchdog is external and loads before account-original.js',()=>{
  const wd=html.indexOf('/account-boot-watchdog.js?v=6.4.82-runtime-diagnostic');
  const app=html.indexOf('account-original.js?v=6.4.88-postcode-first');
  assert.ok(wd>=0&&app>wd);
  assert.doesNotMatch(html,/src=["']\/?account\.js/);
  assert.doesNotMatch(html,/window\.__namdarAccountBoot=\{phase:'html-ready'/);
});

test('external watchdog captures browser runtime and resource errors',()=>{
  assert.match(watchdog,/addEventListener\('error'/);
  assert.match(watchdog,/RESOURCE /);
  assert.match(watchdog,/JS /);
  assert.match(watchdog,/unhandledrejection/);
  assert.match(watchdog,/PROMISE /);
});

test('external watchdog cannot leave restore spinner visible forever',()=>{
  assert.match(watchdog,/setTimeout\(.*8000/s);
  assert.match(watchdog,/loading\.classList\.add\('hidden'\)/);
  assert.match(watchdog,/ACCOUNT-BOOT-/);
});

test('bootstrap records concrete startup phases and clears watchdog on ready',()=>{
  for(const phase of ['init-start','config-fetch','supabase-library','supabase-client','initial-session','render-state','ready']){
    assert.match(js,new RegExp(`phase='${phase}'`));
  }
  assert.match(js,/clearTimeout\(window\.__namdarAccountBootTimer\)/);
});
