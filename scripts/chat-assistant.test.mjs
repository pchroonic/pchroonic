import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {INTENTS,classifyIntent,guidedReply,actionsForIntent,normaliseHistory,buildInstructions}=require('../lib/chat-assistant');
const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const catalog=[
  {name:'Window Cleaning',status:'live'},
  {name:'Gutter Cleaning',status:'planned'},
  {name:'Roof Cleaning',status:'planned'},
  {name:'Handyman Services',status:'planned'},
  {name:'3D Property Tours',status:'planned'}
];

test('assistant recognises core customer intents',()=>{
  assert.equal(classifyIntent('How much does window cleaning cost?'),INTENTS.PRICE);
  assert.equal(classifyIntent('Do you cover SE14?'),INTENTS.POSTCODE);
  assert.equal(classifyIntent('Can I book Tuesday?'),INTENTS.BOOKING);
  assert.equal(classifyIntent('Do you clean gutters?'),INTENTS.FUTURE_SERVICE);
  assert.equal(classifyIntent('I need help with a payment'),INTENTS.SUPPORT);
});

test('guided mode keeps Window Cleaning live and future services unavailable',()=>{
  const windows=guidedReply('Tell me about windows',{catalog});
  const future=guidedReply('Can you clean my gutters?',{catalog});
  assert.match(windows,/Window Cleaning is Namdar’s live service right now/);
  assert.match(windows,/frames and exterior sills/);
  assert.match(future,/Only Window Cleaning is live/);
  assert.match(future,/planned/);
  assert.doesNotMatch(future,/book.*gutter/i);
});

test('support routing respects customer-only private support',()=>{
  const guest=guidedReply('I need support',{catalog,signedIn:false,supportEmail:'support@namdar.co.uk'});
  const customer=guidedReply('I have a complaint',{catalog,signedIn:true,supportEmail:'support@namdar.co.uk'});
  assert.match(guest,/sign in to My Namdar/);
  assert.match(guest,/support@namdar\.co\.uk/);
  assert.doesNotMatch(guest,/create a support ticket/i);
  assert.match(customer,/private Customer Support in My Namdar/);
  const guestActions=actionsForIntent(INTENTS.SUPPORT,{signedIn:false,supportEmail:'support@namdar.co.uk'});
  assert.equal(guestActions[0].href,'mailto:support@namdar.co.uk');
  assert.equal(guestActions[1].href,'/account?tab=support');
});

test('AI context is bounded and service status overrides stale FAQ wording',()=>{
  const history=Array.from({length:20},(_,i)=>({sender_role:i%2?'assistant':'guest',message:`message ${i}`}));
  const normal=normaliseHistory(history);
  assert.equal(normal.length,12);
  assert.equal(normal[0].content,'message 8');
  const instructions=buildInstructions({catalog,faqs:[{question:'Do you do gutters?',answer:'Yes, book gutters now.'}]});
  assert.match(instructions,/live now = Window Cleaning/);
  assert.match(instructions,/Gutter Cleaning \(planned\)/);
  assert.match(instructions,/overrides any older FAQ wording/);
  assert.match(instructions,/Do not claim that this assistant can create a support ticket for a guest/);
  assert.match(instructions,/Never reveal/);
});

test('chat API uses history, live service catalogue, bounded provider call and human takeover',()=>{
  const source=read('api/chat.js');
  assert.match(source,/loadServiceCatalog\(db\)/);
  assert.match(source,/order=created_at\.desc&limit=12/);
  assert.match(source,/new AbortController\(\)/);
  assert.match(source,/setTimeout\(\(\)=>controller\.abort\(\),7000\)/);
  assert.match(source,/store:false/);
  assert.match(source,/if\(session\.mode==='human'\)return/);
  assert.match(source,/actionsForIntent/);
  assert.doesNotMatch(source,/I can create a support ticket/);
});

test('upgraded browser chat includes suggestions, privacy, resume and mobile-safe loader',()=>{
  const ui=read('chat-experience.js'),css=read('chat-experience.css'),loader=read('conversion.js');
  assert.match(ui,/Ask Namdar/);
  assert.match(ui,/Suggested questions|chatSuggestions/);
  assert.match(ui,/Don’t share passwords or card details/);
  assert.match(ui,/visibilitychange/);
  assert.match(ui,/newConversation/);
  assert.match(ui,/Private support in My Namdar/);
  assert.match(css,/100dvh/);
  assert.match(css,/prefers-reduced-motion/);
  assert.match(loader,/6\.4\.29-chat-1/);
  assert.match(loader,/chat-experience\.js/);
  assert.match(loader,/chat-experience\.css/);
});
