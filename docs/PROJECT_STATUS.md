# Namdar project status

Last updated: 2026-09-14 UTC

## Production baseline
- Repo `pchroonic/pchroonic`, default `main`.
- Current live product release: PR #73 `Fix Staff My jobs auth recovery`.
- Exact tested head: `43c8b678f38549d9bce674c1e4ae8ab0eed889c4`.
- GitHub CI `34886442615`: SUCCESS.
- Exact preview `dpl_92WaxJ1yhL4kGuDusWrmTC7FhiXg`: READY with clean errors-only build; Vercel commit status SUCCESS.
- Product merge/main: `dc10aefc814f6aac8a6cb686597a01b682647deb`.
- Production deployment: `dpl_FP8WnzuPGtYwxNKLpMsGjpc7pPRo`, READY and clean.
- Production `/api/health`: HTTP 200 after release.
- Live Staff version: `6.4.31-staff-auth-recovery-1`.
- Live `/staff` pins Supabase JS `2.116.0`; live `staff.js`, `staff-auth-readiness.js`, `staff-sw.js` verified HTTP 200.
- Post-release error/fatal runtime log check found no matching logs.
- Supabase production `qjigldxjcpnrlyxgmlqq`.
- Window Cleaning is the only live service.
- Privileged Staff/Admin requires CAPTCHA + AAL2/MFA.
- Stripe customer payment policy remains OFF; no live Stripe credentials.
- Ask Namdar remains Guided assistant because `aiEnabled:false`.

## Staff My jobs auth recovery — LIVE
### User-reported bug
`/staff` could show a successful Turnstile but then fail Sign in with:
`Cannot read properties of null (reading 'auth')`.
A hard refresh then restored the jobs page.

### Root cause fixed
- direct `sb.auth` dereference was reachable when Staff setup failed before the Supabase client was assigned;
- Staff used floating Supabase JS `@2` instead of pinned `2.116.0`;
- Staff service worker still used an old `6.4.16` cache namespace and cache-first/stale-while-revalidate for auth-critical files.

### Live fix
- `staff-auth-readiness.js` now guards/retries auth setup and restores an existing persisted session when possible;
- it can reload pinned Supabase `2.116.0`, reload safe public config, rebuild the auth client and reopen My jobs automatically;
- sign-in passes a resolved `auth` object to privileged CAPTCHA rather than dereferencing null `sb.auth`;
- Staff service worker cache namespace is now `6.4.31-staff-auth-recovery-1`;
- auth-critical Staff scripts are network-first online with offline cache fallback;
- regression tests and CI coverage added.

### Verification
- PR #73 exact head/CI/preview passed.
- Production deployment READY + clean.
- `/api/health` HTTP 200.
- Live Staff page/loader/recovery/service-worker assets verified current.
- No error/fatal runtime logs immediately after release.

### Final browser smoke still pending user confirmation
One normal authenticated browser check remains:
- open My jobs normally without a hard refresh;
- if an existing session is valid, it should restore directly;
- if signed out, ordinary CAPTCHA + sign-in should work once;
- never share password or MFA code in chat.

## Security Hardening — LIVE
- Private server-side rate limits with HMAC-hashed identities.
- Secure Supabase invitations; no temporary passwords.
- Account owners confirm email changes themselves.
- Current/last administrator safeguards live.
- Admin 30-minute inactivity sign-out live.
- CAPTCHA, AAL2/TOTP MFA, CSP/security headers and audit redaction preserved.
- Supabase Leaked Password Protection remains a manual Auth-setting follow-up until enabled/re-verified.

## Stable feature status
### Accounts / authentication
- My Namdar portal live with pinned Supabase JS `2.116.0` and bounded session restore.
- Staff My jobs auth/cache recovery is now live with the same pinned Supabase build.
- Privileged MFA and CAPTCHA live.
- Self-service password/email/authenticator controls live.

### Operations
- Quotes/bookings/payments/Admin CRM live.
- Window Cleaning live; later services planned.
- Customer support tickets remain customer-only/private.

### Business Finance
- Sole-trader-first Business Finance live.
- Cash-basis reporting/tax estimate framework live.
- Smart Receipt workflow private and review-first.
- Sandbox Stripe excluded from finance figures.

### Reliability / Newsletter / Chat
- System Health history live.
- Newsletter Centre consent-aware/resumable; never send a campaign as a deployment test.
- Ask Namdar grounded Guided assistant live; provider AI optional and currently disabled.

## Open roadmap
- User browser-smoke Staff My jobs without hard refresh.
- Manually enable Supabase Leaked Password Protection and re-run advisor.
- Decide commercial Stripe payment policy before any live Stripe rollout.
- Google review-request URL.
- Window real-job pricing calibration.
- SMS/legal checks.
- Optional duplicate Supabase include cleanup on account HTML.
- `url.parse()` deprecation cleanup.
- Address-data pilot remains parked.
