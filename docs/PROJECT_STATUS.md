# Namdar project status

Last updated: 2026-09-14 UTC

## Production baseline
- Repo `pchroonic/pchroonic`, default `main`.
- Current main before security release: `bb7c27a6a9e291bb47ede0d95063d5b9b248f566`.
- Current live product release: PR #69 `Upgrade Ask Namdar chat experience`; PR #70 records that live release in continuity docs.
- Production deployment from PR #69: `dpl_8cUiMKDnNc3ko4hw7xtwQSFRFV9K` READY; production `/api/health` HTTP 200 after release.
- Production Ask Namdar loader/assets `6.4.29-chat-1`; `/api/config` reports `aiEnabled:false`, so current mode is Guided assistant.
- Supabase production: `qjigldxjcpnrlyxgmlqq`.
- Window Cleaning is the only live service.
- Privileged Staff/Admin requires AAL2/MFA.
- Stripe customer payment policy remains OFF; no live Stripe credentials.

## Security hardening — FINAL VERIFICATION
Branch: `security/hardening-rate-limits-invites-20260914`

Pre-docs implementation head: `701e7f26736358f36cd2cca12f41cf64f5423bb4`.
Target release loader: `6.4.30-security-hardening-1`.

### Implemented
- Server-side fixed-window rate limiting with a private Supabase table and atomic RPC.
- HMAC-hashed rate-limit identities; raw IP/customer identifiers are not stored in the rate-limit table.
- 429 + `Retry-After` behavior and audit logging for blocks.
- Rate limits on quote creation, chat messages, newsletter subscription, postcode lookup, address lookup and Admin user invitations.
- Admin-created users now receive secure Supabase invitations and choose their own password.
- Temporary password creation/display/email removed from Admin creation flow.
- Existing email identity removed from Admin edit path; account owner confirms changes in My Namdar Security.
- Current logged-in admin cannot demote/suspend/delete itself.
- Last active administrator cannot be demoted/suspended/deleted.
- Non-admin staff cannot invite/promote admins.
- Admin idle sign-out after 30 minutes.
- Existing AAL2/MFA, CAPTCHA, CSP/security headers and audit logging preserved.

### Database
Applied production migration:
- `20260914163700_security_rate_limit_foundation`

Verified:
- limiter blocks after configured test limit;
- disposable verification counter removed;
- `security_rate_limits` RLS enabled;
- zero browser policies on the rate-limit table;
- auth email-update trigger already synchronizes verified Auth email to `profiles`.

### Tests/CI target
- New `scripts/security-hardening.test.mjs`.
- Workflow syntax-checks the new account/Admin/security/invite modules and modified APIs.
- Existing loader-version tests updated to `6.4.30-security-hardening-1`.

### Release gate
Not production-deployed yet. Before merge require:
1. GitHub PR from security branch to main.
2. Full CI SUCCESS.
3. Exact-head Vercel preview READY with clean errors-only build.
4. Safe preview static/config checks only; no real invitations, quotes, chats or marketing email tests.
5. Merge after checks pass.
6. Production deployment READY + clean build.
7. Production `/api/health` HTTP 200 and live security loader/assets verified.
8. Re-run Supabase security advisor.
9. Record exact CI/preview/merge/production IDs in all three continuity docs.

## Security follow-up after this release
- Supabase advisor previously reports Leaked Password Protection disabled. Available tooling does not expose a safe Auth-config mutation for that setting, so treat it as a manual Supabase Dashboard item unless independently verified enabled.
- Consider reviewing Supabase Auth security notification emails for password/email/MFA changes after this release.

## Stable feature status
### Accounts / authentication
- My Namdar account portal live.
- Supabase JS pinned to `2.116.0` with bounded session restore hotfix.
- MFA and privileged login CAPTCHA live.
- Customer self-service password change and authenticator MFA live.

### Operations
- Quotes/bookings/payments/admin CRM live.
- Window Cleaning service live.
- Later services remain planned.
- Customer support tickets are customer-only/private; public chat does not create public tickets.

### Business Finance
- Sole-trader-first model live.
- Cash-basis finance reporting and tax estimate framework live.
- Smart receipt workflow live and private.
- Sandbox Stripe excluded from finance figures.
- No live Stripe credentials.

### System reliability
- System Health dashboard/history live.
- Persistent scheduled-run history verified.
- Existing intermittent Supabase/PostgREST gateway-timeout risk remains monitored through System Health.

### Newsletter
- Consent-aware Newsletter Centre live.
- Campaign sending is resumable/queued.
- Never send a real campaign as a deployment test.

### Ask Namdar
- Grounded guided assistant live.
- Provider AI remains optional and currently disabled in production.
- Human takeover remains exclusive when a staff member takes over a chat.

## Open roadmap
- Finish and release Security Hardening after final CI/preview/production verification.
- Manual Leaked Password Protection enablement if still disabled.
- Decide commercial Stripe payment policy and only then consider live Stripe credentials.
- Google review-request URL.
- Window real-job pricing calibration.
- SMS/legal checks.
- Optional account HTML duplicate Supabase include cleanup.
- `url.parse()` deprecation cleanup.
- Address-data pilot remains parked.
