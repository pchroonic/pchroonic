import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const ops=require('../lib/booking-operations.js');

function mockDb({rules=null,bookings=[],quotes=[]}={}){
  return async path=>{
    if(path.startsWith('site_settings?'))return rules?[{value:rules}]:[];
    if(path.startsWith('bookings?'))return bookings;
    if(path.startsWith('quotes?'))return quotes;
    throw new Error(`Unexpected db path: ${path}`);
  };
}

test('booking rules fail safe to a Stage 1 operating calendar',()=>{
  const r=ops.sanitizeRules({});
  assert.equal(r.horizonDays,21);
  assert.equal(r.minimumNoticeHours,24);
  assert.deepEqual(r.operatingDays,[1,2,3,4,5,6]);
  assert.equal(r.operatingDays.includes(0),false);
  assert.deepEqual(r.enabledWindows,['08-11','11-14','14-17']);
  assert.equal(r.maxJobsPerDay,3);
  assert.equal(r.routeDensityEnabled,true);
});

test('booking horizon and capacity are bounded server side',()=>{
  const r=ops.sanitizeRules({horizonDays:90,maxJobsPerDay:99,minimumNoticeHours:999,operatingDays:[-1,1,1,8],enabledWindows:['bad','08-11']});
  assert.equal(r.horizonDays,21);
  assert.equal(r.maxJobsPerDay,12);
  assert.equal(r.minimumNoticeHours,168);
  assert.deepEqual(r.operatingDays,[1]);
  assert.deepEqual(r.enabledWindows,['08-11']);
});

test('postcode routing uses postcode area rather than customer address text',()=>{
  assert.equal(ops.postcodeZone('SE14 5TD'),'SE');
  assert.equal(ops.postcodeZone('SW2 3HL'),'SW');
  assert.equal(ops.postcodeZone('EC1A 1BB'),'EC');
  assert.equal(ops.postcodeZone(''),null);
});

test('availability respects route zone already established on a day',async()=>{
  const now=new Date('2026-09-14T06:00:00Z');
  const start=ops.londonLocalToUtc('2026-09-15','08:00').toISOString(),end=ops.londonLocalToUtc('2026-09-15','11:00').toISOString();
  const db=mockDb({rules:{horizonDays:7,minimumNoticeHours:0,operatingDays:[1,2,3,4,5,6],enabledWindows:['08-11','11-14','14-17'],maxJobsPerDay:3,routeDensityEnabled:true},bookings:[{id:'b1',quote_id:'q1',starts_at:start,ends_at:end,status:'confirmed'}],quotes:[{id:'q1',postcode:'SE14 5TD',service_key:'windows'}]});
  const same=await ops.availabilityForQuote(db,{id:'q2',postcode:'SE15 4AA',service_key:'windows'},now);
  const other=await ops.availabilityForQuote(db,{id:'q3',postcode:'SW2 3HL',service_key:'windows'},now);
  assert.equal(same.slots.some(x=>x.date==='2026-09-15'),true);
  assert.equal(other.slots.some(x=>x.date==='2026-09-15'),false);
});

test('daily capacity can close a day even when a standard window is unused',async()=>{
  const now=new Date('2026-09-14T06:00:00Z');
  const make=(id,key,startTime,endTime)=>({id,quote_id:key,starts_at:ops.londonLocalToUtc('2026-09-15',startTime).toISOString(),ends_at:ops.londonLocalToUtc('2026-09-15',endTime).toISOString(),status:'confirmed'});
  const db=mockDb({rules:{horizonDays:7,minimumNoticeHours:0,operatingDays:[2],enabledWindows:['08-11','11-14','14-17'],maxJobsPerDay:2,routeDensityEnabled:true},bookings:[make('b1','q1','08:00','11:00'),make('b2','q2','11:00','14:00')],quotes:[{id:'q1',postcode:'SE14 5TD'},{id:'q2',postcode:'SE15 4AA'}]});
  const out=await ops.availabilityForQuote(db,{id:'q3',postcode:'SE16 2AA'},now);
  assert.equal(out.slots.some(x=>x.date==='2026-09-15'),false);
});

test('customer booking wrappers enforce shared operations rules',()=>{
  const quoteAction=fs.readFileSync(new URL('../api/customer-quote-action-core.js',import.meta.url),'utf8');
  const booking=fs.readFileSync(new URL('../api/booking-core.js',import.meta.url),'utf8');
  assert.match(quoteAction,/availabilityForQuote/);
  assert.match(booking,/rpc\/reserve_customer_booking/);
  assert.match(booking,/return json\(res,409/);
});

test('confirmation settings default to manual and reject unknown modes',()=>{
  for(const value of [undefined,'invalid',true])assert.equal(ops.sanitizeRules({confirmationMode:value}).confirmationMode,'manual');
  assert.equal(ops.sanitizeRules({confirmationMode:'automatic'}).confirmationMode,'automatic');
});

test('paused booking policy returns no customer appointments',async()=>{
  const out=await ops.availabilityForQuote(mockDb({rules:{confirmationMode:'paused'}}),{postcode:'SE14 5TD'});
  assert.deepEqual(out.slots,[]);
});

test('database failures cannot be interpreted as an empty available diary',async()=>{
  await assert.rejects(()=>ops.availabilityForQuote(async()=>{throw new Error('offline')},{postcode:'SE14 5TD'}),/offline/);
});

test('Admin booking operations require privileged permissions and audit changes',()=>{
  const api=fs.readFileSync(new URL('../api/admin-booking-operations.js',import.meta.url),'utf8');
  const ui=fs.readFileSync(new URL('../admin-booking-operations.js',import.meta.url),'utf8');
  assert.match(api,/requireStaff\(req,'bookings'\)/);
  assert.match(api,/requireStaff\(req,'settings'\)/);
  assert.match(api,/auditLog/);
  assert.match(ui,/Max jobs per day/);
  assert.match(ui,/Minimum notice/);
  assert.match(ui,/route zone/i);
  assert.match(ui,/Operating days/);
});
