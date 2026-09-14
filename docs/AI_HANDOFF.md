# Namdar AI handoff

Last verified: 2026-09-14 UTC

Read `docs/AI_START.md` first.

## Production source of truth
- Repo `pchroonic/pchroonic`, default `main`.
- Current live product release: PR #73 `Fix Staff My jobs auth recovery`.
- Exact tested head `43c8b678f38549d9bce674c1e4ae8ab0eed889c4`.
- GitHub CI `34886442615`: SUCCESS.
- Exact preview `dpl_92WaxJ1yhL4kGuDusWrmTC7FhiXg`: READY, clean errors-only build; Vercel commit status SUCCESS.
- Product merge `dc10aefc814f6aac8a6cb686597a01b682647deb`.
- Production deployment `dpl_FP8WnzuPGtYwxNKLpMsGjpc7pPRo`: READY, clean errors-only build.
- Production `/api/health`: HTTP 200 after release.
- Live Staff version `6.4.31-staff-auth-recovery-1`; `/staff` pins Supabase JS `2.116.0`.
- Live `staff.js`, `staff-auth-readiness.js`, and `staff-sw.js` verified HTTP 200.
- Production error/fatal runtime-log check after release returned no matching logs.
- Supabase production `qjigldxjcpnrlyxgmlqq`; Vercel project `prj_4fILo0pCaLGUSUIMWrBIVGzeWVDC`.
- Window Cleaning only live. Stripe commercial payment policy OFF. Provider AI disabled (`aiEnabled:false`).
- Privileged Staff/Admin requires CAPTCHA + AAL2/TOTP MFA.

# Staff My jobs auth recovery — LIVE

## Original production failure
User screenshot on `/staff` showed a completed Cloudflare Turnstile followed by:
`Cannot read properties of null (reading 'auth')`
when Sign in was pressed. A hard refresh then restored My jobs.

## Root cause
1. `staff-original.js` initialized `sb=null` and its form handler passed `sb.auth` directly into the privileged CAPTCHA helper. If startup failed before the Supabase client was assigned, the UI could still expose the login form, so the next click threw the exact null-auth error.
2. `staff.html` used floating `@supabase/supabase-js@2` rather than pinned `2.116.0`.
3. `staff-sw.js` was still on the old `6.4.16` cache namespace and served auth-critical Staff scripts cache-first/stale-while-revalidate. This allowed an old/inconsistent Staff bundle to persist until hard refresh.

## Live fix
### `staff-auth-readiness.js`
- loaded after `staff-original.js`;
- replaces the fragile Staff login submit path;
- waits briefly for ordinary startup before entering recovery;
- uses one shared recovery promise;
- dynamically reloads pinned Supabase JS `2.116.0` only when the browser client is missing;
- reuses `loadPublicConfig()` and the same persisted-session settings;
- rebuilds the Supabase client when needed and calls `getSession()`;
- restores an existing Staff session and opens My jobs automatically when possible;
- otherwise leaves a valid login form and passes a resolved `auth` object to `NamdarPrivilegedCaptcha.signIn(...)`;
- attaches an auth-state listener for the recovered-client path so refreshed tokens/sign-out remain synchronized;
- never exposes passwords or MFA codes.

### `staff.html`
- pins `@supabase/supabase-js@2.116.0`;
- current Staff cache-bust is `6.4.31-staff-auth-recovery-1`.

### `staff.js`
Load order is now:
1. privileged login CAPTCHA
2. `staff-original.js`
3. `staff-auth-readiness.js`
4. `staff-closeout.js`
5. `staff-mfa-guard.js`

### `staff-sw.js`
- cache namespace `namdar-staff-v6.4.31-staff-auth-recovery-1`;
- old Staff cache namespaces are removed during activation;
- pinned Supabase JS `2.116.0` in remote asset cache;
- Staff navigation remains network-first with offline fallback;
- auth-critical files (`staff.js`, `staff-original.js`, readiness, CAPTCHA, MFA guard) are network-first while online and only fall back to cache on failure;
- this removes the need for a hard refresh merely to escape a stale auth bundle.

## Regression coverage
`scripts/staff-auth-readiness.test.mjs` checks:
- Staff page/loader current version and pinned Supabase build;
- readiness file is loaded after original Staff code;
- login uses `recoverAuthClient()` and passes a resolved `auth` object rather than direct `sb.auth`;
- recovery can reload pinned Supabase and restore the session;
- service worker has the current cache namespace and network-first auth-critical path.

CI also syntax-checks the new readiness file and Staff service worker.

## Release verification
- PR #73 exact head `43c8b678f38549d9bce674c1e4ae8ab0eed889c4`.
- CI `34886442615` SUCCESS.
- Preview `dpl_92WaxJ1yhL4kGuDusWrmTC7FhiXg` READY, clean build, Vercel status SUCCESS.
- Preview content itself was SSO-protected from direct connector fetch; exact Git source + CI + build metadata were verified before merge.
- Merge `dc10aefc814f6aac8a6cb686597a01b682647deb`.
- Production `dpl_FP8WnzuPGtYwxNKLpMsGjpc7pPRo` READY, clean build.
- `/api/health` HTTP 200.
- Production `/staff` shows version `6.4.31-staff-auth-recovery-1` and pinned Supabase `2.116.0`.
- Production `staff.js`, readiness asset and service worker all HTTP 200 with current code.
- Post-release error/fatal runtime log check found no matching logs.

## What is still not interactively verified
The authenticated browser journey should still be user-smoked once after release:
- navigate normally to My jobs without hard refresh;
- confirm an existing valid session opens the jobs page;
- if signed out, confirm one ordinary CAPTCHA + sign-in works;
- do not share password or MFA code in chat.

Do not claim this browser interaction is verified until the user confirms it.

## Stable systems that must not regress
- Security Hardening from PR #71: private server rate limits, secure invitations, owner-confirmed email changes, administrator lifecycle protections, Admin inactivity timeout.
- Account auth stays pinned to Supabase JS `2.116.0` with bounded session restore.
- Privileged APIs keep AAL2/TOTP MFA and CAPTCHA.
- Business Finance remains private/sole-trader-first; Smart Receipts remain private and review-first.
- System Health and Newsletter Centre remain live.
- Window Cleaning only live; later services planned.
- Stripe sandbox remains excluded from Business Finance; payment policy OFF; no live Stripe credentials.
- Supabase Leaked Password Protection still requires manual enablement/re-verification.

## Development rules
- Verify current `main` and provider state before further substantial changes.
- Preview/test before production.
- Every substantial code/security/config change updates all three continuity docs.
- Never place credentials, passwords, tokens or customer private data in repo/chat/docs.
- Do not create real operational records just to smoke-test deployments.
