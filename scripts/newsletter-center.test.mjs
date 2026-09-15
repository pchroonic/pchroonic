import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const newsletter=require('../lib/newsletter.js');
const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');

test('newsletter topics respect subscriber preferences and status',()=>{
  const s={status:'subscribed',preferences:{offers:true,tips:false,news:true}};
  assert.equal(newsletter.subscriberWantsTopic(s,'all'),true);
  assert.equal(newsletter.subscriberWantsTopic(s,'offers'),true);
  assert.equal(newsletter.subscriberWantsTopic(s,'tips'),false);
  assert.equal(newsletter.subscriberWantsTopic({...s,status:'unsubscribed'},'offers'),false);
});

test('campaign input requires complete HTTPS CTA and sanitizes topic',()=>{
  const c=newsletter.cleanCampaignInput({subject:'Hello',bodyText:'Useful update',audienceTopic:'offers',ctaLabel:'Book',ctaUrl:'https://namdar.co.uk/#quote'});
  assert.equal(c.audienceTopic,'offers');assert.match(c.ctaUrl,/^https:\/\/namdar\.co\.uk/);
  assert.throws(()=>newsletter.cleanCampaignInput({subject:'x',bodyText:'y',ctaLabel:'Click',ctaUrl:'http://example.com'}),/valid HTTPS/);
});

test('campaign email includes preference and unsubscribe controls for subscribers',()=>{
  const e=newsletter.campaignEmail({campaign:{subject:'Care tips',body_text:'Keep frames clean.',audience_topic:'tips'},subscriber:{full_name:'Alex Example',unsubscribe_token:'token_123'},origin:'https://namdar.co.uk'});
  assert.match(e.html,/Manage preferences/);assert.match(e.html,/action=unsubscribe/);assert.match(e.text,/Manage preferences/);assert.doesNotMatch(e.subject,/\[TEST\]/);
});

test('test campaign email is clearly marked and has no subscriber unsubscribe token',()=>{
  const e=newsletter.campaignEmail({campaign:{subject:'Preview',body_text:'Body'},subscriber:{full_name:'Admin'},test:true});
  assert.match(e.subject,/^\[TEST\]/);assert.match(e.html,/test email/i);assert.doesNotMatch(e.html,/token=/);
});

test('delivery counts include resumable processing state',()=>{
  assert.deepEqual(newsletter.deliveryCounts([{status:'sent'},{status:'failed'},{status:'processing'},{status:'queued'},{status:'skipped'}]),{queued:1,processing:1,sent:1,failed:1,skipped:1,total:5});
});

test('Admin newsletter API is permission-protected and uses claimed resumable deliveries',()=>{
  const api=read('api/admin-newsletter.js');
  assert.match(api,/requireStaff\(req,'newsletter'\)/);
  assert.match(api,/status=eq\.queued/);
  assert.match(api,/status:'processing'/);
  assert.match(api,/status=eq\.processing/);
  assert.match(api,/subscriberWantsTopic/);
  assert.match(api,/resolution=ignore-duplicates/);
  assert.doesNotMatch(api,/subscriberSelect[^\n]*unsubscribe_token/);
});

test('legacy bulk sender can no longer bypass Newsletter Centre',()=>{
  const source=read('api/admin-newsletter-send.js');
  assert.match(source,/requireStaff\(req,'newsletter'\)/);
  assert.match(source,/409/);
  assert.doesNotMatch(source,/for\s*\(const s of subscribers/);
});

test('email preference endpoint supports topic preferences and full unsubscribe',()=>{
  const source=read('api/newsletter-unsubscribe.js');
  assert.match(source,/action==='preferences'/);
  assert.match(source,/offers:/);assert.match(source,/tips:/);assert.match(source,/news:/);
  assert.match(source,/status:'unsubscribed'/);
});

test('Admin loader keeps Newsletter Centre in the current release',()=>{
  const loader=read('admin.js');
  assert.match(loader,/6\.4\.35-payment-policy-engine-1/);
  assert.match(loader,/admin-newsletter-center\.js/);
});
