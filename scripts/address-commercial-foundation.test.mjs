#!/usr/bin/env node

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { normalisePolicy, automationBlockReason, distributionBlockReason } = require('../lib/address-policy.js');
const { cleanPostcode, isFullPostcode, cleanUprn, hashApiKey, safeLimit, publicAddressRow } = require('../lib/address-data-api.js');

test('unreviewed address sources fail closed', () => {
  const p = normalisePolicy({}, 'unknown-source');
  assert.equal(p.operationalUseAllowed, false);
  assert.equal(p.automatedBulkIngestAllowed, false);
  assert.equal(p.commercialRedistributionAllowed, false);
  assert.equal(p.subscriptionApiAllowed, false);
  assert.equal(p.bulkExportAllowed, false);
  assert.match(automationBlockReason(p), /not permitted/i);
  assert.match(distributionBlockReason(p), /not permitted/i);
});

test('GetAddress-style restricted policy blocks automation and resale', () => {
  const p = normalisePolicy({
    source_dataset:'getaddress-daily-cache', active:true,
    operational_use_allowed:true, human_input_required:true,
    automated_bulk_ingest_allowed:false,
    commercial_redistribution_allowed:false,
    subscription_api_allowed:false,
    bulk_export_allowed:false,
    rights_notes:'Human-initiated operational lookup only.'
  });
  assert.equal(p.operationalUseAllowed, true);
  assert.equal(p.humanInputRequired, true);
  assert.equal(p.automatedBulkIngestAllowed, false);
  assert.equal(p.subscriptionApiAllowed, false);
  assert.equal(automationBlockReason(p), 'Human-initiated operational lookup only.');
});

test('licence-approved source can be eligible for a paid API', () => {
  const p = normalisePolicy({
    source_dataset:'open-source', active:true,
    operational_use_allowed:true,
    automated_bulk_ingest_allowed:true,
    commercial_redistribution_allowed:true,
    subscription_api_allowed:true,
    bulk_export_allowed:true
  });
  assert.equal(automationBlockReason(p), '');
  assert.equal(distributionBlockReason(p), '');
});

test('Address API helpers normalise and minimise public output', () => {
  assert.equal(cleanPostcode('se13aa'), 'SE1 3AA');
  assert.equal(isFullPostcode('SE1 3AA'), true);
  assert.equal(cleanUprn(' 123456789 '), '123456789');
  assert.equal(cleanUprn('abc'), '');
  assert.equal(safeLimit(999), 100);
  assert.equal(hashApiKey('same'), hashApiKey('same'));
  assert.notEqual(hashApiKey('same'), hashApiKey('different'));
  const row = publicAddressRow({ postcode:'SE1 3AA', display_address:'1 Example Road, SE1 3AA', source_dataset:'safe', source_record_id:'internal-secret', licence_name:'OGL' });
  assert.equal(row.postcode, 'SE1 3AA');
  assert.equal(row.sourceDataset, 'safe');
  assert.equal(Object.hasOwn(row, 'source_record_id'), false);
});

test('scheduled GetAddress harvesting is absent from Vercel cron config', () => {
  const config = JSON.parse(fs.readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
  const paths = (config.crons || []).map(x=>x.path);
  assert.equal(paths.includes('/api/address-harvest-cron'), false);
});

test('migration defines rights gate and subscription-safe view', () => {
  const sql = fs.readFileSync(new URL('../supabase/migrations/20260912172500_address_data_rights_and_distribution_guard.sql', import.meta.url), 'utf8');
  assert.match(sql, /getaddress-daily-cache/);
  assert.match(sql, /automated_bulk_ingest_allowed = false/);
  assert.match(sql, /commercial_redistribution_allowed = false/);
  assert.match(sql, /create or replace view public\.address_distribution_eligible/i);
  assert.match(sql, /r\.commercial_redistribution_allowed = true/i);
  assert.match(sql, /r\.subscription_api_allowed = true/i);
  assert.match(sql, /create table if not exists public\.address_api_clients/i);
  assert.match(sql, /key_hash text not null unique/i);
});

test('bulk provider export endpoint checks rights before reading rows', () => {
  const source = fs.readFileSync(new URL('../api/admin-address-harvest-export.js', import.meta.url), 'utf8');
  assert.match(source, /bulkExportAllowed/);
  assert.match(source, /Bulk export is disabled/);
});
