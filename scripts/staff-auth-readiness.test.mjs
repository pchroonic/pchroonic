import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');

test('staff page pins the known Supabase build and current Staff loader',()=>{
  const html=read('staff.html'),loader=read('staff.js');
  assert.match(html,/@supabase\/supabase-js@2\.116\.0/);
  assert.match(html,/staff\.js\?v=6\.4\.41-staff-operations-v3-1/);
  assert.match(loader,/6\.4\.31-staff-auth-recovery-1/);
  assert.match(loader,/6\.4\.40-staff-experience-v2-1/);
  assert.match(loader,/6\.4\.41-staff-operations-v3-1/);
  assert.match(loader,/staff-auth-readiness\.js/);
  assert.ok(loader.indexOf('staff-original.js')<loader.indexOf('staff-auth-readiness.js'));
});

test('staff sign-in never dereferences auth before readiness recovery',()=>{
  const source=read('staff-auth-readiness.js');
  assert.match(source,/authReady\(\)/);
  assert.match(source,/recoverAuthClient\(\)/);
  assert.match(source,/await ensureSupabaseLibrary\(\)/);
  assert.match(source,/loadPublicConfig\(\)/);
  assert.match(source,/NamdarPrivilegedCaptcha\.signIn\(auth/);
  assert.doesNotMatch(source,/NamdarPrivilegedCaptcha\.signIn\(sb\.auth/);
  assert.match(source,/Secure sign-in setup could not finish/);
});

test('staff auth recovery can reload the pinned browser client without a hard refresh',()=>{
  const source=read('staff-auth-readiness.js');
  assert.match(source,/SUPABASE_VERSION='2\.116\.0'/);
  assert.match(source,/document\.createElement\('script'\)/);
  assert.match(source,/window\.supabase\.createClient/);
  assert.match(source,/getSession\(\)/);
  assert.match(source,/MutationObserver/);
  assert.match(source,/recoverVisibleLogin/);
});

test('staff service worker cannot hold auth-critical scripts on a stale cache-first bundle',()=>{
  const sw=read('staff-sw.js');
  assert.match(sw,/namdar-staff-v6\.4\.41-staff-operations-v3-1/);
  assert.match(sw,/AUTH_CRITICAL/);
  assert.match(sw,/staff-auth-readiness\.js/);
  assert.match(sw,/@supabase\/supabase-js@2\.116\.0/);
  assert.match(sw,/AUTH_CRITICAL\.has\(url\.pathname\)/);
  assert.match(sw,/fetch\(req,\{cache:'no-store'\}\)/);
});
