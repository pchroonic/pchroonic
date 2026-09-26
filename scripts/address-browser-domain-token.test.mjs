#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const config=fs.readFileSync(new URL('../api/config.js',import.meta.url),'utf8');
const js=fs.readFileSync(new URL('../account-original.js',import.meta.url),'utf8');

test('public config exposes only the domain-restricted GetAddress token',()=>{
  assert.match(config,/getAddressDomainToken: env\('GETADDRESS_DOMAIN_TOKEN',''\)/);
  assert.doesNotMatch(config,/getAddressApiKey/);
});

test('browser postcode lookup requests all suggestions with the domain token',()=>{
  assert.match(js,/api\.getAddress\.io\/autocomplete/);
  assert.match(js,/all=true/);
  assert.match(js,/show-postcode=true/);
  assert.match(js,/config\.getAddressDomainToken/);
  assert.match(js,/providerReason:'browser_domain_token'/);
});

test('selected browser suggestion resolves full structured address',()=>{
  assert.match(js,/api\.getAddress\.io\/get/);
  assert.match(js,/id\.startsWith\('ga:'\)/);
  assert.match(js,/sub_building_name/);
  assert.match(js,/building_name/);
  assert.match(js,/building_number/);
  assert.match(js,/thoroughfare/);
  assert.match(js,/town_or_city/);
  assert.match(js,/district/);
});

test('server lookup remains a fallback',()=>{
  assert.match(js,/falling back to Namdar server/);
  assert.match(js,/\/api\/address-search\?postcode=/);
});
