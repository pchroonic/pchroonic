# Namdar AI fast resume

Last verified: 2026-09-14 UTC

Read this first. Use `docs/AI_HANDOFF.md` for implementation detail and `docs/PROJECT_STATUS.md` for roadmap/status.

## Production source of truth
- Repo `pchroonic/pchroonic`, default `main`.
- Current live product release: PR #73 `Fix Staff My jobs auth recovery`.
- Exact tested PR head: `43c8b678f38549d9bce674c1e4ae8ab0eed889c4`.
- GitHub CI run `34886442615`: SUCCESS.
- Exact-head Vercel preview `dpl_92WaxJ1yhL4kGuDusWrmTC7FhiXg`: READY; errors-only build clean; Vercel commit status SUCCESS.
- Product merge/main: `dc10aefc814f6aac8a6cb686597a01b682647deb`.
- Production deployment: `dpl_FP8WnzuPGtYwxNKLpMsGjpc7pPRo`: READY on `https://namdar.co.uk`; errors-only build clean.
- Production `/api/health`: HTTP 200 after release with database/email/reminder/follow-up checks healthy.
- Live Staff asset version: `6.4.31-staff-auth-recovery-1`.
- Live `/staff` pins Supabase JS `2.116.0`.
- Live `staff.js`, `staff-auth-readiness.js`, and `staff-sw.js`: HTTP 200 and verified current.
- Post-release production error/fatal runtime-log check: no matching logs.
- Supabase production `qjigldxjcpnrlyxgmlqq`; Vercel project `prj_4fILo0pCaLGUSUIMWrBIVGzeWVDC`.
- Window Cleaning is the only live/quotable/bookable service. Later services remain planned.
- Privileged Staff/Admin requires CAPTCHA + AAL2/MFA.
- Stripe commercial customer payment policy remains OFF; no live Stripe credentials.
- Ask Namdar provider AI remains disabled (`aiEnabled:false`); Guided assistant mode remains correct.

## Staff My jobs auth recovery — LIVE
User-reported symptom fixed:
- `/staff` could show a successful Turnstile followed by `Cannot read properties of null (reading 'auth')` on Sign in;
- hard refresh then restored the existing Staff session.

Confirmed causes fixed:
- Staff sign-in no longer dereferences `sb.auth` before the auth client is ready;
- Staff now pins Supabase JS `2.116.0` rather than floating `@2`;
- Staff service-worker cache namespace moved from old `6.4.16` to `6.4.31-staff-auth-recovery-1`;
- auth-critical Staff scripts are network-first online, cache fallback offline, preventing stale cache-first bundles from requiring hard refresh.

`staff-auth-readiness.js` now:
- waits for normal auth startup;
- automatically retries missing auth setup if initial startup failed;
- can reload pinned Supabase JS `2.116.0`;
- reloads safe public config, rebuilds the persisted auth client and restores an existing session;
- opens My jobs automatically when a valid existing session is recovered;
- otherwise leaves a ready login form and passes a verified `auth` object into privileged CAPTCHA sign-in;
- preserves Staff MFA/AAL2 and does not expose password/MFA data.

## Verification notes
- New regression test: `scripts/staff-auth-readiness.test.mjs`.
- CI syntax-checks the readiness module/service worker and runs the regression suite.
- Exact preview static fetch was blocked by Vercel SSO in the connector, so exact-head Git source + green CI + exact-head build/status were verified before merge; identical assets were then fetched and verified from production after deployment.
- No real customer, invitation, quote, payment, newsletter, expense or other operational record was created as part of deployment verification.

## Existing security/finance invariants
- Security Hardening remains live: private server rate limits, secure invitations, owner-confirmed email changes, current/last-admin protections, 30-minute Admin idle sign-out, CAPTCHA and AAL2/MFA.
- Supabase Leaked Password Protection is still a manual Auth-setting follow-up until explicitly enabled and re-verified.
- Business Finance remains private, sole-trader-first, cash-basis oriented and excludes Stripe sandbox rows.
- Smart Receipts remain private and review-first.
