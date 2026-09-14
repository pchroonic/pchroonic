# Namdar AI handoff

Last verified: 2026-09-14 UTC

Read `docs/AI_START.md` first.

## Production source of truth
- Repo `pchroonic/pchroonic`, default `main`.
- Main before this security release: `bb7c27a6a9e291bb47ede0d95063d5b9b248f566`.
- Current live product release: PR #69 `Upgrade Ask Namdar chat experience`; PR #70 is docs-only continuity.
- PR #69 exact tested head `2b0d044a4e8e2e5276be2bdfa86a3e95d93f84f4`; GitHub CI `34861747184` SUCCESS.
- PR #69 exact preview `dpl_7LTPd5ZdodWWvM8GaJTkzfHryfdY` READY with clean build.
- PR #69 merge `935600a1bf8c7892bc6bc4fc0dafa118901b21e2`; docs-only PR #70 merge/main `bb7c27a6a9e291bb47ede0d95063d5b9b248f566`.
- Current production deployment from PR #69: `dpl_8cUiMKDnNc3ko4hw7xtwQSFRFV9K` READY on `https://namdar.co.uk`; `/api/health` was HTTP 200 after release.
- Production Ask Namdar assets `6.4.29-chat-1`; `/api/config` remains `aiEnabled:false`, so production is Guided assistant mode.
- Supabase production `qjigldxjcpnrlyxgmlqq` (`namdar-production`, `eu-west-1`). Do not use old inactive project `wbftztjembykhbnmqvnt` as staging.
- Vercel team `team_8Az8WtWcnfwtYRdhR8vGqC3L`, project `prj_4fILo0pCaLGUSUIMWrBIVGzeWVDC`.
- Window Cleaning only live. Gutters, jet washing, roof cleaning, handyman and 3D tours remain planned.
- Address-data expansion is parked.
- Privileged Staff/Admin requires AAL2/MFA.
- Stripe commercial customer payment policy is OFF; no live Stripe credentials.

## Stable systems that must not regress
- Account auth uses pinned Supabase JS `2.116.0` and the lock/session restore hotfix.
- Admin/Staff privileged APIs enforce AAL2/TOTP MFA.
- Privileged login CAPTCHA/Turnstile is present.
- Business Finance is private, sole-trader-first, and excludes sandbox Stripe rows.
- Smart receipts are private and review-first; receipt OCR stays in the authenticated browser.
- System Health has persistent scheduled-run/incident history.
- Newsletter Centre is consent-aware/resumable; no campaign should be sent as a deployment test.
- Ask Namdar is grounded in the service catalogue and works in Guided assistant mode while `aiEnabled:false`.
- Stripe webhook remains authoritative for payment state; customer payment policy remains OFF.

# Security hardening release

## Branch / release target
Branch: `security/hardening-rate-limits-invites-20260914`

Pre-docs implementation head: `701e7f26736358f36cd2cca12f41cf64f5423bb4`.
Target Admin/My Namdar asset version: `6.4.30-security-hardening-1`.

Compared with production main before docs, the implementation changes:
- `.github/workflows/ai-handoff-check.yml`
- `account-security-email.js` (new)
- `account.js`
- `admin-security-hardening.js` (new)
- `admin.js`
- `api/address-search.js`
- `api/admin-users.js`
- `api/chat.js`
- `api/newsletter-subscribe.js`
- `api/postcode.js`
- `api/quote.js`
- `lib/auth-invite.js` (new)
- `lib/security.js` (new)
- four existing loader-version regression tests
- `scripts/security-hardening.test.mjs` (new)
- `supabase/migrations/20260914163700_security_rate_limit_foundation.sql` (new)

## 1. Private server-side rate limiting
Production migration `20260914163700_security_rate_limit_foundation` is already applied and has the matching SQL file in this branch.

It creates private table `public.security_rate_limits`:
- primary key `(scope, key_hash)`;
- fixed-window counter fields;
- RLS enabled;
- no anon/authenticated table grants;
- no browser policies;
- service-role access only;
- `last_seen_at` index for future housekeeping.

It also creates `public.consume_security_rate_limit(text,text,integer,integer)`:
- `SECURITY DEFINER`;
- safe `search_path = public, pg_temp`;
- atomic `INSERT ... ON CONFLICT DO UPDATE` counter consumption;
- returns allowed/current_count/remaining/reset_at;
- executable only by service role.

`lib/security.js`:
- chooses the trusted request IP header order currently used by Namdar hosting (`cf-connecting-ip`, `x-real-ip`, first `x-forwarded-for`, socket fallback);
- converts the identity to HMAC-SHA256 using the server service key before database storage;
- stores only the truncated HMAC hash, never the raw IP/customer identifier;
- sends `RateLimit-Limit` and `RateLimit-Remaining` response headers;
- blocked requests return 429 with `Retry-After`;
- block events are written to existing audit history as `security.rate_limited` without storing the raw identity.

Limits currently wired:
- quote creation: `quote.create.ip`, 8 per 15 minutes per connection;
- public/signed-in chat messages: guest IP 30 per 10 minutes; signed-in user 50 per 10 minutes; chat polling is deliberately not counted;
- newsletter subscribe: IP bounded;
- postcode lookup: IP bounded;
- address lookup: IP bounded to protect expensive external/OpenStreetMap fallback activity;
- Admin account invitation: actor-based limit, 30 per hour per staff user.

Production mechanism test completed before final verification:
- disposable key was consumed beyond a small test limit;
- the next request was correctly blocked;
- test row was deleted afterwards;
- final verification query found zero disposable verification rows;
- `security_rate_limits` RLS enabled with zero browser policies.
No customer, quote, chat, newsletter, payment or real invitation was created for this test.

## 2. Secure Admin-created user invitations
Old behavior in `api/admin-users.js` generated a temporary password, returned it to Admin and emailed it to the user.

New behavior:
- `lib/auth-invite.js` calls Supabase Auth `/auth/v1/invite` using the service role server-side;
- redirect target is `/account?tab=security&invited=1` on the configured Namdar origin;
- no password is generated, returned, logged or emailed by Namdar;
- after Supabase creates the invited auth user, Namdar patches the profile/role details and optional `staff_access`;
- if profile setup fails after the invite user was created, the auth user is deleted best-effort to avoid a half-created Namdar account;
- audit action is `user.invite` with `credentialDelivery:'supabase_invitation'` and `temporaryPassword:false`.

`admin-security-hardening.js`:
- replaces the old Admin save handler;
- hides/disables the temporary-password control;
- shows `Secure invitation` guidance for new users;
- existing users have their email field disabled in Admin;
- only an active Admin UI exposes the Admin role option;
- new-user success message says the secure invitation was sent rather than displaying a password.

Do not deployment-test this by inviting a real customer/staff email without explicit approval.

## 3. Account email identity protection
Existing user email identity can no longer be overwritten through `api/admin-users.js`.

PATCH behavior:
- if requested email differs from current profile email, API returns 409 with instruction to use My Namdar Security;
- email is no longer included in the profile patch path;
- no Admin Auth `email_confirm:true` bypass exists for edits.

`account-security-email.js` adds My Namdar → Security `Change email address`:
- validates the new email;
- requires a signed-in session;
- calls `sb.auth.updateUser({email: next}, {emailRedirectTo: ...})`;
- current email stays active until Supabase completes the confirmation requirement;
- invitation and email-confirmation return messages are surfaced in the account UI.

Production trigger verification:
- `auth.users` has `on_auth_user_email_updated` AFTER UPDATE trigger;
- it calls `public.sync_profile_email()`;
- that function updates `public.profiles.email` whenever verified Auth email changes.
Therefore no new migration is needed for profile email synchronization.

## 4. Privileged account lifecycle protection
`api/admin-users.js` now enforces:
- only an administrator can invite another administrator;
- only an administrator can modify/promote administrator roles;
- the currently signed-in privileged account cannot change its own role/account status;
- the currently signed-in account cannot delete itself;
- before an active admin is demoted/suspended/deleted, another active admin must exist;
- the last active administrator therefore cannot be removed accidentally.

## 5. Admin idle timeout
`admin-security-hardening.js` records user activity and signs out the Admin dashboard after 30 minutes of inactivity.
- events: pointer, keyboard, touch and scroll;
- hidden tabs are checked on visibility return;
- signed-out/login view resets the idle timer;
- message explains the security timeout after sign-out.

This is in addition to, not a replacement for, Supabase session expiry and AAL2/MFA.

## 6. Existing protections deliberately preserved
Do not weaken:
- Turnstile/CAPTCHA on privileged login and existing public anti-bot flows;
- AAL2/TOTP requirement for privileged Admin/Staff APIs;
- CSP/security headers already configured in Vercel;
- audit-log redaction in `lib/server-original.js`;
- server/service-role-only private finance, receipt and health tables;
- customer-only private support-ticket policy.

## CI coverage
`.github/workflows/ai-handoff-check.yml` now syntax-checks:
- `account-security-email.js`
- `admin-security-hardening.js`
- `api/admin-users.js`
- `api/address-search.js`
- `lib/security.js`
- `lib/auth-invite.js`
and runs `scripts/security-hardening.test.mjs`.

The security regression test asserts:
- private/RLS rate-limit schema + atomic RPC;
- HMAC identity hashing, 429/Retry-After and audit behavior;
- rate limits on high-value public endpoints while chat poll remains uncounted;
- secure invites and absence of temporary-password output;
- current/last-admin lifecycle safeguards;
- verified self-service email changes;
- Admin idle timeout and loader version.

Existing tests that checked the old Admin loader string were updated to the new `6.4.30-security-hardening-1` target.

## Final verification still required before release
1. Open PR to `main`.
2. Full GitHub CI must be green.
3. Resolve exact PR head SHA from the PR.
4. Find Vercel preview for that exact head; require READY.
5. Check errors-only preview build log is clean.
6. Safe preview checks only:
   - static `admin.js` includes `6.4.30-security-hardening-1` and `admin-security-hardening.js`;
   - static `account.js` includes `6.4.30-security-hardening-1` and `account-security-email.js`;
   - new assets return HTTP 200;
   - `/api/config` is safe to inspect;
   - do not submit quotes/chats/newsletters/invites as deployment smoke tests.
7. Merge only after exact-head CI + preview pass.
8. Wait for production deployment; require READY + clean build.
9. Verify production `/api/health` HTTP 200 and the live static loader/assets.
10. Re-run Supabase security advisor and document remaining findings.
11. Update all three continuity docs with exact tested head, CI run, preview ID, merge SHA and production deployment ID.

## Supabase security advisor/manual auth setting
Prior advisor output still reported Leaked Password Protection disabled. The currently available Supabase management connector exposes advisors/SQL but not a safe project Auth-config mutation for this setting. Do not claim it is enabled unless directly verified. If it remains disabled after release, record it as a manual Supabase Dashboard follow-up.

## Existing Business Finance / Stripe baseline
- User decision: operate as sole trader first, later limited company after successful business growth.
- Never recast historical sole-trader transactions as company activity.
- Business Finance excludes Stripe sandbox rows using `payment_records.provider_livemode`.
- Retained Stripe sandbox ledger: 4 rows (two £0.50 payments, two £0.50 refunds), 0 live rows.
- No live Stripe credentials.
- Customer Stripe payment policy remains OFF.
- No automatic expense/tax posting from operational job-cost estimates or receipt OCR.

## Open work after security release
- Leaked Password Protection manual Supabase Auth setting if still disabled.
- Optional security notification email settings review in Supabase Auth.
- Decide commercial Stripe policy: optional online payment vs deposit required vs full payment required; keep OFF until deliberate decision.
- Only after payment policy approval: connect live Stripe credentials/webhook and run live-readiness checklist.
- Google review request URL still open.
- Window real-job pricing evidence/calibration.
- SMS/legal remaining checks.
- Optional duplicate floating Supabase include cleanup on `account.html`.
- `url.parse()` deprecation warning remains tech debt.
- Address-data pilot remains parked.

## Development rules
- Before substantive continuation, verify `main`, branch/provider state and read these docs rather than assuming handoff text is current.
- Preview/test before production.
- Every substantial code/database/API/security/config change updates `docs/AI_START.md`, `docs/AI_HANDOFF.md`, and `docs/PROJECT_STATUS.md`.
- Do not put secrets, customer private data or credentials into repo/chat/docs.
- Keep migrations idempotent/safe and record production-applied migration truth.
