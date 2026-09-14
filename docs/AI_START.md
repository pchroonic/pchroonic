# Namdar AI fast resume

Last verified: 2026-09-14 UTC

Read this first. Use `docs/AI_HANDOFF.md` for implementation detail and `docs/PROJECT_STATUS.md` for roadmap/status.

## Production baseline
- Repo `pchroonic/pchroonic`, default `main`.
- Current production main before this security release: `bb7c27a6a9e291bb47ede0d95063d5b9b248f566`.
- Current live product release remains PR #69 `Upgrade Ask Namdar chat experience`; PR #70 is docs-only continuity.
- Production deployment from PR #69: `dpl_8cUiMKDnNc3ko4hw7xtwQSFRFV9K`, READY; `/api/health` was HTTP 200 after release.
- Production chat assets: `6.4.29-chat-1`; production `/api/config` remains `aiEnabled:false`, so Ask Namdar is currently Guided assistant mode.
- Supabase production: `qjigldxjcpnrlyxgmlqq`.
- Vercel project: `prj_4fILo0pCaLGUSUIMWrBIVGzeWVDC`, team `team_8Az8WtWcnfwtYRdhR8vGqC3L`.
- Window Cleaning is the only live/quotable/bookable service. Later services remain planned. Address-data expansion remains parked.
- Privileged Staff/Admin requires AAL2/MFA.
- Stripe commercial customer payment policy remains OFF; no live Stripe credentials.

## Security hardening release in final verification
Branch: `security/hardening-rate-limits-invites-20260914`

Pre-docs implementation head: `701e7f26736358f36cd2cca12f41cf64f5423bb4`.
Target loaders: `6.4.30-security-hardening-1` for Admin and My Namdar.

Implemented:
- private server-only fixed-window rate limiting backed by `security_rate_limits` + atomic `consume_security_rate_limit(...)` RPC;
- rate-limit identifiers are HMAC-SHA256 hashes using the server key; raw IP addresses and customer identifiers are not stored in the counter table;
- rate-limit blocks return HTTP 429 with `Retry-After` and are written to the existing audit log as `security.rate_limited`;
- limits applied to quote creation, chat messages, newsletter subscription, postcode lookup and address lookup;
- Admin account creation changed from generated/emailed temporary passwords to Supabase secure email invitations;
- Admin UI no longer shows or accepts temporary passwords for new users;
- existing account email identity cannot be overwritten by Admin; account owners change email in My Namdar → Security using Supabase confirmation;
- current logged-in administrator cannot change their own role/account status or delete themselves;
- last active administrator cannot be demoted, suspended or deleted;
- non-admin staff cannot invite/promote administrators;
- Admin automatically signs out after 30 minutes of inactivity;
- existing CAPTCHA, AAL2/TOTP MFA, CSP/security headers and audit logging remain in place.

## Production database change already applied
Migration `20260914163700_security_rate_limit_foundation` is already applied to production and has a matching repo migration file.

Verified directly in production:
- atomic limiter allowed requests up to the test limit and blocked the next request;
- disposable verification counter was deleted afterwards;
- `security_rate_limits` has RLS enabled and 0 browser policies;
- production auth trigger `on_auth_user_email_updated` calls `sync_profile_email()`, so verified Supabase email changes propagate back to `profiles`;
- no customer, quote, chat, newsletter or payment record was created during limiter verification.

## Final verification checklist
1. Open PR from the security branch to `main`.
2. Require full GitHub CI green, including `scripts/security-hardening.test.mjs`.
3. Locate the exact-head Vercel preview; require READY and clean errors-only build.
4. Verify preview static loaders/assets and safe GET endpoints only; do not create real users, quotes, chats or emails as deployment tests.
5. Merge only after CI + exact preview are clean.
6. Verify production deployment READY, `/api/health` HTTP 200, and live `6.4.30-security-hardening-1` Admin/account loaders/assets.
7. Re-run Supabase security advisor. Leaked Password Protection may still require a manual Supabase Auth setting because the available management connector does not expose that project-auth mutation.
8. Record exact live release/deployment state in all three continuity docs after production verification.

## Important safety notes
- Do not invent or expose passwords, tokens, provider keys or customer private data.
- Do not test the invitation flow with a real customer/staff email unless explicitly approved; CI/source verification is the safe default.
- Do not enable Stripe commercial payments as part of this security release.
- Preserve the current AAL2/MFA boundary for privileged Admin/Staff APIs.
