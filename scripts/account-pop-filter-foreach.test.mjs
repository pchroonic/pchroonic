#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const src=fs.readFileSync(new URL('../account-original.js',import.meta.url),'utf8');

test('collection selectors use $$ before forEach',()=>{
  assert.doesNotMatch(src, /\$\('\[data-pop-filter\]'\)\.forEach/g);
  const matches=src.match(/\$\$\('\[data-pop-filter\]'\)\.forEach/g)||[];
  assert.equal(matches.length,3);
});

test('account bootstrap still reaches init after notification handlers are wired',()=>{
  const handler=src.indexOf("if(!redirectLegacyHost())");
  const init=src.indexOf("init().catch",handler);
  assert.ok(handler>=0&&init>handler);
});
