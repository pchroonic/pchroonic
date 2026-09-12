#!/usr/bin/env node

import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { queueTargetForRun, MAX_DAILY_LOOKUPS } = require('../lib/address-harvest-priority.js');

test('manual harvest discovers only enough covered candidates for the requested run', () => {
  assert.equal(queueTargetForRun('manual', 1), 1);
  assert.equal(queueTargetForRun('manual', 5), 5);
  assert.equal(queueTargetForRun('manual', MAX_DAILY_LOOKUPS), MAX_DAILY_LOOKUPS);
});

test('manual discovery target remains inside the hard daily maximum', () => {
  assert.equal(queueTargetForRun('manual', 999), MAX_DAILY_LOOKUPS);
  assert.equal(queueTargetForRun('manual', 0), 1);
  assert.equal(queueTargetForRun('manual', 'not-a-number'), 1);
});

test('automatic harvest keeps a deep queue for daily operation', () => {
  assert.equal(queueTargetForRun('cron', 1), 80);
  assert.equal(queueTargetForRun('cron', 10), 80);
  assert.equal(queueTargetForRun('cron', 20), 120);
});
