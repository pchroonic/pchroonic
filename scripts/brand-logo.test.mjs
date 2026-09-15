import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
const require=createRequire(import.meta.url);
const { MAX_LOGO_BYTES, detectLogoImageType, decodeLogoBase64 }=require('../lib/brand-logo');
const adminBrandAssetsSource=readFileSync(new URL('../admin-brand-assets.js',import.meta.url),'utf8');
const adminMfaGuardSource=readFileSync(new URL('../admin-mfa-guard.js',import.meta.url),'utf8');
const adminLoaderSource=readFileSync(new URL('../admin.js',import.meta.url),'utf8');

test('detects supported logo image signatures',()=>{
  assert.equal(detectLogoImageType(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]))?.mimeType,'image/png');
  assert.equal(detectLogoImageType(Buffer.from([0xff,0xd8,0xff,0xe0]))?.mimeType,'image/jpeg');
  assert.equal(detectLogoImageType(Buffer.from('RIFFxxxxWEBP','ascii'))?.mimeType,'image/webp');
  const avif=Buffer.alloc(20);avif.write('ftyp',4,'ascii');avif.write('avif',8,'ascii');
  assert.equal(detectLogoImageType(avif)?.mimeType,'image/avif');
});

test('rejects unsupported content even when base64 is valid',()=>{
  assert.throws(()=>decodeLogoBase64(Buffer.from('<svg></svg>').toString('base64')),/PNG, JPG, WebP or AVIF/);
});

test('rejects logo payloads over the 2 MB limit',()=>{
  const tooLarge=Buffer.alloc(MAX_LOGO_BYTES+1,0);tooLarge.set([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a],0);
  assert.throws(()=>decodeLogoBase64(tooLarge.toString('base64')),/too large/);
});

test('decodes a valid PNG payload',()=>{
  const png=Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,0,0,0,0]);
  const result=decodeLogoBase64(png.toString('base64'));
  assert.equal(result.mimeType,'image/png');
  assert.equal(result.extension,'png');
  assert.deepEqual(result.buffer,png);
});

test('Admin brand module repairs the missing review URL control before website settings load',async()=>{
  const elements=new Map();
  const grid={insertAdjacentHTML(_position,html){assert.match(html,/settingReviewUrl/);elements.set('settingReviewUrl',{value:'',closest:()=>null})}};
  const document={
    getElementById:id=>elements.get(id)||null,
    querySelector:selector=>selector==='#website .admin-form-grid'?grid:null,
  };
  const context={
    document,
    websiteTools:async()=>{document.getElementById('settingReviewUrl').value='https://reviews.example';return 'loaded'},
    URL:{revokeObjectURL(){}},
    console,
    esc:value=>String(value),
    api:async()=>({}),
    setBusy() {},
  };
  vm.createContext(context);
  vm.runInContext(adminBrandAssetsSource,context);
  assert.ok(document.getElementById('settingReviewUrl'));
  assert.equal(await context.websiteTools(),'loaded');
  assert.equal(document.getElementById('settingReviewUrl').value,'https://reviews.example');
});

test('Admin dashboard errors are not reported as MFA failures',async()=>{
  let message='';
  const context={
    enter:async()=>{throw new Error('dashboard boom')},
    showLogin:value=>{message=value;return value},
    sb:{auth:{mfa:{}}},
    currentSession:null,
    document:{},
    console,
  };
  vm.createContext(context);
  vm.runInContext(adminMfaGuardSource,context);
  await context.enter(null);
  assert.match(message,/Admin dashboard could not be loaded: dashboard boom/);
  assert.doesNotMatch(message,/Two-step verification could not be completed/);
});

test('Actual privileged-session failures still report an MFA error',async()=>{
  let message='';
  const query={select(){return this},eq(){return this},async maybeSingle(){return {data:null,error:new Error('profile lookup failed')}}};
  const context={
    enter:async()=>{},
    showLogin:value=>{message=value;return value},
    sb:{auth:{mfa:{}},from:()=>query},
    currentSession:null,
    document:{},
    console,
  };
  vm.createContext(context);
  vm.runInContext(adminMfaGuardSource,context);
  await context.enter({user:{id:'admin-1'}});
  assert.match(message,/Two-step verification could not be completed: profile lookup failed/);
});

test('Admin loader cache-busts the website crash fix',()=>{
  assert.match(adminLoaderSource,/6\.4\.37-admin-website-crash-fix-1/);
});
