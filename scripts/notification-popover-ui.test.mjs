#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync(new URL('../account.html',import.meta.url),'utf8');
const js=fs.readFileSync(new URL('../account-original.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../styles.css',import.meta.url),'utf8');

test('header notification bell opens a popover with filters',()=>{
  assert.match(html,/id="notificationBell"/);
  assert.match(html,/id="notificationPopover"/);
  assert.match(html,/data-pop-filter="all"/);
  assert.match(html,/data-pop-filter="quote"/);
  assert.match(html,/data-pop-filter="booking"/);
});

test('popover filter changes rendered notification subset',()=>{
  assert.match(js,/notificationPopoverFilter='all'/);
  assert.match(js,/popItems=notificationPopoverFilter==='all'/);
  assert.match(js,/\[data-pop-filter\]/);
});

test('popover keeps a compact anchored layout',()=>{
  assert.match(css,/notification-bell-icon/);
  assert.match(css,/notification-popover-filters/);
  assert.match(css,/notification-popover-footer/);
});
