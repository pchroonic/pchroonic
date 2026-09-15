# Namdar project status

Last updated: 2026-09-15 UTC

## Production baseline
- Repo `pchroonic/pchroonic`, default `main`.
- Current main before Privacy Centre: `44d26ff206ea4163dbe2f83c1e0a93ff6a0c857b`.
- Current live product release before this branch: PR #75 customer quote-to-booking journey.
- Supabase production: `qjigldxjcpnrlyxgmlqq`.
- Window Cleaning only live.
- Privileged Staff/Admin requires CAPTCHA + AAL2/TOTP MFA.
- Stripe customer payment policy OFF; no live Stripe credentials.
- Ask Namdar provider AI disabled (`aiEnabled:false`).
- Staff My Jobs auth recovery live and user-confirmed fixed.

## Privacy Centre / UK GDPR operations — RELEASE CANDIDATE
Branch: `feature/privacy-centre-20260915`
Version: `6.4.33-privacy-centre-1`

### Database and legal documents
Migration `privacy_centre` has already been safely applied to production from `supabase/migrations/20260915083000_privacy_centre.sql`.
- `privacy_requests` table created.
- RLS enabled; zero direct browser policies.
- Response target defaults to one calendar month.
- Immediately after migration: zero privacy requests.
- Privacy Policy upgraded/published to version 2.
- Cookie Policy upgraded/published to version 2.

Policy v2 now covers personal-data categories, lawful bases, service providers, transfers, retention criteria, customer rights, marketing choices, security, automated guide-estimate review and ICO complaints. Cookie Policy covers essential browser storage, optional advertising consent, current first-party page-view behavior and changing the choice.

The policy intentionally says the controller's formal legal name and postal correspondence address still need to be added before wider commercial launch. Those details were not invented or taken from private context without explicit approval.

### Customer privacy features
New authenticated APIs:
- `/api/customer-privacy`: create/list privacy-rights requests.
- `/api/customer-data-export`: download a structured JSON account-data copy.

My Namdar adds `Privacy & data`:
- account-data download;
- privacy request form/history;
- status/identity/target-date visibility;
- links to policies;
- existing account deletion handoff;
- cookie choice controls.

Self-service export excludes internal staff/admin notes, private newsletter/chat tokens and payment-provider internals. It is described as an account-data copy, not a guaranteed complete statutory SAR response.

### Admin privacy features
New `Privacy & GDPR` tab:
- permission-gated by `legal`;
- AAL2 enforced by server via existing `requireStaff` wrapper;
- open/due-soon/overdue/total counts;
- record email/phone/in-person privacy requests;
- identity/status workflow;
- internal notes separated from customer-facing response summary;
- completion/refusal requires a response summary;
- customer completion/refusal email;
- audit logging.

New `/api/admin-legal` replaces browser-direct legal publishing for the existing editor:
- legal permission + AAL2;
- server HTML sanitization;
- proper version increment;
- update attribution;
- audit log.

### Cookie controls
`privacy-controls.js` adds a persistent footer `Cookie settings` control on the public/Legal pages.
- essential-only and optional-advertising choices;
- legacy choice remains compatible;
- choice metadata stores version/timestamp;
- marketing -> essential reloads the page so already-loaded optional ad code is removed from the active page.

### Regression coverage
- New `scripts/privacy-center.test.mjs`.
- CI syntax checks new account/admin/cookie/API modules.
- Existing booking-journey regression updated for the new account loader version only.
- All three AI continuity docs updated.

### Release gate status
Pending:
- open feature PR;
- exact-head GitHub CI SUCCESS;
- exact-head Vercel preview READY + clean error-only build;
- exact-head merge;
- production health/assets/API verification.

Do not create real privacy requests or send real privacy completion emails as deployment tests.

### Remaining manual/privacy items
Do not label Namdar “fully GDPR compliant” yet.
- User must approve/formally supply the sole trader/controller legal name and postal correspondence address for publication.
- User must complete the official ICO data-protection fee self-assessment; registration/payment is only required if the official assessment says so.
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
- Complete Privacy Centre release gate and production verification.
- Publish controller formal legal name/address after explicit user approval.
- Complete ICO fee self-assessment.
- Manually enable Supabase Leaked Password Protection and re-run advisor.
- User-driven booking journey smoke.
- Decide commercial Stripe payment policy before live rollout.
- Google review-request URL.
- Window real-job pricing calibration.
- SMS/legal checks.
- Optional duplicate Supabase include cleanup.
- `url.parse()` deprecation cleanup.
- Address-data pilot remains parked.
