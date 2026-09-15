# Namdar AI fast resume

Last verified: 2026-09-15 UTC

Read this first. Use `docs/AI_HANDOFF.md` for implementation detail and `docs/PROJECT_STATUS.md` for roadmap/status.

## Production source of truth
- Repo `pchroonic/pchroonic`, default `main`.
- Current main before this privacy feature: `44d26ff206ea4163dbe2f83c1e0a93ff6a0c857b` (PR #76 docs sync).
- Current live product release remains PR #75 `Improve customer quote-to-booking journey` until this feature PR is merged.
- Window Cleaning is the only live/quotable/bookable service.
- Privileged Staff/Admin requires CAPTCHA + AAL2/TOTP MFA.
- Stripe commercial customer payment policy remains OFF; no live Stripe credentials.
- Ask Namdar provider AI remains disabled (`aiEnabled:false`).
- Staff My Jobs auth recovery remains live and user-confirmed fixed.

## Privacy Centre / UK GDPR package — IMPLEMENTED ON BRANCH, NOT FULLY RELEASED YET
Branch: `feature/privacy-centre-20260915`
Release version: `6.4.33-privacy-centre-1`

### Database / policies already applied safely
Production Supabase project `qjigldxjcpnrlyxgmlqq` has migration `privacy_centre` applied from repo SQL `supabase/migrations/20260915083000_privacy_centre.sql`.
- New private `privacy_requests` table.
- RLS enabled, no direct browser policies (`policy_count=0`).
- No privacy requests were created by deployment work (`0` immediately after migration).
- Privacy Policy and Cookie Policy were upgraded to version 2 and published.
- Public policy text deliberately does **not** claim Namdar is fully GDPR compliant.

### Customer privacy features on branch
- New authenticated `/api/customer-privacy` lets customers submit and track privacy-rights requests.
- Signed-in portal requests are marked identity-verified; one-month response target comes from DB default.
- New authenticated `/api/customer-data-export` downloads a structured JSON copy of main customer-facing account data.
- Export intentionally excludes internal staff/admin notes, private newsletter tokens, chat guest tokens and payment-provider internals.
- My Namdar gets a new `Privacy & data` tab with:
  - privacy request form/history;
  - self-service account-data download;
  - Privacy/Cookie policy links;
  - cookie preference controls;
  - link to the existing verified account-deletion flow.

### Admin privacy features on branch
- New `Privacy & GDPR` Admin tab, permission-gated by existing `legal` permission and AAL2 server enforcement.
- Admin can record requests received by email/phone/in person, track identity/status/due dates, keep internal notes and write customer-facing response summaries.
- Completing/refusing requires a response summary and sends a customer email.
- Audit log records request creation/updates.
- Readiness checklist keeps manual/legal gaps visible rather than hiding them.
- Legal publishing is moved through `/api/admin-legal`, which sanitizes HTML, increments document versions and audit-logs publication.

### Cookie controls on branch
- Existing optional advertising remains consent-gated.
- New persistent `Cookie settings` control lets visitors reopen the choice.
- Withdrawing from optional advertising to essential-only reloads the page so already-loaded ad code is no longer active.
- Choice metadata records choice/version/timestamp in first-party browser storage while keeping legacy compatibility.

### Important remaining manual/legal items
Do not describe Namdar as “fully GDPR compliant” yet.
- Add the sole trader's formal legal/controller name and postal correspondence address to the Privacy Policy before wider commercial launch; these were intentionally not invented or exposed in code.
- Complete the ICO data-protection fee self-assessment; pay/register only if required.
- Continue periodic retention/provider-contract review so practice matches the policy.
- Supabase Leaked Password Protection remains a separate manual security setting to enable/re-verify.

## Release gate / next action
- Update all three continuity docs (this branch does).
- CI syntax-checks privacy modules/APIs and runs `scripts/privacy-center.test.mjs`.
- Open PR only after implementation review.
- Require exact-head GitHub CI SUCCESS + exact-head Vercel preview READY/clean before merge.
- After merge verify `/api/health`, live v2 legal pages, `account.js`/`admin.js` version `6.4.33-privacy-centre-1`, privacy assets and safe unauthenticated API behavior.
- Do not create a real privacy request or send a real privacy-response email merely as a deployment test.

## Stable invariants
- Customer booking journey v6.4.32 remains live and payment rules are unchanged.
- Security Hardening remains live.
- Business Finance remains private/sole-trader-first; Smart Receipts remain private/review-first.
- Customer payment policy stays OFF until a separate deliberate decision.
