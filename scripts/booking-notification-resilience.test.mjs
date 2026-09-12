import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const { dedupeCandidates, queueBusinessCandidates, scanBusinessFollowUpsBatched }=require('../lib/business-followup-batched');

const candidate=(key='a')=>({notification_type:'quote_reminder',entity_type:'quote',entity_id:'11111111-1111-1111-1111-111111111111',event_key:key,due_at:'2026-09-13T09:00:00.000Z',recipient_email:'customer@example.com',status:'pending',attempts:0,metadata:{stage:1}});

test('deduplicates the same business notification event before insert',()=>{
  assert.equal(dedupeCandidates([candidate('same'),candidate('same')]).length,1);
});

test('batch insert uses conflict-ignore semantics and counts only inserted rows',async()=>{
  const calls=[];
  const db=async(path,options)=>{calls.push({path,options});return [candidate('new')];};
  const result=await queueBusinessCandidates(db,[candidate('new'),candidate('new')]);
  assert.equal(result.candidates,1);
  assert.equal(result.queued,1);
  assert.equal(calls.length,1);
  assert.match(calls[0].path,/on_conflict=notification_type%2Centity_type%2Centity_id%2Cevent_key/);
  assert.equal(calls[0].options.prefer,'resolution=ignore-duplicates,return=representation');
});

test('retries one transient gateway failure for idempotent conflict-ignore batch insert',async()=>{
  let attempts=0;
  const db=async()=>{attempts++;if(attempts===1){const e=new Error('Gateway Timeout');e.status=504;throw e;}return[candidate('retry')];};
  const result=await queueBusinessCandidates(db,[candidate('retry')]);
  assert.equal(attempts,2);
  assert.equal(result.queued,1);
  assert.equal(result.errors.length,0);
});

test('scanner bulk-loads invoice quote context and queues one batch rather than per-event lookups',async()=>{
  const calls=[];
  const quote={id:'11111111-1111-1111-1111-111111111111',email:'customer@example.com',sent_at:'2026-09-10T09:00:00.000Z',updated_at:'2026-09-10T09:00:00.000Z',created_at:'2026-09-10T09:00:00.000Z',expires_at:null};
  const invoice={id:'22222222-2222-2222-2222-222222222222',quote_id:quote.id,total:80,amount_paid:0,due_at:'2026-09-10T09:00:00.000Z',status:'issued'};
  const db=async(path,options={})=>{
    calls.push({path,options});
    if(path.startsWith('profiles?'))return[];
    if(path.startsWith('quotes?status='))return[quote];
    if(path.startsWith('invoices?'))return[invoice];
    if(path.startsWith('quotes?id=in.'))return[{id:quote.id,email:quote.email,customer_name:'Customer',service_key:'windows'}];
    if(path.startsWith('bookings?status=eq.confirmed&assigned_staff_id=is.null'))return[];
    if(path.startsWith('bookings?status=eq.confirmed&work_status=eq.scheduled'))return[];
    if(path.startsWith('business_notifications?on_conflict='))return options.body;
    throw new Error(`Unexpected path ${path}`);
  };
  const result=await scanBusinessFollowUpsBatched({db,env:()=>'',isManagedInboxAddress:()=>false});
  const notificationCalls=calls.filter(x=>x.path.startsWith('business_notifications?'));
  assert.equal(notificationCalls.length,1);
  assert.equal(result.queued,result.candidates);
  assert.ok(result.candidates>=6);
});

test('scanner reports a source gateway error without throwing away other sources',async()=>{
  const db=async(path,options={})=>{
    if(path.startsWith('profiles?'))return[];
    if(path.startsWith('quotes?status=')){const e=new Error('Gateway Timeout');e.status=504;throw e;}
    if(path.startsWith('invoices?'))return[];
    if(path.startsWith('business_notifications?on_conflict='))return options.body||[];
    return[];
  };
  const result=await scanBusinessFollowUpsBatched({db,env:()=>'',isManagedInboxAddress:()=>false});
  assert.equal(result.degraded,true);
  assert.equal(result.sourceErrors[0].source,'quote_reminders');
});
