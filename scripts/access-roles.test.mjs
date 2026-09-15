import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const access=require('../lib/access-roles.js');
const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');

test('role permissions are bounded to the supported Admin permission catalogue',()=>{
  const out=access.normalizePermissions({quotes:true,bookings:1,staff:true,unknown:true});
  assert.equal(out.quotes,true);
  assert.equal(out.bookings,false);
  assert.equal(out.staff,true);
  assert.equal(Object.hasOwn(out,'unknown'),false);
  assert.deepEqual(access.SYSTEM_ROLE_KEYS,['owner','administrator']);
  assert.equal(Object.values(access.allPermissions()).every(Boolean),true);
});

test('role schema is private, protected and promotes one unambiguous existing Admin to Owner',()=>{
  const sql=read('supabase/migrations/20260915144500_staff_role_management.sql');
  assert.match(sql,/create table if not exists public\.staff_roles/i);
  assert.match(sql,/alter table public\.staff_roles enable row level security/i);
  assert.match(sql,/revoke all on table public\.staff_roles from anon, authenticated/i);
  assert.match(sql,/add column if not exists role_key text/i);
  assert.match(sql,/staff_access_role_key_fkey/i);
  assert.match(sql,/'owner'[\s\S]*'Owner'/i);
  assert.match(sql,/'administrator'[\s\S]*'Administrator'/i);
  assert.match(sql,/count\(\*\)[\s\S]*= 1[\s\S]*role_key = 'owner'/i);
  assert.doesNotMatch(sql,/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
});

test('custom role mutations are Owner-only and protected system roles cannot be edited or deleted',()=>{
  const api=read('api/admin-roles.js');
  assert.match(api,/requireOwner\(req\)/);
  assert.match(api,/system_role/);
  assert.match(api,/protected system roles and cannot be edited/i);
  assert.match(api,/protected system roles and cannot be deleted/i);
  assert.match(api,/staff_access\?role_key=eq\./);
  assert.match(api,/permissions,updated_at/);
  assert.match(api,/assigned to \$\{usage\.length\} staff account/);
});

test('Administrator lifecycle is subordinate to Owner and last Owner is protected',()=>{
  const api=read('api/admin-users.js');
  assert.match(api,/Only an Owner can invite an Administrator/);
  assert.match(api,/Only an Owner can modify, promote or demote Administrator accounts/);
  assert.match(api,/otherActiveOwners/);
  assert.match(api,/must keep at least one other active Owner/);
  assert.match(api,/cannot change the account type, access role or account status/);
  assert.match(api,/accessRoleKey/);
  assert.match(api,/roleForAssignment/);
  assert.match(api,/email identity changes must be confirmed by the account owner/);
});

test('Admin UI exposes reusable roles while preserving secure invitation flow',()=>{
  const ui=read('admin-role-management.js'),loader=read('admin.js'),security=read('admin-security-hardening.js');
  assert.match(loader,/admin-role-management\.js/);
  assert.match(loader,/6\.4\.39-access-roles-1/);
  assert.match(ui,/Create role/);
  assert.match(ui,/Access role/);
  assert.match(ui,/Individual permissions/);
  assert.match(ui,/Owner and Administrator are protected system roles/);
  assert.match(ui,/body\.accessRoleKey/);
  assert.match(ui,/Secure invitation sent/);
  assert.match(security,/Secure invitation/);
});
