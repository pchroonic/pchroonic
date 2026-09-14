# Namdar AI handoff

Last verified: 2026-09-14 UTC

Read `docs/AI_START.md` first.

## Production source of truth
- Repo `pchroonic/pchroonic`, default `main`.
- Current live product release: PR #71 `Harden Namdar public APIs and account security`.
- Exact tested PR head: `fee9f82c7912372e612b133a69924a5a01c7f9e4`.
- GitHub CI run `34884232265`: SUCCESS.
- Exact-head Vercel preview: `dpl_AR6bRZvrS5DFGYQ3qgQLWbcUzsDb`, READY, errors-only build log clean.
- PR #71 merge/main: `ea61d8df2ed1110973580c4a0ab3bca09e05d7a8`.
- Production deployment: `dpl_bwmC8t5W68ETAf8MzR6HvLiNCxMb`, READY on `https://namdar.co.uk`, errors-only build log clean.
- Production `/api/health`: HTTP 200 after release; returned `ok:true`, database/email/reminders/followups healthy and existing Stripe configuration healthy.
- Production Admin/My Namdar asset version: `6.4.30-security-hardening-1`.
- Production `admin.js` verified loading `admin-security-hardening.js`; both HTTP 200.
- Production `account.js` verified loading pinned Supabase JS `2.116.0` plus `account-security-email.js`; both HTTP 200.
- Production error/fatal runtime-log check immediately after release returned no matching logs.
- Supabase production: `qjigldxjcpnrlyxgmlqq` (`namdar-production`, `eu-west-1`). Do not use old inactive project `wbftztjembykhbnmqvnt` as staging.
- Vercel team `team_8Az8WtWcnfwtYRdhR8vGqC3L`, project `prj_4fILo0pCaLGUSUIMWrBIVGzeWVDC`.
- Window Cleaning only live. Gutters, jet washing, roof cleaning, handyman and 3D tours remain planned.
- Address-data expansion is parked.
- Privileged Staff/Admin requires AAL2/MFA.
- Stripe commercial customer payment policy is OFF; no live Stripe credentials.
- Ask Namdar provider AI remains disabled in production (`aiEnabled:false`), so Guided assistant mode remains correct.

## Stable systems that must not regress
- Account auth uses pinned Supabase JS `2.116.0` and the bounded lock/session restore hotfix.
- Admin/Staff privileged APIs enforce AAL2/TOTP MFA.
- Privileged login CAPTCHA/Turnstile remains present.
- Business Finance is private, sole-trader-first, and excludes sandbox Stripe rows.
- Smart receipts are private and review-first; receipt OCR remains in the authenticated browser.
- System Health has persistent scheduled-run/incident history.
- Newsletter Centre is consent-aware/resumable; never send a campaign as a deployment test.
- Ask Namdar is grounded in the service catalogue and works in Guided assistant mode while `aiEnabled:false`.
- Stripe webhook remains authoritative for payment state; customer payment policy remains OFF.

# Security hardening — LIVE

## Release history
Branch: `security/hardening-rate-limits-invites-20260914`

The first PR CI run failed only because the new regression test rejected the safe audit metadata `temporaryPassword:false`. Product code and the other security tests were green. The test was narrowed to check that no temporary password is returned or emailed while explicitly allowing the false audit flag.

Final release gate:
- final PR head `fee9f82c7912372e612b133a69924a5a01c7f9e4`;
- GitHub CI `34884232265` SUCCESS;
- exact preview `dpl_AR6bRZvrS5DFGYQ3qgQLWbcUzsDb` READY;
- preview errors-only build log clean;
- Vercel commit status SUCCESS;
- PR merge `ea61d8df2ed1110973580c4a0ab3bca09e05d7a8`;
- production `dpl_bwmC8t5W68ETAf8MzR6HvLiNCxMb` READY;
- production errors-only build clean;
- production `/api/health` HTTP 200;
- production security loaders/assets HTTP 200.

The exact preview is Vercel SSO protected. The connector could verify the exact deployment metadata/build but could not directly fetch protected preview static files. Exact-head source was therefore checked in GitHub before merge, and the identical release assets were then fetched from production after deployment.

## 1. Private server-side rate limiting
Production migration `20260914163700_security_rate_limit_foundation` is applied and has a matching repo SQL migration.

It creates private table `public.security_rate_limits`:
- primary key `(scope, key_hash)`;
- fixed-window counters;
- RLS enabled;
- no anon/authenticated table grants;
- no browser policies;
- service-role only;
- `last_seen_at` index for housekeeping.

It creates `public.consume_security_rate_limit(text,text,integer,integer)`:
- `SECURITY DEFINER`;
- safe `search_path = public, pg_temp`;
- atomic `INSERT ... ON CONFLICT DO UPDATE` consumption;
- returns allowed/current_count/remaining/reset_at;
- executable only by service role.

`lib/security.js`:
- derives request identity from trusted hosting headers/fallback;
- HMAC-SHA256 hashes the identity with the server service key before storage;
- stores only a truncated HMAC, never raw IP/customer identity;
- emits `RateLimit-Limit` and `RateLimit-Remaining`;
- blocks with HTTP 429 and `Retry-After`;
- writes `security.rate_limited` into existing audit history without storing the raw identity.

Live limits:
- quote creation: 8 per 15 minutes per IP identity;
- chat messages: guest 30 per 10 minutes per IP, signed-in 50 per 10 minutes per user identity; poll is excluded;
- newsletter signup: IP bounded;
- postcode lookup: IP bounded;
- address lookup: IP bounded to protect external/OpenStreetMap fallback cost;
- Admin account invitations: 30 per hour per staff actor.

Production mechanism verification:
- disposable rate-limit key was consumed through a small test threshold;
- next request was correctly blocked;
- disposable row was deleted afterward;
- final query found zero disposable verification rows;
- `security_rate_limits` RLS is enabled with zero browser policies.
No real customer, quote, chat, newsletter, payment or invitation was created for this test.

## 2. Secure Admin-created account invitations
Old Admin behavior generated a temporary password, returned it to Admin and emailed it to the user.

Live behavior:
- `lib/auth-invite.js` calls Supabase Auth `/auth/v1/invite` server-side using service-role credentials;
- redirect target is `/account?tab=security&invited=1`;
- no password is generated, returned, logged or emailed by Namdar;
- after Auth creates the invited user, Namdar patches profile/role details and optional `staff_access`;
- if profile setup fails, the created Auth user is deleted best-effort to avoid a half-created account;
- audit action `user.invite` records `credentialDelivery:'supabase_invitation'` and `temporaryPassword:false`.

`admin-security-hardening.js`:
- replaces the old Admin save handler;
- hides/disables the temporary-password control;
- displays secure-invitation guidance;
- disables existing-user email editing in Admin;
- only an active Admin UI can select the Admin role;
- new-user success copy says a secure invitation was sent rather than displaying a credential.

Do not test this by inviting a real customer/staff email unless explicitly approved.

## 3. Verified account email changes
Admin cannot overwrite an existing account email identity through `api/admin-users.js`.

PATCH behavior:
- a different email returns 409 and directs the owner to My Namdar → Security;
- email is omitted from the profile edit patch path;
- no Admin Auth `email_confirm:true` bypass remains for existing-user email edits.

`account-security-email.js` adds My Namdar → Security `Change email address`:
- validates the new email;
- requires signed-in session;
- uses `sb.auth.updateUser({email: next}, {emailRedirectTo: ...})`;
- current email stays active until Supabase confirmation completes;
- invitation/email-confirmation return messages appear in the account UI.

Production trigger verification:
- `auth.users` trigger `on_auth_user_email_updated` fires AFTER UPDATE;
- it calls `public.sync_profile_email()`;
- `sync_profile_email()` updates `public.profiles.email` when Auth email changes.
No additional sync migration was needed.

## 4. Privileged account lifecycle safeguards
`api/admin-users.js` now enforces:
- only an administrator can invite another administrator;
- only an administrator can promote/modify administrator roles;
- current signed-in privileged account cannot change its own role/account status;
- current account cannot delete itself;
- an active admin cannot be demoted/suspended/deleted unless another active admin exists;
- therefore the last active administrator cannot be removed accidentally.

## 5. Admin inactivity timeout
`admin-security-hardening.js` signs the Admin dashboard out after 30 minutes of inactivity.
- pointer, keyboard, touch and scroll reset activity time;
- hidden tab is checked when visible again;
- login/signed-out state resets idle timing;
- user receives a clear timeout message after sign-out.

This supplements, rather than replaces, Supabase session expiry and AAL2/MFA.

## 6. Existing protections deliberately preserved
Do not weaken:
- Turnstile/CAPTCHA on privileged login and existing public anti-bot flows;
- AAL2/TOTP requirement for privileged Admin/Staff APIs;
- CSP/security headers in Vercel;
- audit-log secret redaction in `lib/server-original.js`;
- server/service-role-only private finance, receipt and health tables;
- customer-only private support-ticket policy.

## CI coverage
`.github/workflows/ai-handoff-check.yml` syntax-checks the new security/account/Admin modules and modified APIs and runs `scripts/security-hardening.test.mjs`.

The security suite asserts:
- private/RLS rate-limit schema + atomic RPC;
- HMAC identity hashing, 429/Retry-After and audit behavior;
- server-side limits on high-value public endpoints while chat poll is uncounted;
- secure invitations and absence of temporary-password output;
- current/last-admin lifecycle safeguards;
- verified self-service email changes;
- Admin inactivity timeout and current loader version.

## Supabase advisor state after release
Security advisor rerun at `2026-09-14T19:03Z`:
- `security_rate_limits` appears under INFO `RLS Enabled No Policy`. This is intentional because the table is server/service-role only and direct browser access is deliberately absent.
- **WARN: Leaked Password Protection Disabled** remains. This is the one actionable manual Auth setting left by this release.
- Other RLS-no-policy entries are existing private/server-only tables and are not introduced as browser-readable surfaces by this release.

Remediation for leaked password protection:
https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

Performance advisor rerun after the DDL:
- no new missing-FK issue is attributed to `security_rate_limits` (it has no FK dependency);
- `security_rate_limits_last_seen_idx` is currently reported unused, expected immediately after a fresh release;
- other missing-FK/multiple-policy/unused-index findings are existing broader project performance work and were not expanded into this security release.

## Existing Business Finance / Stripe baseline
- User decision: sole trader first, later limited company after successful growth.
- Never recast historical sole-trader transactions as company activity.
- Business Finance excludes sandbox Stripe using `payment_records.provider_livemode`.
- Retained Stripe sandbox ledger: 4 rows (two £0.50 payments, two £0.50 refunds), 0 live rows.
- No live Stripe credentials.
- Customer Stripe payment policy remains OFF.
- No automatic expense/tax posting from operational job-cost estimates or receipt OCR.

## Open work after security release
- Manually enable and then re-verify Supabase Leaked Password Protection.
- Optional Supabase Auth security-notification email review for password/email/MFA changes.
- Decide commercial Stripe policy: optional online payment vs deposit required vs full required; keep OFF until deliberate approval.
- Only after payment-policy approval connect live Stripe credentials/webhook and run live-readiness checklist.
- Google review-request URL still open.
- Window real-job pricing evidence/calibration.
- SMS/legal remaining checks.
- Optional duplicate floating Supabase include cleanup on `account.html`.
- `url.parse()` deprecation warning remains tech debt.
- Address-data pilot remains parked.

## Development rules
- Verify current `main`, provider state and these docs before substantive continuation.
- Preview/test before production.
- Every substantial code/database/API/security/config change updates `docs/AI_START.md`, `docs/AI_HANDOFF.md`, and `docs/PROJECT_STATUS.md`.
- Never put secrets, customer private data or credentials into repo/chat/docs.
- Keep migrations safe/idempotent and record production-applied migration truth.
