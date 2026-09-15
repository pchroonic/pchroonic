# Namdar AI handoff

Last verified: 2026-09-15 UTC

Read `docs/AI_START.md` first.

## Production baseline
- Repo `pchroonic/pchroonic`, default `main`.
- Current live product release: PR #78 `Add Namdar Privacy Centre and UK GDPR operations`.
- Current main/merge commit: `3b56a12620c754853f3d5145c3daa277caa07c70`.
- Production Vercel deployment: `dpl_Ew4HKZdj1fGjpuT8KHMTM5YbRdeH`, READY and serving `namdar.co.uk`.
- Supabase production `qjigldxjcpnrlyxgmlqq`.
- Window Cleaning only live. Stripe commercial payment policy OFF. Provider AI disabled (`aiEnabled:false`).
- Privileged Staff/Admin requires CAPTCHA + AAL2/TOTP MFA.
- Staff My Jobs auth recovery remains live and user-confirmed fixed.

# UK GDPR / Privacy Centre — LIVE

Feature PR: #78
Version: `6.4.33-privacy-centre-1`

## Why this work exists
The site already had a Privacy page, Cookie page, marketing consent, newsletter preferences/unsubscribe, account deletion and security controls, but the live privacy/cookie notices were short and the business had no central rights-request workflow, customer data-copy tool, persistent cookie-settings control or Admin privacy-request tracker.

This release builds those operational controls while deliberately avoiding the false statement that Namdar is “fully GDPR compliant”. Legal/commercial facts that the user has not formally supplied for publication are left as explicit readiness items rather than invented.

## Database migration applied
Repo migration:
- `supabase/migrations/20260915083000_privacy_centre.sql`

Production migration name:
- `privacy_centre`

Creates private table `privacy_requests` with:
- `id`
- nullable `customer_id` FK to profiles, ON DELETE SET NULL
- requester email/name
- request type: access / portability / rectification / erasure / restriction / objection / marketing / other
- details
- identity status: verified / needs_verification
- request status: received / identity_check / in_progress / completed / refused / cancelled
- source: portal / email / phone / in_person / other
- requested/due/completed timestamps
- customer-facing response summary
- internal admin notes
- nullable creating-staff FK
- created/updated timestamps

Response target defaults to `now() + interval '1 month'`.
Indexes cover customer, status/due and lower-cased email.
RLS is enabled with zero direct browser policies; server APIs use service-role mediated access only.
Immediately after migration, table count was 0.

The same migration updates the published `privacy` and `cookies` legal documents to version 2. Production verification after migration showed both published=true/version=2.

## Privacy Policy v2 content
The upgraded policy covers:
- controller/trading-name position for the sole-trader business;
- categories of personal information;
- purposes and lawful bases (pre-contract/contract, legal obligation, legitimate interests, consent);
- automated guide estimate explanation and human review before final quote;
- processor/service-provider categories and current examples;
- international transfer safeguards in general UK terms without pretending a specific transfer mechanism has been independently verified for every vendor;
- retention criteria by record category;
- UK data-protection rights;
- one-month normal response target, identity checks and lawful complexity extensions;
- marketing choice separation;
- cookies/similar technologies;
- security measures;
- adult-service context;
- ICO complaint route.

Intentional readiness disclosure remains live:
- the public notice says the controller's formal legal name and postal correspondence address must be added before wider commercial launch. Do not remove this until the user supplies and explicitly approves those public details.

## Cookie Policy v2
Covers:
- cookies, local storage and similar technology;
- essential authentication/security storage;
- privacy-choice storage;
- Ask Namdar chat continuity;
- referral continuity when a user intentionally follows a referral;
- optional advertising only after consent;
- page-view endpoint currently stores path/referrer host and does not place a separate analytics cookie/browser identifier;
- how to change the choice and consequences of blocking essential storage;
- third-party feature categories.

## Customer privacy request API
`api/customer-privacy.js`
- requires `requireCustomer(req)` for GET and POST;
- GET returns only the signed-in customer's request history and never internal admin notes;
- POST validates request type/details;
- caps multiple simultaneously open requests to reduce abuse;
- signed-in portal requests use authenticated account email/customer id and are marked `identity_status='verified'`;
- inserts status `received`;
- sends an acknowledgement email with reference and target response date;
- erasure acknowledgement points to the existing My Namdar account-deletion flow without bypassing it.

## Customer self-service data copy
`api/customer-data-export.js`
- authenticated GET only;
- returns a JSON attachment, cache-control no-store;
- described as a useful self-service account-data copy, not automatically a complete statutory SAR response;
- includes selected customer-facing account information from profile, quotes, bookings, projects, subscriptions, notifications/emails, support, rewards, invoices/payments, newsletter preferences, chats, privacy requests and account-deletion status;
- queries by authenticated customer id and, for historical guest-linked records where appropriate, exact authenticated email;
- excludes staff/admin internal notes, newsletter private tokens, chat guest tokens and payment-provider internals;
- quote photo storage paths are not exposed; only a photo count is included;
- customer is directed to submit a formal Access request if they believe information is missing.

## My Namdar Privacy & data UI
`account-privacy-center.js` is live through `account.js` version `6.4.33-privacy-centre-1`.
It dynamically adds a `Privacy & data` tab and extends the account tab slug maps.
Features:
- download account-data JSON;
- submit privacy requests;
- request history with status, identity state, target date and customer-facing response;
- Privacy Policy / Cookie Policy links;
- account deletion handoff to existing Security panel;
- cookie-choice display and essential-only / optional-advertising choices.

## Admin Privacy & GDPR UI
`admin-privacy-center.js` is live through `admin.js` version `6.4.33-privacy-centre-1`.
- dynamically adds a `Privacy & GDPR` tab;
- visible only with existing `legal` permission;
- API enforcement uses `requireStaff(req,'legal')`, therefore existing server wrapper also requires AAL2;
- KPI cards for open/due-soon/overdue/total;
- manual request entry for requests received by email/phone/in person/other;
- identity and workflow status management;
- separate customer-facing response summary and internal admin notes;
- completion/refusal requires a response summary;
- completion/refusal emails the requester;
- request create/update actions audit-log before/after state.

Readiness checklist deliberately keeps these open:
1. publish formal sole-trader/controller legal name + postal correspondence address;
2. complete ICO data-protection fee self-assessment and register/pay only if required;
3. maintain operational retention/provider-contract reviews;
4. enable/re-verify Supabase Leaked Password Protection separately.

## Versioned legal publishing
`api/admin-legal.js` is live:
- `requireStaff(req,'legal')`;
- accepts only privacy/terms/cookies;
- sanitizes HTML server-side with existing `sanitizeLegalHtml`;
- rejects implausibly short documents;
- increments version instead of resetting it to 1;
- records publisher id/update timestamp;
- audit logs publication.

`admin-privacy-center.js` replaces the old browser-direct `saveLegal()` behavior at runtime so existing legal editor UI publishes through this protected API.

## Cookie preference controls
`privacy-controls.js` is live:
- adds persistent `Cookie settings` button to footer;
- allows essential-only or optional advertising;
- keeps legacy `namdar_cookie_choice` compatibility;
- also records metadata key with choice/version/timestamp;
- when changing marketing -> essential, reloads the page so already-loaded advertising code is no longer active;
- if optional advertising is newly allowed and `enableAds()` exists, it may be enabled immediately.

Loaded:
- on homepage through `booking-journey.js`;
- on Privacy/Terms/Cookies pages through `legal-page.js`.

## Styling
Shared `privacy-center.css` covers customer/admin privacy layouts, cookie-settings link and responsive behavior.

## Regression coverage
`scripts/privacy-center.test.mjs` checks:
- privacy table + RLS/no policies + one-month default;
- policy content categories;
- customer auth boundary;
- export redactions;
- admin legal permission and audit actions;
- server-sanitized/versioned legal publishing;
- account/admin loaders and UI markers;
- cookie choice withdrawal behavior.

Existing finance, receipt, health, newsletter, security and booking regressions were updated only for the new loader version where necessary and remained passing.
CI syntax-checks all new modules/APIs and runs the privacy test.

## Release verification completed
Feature exact head:
- `57785dbcbcf0054c79817032846025afa159c89d`
- GitHub Actions run `34943637689`: SUCCESS.
- exact-head Vercel preview `dpl_5cA21wmSZjQBo5vAq9TVWY4kCteV`: READY.
- exact-head preview errors-only build log: clean.

Merge / production:
- PR #78 merged as `3b56a12620c754853f3d5145c3daa277caa07c70`.
- production deployment `dpl_Ew4HKZdj1fGjpuT8KHMTM5YbRdeH`: READY, alias includes `namdar.co.uk`.
- production errors-only build log: clean.
- `/api/health`: HTTP 200, `ok:true`, all reported checks true.
- live `account.js`: `6.4.33-privacy-centre-1`, loads `account-privacy-center.js`.
- live `admin.js`: `6.4.33-privacy-centre-1`, loads `admin-privacy-center.js`.
- live `/api/legal?slug=privacy`: version 2.
- live `/api/legal?slug=cookies`: version 2.
- unauthenticated `/api/customer-privacy`: HTTP 401.
- unauthenticated `/api/customer-data-export`: HTTP 401.
- no real privacy request, privacy completion email or real customer export was created during release verification.

## Known limitations / do not overclaim
- This release is a privacy operations foundation, not legal advice or a certification.
- Controller formal legal name and postal address are still missing from the public policy by design, pending explicit user approval.
- ICO fee/registration requirement has not been assumed; user must complete the official self-assessment.
- A self-service JSON export is not promised to be a complete statutory SAR response; formal Access requests remain available.
- Retention criteria are published, but not every legacy table has automatic lifecycle deletion. Admin must perform periodic retention review until more automated retention is deliberately introduced.
- Supabase Leaked Password Protection remains a separate manual task.

## Stable systems that must not regress
- Booking journey v6.4.32 remains live.
- Security Hardening remains live.
- Staff My Jobs auth recovery remains live/user-confirmed.
- Account Supabase JS remains pinned to 2.116.0.
- Window Cleaning only live.
- Stripe customer payment policy OFF.
- Business Finance/Smart Receipts private and sole-trader-first.
