# Namdar project status

Last updated: 2026-09-14 UTC

## Production baseline
- Repo `pchroonic/pchroonic`, default `main`.
- Current live product release: PR #71 `Harden Namdar public APIs and account security`.
- Exact tested PR head: `fee9f82c7912372e612b133a69924a5a01c7f9e4`.
- GitHub CI `34884232265`: SUCCESS.
- Exact preview `dpl_AR6bRZvrS5DFGYQ3qgQLWbcUzsDb`: READY with clean errors-only build.
- Merge/main: `ea61d8df2ed1110973580c4a0ab3bca09e05d7a8`.
- Production deployment: `dpl_bwmC8t5W68ETAf8MzR6HvLiNCxMb`: READY with clean errors-only build.
- Production `/api/health`: HTTP 200 after release.
- Production Admin/My Namdar loader: `6.4.30-security-hardening-1`.
- `admin-security-hardening.js` and `account-security-email.js` verified HTTP 200 live.
- Supabase production: `qjigldxjcpnrlyxgmlqq`.
- Window Cleaning is the only live service.
- Privileged Staff/Admin requires AAL2/MFA.
- Stripe customer payment policy remains OFF; no live Stripe credentials.
- Ask Namdar remains Guided assistant mode because production `aiEnabled:false`.

## Security hardening — LIVE
### Abuse protection
- Private fixed-window server-side rate limiter live.
- Atomic Supabase RPC prevents racey counter updates.
- Limiter keys are HMAC-SHA256 hashes; raw IP/customer identifiers are not stored in the rate-limit table.
- Blocked requests return HTTP 429 with `Retry-After` and produce an audit event.
- Protected surfaces: quote creation, chat messages, newsletter subscription, postcode lookup, address lookup and Admin invitations.

### Account credential safety
- Admin-created users now receive secure Supabase invitations and choose their own password.
- Temporary password generation/display/email has been removed from the Admin creation flow.
- Existing user email identity cannot be changed from Admin.
- Account owners change email in My Namdar → Security through Supabase confirmation.
- Existing production Auth trigger synchronizes verified Auth email changes to the Namdar profile.

### Privileged account safeguards
- Non-admin staff cannot create/promote admins.
- Current logged-in admin cannot demote/suspend/delete itself.
- Last active administrator cannot be demoted/suspended/deleted.
- Admin auto-signs out after 30 minutes of inactivity.
- Existing AAL2/TOTP MFA, CAPTCHA, CSP/security headers and audit redaction remain preserved.

### Database
Applied production migration:
- `20260914163700_security_rate_limit_foundation`

Verified:
- disposable limiter test blocks after the configured threshold;
- disposable verification row removed afterward;
- `security_rate_limits` RLS enabled with zero browser policies;
- no real customer/quote/chat/newsletter/payment/invitation record was created during mechanism testing.

### Release verification
- Initial CI failure was caused only by an overly broad security regression regex rejecting the safe audit flag `temporaryPassword:false`; test was corrected.
- Final CI run `34884232265` passed.
- Exact-head preview `dpl_AR6bRZvrS5DFGYQ3qgQLWbcUzsDb` READY and clean.
- PR #71 merged at `ea61d8df2ed1110973580c4a0ab3bca09e05d7a8`.
- Production `dpl_bwmC8t5W68ETAf8MzR6HvLiNCxMb` READY and clean.
- Production `/api/health` HTTP 200.
- Production Admin/account loaders and both new security assets HTTP 200.
- Post-release error/fatal runtime-log check returned no matching logs.

## Remaining security follow-up
Supabase Security Advisor still reports **Leaked Password Protection Disabled**. Available management tooling does not expose a safe project Auth-config mutation, so this remains a manual Supabase Dashboard/Auth setting until changed and re-verified.

Reference:
https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

The advisor also lists `security_rate_limits` as `RLS Enabled No Policy` INFO. This is intentional for the server/service-role-only limiter table; browser access is deliberately absent.

## Stable feature status
### Accounts / authentication
- My Namdar portal live.
- Supabase JS pinned to `2.116.0` with bounded session restore hotfix.
- Privileged MFA and login CAPTCHA live.
- Self-service password, email and authenticator controls live.

### Operations
- Quotes/bookings/payments/Admin CRM live.
- Window Cleaning live; later services remain planned.
- Customer support tickets are customer-only/private; public chat does not create public tickets.

### Business Finance
- Sole-trader-first Business Finance live.
- Cash-basis finance reporting/tax estimate framework live.
- Smart receipt workflow live and private.
- Sandbox Stripe excluded from finance figures.
- No live Stripe credentials.

### System reliability
- System Health dashboard/history live.
- Persistent scheduled-run history verified.
- Existing intermittent Supabase/PostgREST gateway-timeout risk remains monitored.

### Newsletter
- Consent-aware Newsletter Centre live.
- Campaign sending is resumable/queued.
- Never send a real campaign as a deployment test.

### Ask Namdar
- Grounded guided assistant live.
- Optional model provider remains disabled in production.
- Human takeover remains exclusive after staff takeover.

## Open roadmap
- Manually enable Supabase Leaked Password Protection and re-run advisor.
- Optionally review Supabase Auth security-notification emails for password/email/MFA changes.
- Decide commercial Stripe payment policy before any live Stripe rollout.
- Google review-request URL.
- Window real-job pricing calibration.
- SMS/legal checks.
- Optional duplicate Supabase include cleanup on `account.html`.
- `url.parse()` deprecation cleanup.
- Address-data pilot remains parked.
