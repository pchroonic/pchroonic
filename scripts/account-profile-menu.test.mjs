#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync(new URL('../account.html',import.meta.url),'utf8');
const js=fs.readFileSync(new URL('../account-original.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../styles.css',import.meta.url),'utf8');

test('My Namdar has an accessible profile dropdown',()=>{
  assert.match(html,/id="accountProfileMenuButton"/);
  assert.match(html,/aria-controls="accountProfileMenu"/);
  assert.match(html,/id="accountProfileMenu"/);
  assert.match(html,/data-profile-menu-panel="profilePanel"/);
  assert.match(html,/data-profile-menu-panel="messagesPanel"/);
  assert.match(html,/data-profile-menu-panel="securityPanel"/);
  assert.match(html,/id="signOut"/);
});

test('utility sections are removed from the horizontal portal tabs',()=>{
  const tabs=(html.match(/<div class="portal-tabs">([\s\S]*?)<\/div>/)||[])[1]||'';
  assert.doesNotMatch(tabs,/data-portal-tab="profilePanel"/);
  assert.doesNotMatch(tabs,/data-portal-tab="messagesPanel"/);
  assert.doesNotMatch(tabs,/data-portal-tab="securityPanel"/);
  for(const panel of ['overviewPanel','quotesPanel','bookingsPanel','billingPanel','ticketsPanel','projectsPanel','subscriptionsPanel','rewardsPanel']) assert.match(tabs,new RegExp('data-portal-tab="'+panel+'"'));
});

test('profile-menu panels can open without a horizontal tab button',()=>{
  assert.match(js,/if\(!panel\)return/);
  assert.match(js,/if\(b\)b\.classList\.add\('active'\)/);
});

test('profile menu closes on selection, outside click and Escape',()=>{
  assert.match(js,/data-profile-menu-panel/);
  assert.match(js,/setAccountProfileMenu\(false\)/);
  assert.match(js,/e\.key==='Escape'/);
  assert.match(js,/account-profile-menu-wrap/);
});

test('profile menu styles are present and collection helper misuse stays forbidden',()=>{
  assert.match(css,/\.account-profile-menu\{/);
  assert.match(css,/\.account-profile-button\{/);
  assert.doesNotMatch(js,/(?<!\$)\$\([^\n;]*?\)\.forEach\s*\(/g);
});
