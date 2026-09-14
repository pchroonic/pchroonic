# Namdar project status

Last updated: 2026-09-14 UTC

## Production baseline
- Repo `pchroonic/pchroonic`, default `main`.
- Current live product release: PR #75 `Improve customer quote-to-booking journey`.
- Exact tested PR head `7610856d2d9a20280897f019c1b61415472b8596`.
- GitHub CI `34888850208`: SUCCESS.
- Exact preview `dpl_2xEFQ4vf4ERB1P5Q4TxYrmbKTobR`: READY with clean errors-only build and Vercel status SUCCESS.
- Product merge/main: `09d3ed99ab63652cb165cc409bf7b69f20e629f0`.
- Production deployment `dpl_FUv52bL3ZgdDGLYrnGVSS58D96id`: READY with clean errors-only build.
- Production `/api/health`: HTTP 200 after release.
- Live customer journey version `6.4.32-booking-journey-1`.
- Live journey/account assets verified HTTP 200; claim API safe GET returns 405 as designed.
- Post-release error/fatal runtime log check found no matching logs.
- Supabase production `qjigldxjcpnrlyxgmlqq`.
- Window Cleaning is the only live service.
- Privileged Staff/Admin requires CAPTCHA + AAL2/MFA.
- Stripe customer payment policy remains OFF; no live Stripe credentials.
- Ask Namdar remains Guided assistant because `aiEnabled:false`.

## Customer booking journey — LIVE
Release: `6.4.32-booking-journey-1`

### Conversion improvements
- Postcode/service-area checking now appears at the beginning of the quote journey instead of after most job fields.
- Existing postcode verification remains authoritative on the client and `/api/quote` still rechecks service/coverage server-side.
- Quote progress language is Location → Property → Job → Photos → Details → Extras.
- Promotion/reward inputs remain available but are collapsed as optional extras.
- The guide-estimate result explains estimate saved → Namdar final review → customer decision → appointment selection.
- Continue sends the customer to the exact quote in My Namdar.

### Address continuity
- Public address selection no longer depends on customer-only `/api/address-get` just to select an address returned by public search.
- The returned display address is retained and stored with the quote request as a structured `[Requested address]` entry in existing quote notes.
- No address/database migration was required.
- When an accepted quote is scheduled, saved profile address remains first choice; if blank, My Namdar can reuse the requested address captured with that quote.

### Guest estimate → My Namdar continuity
Protected endpoint `api/customer-quote-claim.js` is live:
- requires an authenticated active customer;
- only claims an unowned quote (`customer_id` null);
- authenticated Supabase email must exactly match the email originally used for the quote;
- refuses a quote already owned by another account;
- does not modify final price, quote status, customer decision or booking state.

My Namdar:
- shows a continuation banner for a quote created before sign-in;
- pre-fills the same email into sign-in/account creation when session continuity is available;
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
- No real customer, quote, booking or payment was created merely as a deployment smoke test.

### Release verification
- First CI failure was only an over-specific test assertion around escaped `[Requested address]` parser source; product code was unchanged for the correction.
- Final exact head `7610856d2d9a20280897f019c1b61415472b8596` passed CI `34888850208`.
- Exact preview `dpl_2xEFQ4vf4ERB1P5Q4TxYrmbKTobR` READY/clean.
- Product merge `09d3ed99ab63652cb165cc409bf7b69f20e629f0`.
- Production `dpl_FUv52bL3ZgdDGLYrnGVSS58D96id` READY/clean.
- Production `/api/health` HTTP 200.
- `conversion.js`, `booking-journey.js`, `account.js`, `account-booking-journey.js` HTTP 200/current.
- GET `/api/customer-quote-claim` returned 405, confirming the route is live without mutating data.
- Post-release error/fatal logs: none found.

### Interactive verification pending
The deployment itself is verified. The remaining test is user-driven because a successful guide estimate creates a real quote record. When desired, intentionally test postcode → guide estimate → Continue to My Namdar using the same email. Do not accept/book unless intended. If a controlled test quote is created, remove it after validation.

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
- Quotes/bookings/Admin CRM live.
- Window Cleaning live; later services planned.
- Customer support tickets remain customer-only/private.
- Stripe payment infrastructure exists but commercial customer payment policy remains OFF.

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
- User-driven browser smoke of the live customer booking journey.
- Manually enable Supabase Leaked Password Protection and re-run advisor.
- Decide commercial Stripe payment policy before any live Stripe rollout.
- Google review-request URL.
- Window real-job pricing calibration.
- SMS/legal checks.
- Optional duplicate Supabase include cleanup on account HTML.
- `url.parse()` deprecation cleanup.
- Address-data pilot remains parked.
