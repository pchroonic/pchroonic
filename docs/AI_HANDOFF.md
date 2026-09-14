# Namdar AI handoff

Last verified: 2026-09-14 UTC

Read `docs/AI_START.md` first.

## Production baseline
- Repo `pchroonic/pchroonic`, default `main`.
- Current live product release: PR #75 `Improve customer quote-to-booking journey`.
- Exact tested head: `7610856d2d9a20280897f019c1b61415472b8596`.
- Final GitHub CI run `34888850208`: SUCCESS.
- Exact-head Vercel preview `dpl_2xEFQ4vf4ERB1P5Q4TxYrmbKTobR`: READY, errors-only build clean, Vercel status SUCCESS.
- Product merge: `09d3ed99ab63652cb165cc409bf7b69f20e629f0`.
- Production deployment: `dpl_FUv52bL3ZgdDGLYrnGVSS58D96id`: READY on `https://namdar.co.uk`, errors-only build clean.
- Production `/api/health`: HTTP 200 after release.
- Production customer journey version `6.4.32-booking-journey-1`.
- Live `conversion.js`, `booking-journey.js`, `account.js`, `account-booking-journey.js`: HTTP 200/current.
- Safe non-mutating GET `/api/customer-quote-claim`: HTTP 405 as designed.
- Post-release error/fatal runtime-log check: no matching logs.
- Supabase production `qjigldxjcpnrlyxgmlqq`; Vercel project `prj_4fILo0pCaLGUSUIMWrBIVGzeWVDC`, team `team_8Az8WtWcnfwtYRdhR8vGqC3L`.
- Window Cleaning only live. Stripe commercial payment policy OFF. Provider AI disabled (`aiEnabled:false`).
- Privileged Staff/Admin requires CAPTCHA + AAL2/TOTP MFA.

# Customer booking journey — LIVE

Release version: `6.4.32-booking-journey-1`
Source feature branch: `feature/customer-booking-journey-20260914`
PR: #75

## Why this work exists
Audit of the real customer path found four conversion gaps:
1. postcode/coverage checking happened late in the long quote form;
2. the public address dropdown could display an address but guest selection then called customer-only `/api/address-get`, and the chosen address was not retained through the quote journey;
3. a quote created while signed out had `customer_id = null`, so creating/signing into My Namdar afterward did not have a dedicated secure claim step;
4. the guide-estimate result did not strongly explain the required sequence of review → decision → appointment.

## Homepage quote journey
`booking-journey.js` + `booking-journey.css` are loaded by `conversion.js`.

Live behavior:
- moves the existing postcode/check/address controls to the beginning of the quote journey without duplicating form fields;
- labels progress Location → Property → Job → Photos → Details → Extras;
- automatically checks a plausible postcode after input settles/blur and, before `/api/quote`, reuses existing `verifyQuotePostcode()`;
- blocks the quote request client-side when configured coverage explicitly says Window Cleaning is unavailable; the server remains authoritative;
- optional promotion/reward fields are collapsed under an extras disclosure;
- quote CTA copy is `Save my guide estimate`;
- selected public address is captured directly from the already-returned dropdown display value, so guest visitors do not need `/api/address-get` merely to select an address;
- selected address is appended to the existing notes payload as `[Requested address]\n<display address>`; `quotes.inputs` already persists notes, so no migration is needed;
- result card explains estimate saved → final quote reviewed → accept/decline → choose appointment;
- Continue routes to `/account?tab=quotes&quote=<id>&journey=quote`;
- guest-only continuity context (quote id, email, postcode, estimate, optional selected address) is stored in `sessionStorage`, not a server cookie or public URL.

Pricing, live-service gating, final-review rules and payment policy are unchanged.

## Secure guest-quote claim
`api/customer-quote-claim.js` is live.

Rules:
- POST only;
- requires `requireCustomer(req)`, so the account is authenticated and active;
- returns success without mutation if the quote already belongs to the signed-in customer;
- refuses a quote owned by a different customer;
- for an unowned quote, requires exact lower-cased match between Supabase Auth `user.email` and `quote.email`;
- only then patches `quotes.customer_id` to the authenticated user id, constrained by `customer_id=is.null`;
- best-effort links the exact archived quote email message (`recipient_email` + quote target path) if it existed before the account;
- does not change quote price, status, final price, customer response, expiry or booking state.

This is the secure bridge between anonymous guide-estimate creation and a later customer account.

## My Namdar continuation
`account-booking-journey.js` loads after the existing account modules through `account.js`.

Live behavior:
- when `journey=quote` and matching session context exists, shows a continuation banner and pre-fills login/registration email;
- masks the email in explanatory copy;
- waits for the normal existing account auth client rather than creating a second Supabase client;
- if a session already exists, claims immediately;
- also listens to `onAuthStateChange`, allowing the same page to continue after normal sign-in;
- existing confirmation/magic/OAuth return URLs preserve the quote query because `accountReturnUrl()` carries the current query through the Auth redirect;
- after successful claim/already-owned response, reloads portal data and applies the quote deep link;
- shows Request → Final quote → Decision → Appointment progress;
- changes next-step copy from actual quote/customer-response/booking state;
- when scheduling an accepted quote, saved profile address has priority; if blank, the module parses the structured `[Requested address]` line from quote notes;
- clarifies that the accepted final price stays unchanged unless scope changes and a selected slot remains a request until Namdar confirms it.

## Files
Added:
- `booking-journey.js`
- `booking-journey.css`
- `account-booking-journey.js`
- `api/customer-quote-claim.js`
- `scripts/customer-booking-journey.test.mjs`

Modified:
- `conversion.js` loads the homepage journey;
- `account.js` loads the My Namdar journey at `6.4.32-booking-journey-1` while keeping Supabase JS pinned to `2.116.0`;
- `.github/workflows/ai-handoff-check.yml` syntax-checks new modules/API and runs the new regression suite;
- all three continuity docs.

## Regression / release verification
`scripts/customer-booking-journey.test.mjs` asserts:
- coverage-first homepage behavior and optional-extras collapse;
- selected-address retention without `/api/address-get` dependency;
- claim endpoint requires authenticated customer, refuses another owner and requires exact matching email;
- My Namdar uses auth-state continuation and renders quote-to-appointment progress;
- no payment enablement, automatic acceptance or booking bypass is introduced.

Release facts:
- first CI run failed only because a test regex expected literal `[Requested address]` while source contains an escaped regex parser. Product code was not changed for the correction;
- final exact head `7610856d2d9a20280897f019c1b61415472b8596` passed CI `34888850208`;
- exact preview `dpl_2xEFQ4vf4ERB1P5Q4TxYrmbKTobR` READY/clean;
- merge `09d3ed99ab63652cb165cc409bf7b69f20e629f0`;
- production `dpl_FUv52bL3ZgdDGLYrnGVSS58D96id` READY/clean;
- production `/api/health` HTTP 200;
- live assets current/HTTP 200;
- safe GET on claim API returned 405;
- production error/fatal logs contained no matching entries after deployment.

## Database / environment impact
- No migration.
- No new environment variables.
- Existing tables only: `quotes` and targeted `customer_messages` ownership patch after verified email-match claim.
- No change to Stripe configuration/payment policy.
- No real customer, quote, booking or payment was created as a deployment test.

## Interactive verification still pending
The product/deployment is verified, but the full real browser flow remains user-driven because a successful guide estimate creates an operational quote record.
Recommended smoke when the user chooses:
1. Homepage → Window Cleaning quote.
2. Confirm postcode is first and coverage/address selection works.
3. Intentionally create a guide estimate.
4. Continue to My Namdar.
5. If signed out, sign in/create account using the exact same email.
6. Confirm the quote appears automatically with Request → Final quote → Decision → Appointment guidance.
7. Do not accept/book unless intended. If it was a controlled test quote, clean it afterward.
Never request the user's password or MFA code.

## Stable systems that must not regress
- Security Hardening PR #71: private rate limits, secure invitations, owner-confirmed email changes, administrator lifecycle safeguards and Admin inactivity timeout.
- Account auth stays pinned to Supabase JS `2.116.0`.
- Staff My jobs auth recovery PR #73 remains live; user explicitly confirmed the prior null-`auth`/hard-refresh problem is fixed.
- Privileged APIs keep AAL2/TOTP MFA + CAPTCHA.
- Window Cleaning only live; later services planned.
- Business Finance / Smart Receipts private; Stripe sandbox excluded; commercial payments OFF.
- Supabase Leaked Password Protection remains a manual enable/re-verify item.

## Open work
- User-driven full booking-journey browser smoke.
- Manually enable and re-verify Supabase Leaked Password Protection.
- Decide commercial Stripe payment policy before live Stripe rollout.
- Google review-request URL.
- Window real-job pricing calibration.
- SMS/legal checks.
- Optional duplicate Supabase include cleanup on account HTML.
- `url.parse()` deprecation cleanup.
- Address-data pilot remains parked.
