import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=file=>fs.readFileSync(new URL(`../${file}`,import.meta.url),'utf8');

test('quote availability gate uses the actual serviceKey and cannot default future services to windows',()=>{
  const source=read('api/quote.js');
  assert.match(source,/body\.serviceKey\|\|body\.service/);
  assert.doesNotMatch(source,/body\.service\|\|'windows'/);
  assert.match(source,/if\(!isLive\(service\)\)return json\(res,409/);
});

test('window quote inputs are normalised server-side before pricing',()=>{
  const source=read('api/quote.js');
  assert.match(source,/WINDOW_DETAIL=new Set\(\[1,1\.15,1\.28\]\)/);
  assert.match(source,/WINDOW_EXTRA=new Set\(\[1,1\.12,1\.28,1\.5\]\)/);
  assert.match(source,/WINDOW_FREQUENCY=new Set\(\['once','4_weekly','8_weekly','12_weekly','monthly','quarterly'\]\)/);
  assert.match(source,/req\.body=normaliseWindowInputs\(body\)/);
});

test('quote engine supports 4 8 and 12 week recurring guide-price frequencies',()=>{
  const source=read('api/quote-core.js');
  assert.match(source,/'4_weekly':\.86/);
  assert.match(source,/'8_weekly':\.90/);
  assert.match(source,/'12_weekly':\.94/);
});

test('homepage window journey collects condition access and recurring frequency',()=>{
  const source=read('conversion.js');
  assert.match(source,/windowCleanCondition/);
  assert.match(source,/windowAccessDetail/);
  assert.match(source,/Regular every 4 weeks/);
  assert.match(source,/Regular every 8 weeks/);
  assert.match(source,/Regular every 12 weeks/);
  assert.match(source,/\[Window details\]/);
  assert.match(source,/Frames and exterior sills are included/);
});

test('My Namdar recurring Window Cleaning matches the Stage 1 cadence',()=>{
  const account=read('account-service-availability.js');
  const api=read('api/subscription-core.js');
  for(const interval of ['4_weekly','8_weekly','12_weekly']){
    assert.match(account,new RegExp(interval));
    assert.match(api,new RegExp(interval));
  }
  assert.match(api,/intervalKey\|\|'8_weekly'/);
});

test('Window Cleaning service page explains inclusions and reviewed recurring flow',()=>{
  const source=read('services/window-cleaning.html');
  assert.match(source,/Exterior glass, frames and exterior sills/);
  assert.match(source,/4-, 8- or 12-week/);
  assert.match(source,/first clean/i);
  assert.match(source,/No\. The estimate stage does not take payment/);
});
