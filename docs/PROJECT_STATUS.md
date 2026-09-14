# Namdar project status

Last updated: 2026-09-14 UTC

## Production baseline
- Repo `pchroonic/pchroonic`, default `main`.
- Current main before Staff auth recovery: `5b4056db5a9b098cf0cfcd0744e17bf1ff2ec0d4`.
- Current live product release: PR #71 `Harden Namdar public APIs and account security`; PR #72 is docs-only continuity.
- Current production deployment: `dpl_4ttWCLhEDsWUpqNhQqRwQQz57Acc`, READY; `/api/health` HTTP 200.
- Production Admin/My Namdar loader: `6.4.30-security-hardening-1`.
- Supabase production `qjigldxjcpnrlyxgmlqq`.
- Window Cleaning is the only live service.
- Privileged Staff/Admin requires CAPTCHA + AAL2/MFA.
- Stripe customer payment policy remains OFF; no live Stripe credentials.
- Ask Namdar remains Guided assistant because `aiEnabled:false`.

## Staff My jobs auth recovery — FINAL VERIFICATION PENDING
Branch: `fix/staff-auth-recovery-20260914`
Target Staff version: `6.4.31-staff-auth-recovery-1`.

### Production bug confirmed
User screenshot from `/staff` showed successful Cloudflare Turnstile followed by:
`Cannot read properties of null (reading 'auth')`.
A hard refresh then restored the Staff page/session.

### Root cause
- Staff login submit used `sb.auth` directly even when startup had failed before `sb` was assigned.
- Staff still used floating Supabase JS `@2` instead of pinned `2.116.0`.
- Staff service worker cache namespace was still `6.4.16` and auth-critical scripts were cache-first/stale-while-revalidate, which could preserve an inconsistent old bundle until hard refresh.

### Implemented fix
- Added `staff-auth-readiness.js` to guard and recover auth initialization.
- Auto-recovers a failed Staff startup by reloading pinned Supabase `2.116.0`, reusing `/api/config`, rebuilding the persisted auth client, and restoring the existing session when possible.
- Sign-in now passes a verified `auth` object to privileged CAPTCHA instead of dereferencing null `sb.auth`.
- `staff.html` pins Supabase `2.116.0` and current cache-bust version.
- `staff.js` loads the readiness layer after `staff-original.js`.
- `staff-sw.js` bumped to the current cache namespace and uses network-first online for auth-critical Staff scripts, with cache fallback only when offline/network fails.
- New regression suite `scripts/staff-auth-readiness.test.mjs`.
- CI now syntax-checks the readiness module and runs its test.

### Release gate
- Full GitHub CI must pass.
- Exact-head Vercel preview must be READY with clean errors-only build.
- Preview Staff assets/version/pinned Supabase must be verified.
- Merge exact tested head only.
- Production deployment must be READY + clean, `/api/health` HTTP 200, and live Staff assets must match `6.4.31-staff-auth-recovery-1`.
- Then user should test ordinary My jobs navigation without hard refresh.

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
- Privileged MFA and CAPTCHA live.
- Self-service password/email/authenticator controls live.

### Operations
- Quotes/bookings/payments/Admin CRM live.
- Staff My jobs is live but the auth/cache recovery fix above is pending release verification.
- Window Cleaning live; later services planned.
- Customer support tickets remain customer-only/private.

### Business Finance
- Sole-trader-first Business Finance live.
- Cash-basis reporting/tax estimate framework live.
- Smart receipt workflow private and review-first.
- Sandbox Stripe excluded from finance figures.

### System reliability / Newsletter / Chat
- System Health history live.
- Newsletter Centre consent-aware/resumable; never send a campaign as a deployment test.
- Ask Namdar grounded Guided assistant live; provider AI optional and currently disabled.

## Open roadmap
- Finish Staff auth recovery CI/preview/production verification.
- Manually enable Supabase Leaked Password Protection and re-run advisor.
- Decide commercial Stripe payment policy before any live Stripe rollout.
- Google review-request URL.
- Window real-job pricing calibration.
- SMS/legal checks.
- Optional duplicate Supabase include cleanup on account HTML.
- `url.parse()` deprecation cleanup.
- Address-data pilot remains parked.
