# Namdar AI fast resume

Last verified: 2026-09-14 UTC

Read this first. Use `docs/AI_HANDOFF.md` for implementation detail and `docs/PROJECT_STATUS.md` for roadmap/status.

## Production source of truth
- Repo `pchroonic/pchroonic`, default `main`.
- Current `main` before this staff fix: `5b4056db5a9b098cf0cfcd0744e17bf1ff2ec0d4` (PR #72 docs-only merge after Security Hardening).
- Current live product release remains PR #71 `Harden Namdar public APIs and account security`.
- PR #71 final tested head `fee9f82c7912372e612b133a69924a5a01c7f9e4`; GitHub CI `34884232265` SUCCESS.
- Product merge `ea61d8df2ed1110973580c4a0ab3bca09e05d7a8`.
- Current production deployment after docs-only PR #72: `dpl_4ttWCLhEDsWUpqNhQqRwQQz57Acc`, READY; `/api/health` HTTP 200.
- Production Admin/My Namdar asset version remains `6.4.30-security-hardening-1`.
- Supabase production `qjigldxjcpnrlyxgmlqq`; Vercel project `prj_4fILo0pCaLGUSUIMWrBIVGzeWVDC`.
- Window Cleaning is the only live/quotable/bookable service. Later services remain planned.
- Privileged Staff/Admin requires AAL2/MFA and CAPTCHA.
- Stripe commercial customer payment policy remains OFF; no live Stripe credentials.
- Ask Namdar provider AI remains disabled (`aiEnabled:false`), so Guided assistant mode is correct.

## Staff My jobs auth recovery — in verification
User-reported production symptom on `/staff`:
- My jobs sometimes showed the staff sign-in form with `Cannot read properties of null (reading 'auth')` after pressing Sign in;
- a hard refresh then restored the existing session and opened the jobs page.

Confirmed cause/risk from production source:
- `staff-original.js` login submit handler dereferenced `sb.auth` directly even when staff setup had failed before assigning `sb`;
- staff page still loaded floating `@supabase/supabase-js@2` rather than the pinned `2.116.0` used by My Namdar;
- `staff-sw.js` was still on the old `6.4.16` cache namespace and served auth-critical scripts cache-first/stale-while-revalidate, allowing an inconsistent old staff bundle until hard refresh.

Fix branch: `fix/staff-auth-recovery-20260914`
Target staff asset version: `6.4.31-staff-auth-recovery-1`.

Implemented on the branch:
- new `staff-auth-readiness.js` replaces the fragile submit path and never passes `sb.auth` before an auth client is ready;
- if initial staff setup failed, it automatically retries the safe public config, can reload pinned Supabase JS `2.116.0`, rebuild the persisted-session client, restore the existing session, and reopen My jobs without a hard refresh;
- preserves privileged CAPTCHA sign-in and existing Staff MFA flow;
- `staff.html` now pins Supabase JS `2.116.0` and current staff cache-bust version;
- `staff.js` loads `staff-auth-readiness.js` after `staff-original.js`;
- service worker bumped to the current staff version and auth-critical scripts use network-first online with cache fallback offline;
- new regression test `scripts/staff-auth-readiness.test.mjs` plus CI syntax/test coverage.

## Verification gate for staff fix
1. Open PR to `main` only after all three continuity docs are updated.
2. Require full GitHub CI green.
3. Require exact-head Vercel preview READY with clean errors-only build.
4. Verify preview `staff.html`, `staff.js`, `staff-auth-readiness.js`, and `staff-sw.js` match `6.4.31-staff-auth-recovery-1` and pinned Supabase `2.116.0`.
5. Merge only after the exact-head gate passes.
6. Verify production deployment READY, clean build, `/api/health` HTTP 200, and live staff assets/version.
7. User should then open My jobs normally without hard refresh. Do not ask them to expose their password or MFA code.

## Security/finance invariants
- Preserve Security Hardening: private server-side rate limits, secure invitations, owner-confirmed email changes, last-admin/current-admin protections, 30-minute Admin idle sign-out, CAPTCHA and AAL2/MFA.
- Supabase Leaked Password Protection is still a manual Auth-setting follow-up until explicitly enabled/re-verified.
- Business Finance remains sole-trader-first, private, cash-basis oriented, excludes Stripe sandbox rows, and Smart Receipts remain review-first/private.
- Do not create real customers, quotes, chats, newsletter sends, invitations, payments or expenses merely as deployment tests.
