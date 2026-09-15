# Namdar project status

Last updated: 2026-09-15 UTC

## Production baseline
- Repo `pchroonic/pchroonic`, default `main`.
- Current main/live product release: `3b56a12620c754853f3d5145c3daa277caa07c70` (PR #78 Privacy Centre / UK GDPR operations).
- Production deployment: `dpl_Ew4HKZdj1fGjpuT8KHMTM5YbRdeH`, READY on `namdar.co.uk`.
- Supabase production: `qjigldxjcpnrlyxgmlqq`.
- Window Cleaning only live.
- Privileged Staff/Admin requires CAPTCHA + AAL2/TOTP MFA.
- Stripe customer payment policy OFF; do not infer live commercial payment readiness from health secret-presence booleans.
- Ask Namdar provider AI disabled (`aiEnabled:false`).
- Staff My Jobs auth recovery live and user-confirmed fixed.

## Privacy Centre / UK GDPR operations — LIVE
Version: `6.4.33-privacy-centre-1`
Feature PR: #78

### Database and legal documents
Migration `privacy_centre` has been safely applied to production from `supabase/migrations/20260915083000_privacy_centre.sql`.
- `privacy_requests` table created.
- RLS enabled; zero direct browser policies.
- Response target defaults to one calendar month.
- Immediately after migration: zero privacy requests.
- Privacy Policy published at version 2.
- Cookie Policy published at version 2.

Policy v2 covers personal-data categories, lawful bases, service providers, transfers, retention criteria, customer rights, marketing choices, security, automated guide-estimate review and ICO complaints. Cookie Policy covers essential browser storage, optional advertising consent, current first-party page-view behavior and changing the choice.

The policy intentionally says the controller's formal legal name and postal correspondence address still need to be added before wider commercial launch. Those details were not invented or taken from private context without explicit approval.

### Customer privacy features live
Authenticated APIs:
- `/api/customer-privacy`: create/list privacy-rights requests.
- `/api/customer-data-export`: download a structured JSON account-data copy.

My Namdar `Privacy & data` includes:
- account-data download;
- privacy request form/history;
- status/identity/target-date visibility;
- links to policies;
- existing account deletion handoff;
- cookie choice controls.

Self-service export excludes internal staff/admin notes, private newsletter/chat tokens and payment-provider internals. Quote photo storage paths are not exposed; only a photo count is included. It is described as an account-data copy, not a guaranteed complete statutory SAR response.

### Admin privacy features live
`Privacy & GDPR` tab:
- permission-gated by `legal`;
- AAL2 enforced by server via existing `requireStaff` wrapper;
- open/due-soon/overdue/total counts;
- record email/phone/in-person privacy requests;
- identity/status workflow;
- internal notes separated from customer-facing response summary;
- completion/refusal requires a response summary;
- customer completion/refusal email;
- audit logging.

`/api/admin-legal` replaces browser-direct legal publishing for the existing editor:
- legal permission + AAL2;
- server HTML sanitization;
- proper version increment;
- update attribution;
- audit log.

### Cookie controls live
`privacy-controls.js` adds a persistent footer `Cookie settings` control on the public/legal pages.
- essential-only and optional-advertising choices;
- legacy choice remains compatible;
- choice metadata stores version/timestamp;
- marketing -> essential reloads the page so already-loaded optional ad code is removed from the active page.

### Release verification
- Exact feature head `57785dbcbcf0054c79817032846025afa159c89d`.
- GitHub CI run `34943637689`: SUCCESS.
- Exact-head preview `dpl_5cA21wmSZjQBo5vAq9TVWY4kCteV`: READY, clean errors-only build.
- PR #78 merged as `3b56a12620c754853f3d5145c3daa277caa07c70`.
- Production `dpl_Ew4HKZdj1fGjpuT8KHMTM5YbRdeH`: READY, clean errors-only build.
- Live `/api/health`: HTTP 200, healthy.
- Live `account.js` and `admin.js`: `6.4.33-privacy-centre-1` and load the privacy modules.
- Live privacy/cookie legal endpoints: version 2.
- Unauthenticated customer privacy/data-export APIs: HTTP 401.
- No real privacy request or privacy completion email was generated during deployment verification.

### Remaining manual/privacy items
Do not label Namdar “fully GDPR compliant” yet.
- Owner must explicitly approve/supply the sole trader/controller legal name and postal correspondence address for publication.
- Owner must complete the official ICO data-protection fee self-assessment; registration/payment is only required if the official assessment says so.
- Retention and processor/provider contracts need periodic operational review.
- Supabase Leaked Password Protection remains a separate manual setting to enable/re-verify.

## Customer booking journey — LIVE
- v6.4.32 coverage-first flow remains live.
- Guest quote claim still requires exact authenticated email match.
- My Namdar quote progress remains Request → Final quote → Decision → Appointment.
- No pricing or payment-policy changes in Privacy Centre work.

## Security Hardening — LIVE
- Private server-side rate limits with HMAC-hashed identities.
- Secure invitations; no temporary passwords.
- Owner-confirmed email changes.
- Admin lifecycle safeguards.
- Admin inactivity sign-out.
- CAPTCHA + AAL2/TOTP MFA + CSP/security headers.

## Business / operations stable state
- Sole-trader-first Business Finance live/private.
- Smart Receipts review-first/private.
- Newsletter Centre consent-aware/resumable.
- Ask Namdar Guided assistant live; provider AI off.
- Customer support tickets customer-only/private.
- Stripe infrastructure exists but commercial customer payments remain OFF.

## Open roadmap
- Publish controller formal legal name/address after explicit user approval.
- Complete ICO fee self-assessment.
- Manually enable Supabase Leaked Password Protection and re-run advisor.
- User-driven authenticated Privacy Centre smoke when convenient, without creating unnecessary real privacy requests.
- User-driven booking journey smoke.
- Decide commercial Stripe payment policy before live rollout.
- Google review-request URL.
- Window real-job pricing calibration.
- SMS/legal checks.
- Optional duplicate Supabase include cleanup.
- `url.parse()` deprecation cleanup.
- Address-data pilot remains parked.
