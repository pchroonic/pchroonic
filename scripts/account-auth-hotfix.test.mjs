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

test('account loader pins the current lockless Supabase build before the auth guard',()=>{
  assert.match(loaderSource,/const supabaseVersion='2\.116\.0'/);
  const supabase=loaderSource.indexOf('cdn.jsdelivr.net/npm/@supabase/supabase-js@');
  const guard=loaderSource.indexOf('/account-auth-hotfix.js');
  assert.ok(supabase>=0,'pinned Supabase script should be loaded');
  assert.ok(guard>=0,'auth guard should be loaded');
  assert.ok(supabase<guard,'current Supabase build must load before the auth guard patches createClient');
});

test('account loader installs auth guard before the portal bootstrap',()=>{
  const guard=loaderSource.indexOf('/account-auth-hotfix.js');
  const original=loaderSource.indexOf('/account-original.js');
  assert.ok(guard>=0,'auth guard should be loaded');
  assert.ok(original>=0,'account bootstrap should be loaded');
  assert.ok(guard<original,'auth guard must run before account-original.js');
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
