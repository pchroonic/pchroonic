import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {normalizeTopic,normalizePreferences,subscriberWantsTopic,safeCampaignUrl,buildCampaignMessage}=require('../lib/newsletter');
const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');

test('newsletter preferences and topic targeting are deterministic',()=>{
  assert.equal(normalizeTopic('OFFERS'),'offers');
  assert.equal(normalizeTopic('unknown'),'all');
  assert.deepEqual(normalizePreferences({offers:false,tips:true,news:false}),{offers:false,tips:true,news:false});
  assert.equal(subscriberWantsTopic({preferences:{offers:false,tips:true,news:true}},'offers'),false);
  assert.equal(subscriberWantsTopic({preferences:{offers:false,tips:true,news:true}},'tips'),true);
  assert.equal(subscriberWantsTopic({preferences:{offers:false,tips:false,news:false}},'all'),true);
});

test('campaign URLs stay secure and email includes unsubscribe without tracking pixels',()=>{
  assert.equal(safeCampaignUrl('javascript:alert(1)','https://namdar.co.uk'),'');
  assert.equal(safeCampaignUrl('/#quote','https://namdar.co.uk'),'https://namdar.co.uk/#quote');
  const rendered=buildCampaignMessage({body_text:'Useful update',cta_label:'Get a quote',cta_url:'https://namdar.co.uk/#quote'},{full_name:'Test Person'},{origin:'https://namdar.co.uk',unsubscribeUrl:'https://namdar.co.uk/unsubscribe?token=u_test'});
  assert.match(rendered.html,/Useful update/);
  assert.match(rendered.html,/Unsubscribe or change your email preference/);
  assert.doesNotMatch(rendered.html,/tracking|pixel|open[_-]?track/i);
});

test('public signup supports current consent flow plus confirmation-ready mode',()=>{
  const api=read('api/newsletter-subscribe.js'),confirm=read('api/newsletter-confirm.js');
  assert.match(api,/normalizePreferences/);
  assert.match(api,/status:'subscribed'/);
  assert.match(api,/status:'pending'/);
  assert.match(api,/requireConfirmation/);
  assert.match(api,/RESEND_COOLDOWN_MS/);
  assert.match(confirm,/status:'subscribed'/);
  assert.match(confirm,/Welcome to Namdar updates/);
});

test('unsubscribe web page requires an explicit click and sender supports one-click headers',()=>{
  const ui=read('unsubscribe.js'),send=read('api/admin-newsletter.js'),legacy=read('api/admin-newsletter-send.js');
  assert.match(ui,/button\.onclick/);
  assert.match(send,/List-Unsubscribe/);
  assert.match(send,/List-Unsubscribe-Post/);
  assert.match(legacy,/requireStaff\(req,'newsletter'\)/);
});

test('newsletter Admin API is AAL2 permission scoped and prevents duplicate sends',()=>{
  const api=read('api/admin-newsletter.js');
  assert.match(api,/requireStaff\(req,'newsletter'\)/);
  assert.match(api,/status!=='draft'/);
  assert.match(api,/status:'sending'/);
  assert.match(api,/newsletter_deliveries/);
  assert.match(api,/audience\.length>500/);
  assert.match(api,/action==='test'/);
  assert.match(api,/action==='save_draft'/);
});

test('Newsletter v2 migration keeps delivery history server mediated',()=>{
  const migration=read('supabase/migrations/20260913162500_newsletter_v2_campaigns_preferences_delivery.sql');
  assert.match(migration,/newsletter_deliveries/);
  assert.match(migration,/enable row level security/i);
  assert.doesNotMatch(migration,/create policy/i);
  assert.match(migration,/audience_topic/);
});

test('Admin loader includes Newsletter v2 campaign studio',()=>{
  const loader=read('admin.js'),ui=read('admin-newsletter.js');
  assert.match(loader,/6\.4\.28-newsletter-2/);
  assert.match(loader,/admin-newsletter\.js/);
  assert.match(ui,/Campaign studio/);
  assert.match(ui,/Send test to me/);
  assert.match(ui,/Namdar does not use open-tracking pixels/);
});
