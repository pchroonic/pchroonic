# Namdar project status

Last updated: 2026-09-14 UTC

## Production baseline
- Repo `pchroonic/pchroonic`, default `main`.
- Current live product release: PR #73 `Fix Staff My jobs auth recovery`.
- Current main before the booking-journey branch: `a8dfdf7b57eb0fcff6c183db7190483e961f9c47` (PR #74 continuity sync).
- PR #73 exact tested head `43c8b678f38549d9bce674c1e4ae8ab0eed889c4`; GitHub CI `34886442615` SUCCESS; production `dpl_FP8WnzuPGtYwxNKLpMsGjpc7pPRo` READY and clean.
- Production `/api/health`: HTTP 200 after release.
- User has confirmed the Staff My jobs authentication/hard-refresh issue is fixed in their browser.
- Supabase production `qjigldxjcpnrlyxgmlqq`.
- Window Cleaning is the only live service.
- Privileged Staff/Admin requires CAPTCHA + AAL2/MFA.
- Stripe customer payment policy remains OFF; no live Stripe credentials.
- Ask Namdar remains Guided assistant because `aiEnabled:false`.

## Customer booking journey — IMPLEMENTED ON BRANCH, NOT LIVE YET
Branch: `feature/customer-booking-journey-20260914`
Release version: `6.4.32-booking-journey-1`

### Conversion improvements
- Postcode/service-area checking is moved to the beginning of the quote journey instead of asking customers to complete most job fields first.
- The existing postcode verifier remains authoritative on the client and `/api/quote` still rechecks postcode/coverage server-side.
- The quote progress language is simplified to Location → Property → Job → Photos → Details → Extras.
- Promotion and rewards inputs remain available but are collapsed as optional extras.
- The guide-estimate result now explains the required sequence: estimate saved → Namdar reviews final quote → customer accepts → appointment selection.
- The Continue action sends the customer to the exact quote in My Namdar.

### Address continuity
- Public address selection no longer depends on the customer-only `/api/address-get` call merely to choose a returned address.
- The already-returned display address is retained in the browser and stored with the quote request as a structured `[Requested address]` entry in existing quote notes.
- No address/database migration is required.
- When an accepted quote is scheduled, saved profile address remains first choice; if blank, My Namdar can reuse the requested address captured with that quote.

### Guest estimate → My Namdar continuity
New protected endpoint `api/customer-quote-claim.js`:
- requires an authenticated active customer;
- only claims a quote whose `customer_id` is currently null;
- authenticated Supabase email must exactly match the email originally used for the quote;
- refuses a quote already owned by another account;
- does not modify final price, quote status, customer decision or booking state.

My Namdar:
- shows a continuation banner for a quote created before sign-in;
- pre-fills the same email into sign-in/account creation;
- claims the matching guest quote after an existing session or subsequent auth-state change;
- reloads the exact quote after claim;
- shows Request → Final quote → Decision → Appointment progress and contextual next-step copy.

### Safety / scope
- Window Cleaning remains the only live service.
- No pricing-rule change.
- No automatic quote acceptance.
- No automatic booking creation.
- No Stripe/payment enablement.
- No database migration or environment-variable change.
- No real customer, quote, booking or payment should be created merely as a deployment smoke test.

### Files
Added:
- `booking-journey.js`
- `booking-journey.css`
- `account-booking-journey.js`
- `api/customer-quote-claim.js`
- `scripts/customer-booking-journey.test.mjs`

Modified:
- `conversion.js`
- `account.js`
- `.github/workflows/ai-handoff-check.yml`
- all three AI continuity docs.

### Verification status / next action
- Regression coverage is wired into CI for coverage-first flow, address retention, secure quote claiming, My Namdar progression and payment-policy non-regression.
- Next: open PR, require exact-head GitHub CI SUCCESS and exact-head Vercel preview READY/clean before merge.
- After production verification, user should smoke the browser path postcode → estimate → My Namdar. Credentials/MFA must never be shared in chat.

## Security Hardening — LIVE
- Private server-side rate limits with HMAC-hashed identities.
- Secure Supabase invitations; no temporary passwords.
- Account owners confirm email changes themselves.
- Current/last administrator safeguards live.
- Admin 30-minute inactivity sign-out live.
- CAPTCHA, AAL2/TOTP MFA, CSP/security headers and audit redaction preserved.
- Supabase Leaked Password Protection remains a manual Auth-setting follow-up until enabled/re-verified.

## Stable feature status
### Accounts / authentication
- My Namdar portal live with pinned Supabase JS `2.116.0` and bounded session restore.
- Staff My jobs auth/cache recovery is live and user-confirmed fixed.
- Privileged MFA and CAPTCHA live.
- Self-service password/email/authenticator controls live.

### Operations
- Quotes/bookings/payments/Admin CRM live.
- Window Cleaning live; later services planned.
- Customer support tickets remain customer-only/private.

### Business Finance
- Sole-trader-first Business Finance live.
- Cash-basis reporting/tax estimate framework live.
- Smart Receipt workflow private and review-first.
- Sandbox Stripe excluded from finance figures.

### Reliability / Newsletter / Chat
- System Health history live.
- Newsletter Centre consent-aware/resumable; never send a campaign as a deployment test.
- Ask Namdar grounded Guided assistant live; provider AI optional and currently disabled.

## Open roadmap
- Release and user-smoke the customer booking journey after CI/preview verification.
- Manually enable Supabase Leaked Password Protection and re-run advisor.
- Decide commercial Stripe payment policy before any live Stripe rollout.
- Google review-request URL.
- Window real-job pricing calibration.
- SMS/legal checks.
- Optional duplicate Supabase include cleanup on account HTML.
- `url.parse()` deprecation cleanup.
- Address-data pilot remains parked.
