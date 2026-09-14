# Namdar AI handoff

Last verified: 2026-09-14 UTC

Read `docs/AI_START.md` first.

## Production baseline before this fix
- Repo `pchroonic/pchroonic`, default `main`.
- Current `main`: `5b4056db5a9b098cf0cfcd0744e17bf1ff2ec0d4`.
- Current live product release: PR #71 `Harden Namdar public APIs and account security`; PR #72 is docs-only continuity.
- PR #71 exact tested head `fee9f82c7912372e612b133a69924a5a01c7f9e4`; CI `34884232265` SUCCESS.
- Product merge `ea61d8df2ed1110973580c4a0ab3bca09e05d7a8`.
- Current production deployment after PR #72: `dpl_4ttWCLhEDsWUpqNhQqRwQQz57Acc`, READY and `/api/health` HTTP 200.
- Production Admin/My Namdar loaders: `6.4.30-security-hardening-1`.
- Supabase production `qjigldxjcpnrlyxgmlqq`; Vercel project `prj_4fILo0pCaLGUSUIMWrBIVGzeWVDC`.
- Window Cleaning only live. Stripe commercial payment policy OFF. Provider AI disabled (`aiEnabled:false`).
- Privileged Staff/Admin requires CAPTCHA and AAL2/TOTP MFA.

# Staff My jobs auth recovery

## User-observed production bug
On `https://namdar.co.uk/staff`, the user captured a login screen where Cloudflare Turnstile had succeeded, but pressing Sign in produced:

`Cannot read properties of null (reading 'auth')`

A hard refresh then opened My jobs without another login. Do not treat this as expected behavior.

## Root-cause analysis
Production source confirmed three interacting weaknesses:

1. `staff-original.js` declares `let sb=null` and its login submit handler calls:
   `window.NamdarPrivilegedCaptcha.signIn(sb.auth, ...)`.
   If startup fails before `sb=window.supabase.createClient(...)`, the catch path calls `showLogin(...)`; the login remains usable even though `sb` is still null. The next click therefore throws exactly the user-visible null-auth error.

2. `staff.html` still loaded floating `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2`, while My Namdar already pins `2.116.0`. A transient/floating CDN load problem can therefore leave Staff setup without `window.supabase` and make the null-client path reachable.

3. `staff-sw.js` was still `namdar-staff-v6.4.16-privileged-captcha-1` and used cache-first/stale-while-revalidate for local Staff scripts. Because newer Staff code had shipped after that cache namespace, a controlled page navigation could receive an old/inconsistent JS bundle until hard refresh bypassed/renewed cache. This matches the reported hard-refresh recovery pattern.

## Fix branch
`fix/staff-auth-recovery-20260914`

Target Staff version:
`6.4.31-staff-auth-recovery-1`

### New `staff-auth-readiness.js`
Loaded after `staff-original.js` so it can safely reuse the existing Staff functions/state while replacing the fragile form submit handler.

Behavior:
- never dereferences `sb.auth` until `authReady()` confirms an auth client;
- briefly waits for normal startup to complete;
- if startup already failed, automatically starts a single shared recovery promise;
- dynamically reloads pinned Supabase JS `2.116.0` only when `window.supabase.createClient` is absent;
- reloads `/api/config` through the existing safe `loadPublicConfig()` path;
- reconfigures the privileged CAPTCHA slot;
- rebuilds the Supabase client with the existing persisted-session options;
- calls `getSession()` and restores `currentSession`;
- if an existing session is present, loads jobs and opens the app automatically rather than asking for another login/hard refresh;
- if no session exists, leaves a ready login form and uses `NamdarPrivilegedCaptcha.signIn(auth, ...)` with a verified auth object;
- attaches an auth-state listener only for the recovered-client path so token refresh/sign-out state stays synchronized;
- keeps clear user-facing setup errors and never exposes password/MFA values.

### `staff.html`
- pins `@supabase/supabase-js@2.116.0`;
- bumps `styles.css` and `staff.js` cache-bust query to `6.4.31-staff-auth-recovery-1`.

### `staff.js`
- version `6.4.31-staff-auth-recovery-1`;
- load order:
  1. privileged login CAPTCHA
  2. `staff-original.js`
  3. `staff-auth-readiness.js`
  4. closeout
  5. Staff MFA guard

### `staff-sw.js`
- cache namespace bumped to `namdar-staff-v6.4.31-staff-auth-recovery-1` so older Staff caches are removed on activation;
- includes the new readiness asset and `staff-closeout.js` in local assets;
- remote Supabase cache key pins `2.116.0`;
- Staff navigation remains network-first with offline fallback;
- auth-critical scripts (`staff.js`, `staff-original.js`, readiness, CAPTCHA, MFA guard) are now **network-first online** and only fall back to cache when the network request fails;
- this prevents a stale cache-first auth bundle from remaining active simply because the browser did not hard refresh.

## Regression coverage
New `scripts/staff-auth-readiness.test.mjs` asserts:
- Staff page and loader use `6.4.31-staff-auth-recovery-1`;
- Supabase JS is pinned to `2.116.0`;
- readiness module is loaded after original Staff code;
- login uses `recoverAuthClient()` and passes a resolved `auth` object to CAPTCHA rather than direct `sb.auth` dereference;
- recovery can dynamically reload the pinned browser client and restore session;
- service worker uses the new cache namespace and network-first auth-critical fetch path.

`.github/workflows/ai-handoff-check.yml` now syntax-checks `staff-auth-readiness.js` and runs the new regression test.

## Release gate
Before production:
1. Open PR from `fix/staff-auth-recovery-20260914` to `main`.
2. Full GitHub CI must be SUCCESS.
3. Exact PR head must have Vercel preview READY and clean errors-only build.
4. Verify preview source/assets only; no real staff invitation, quote, payment or marketing side effect.
5. Confirm preview `/staff` serves pinned Supabase `2.116.0`, current Staff loader, readiness file and current service worker.
6. Merge exact tested head only.
7. Verify production deployment READY + clean build.
8. Verify production `/api/health` HTTP 200 and live Staff assets/version.
9. User can then test ordinary navigation to My jobs. Never ask them to share password or MFA code.
10. Record the exact live IDs in all three docs after production verification.

## Stable systems that must not regress
- Security Hardening from PR #71: private server rate limiting, secure invitations, verified owner email changes, administrator lifecycle protections, Admin idle timeout.
- Account auth uses pinned Supabase JS `2.116.0` and bounded session restore.
- Privileged APIs keep AAL2/TOTP MFA and CAPTCHA.
- Business Finance remains private/sole-trader-first; Smart Receipts remain private and review-first.
- System Health and Newsletter Centre remain live.
- Window Cleaning only live; future services remain planned.
- Stripe sandbox remains excluded from Business Finance; customer payment policy OFF; no live Stripe credentials.
- Supabase Leaked Password Protection still needs manual enablement/re-verification.

## Development rules
- Preview/test before production.
- Every substantial code/security/config change updates `docs/AI_START.md`, `docs/AI_HANDOFF.md`, and `docs/PROJECT_STATUS.md`.
- Do not put credentials, passwords, tokens or customer private data in repo/chat/docs.
- Do not create real operational records merely as smoke tests.
