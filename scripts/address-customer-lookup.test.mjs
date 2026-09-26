#!/usr/bin/env node

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { normalizeSuggestion } = require('../lib/address-harvest.js');

test('GetAddress postcode suggestion normalizes into reusable master-address shape', () => {
  const row = normalizeSuggestion('SE14 5TD', {
    id:'example-id',
    address:'Flat 2~~~NAMDAR~~~Rowan House~~~NAMDAR~~~Erlanger Road~~~NAMDAR~~~~~~NAMDAR~~~London~~~NAMDAR~~~Greater London~~~NAMDAR~~~United Kingdom~~~NAMDAR~~~SE14 5TD'
  });
  assert.equal(row.source_dataset, 'getaddress-daily-cache');
  assert.equal(row.postcode, 'SE14 5TD');
  assert.match(row.display_address, /Flat 2/i);
  assert.match(row.display_address, /Rowan House/i);
  assert.equal(row.source_record_id, 'example-id');
});

test('customer address endpoint is human-lookup gated and cached', () => {
  const source = fs.readFileSync(new URL('../api/address-search.js', import.meta.url), 'utf8');
  assert.match(source, /humanInputRequired!==true/);
  assert.match(source, /operationalUseAllowed!==true/);
  assert.match(source, /GETADDRESS_API_KEY/);
  assert.match(source, /address_lookup_cache/);
  assert.match(source, /source_dataset,source_record_id/);
  assert.match(source, /limit:12,windowSeconds:600/);
});

test('full provider cache suppresses partial OSM rows in customer picker', () => {
  const source = fs.readFileSync(new URL('../api/address-search.js', import.meta.url), 'utf8');
  assert.match(source, /providerCached\?\(master\|\|\[\]\)\.filter\(a=>a\.source_dataset!==['"]osm-postcode-cache['"]\)/);
});

test('GetAddress authentication failures are never cached and are diagnosable', () => {
  const source = fs.readFileSync(new URL('../api/address-search.js', import.meta.url), 'utf8');
  assert.match(source, /provider_unauthorized/);
  assert.match(source, /!authFailure\)await saveCache/);
  assert.match(source, /providerReason/);
});

test('GetAddress lookup can use a configured API key or domain token', () => {
  const source = fs.readFileSync(new URL('../api/address-search.js', import.meta.url), 'utf8');
  assert.match(source, /GETADDRESS_API_KEY/);
  assert.match(source, /GETADDRESS_DOMAIN_TOKEN/);
});
