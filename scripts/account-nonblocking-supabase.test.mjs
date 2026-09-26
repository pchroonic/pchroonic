#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync(new URL('../account.html',import.meta.url),'utf8');
const js=fs.readFileSync(new URL('../account-original.js',import.meta.url),'utf8');

test('account HTML never blocks account startup on an external Supabase script',()=>{
  assert.doesNotMatch(html,/src=["']https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js/);
  assert.doesNotMatch(html,/src=["']https:\/\/unpkg\.com\/@supabase\/supabase-js/);
  assert.match(html,/account-original\.js\?v=6\.4\.88-postcode-first/);
});

test('account bootstrap loads Supabase dynamically with bounded primary and fallback attempts',()=>{
  assert.match(js,/loadScriptOnce\('https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@2\.117\.1',4500\)/);
  assert.match(js,/loadScriptOnce\('https:\/\/unpkg\.com\/@supabase\/supabase-js@2\.117\.1',4500\)/);
  assert.match(js,/setTimeout\(\(\)=>finish\(new Error\('A secure sign-in component timed out while loading\.'\)\),timeoutMs\)/);
});

test('init phase advances before Supabase library loading begins',()=>{
  const init=js.indexOf("phase='init-start'");
  const lib=js.indexOf("phase='supabase-library'");
  assert.ok(init>=0&&lib>init);
});
