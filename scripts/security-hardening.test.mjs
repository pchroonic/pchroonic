import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');

test('rate limit storage is private and atomic',()=>{
  const sql=read('supabase/migrations/20260914163700_security_rate_limit_foundation.sql');
  assert.match(sql,/security_rate_limits/);
  assert.match(sql,/enable row level security/i);
  assert.match(sql,/revoke all on table public\.security_rate_limits from anon, authenticated/i);
  assert.match(sql,/consume_security_rate_limit/);
  assert.match(sql,/security definer/i);
  assert.match(sql,/set search_path = public, pg_temp/i);
  assert.match(sql,/on conflict \(scope, key_hash\) do update/i);
  assert.doesNotMatch(sql,/create policy/i);
});

test('server rate limiter hashes identities and audits blocks',()=>{
  const source=read('lib/security.js');
  assert.match(source,/createHmac\('sha256',serviceKey\(\)\)/);
  assert.match(source,/rpc\/consume_security_rate_limit/);
  assert.match(source,/Retry-After/);
  assert.match(source,/status=429/);
  assert.match(source,/security\.rate_limited/);
});

test('high-value public endpoints have server-side abuse limits',()=>{
  const quote=read('api/quote.js'),chat=read('api/chat.js'),newsletter=read('api/newsletter-subscribe.js'),postcode=read('api/postcode.js'),address=read('api/address-search.js');
  assert.match(quote,/quote\.create\.ip/);
  assert.match(chat,/chat\.message\.(?:user|ip)/);
  assert.match(newsletter,/newsletter\.subscribe\.ip/);
  assert.match(postcode,/postcode\.lookup\.ip/);
  assert.match(address,/address\.lookup\.ip/);
  assert.doesNotMatch(chat,/consumeRateLimit[^\n]+action==='poll'/);
});

test('Admin-created accounts use secure invitations instead of temporary passwords',()=>{
  const api=read('api/admin-users.js'),invite=read('lib/auth-invite.js');
  assert.match(api,/inviteUserByEmail/);
  assert.match(api,/credentialDelivery:'supabase_invitation'/);
  assert.match(api,/temporaryPassword:false/);
  assert.doesNotMatch(api,/return json\(res,201,\{[^}]*temporaryPassword/);
  assert.doesNotMatch(api,/Temporary password:/);
  assert.match(invite,/\/auth\/v1\/invite/);
  assert.match(invite,/account\?tab=security&invited=1/);
  assert.doesNotMatch(invite,/password/);
});

test('privileged account lifecycle protects current and last administrator',()=>{
  const api=read('api/admin-users.js');
  assert.match(api,/Only an administrator can invite another administrator/);
  assert.match(api,/cannot change the role or account status/);
  assert.match(api,/otherActiveAdmins/);
  assert.match(api,/must keep at least one active administrator/);
  assert.match(api,/email identity changes must be confirmed by the account owner/);
});

test('account owner controls verified email changes and Admin does not expose passwords',()=>{
  const account=read('account-security-email.js'),accountLoader=read('account.js'),admin=read('admin-security-hardening.js'),adminLoader=read('admin.js');
  assert.match(account,/auth\.updateUser\(\{email:next\}/);
  assert.match(account,/emailRedirectTo/);
  assert.match(accountLoader,/account-security-email\.js/);
  assert.match(admin,/Secure invitation/);
  assert.match(admin,/30\*60\*1000/);
  assert.match(admin,/editTempPassword/);
  assert.match(adminLoader,/admin-security-hardening\.js/);
  assert.match(adminLoader,/6\.4\.36-admin-logo-upload-1/);
});
