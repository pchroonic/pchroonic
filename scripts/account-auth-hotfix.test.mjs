import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const loaderSource=fs.readFileSync(new URL('../account.js',import.meta.url),'utf8');
const hotfixSource=fs.readFileSync(new URL('../account-auth-hotfix.js',import.meta.url),'utf8');

function classList(initial=[]){
  const values=new Set(initial);
  return {
    add:(...items)=>items.forEach(x=>values.add(x)),
    remove:(...items)=>items.forEach(x=>values.delete(x)),
    contains:item=>values.has(item)
  };
}

function createContext(href='https://namdar.co.uk/account?tab=billing'){
  const timers=[];
  const storage=new Map();
  const local=new Map();
  let reloads=0;
  const loading={classList:classList()};
  const authSection={classList:classList(['hidden'])};
  const portalSection={classList:classList(['hidden'])};
  const authStatus={textContent:'',classList:classList()};
  const client={
    auth:{
      getSession:()=>new Promise(()=>{}),
      onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})
    }
  };
  const context={
    window:{supabase:{createClient:()=>client}},
    sb:client,
    document:{querySelector:selector=>({
      '#accountSessionLoading':loading,
      '#authSection':authSection,
      '#portalSection':portalSection,
      '#authStatus':authStatus
    })[selector]||null},
    location:{href,reload:()=>{reloads++}},
    sessionStorage:{
      getItem:key=>storage.has(key)?storage.get(key):null,
      setItem:(key,value)=>storage.set(key,String(value))
    },
    localStorage:{
      get length(){return local.size},
      key:index=>[...local.keys()][index]??null,
      getItem:key=>local.has(key)?local.get(key):null,
      setItem:(key,value)=>local.set(key,String(value)),
      removeItem:key=>local.delete(key)
    },
    console,
    URL,
    Promise,
    Error,
    Symbol,
    Object,
    setTimeout:(fn,ms)=>{timers.push({fn,ms,cleared:false});return timers.length},
    clearTimeout:id=>{if(timers[id-1])timers[id-1].cleared=true},
    setInterval:()=>1,
    clearInterval:()=>{}
  };
  context.window.window=context.window;
  return {context,timers,client,local,get reloads(){return reloads}};
}


test('account HTML loads the account stack directly without the document.write loader',()=>{
  const html=fs.readFileSync(new URL('../account.html',import.meta.url),'utf8');
  assert.doesNotMatch(html,/account\.js\?v=/);
  assert.doesNotMatch(html,/supabase-js@2\.117\.1/);
  assert.match(html,/account-original\.js\?v=6\.4\.93-payment-handoff-1/);
  assert.match(html,/account-mfa-guard\.js/);
});

test('account loader file may remain in repo but is not on the live account startup path',()=>{
  const html=fs.readFileSync(new URL('../account.html',import.meta.url),'utf8');
  assert.doesNotMatch(html,/src=["']\/?account\.js/);
});

test('account bootstrap uses native Supabase persisted-session flow',()=>{
  const src=fs.readFileSync(new URL('../account-original.js',import.meta.url),'utf8');
  assert.match(src,/persistSession:true,autoRefreshToken:true,detectSessionInUrl:true/);
  assert.match(src,/onAuthStateChange/);
});

test('hung getSession resolves with a bounded timeout instead of hanging forever',async()=>{
  const fixture=createContext();
  vm.runInNewContext(hotfixSource,fixture.context);
  const patched=fixture.context.window.supabase.createClient();
  const pending=patched.auth.getSession();
  const timeoutMs=fixture.context.window.NamdarAuthHotfix.sessionTimeoutMs;
  assert.ok(timeoutMs>=10000,'session restore should allow normal slow network/auth recovery');
  const timer=fixture.timers.find(x=>x.ms===timeoutMs&&!x.cleared);
  assert.ok(timer,'session timeout should be scheduled');
  timer.fn();
  const result=await pending;
  assert.equal(result.data.session,null);
  assert.match(result.error.message,/timed out/i);
});

test('a valid cached session is recovered instead of falsely signing the customer out',async()=>{
  const fixture=createContext();
  const future=Math.floor(Date.now()/1000)+3600;
  fixture.local.set('sb-qjigldxjcpnrlyxgmlqq-auth-token',JSON.stringify({
    access_token:'access-token',
    refresh_token:'refresh-token',
    expires_at:future,
    user:{id:'customer-1',email:'customer@example.com'}
  }));
  vm.runInNewContext(hotfixSource,fixture.context);
  const patched=fixture.context.window.supabase.createClient();
  const pending=patched.auth.getSession();
  const timeoutMs=fixture.context.window.NamdarAuthHotfix.sessionTimeoutMs;
  fixture.timers.find(x=>x.ms===timeoutMs&&!x.cleared).fn();
  const result=await pending;
  assert.equal(result.error,null);
  assert.equal(result.recovered,true);
  assert.equal(result.data.session.user.id,'customer-1');
});


test('watchdog actively resumes the portal instead of leaving the loading spinner visible',async()=>{
  const fixture=createContext('https://namdar.co.uk/account');
  const future=Math.floor(Date.now()/1000)+3600;
  fixture.local.set('sb-qjigldxjcpnrlyxgmlqq-auth-token',JSON.stringify({
    access_token:'access-token',
    refresh_token:'refresh-token',
    expires_at:future,
    user:{id:'customer-2',email:'customer2@example.com'}
  }));
  let rendered=null;
  fixture.context.window.renderState=session=>{rendered=session; fixture.context.document.querySelector('#accountSessionLoading').classList.add('hidden')};
  vm.runInNewContext(hotfixSource,fixture.context);
  const timeoutMs=fixture.context.window.NamdarAuthHotfix.sessionTimeoutMs;
  const watchdog=fixture.timers.find(x=>x.ms===timeoutMs+1500&&!x.cleared);
  assert.ok(watchdog,'watchdog should be scheduled');
  watchdog.fn();
  await Promise.resolve();
  assert.equal(rendered?.user?.id,'customer-2');
  assert.equal(fixture.context.document.querySelector('#accountSessionLoading').classList.contains('hidden'),true);
});


test('cached recovery never renders the portal before the Supabase auth client is ready',async()=>{
  const fixture=createContext('https://namdar.co.uk/account');
  const future=Math.floor(Date.now()/1000)+3600;
  fixture.local.set('sb-qjigldxjcpnrlyxgmlqq-auth-token',JSON.stringify({
    access_token:'access-token',
    refresh_token:'refresh-token',
    expires_at:future,
    user:{id:'customer-3',email:'customer3@example.com'}
  }));
  let renders=0;
  fixture.context.sb=null;
  fixture.context.window.renderState=()=>{renders++};
  vm.runInNewContext(hotfixSource,fixture.context);
  const timeoutMs=fixture.context.window.NamdarAuthHotfix.sessionTimeoutMs;
  const watchdog=fixture.timers.find(x=>x.ms===timeoutMs+1500&&!x.cleared);
  assert.ok(watchdog);
  watchdog.fn();
  await Promise.resolve();
  assert.equal(renders,0,'recovery must not call renderState while the auth client is not ready');
  assert.equal(fixture.reloads,1,'a single guarded reload is used instead');
});

test('MFA guard only labels MFA challenge failures, not ordinary portal render failures',()=>{
  const mfaSource=fs.readFileSync(new URL('../account-mfa-guard.js',import.meta.url),'utf8');
  const challengeCatch=mfaSource.indexOf('verifiedSession=await challengePromise');
  const renderCall=mfaSource.lastIndexOf('return originalRenderState(verifiedSession)');
  const mfaMessage=mfaSource.indexOf('Two-step verification could not be completed');
  assert.ok(challengeCatch>=0&&renderCall>challengeCatch);
  assert.ok(mfaMessage>challengeCatch&&mfaMessage<renderCall,'MFA failure copy should be scoped to the challenge step only');
});


test('login flow never calls sb.auth before the Supabase client exists',()=>{
  const src=fs.readFileSync(new URL('../account-original.js',import.meta.url),'utf8');
  assert.match(src,/if\(!sb\?\.auth\)throw new Error\('Secure sign-in is still loading/);
  const guard=src.indexOf("if(!sb?.auth)throw new Error('Secure sign-in is still loading");
  const call=src.indexOf("sb.auth.signInWithPassword",guard);
  assert.ok(guard>=0&&call>guard,'auth readiness guard must run before password sign-in');
});

test('watchdog never reveals the login form while the auth client is still null',()=>{
  const src=fs.readFileSync(new URL('../account-auth-hotfix.js',import.meta.url),'utf8');
  const readyGuard=src.indexOf("if(!authClientReady())");
  const reveal=src.indexOf("document.querySelector('#authSection')?.classList.remove('hidden')",readyGuard);
  assert.ok(readyGuard>=0&&reveal>readyGuard,'watchdog must gate login visibility on auth client readiness');
});


test('customers without a cached session see sign-in quickly once auth is ready',()=>{
  const fixture=createContext('https://namdar.co.uk/account');
  vm.runInNewContext(hotfixSource,fixture.context);
  const earlyMs=fixture.context.window.NamdarAuthHotfix.earlyLoginMs;
  assert.ok(earlyMs<=3000,'early login should not make signed-out customers wait on the restore screen');
  const early=fixture.timers.find(x=>x.ms===earlyMs&&!x.cleared);
  assert.ok(early,'early login timer should be scheduled');
  early.fn();
  assert.equal(fixture.context.document.querySelector('#accountSessionLoading').classList.contains('hidden'),true);
  assert.equal(fixture.context.document.querySelector('#authSection').classList.contains('hidden'),false);
});

test('customers with a valid cached session keep the protected restore path',()=>{
  const fixture=createContext('https://namdar.co.uk/account');
  const future=Math.floor(Date.now()/1000)+3600;
  fixture.local.set('sb-qjigldxjcpnrlyxgmlqq-auth-token',JSON.stringify({
    access_token:'access-token',
    refresh_token:'refresh-token',
    expires_at:future,
    user:{id:'customer-restore',email:'restore@example.com'}
  }));
  vm.runInNewContext(hotfixSource,fixture.context);
  const earlyMs=fixture.context.window.NamdarAuthHotfix.earlyLoginMs;
  const early=fixture.timers.find(x=>x.ms===earlyMs&&!x.cleared);
  assert.ok(early);
  early.fn();
  assert.equal(fixture.context.document.querySelector('#accountSessionLoading').classList.contains('hidden'),false);
  assert.equal(fixture.context.document.querySelector('#authSection').classList.contains('hidden'),true);
});

test('Stripe success return performs at most one automatic retry when session restore times out',async()=>{
  const fixture=createContext('https://namdar.co.uk/account?tab=billing&payment=success&session_id=cs_test_safe');
  vm.runInNewContext(hotfixSource,fixture.context);
  const patched=fixture.context.window.supabase.createClient();
  const timeoutMs=fixture.context.window.NamdarAuthHotfix.sessionTimeoutMs;

  let pending=patched.auth.getSession();
  fixture.timers.find(x=>x.ms===timeoutMs&&!x.cleared).fn();
  await pending;
  assert.equal(fixture.reloads,1,'first timeout should retry the Stripe return once');

  pending=patched.auth.getSession();
  const activeTimers=fixture.timers.filter(x=>x.ms===timeoutMs&&!x.cleared);
  activeTimers.at(-1).fn();
  await pending;
  assert.equal(fixture.reloads,1,'the same Stripe session must not enter a reload loop');
});
