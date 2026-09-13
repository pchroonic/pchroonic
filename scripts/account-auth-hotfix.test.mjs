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
  return {context,timers,client,get reloads(){return reloads}};
}

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
  const timer=fixture.timers.find(x=>x.ms===timeoutMs&&!x.cleared);
  assert.ok(timer,'session timeout should be scheduled');
  timer.fn();
  const result=await pending;
  assert.equal(result.data.session,null);
  assert.match(result.error.message,/timed out/i);
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
