# Namdar AI fast resume

Last verified: 2026-09-14 UTC

Read this first. Use `docs/AI_HANDOFF.md` for implementation detail and `docs/PROJECT_STATUS.md` for roadmap/status.

## Production source of truth
- Repo `pchroonic/pchroonic`, default `main`.
- Current live product release: PR #71 `Harden Namdar public APIs and account security`.
- Exact tested PR head: `fee9f82c7912372e612b133a69924a5a01c7f9e4`.
- GitHub CI run `34884232265`: SUCCESS.
- Exact-head Vercel preview `dpl_AR6bRZvrS5DFGYQ3qgQLWbcUzsDb`: READY; errors-only build log clean.
- Merge/main: `ea61d8df2ed1110973580c4a0ab3bca09e05d7a8`.
- Production deployment: `dpl_bwmC8t5W68ETAf8MzR6HvLiNCxMb`: READY on `https://namdar.co.uk`; errors-only build log clean.
- Production `/api/health`: HTTP 200 after release with database/email/reminder/follow-up checks healthy.
- Live Admin and My Namdar loaders: `6.4.30-security-hardening-1`.
- Live `admin-security-hardening.js` and `account-security-email.js`: HTTP 200.
- Supabase production: `qjigldxjcpnrlyxgmlqq`.
- Vercel project: `prj_4fILo0pCaLGUSUIMWrBIVGzeWVDC`, team `team_8Az8WtWcnfwtYRdhR8vGqC3L`.
- Window Cleaning is the only live/quotable/bookable service. Later services remain planned. Address-data expansion remains parked.
- Privileged Staff/Admin requires AAL2/MFA.
- Stripe commercial customer payment policy remains OFF; no live Stripe credentials.
- Ask Namdar provider AI remains disabled in production (`aiEnabled:false`); Guided assistant mode remains correct.

## Security hardening — LIVE
Production migration:
- `20260914163700_security_rate_limit_foundation`

Live protections:
- private server-only fixed-window rate limiting backed by `security_rate_limits` + atomic `consume_security_rate_limit(...)` RPC;
- HMAC-SHA256 rate-limit identifiers; raw IP/customer identifiers are not stored in the limiter table;
- blocked requests return HTTP 429 with `Retry-After` and produce `security.rate_limited` audit history;
- limits protect quote creation, chat messages, newsletter subscription, postcode lookup, address lookup and Admin invitations;
- Admin-created users receive Supabase secure invitations and choose their own password; Namdar no longer creates, displays or emails temporary passwords;
- Admin cannot overwrite an existing account email identity; owners change email in My Namdar → Security using Supabase confirmation;
- verified Auth email changes sync to `profiles` through the existing `on_auth_user_email_updated` → `sync_profile_email()` trigger;
- current logged-in administrator cannot demote/suspend/delete itself;
- last active administrator cannot be demoted/suspended/deleted;
- non-admin staff cannot invite/promote administrators;
- Admin signs out after 30 minutes of inactivity;
- existing CAPTCHA, AAL2/TOTP MFA, CSP/security headers and audit redaction remain in place.

## Verification notes
- Rate-limit RPC was tested in production with a disposable key: it allowed through the configured test limit, blocked the next request, and the disposable counter was deleted afterwards.
- `security_rate_limits` has RLS enabled and no browser policies. Supabase advisor reports this as `RLS Enabled No Policy` INFO; for this server-only table that is intentional.
- No real customer, quote, chat, newsletter, payment or invitation was created during security verification.
- Production error/fatal runtime log check after deployment returned no matching logs.
- Exact preview was Vercel-SOO protected, so its static files could not be fetched directly through the connector; the exact Git head, green CI and clean exact-head build were verified before merge, and the same loaders/assets were then fetched successfully from production.

## Remaining manual security item
Supabase Security Advisor still reports **Leaked Password Protection Disabled**. The available management connector does not expose a safe Auth-config mutation for this setting, so do not claim it is enabled until it is changed and re-verified in Supabase Auth settings.

Reference: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

## Important safety notes
- Do not invent or expose passwords, tokens, provider keys or customer private data.
- Do not create real invitation/marketing/quote/chat records merely as deployment tests.
- Do not enable Stripe commercial payments without a separate deliberate payment-policy decision.
- Preserve AAL2/MFA for privileged Admin/Staff APIs.
