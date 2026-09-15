# Namdar AI fast resume

Last verified: 2026-09-15 UTC

Read this first. Use `docs/AI_HANDOFF.md` for implementation detail and `docs/PROJECT_STATUS.md` for roadmap/status.

## Production source of truth
- Repo `pchroonic/pchroonic`, default `main`.
- Current main/product release: `3b56a12620c754853f3d5145c3daa277caa07c70` (PR #78 `Add Namdar Privacy Centre and UK GDPR operations`).
- Production Vercel deployment: `dpl_Ew4HKZdj1fGjpuT8KHMTM5YbRdeH`, READY and serving `namdar.co.uk`.
- Production errors-only build log was clean.
- `/api/health` returned HTTP 200 with `ok:true` and all reported checks true after release.
- Window Cleaning is the only live/quotable/bookable service.
- Privileged Staff/Admin requires CAPTCHA + AAL2/TOTP MFA.
- Stripe commercial customer payment policy remains OFF; do not infer commercial launch from health secret-presence booleans.
- Ask Namdar provider AI remains disabled (`aiEnabled:false`).
- Staff My Jobs auth recovery remains live and user-confirmed fixed.

## Privacy Centre / UK GDPR package — LIVE
Release version: `6.4.33-privacy-centre-1`
Feature PR: #78

### Database / policies
Production Supabase project `qjigldxjcpnrlyxgmlqq` has migration `privacy_centre` applied from repo SQL `supabase/migrations/20260915083000_privacy_centre.sql`.
- New private `privacy_requests` table.
- RLS enabled, no direct browser policies (`policy_count=0`).
- No privacy requests were created by deployment work (`0` immediately after migration).
- Privacy Policy and Cookie Policy are published at version 2.
- Public policy text deliberately does **not** claim Namdar is fully GDPR compliant.

### Customer privacy features live
- Authenticated `/api/customer-privacy` lets customers submit and track privacy-rights requests.
- Signed-in portal requests are marked identity-verified; one-month response target comes from DB default.
- Authenticated `/api/customer-data-export` downloads a structured JSON copy of main customer-facing account data.
- Export intentionally excludes internal staff/admin notes, private newsletter tokens, chat guest tokens and payment-provider internals.
- My Namdar has a `Privacy & data` tab with privacy requests/history, self-service account-data download, Privacy/Cookie policy links, cookie choices and the existing verified account-deletion handoff.

### Admin privacy features live
- `Privacy & GDPR` Admin tab is permission-gated by existing `legal` permission and AAL2 server enforcement.
- Admin can record requests received by email/phone/in person, track identity/status/due dates, keep internal notes and write customer-facing response summaries.
- Completing/refusing requires a response summary and sends a customer email.
- Audit log records request creation/updates.
- Legal publishing uses `/api/admin-legal`, which sanitizes HTML, increments document versions and audit-logs publication.

### Cookie controls live
- Existing optional advertising remains consent-gated.
- Persistent `Cookie settings` lets visitors reopen their choice.
- Withdrawing from optional advertising to essential-only reloads the page so already-loaded ad code is no longer active.
- Choice metadata records choice/version/timestamp in first-party browser storage while keeping legacy compatibility.

### Production verification completed
- Exact PR head `57785dbcbcf0054c79817032846025afa159c89d`: GitHub CI run `34943637689` SUCCESS.
- Exact-head Vercel preview `dpl_5cA21wmSZjQBo5vAq9TVWY4kCteV`: READY, clean errors-only build.
- PR #78 merged as `3b56a12620c754853f3d5145c3daa277caa07c70`.
- Production `dpl_Ew4HKZdj1fGjpuT8KHMTM5YbRdeH`: READY, clean errors-only build.
- Live `/api/health`: HTTP 200, healthy.
- Live `account.js` and `admin.js`: version `6.4.33-privacy-centre-1` and loading the new privacy modules.
- Live `/api/legal?slug=privacy` and `/api/legal?slug=cookies`: published version 2.
- Unauthenticated `/api/customer-privacy` and `/api/customer-data-export`: HTTP 401 with no request/export side effects.
- No real privacy request, real privacy completion email or real customer export was created for deployment testing.

### Important remaining manual/legal items
Do not describe Namdar as “fully GDPR compliant” yet.
- Add the sole trader's formal legal/controller name and postal correspondence address to the Privacy Policy after explicit owner approval; these were intentionally not invented or exposed in code.
- Complete the ICO data-protection fee self-assessment; pay/register only if required.
- Continue periodic retention/provider-contract review so practice matches the policy.
- Supabase Leaked Password Protection remains a separate manual security setting to enable/re-verify.

## Next action
- Obtain the owner's explicit approval of the exact controller legal name and public postal correspondence address, then publish the Privacy Policy update through the protected legal editor/API.
- Complete the official ICO data-protection fee self-assessment.
- Keep the current privacy workflows live; do not create test rights requests using real customer data.

## Stable invariants
- Customer booking journey v6.4.32 remains live and payment rules are unchanged.
- Security Hardening remains live.
- Business Finance remains private/sole-trader-first; Smart Receipts remain private/review-first.
- Customer payment policy stays OFF until a separate deliberate decision.
