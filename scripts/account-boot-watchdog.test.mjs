#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync(new URL('../account.html',import.meta.url),'utf8');
const js=fs.readFileSync(new URL('../account-original.js',import.meta.url),'utf8');

test('account page has an independent boot watchdog before the loader',()=>{
  const watchdog=html.indexOf("window.__namdarAccountBoot");
  const loader=html.indexOf("account.js?v=6.4.78-boot-watchdog");
  assert.ok(watchdog>=0&&loader>watchdog,'watchdog must exist before account loader');
  assert.match(html,/setTimeout\(function\(\)[\s\S]*?,8000\)/);
});

test('watchdog cannot leave the restore spinner visible forever',()=>{
  assert.match(html,/loading\.classList\.add\('hidden'\)/);
  assert.match(html,/auth\.classList\.remove\('hidden'\)/);
  assert.match(html,/ACCOUNT-BOOT-/);
});

test('bootstrap records concrete startup phases and clears watchdog on ready',()=>{
  for(const phase of ['init-start','config-fetch','supabase-library','supabase-client','initial-session','render-state','ready']){
    assert.match(js,new RegExp(`phase='${phase}'`));
  }
  assert.match(js,/clearTimeout\(window\.__namdarAccountBootTimer\)/);
});
