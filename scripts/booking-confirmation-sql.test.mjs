import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {PGlite}=require(process.env.PGLITE_PATH||'/tmp/namdar-booking-verification/node_modules/@electric-sql/pglite');
const sql=fs.readFileSync(new URL('../supabase/migrations/20260915070501_booking_confirmation_modes.sql',import.meta.url),'utf8');

test('atomic booking SQL: modes, ownership, capacity, retries and permissions',async()=>{
  const db=new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role;
      create table public.site_settings(key text primary key,value jsonb);
      create table public.quotes(id uuid primary key,customer_id uuid,customer_response text,final_price numeric,status text,service_key text,postcode text,promo_code text,promo_discount numeric,reward_discount numeric);
      create table public.bookings(id uuid default gen_random_uuid() primary key,quote_id uuid,customer_id uuid,starts_at timestamptz,ends_at timestamptz,address text,status text,payment_status text,promo_code text,discount_total numeric);
      create table public.service_catalog(service_key text,status text);
      insert into public.service_catalog values ('windows','live');
      insert into public.site_settings values ('booking_operations','{"confirmationMode":"automatic","minimumNoticeHours":0,"operatingDays":[0,1,2,3,4,5,6],"maxJobsPerDay":1}');
      insert into public.quotes values ('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','accepted',45,'approved','windows','SE14 5TD',null,0,0);
      ${sql}`);
    const customer='22222222-2222-4222-8222-222222222222',quote='11111111-1111-4111-8111-111111111111';
    const dates=(await db.query(`select (((now() at time zone 'Europe/London')::date+2)+time '08:00') at time zone 'Europe/London' as start, (((now() at time zone 'Europe/London')::date+2)+time '11:00') at time zone 'Europe/London' as finish`)).rows[0];
    const reserve=async(c=customer,start=dates.start,end=dates.finish)=>(await db.query('select public.reserve_customer_booking($1,$2,$3,$4,$5) as result',[quote,c,start,end,'10 Test Street'])).rows[0].result;
    assert.equal((await reserve('33333333-3333-4333-8333-333333333333')).ok,false,'wrong owner');
    await db.exec("update public.quotes set customer_response='pending'");
    assert.equal((await reserve()).ok,false,'final price must be accepted');
    await db.exec("update public.quotes set customer_response='accepted'");
    let result=await reserve();assert.equal(result.booking.status,'pending','existing quotes require review');
    assert.equal((await reserve()).created,false,'retry returns original booking');
    assert.equal((await db.query('select count(*)::int as n from public.bookings')).rows[0].n,1);
    await db.exec('delete from public.bookings; update public.quotes set booking_requires_review=false');
    result=await reserve();assert.equal(result.booking.status,'confirmed');assert.equal(result.booking.payment_status,'unpaid');
    await db.exec("update public.bookings set quote_id=null");
    assert.equal((await reserve()).ok,false,'occupied slot cannot confirm twice');
    const later=new Date(new Date(dates.start).getTime()+3*3600000),laterEnd=new Date(new Date(dates.finish).getTime()+3*3600000);
    assert.equal((await reserve(customer,later.toISOString(),laterEnd.toISOString())).ok,false,'daily capacity enforced');
    await db.exec("delete from public.bookings; update public.site_settings set value=jsonb_set(value,'{confirmationMode}','\"paused\"')");
    assert.equal((await reserve()).ok,false,'paused blocks new reservations');
    await db.exec("update public.site_settings set value=jsonb_set(value,'{confirmationMode}','\"manual\"')");
    assert.equal((await reserve()).booking.status,'pending','manual overrides eligible quote');
    await db.exec("delete from public.bookings; update public.site_settings set value=jsonb_set(value,'{confirmationMode}','\"automatic\"'); update public.service_catalog set status='paused'");
    assert.equal((await reserve()).ok,false,'service pause enforced');
    const permissions=(await db.query("select has_function_privilege('anon','public.reserve_customer_booking(uuid,uuid,timestamptz,timestamptz,text)','execute') as anon, has_function_privilege('authenticated','public.reserve_customer_booking(uuid,uuid,timestamptz,timestamptz,text)','execute') as customer,has_function_privilege('service_role','public.reserve_customer_booking(uuid,uuid,timestamptz,timestamptz,text)','execute') as server")).rows[0];
    assert.deepEqual(permissions,{anon:false,customer:false,server:true});
  } finally {await db.close()}
});
