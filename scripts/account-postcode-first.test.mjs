#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync(new URL('../account.html',import.meta.url),'utf8');
const js=fs.readFileSync(new URL('../account-original.js',import.meta.url),'utf8');

function between(source,start,end){
  const a=source.indexOf(start),b=source.indexOf(end,a);
  assert.ok(a>=0&&b>a,'Expected block '+start+' … '+end);
  return source.slice(a,b);
}

test('postcode comes before derived area and borough in signup and profile',()=>{
  const reg=between(html,'id="regStep2"','</form>');
  assert.ok(reg.indexOf('id="regPostcode"')<reg.indexOf('id="regRegion"'));
  assert.ok(reg.indexOf('id="regPostcode"')<reg.indexOf('id="regDistrict"'));
  const profile=between(html,'id="profilePanel"','id="quotesPanel"');
  assert.ok(profile.indexOf('id="profilePostcode"')<profile.indexOf('id="profileRegion"'));
  assert.ok(profile.indexOf('id="profilePostcode"')<profile.indexOf('id="profileDistrict"'));
});

test('editing postcode does not erase area borough or town before lookup',()=>{
  const reset=between(js,'function resetPostcodeVerification','async function loadAddressChoices');
  assert.doesNotMatch(reset,/fillRegion\(prefix,'',''\)/);
  assert.doesNotMatch(reset,/City.*value=''/s);
  assert.match(reset,/PostcodeVerified/);
  assert.match(reset,/Latitude/);
  assert.match(reset,/Longitude/);
});

test('successful postcode lookup remains source of truth for derived location',()=>{
  const find=between(js,'async function findAddress','async function initTurnstile');
  const set=find.indexOf('setLocation(prefix,p)');
  const verified=find.indexOf("PostcodeVerified`).value='true'");
  assert.ok(set>=0&&verified>set);
  assert.match(js,/function setLocation\(prefix,d\)\{if\(d\.region\)\{fillRegion\(prefix,d\.region,d\.district\|\|''\)\}/);
});

test('postcode-first release is cache-busted',()=>{
  assert.match(html,/account-original\.js\?v=6\.4\.88-postcode-first/);
});
