# Namdar AI handoff

Last verified: 2026-09-14 UTC

Read `docs/AI_START.md` first.

## Production baseline
- Repo `pchroonic/pchroonic`, default `main`.
- Current live product release: PR #73 `Fix Staff My jobs auth recovery`.
- Current main before this feature branch: `a8dfdf7b57eb0fcff6c183db7190483e961f9c47` (PR #74 continuity sync).
- PR #73 exact tested head `43c8b678f38549d9bce674c1e4ae8ab0eed889c4`; CI `34886442615` SUCCESS; production deployment `dpl_FP8WnzuPGtYwxNKLpMsGjpc7pPRo` READY and clean; `/api/health` HTTP 200.
- User subsequently confirmed the Staff My jobs issue is fixed in their browser.
- Supabase production `qjigldxjcpnrlyxgmlqq`; Vercel project `prj_4fILo0pCaLGUSUIMWrBIVGzeWVDC`.
- Window Cleaning only live. Stripe commercial payment policy OFF. Provider AI disabled (`aiEnabled:false`).
- Privileged Staff/Admin requires CAPTCHA + AAL2/TOTP MFA.

# Customer booking journey — IMPLEMENTED ON BRANCH, NOT YET LIVE

Branch: `feature/customer-booking-journey-20260914`
Version: `6.4.32-booking-journey-1`

## Why this work exists
Audit of the real customer path found four conversion gaps:
1. postcode/coverage checking happened late in the long quote form;
2. the public address dropdown could display an address but guest selection then called customer-only `/api/address-get`, and the chosen address was not retained through the quote journey;
3. a quote created while signed out had `customer_id = null`, so creating/signing into My Namdar afterward did not have a dedicated secure claim step;
4. the guide-estimate result did not strongly explain the required sequence of review → decision → appointment.

## Homepage quote journey
New `booking-journey.js` + `booking-journey.css` are loaded by `conversion.js`.

Behavior:
- physically moves the existing postcode/check/address controls to the beginning of the quote journey without duplicating form fields;
- labels progress as Location → Property → Job → Photos → Details → Extras;
- automatically checks a plausible postcode after input settles/blur and, before `/api/quote`, reuses existing `verifyQuotePostcode()`;
- blocks the quote request client-side when configured coverage explicitly says Window Cleaning is unavailable, while the server remains authoritative;
- optional promotion/reward fields are collapsed under an extras disclosure;
- quote CTA copy is shortened to `Save my guide estimate`;
- the selected public address is captured directly from the already-returned dropdown display value, so guest visitors do not need `/api/address-get` merely to select an address;
- when the quote request is sent, the selected address is appended to the existing notes payload as:
  `[Requested address]\n<display address>`;
- this is intentional because `quotes.inputs` already persists notes and no schema migration is needed;
- the result card adds a clear three-stage explanation: estimate saved → final quote reviewed → accept and choose a slot;
- the Continue button always routes to `/account?tab=quotes&quote=<id>&journey=quote`;
- guest-only continuity context (quote id, email, postcode, estimate, optional selected address) is stored in `sessionStorage`, not a server cookie or public URL.

Pricing, live-service gating, final-review rules and payment policy are unchanged.

## Secure guest-quote claim
New `api/customer-quote-claim.js`:
- POST only;
- requires `requireCustomer(req)`, so the account must be authenticated and active;
- loads exactly the requested quote;
- returns success without mutation if it already belongs to the signed-in customer;
- refuses quotes already owned by a different customer;
- for an unowned quote, requires an exact lower-cased match between Supabase Auth `user.email` and `quote.email`;
- only then patches `quotes.customer_id` to the authenticated user id;
- also best-effort links the exact archived quote email message (`recipient_email` + quote target path) if it was archived before an account existed;
- does not change quote price, status, final price, customer response, expiry or booking state.

This endpoint is the bridge between anonymous estimate creation and a later customer account without weakening ownership rules.

## My Namdar continuation
New `account-booking-journey.js` is loaded after the existing account modules by `account.js`.

Behavior:
- when `journey=quote` and a matching pending session context exists, shows a continuation banner and pre-fills both login and registration email fields;
- masks the email in explanatory copy;
- waits for the normal account auth client rather than creating a second client;
- if a valid session already exists, calls the claim endpoint immediately;
- also listens to `onAuthStateChange`, so an existing customer who signs in on the same page can claim the guest quote without a reload;
- after successful claim/already-owned response, reloads portal data and applies the quote deep link;
- displays a four-stage quote progress strip: Request → Final quote → Decision → Appointment;
- next-step copy changes based on the actual quote/customer-response/booking state;
- when scheduling an accepted quote, the saved profile address still has priority; if it is empty, the module parses the structured `[Requested address]` line from the stored quote notes and pre-fills the service address;
- adds clarification that the accepted final price remains unchanged unless scope changes and that the selected slot is still a request until confirmed.

## Files
Added:
- `booking-journey.js`
- `booking-journey.css`
- `account-booking-journey.js`
- `api/customer-quote-claim.js`
- `scripts/customer-booking-journey.test.mjs`

Modified:
- `conversion.js` to load the homepage journey;
- `account.js` version bumped to `6.4.32-booking-journey-1` and loads the account journey;
- `.github/workflows/ai-handoff-check.yml` syntax-checks new modules/API and runs the new regression suite;
- all three continuity docs.

## Regression coverage
`scripts/customer-booking-journey.test.mjs` asserts:
- coverage-first homepage behavior and optional-extras collapse;
- selected-address retention without `/api/address-get` dependency;
- claim endpoint requires an authenticated customer, refuses another owner and requires exact matching email;
- My Namdar uses auth-state continuation and renders quote-to-appointment progress;
- no payment enablement, automatic acceptance or booking bypass is introduced.

## Database / environment impact
- No migration.
- No new environment variables.
- Existing tables only: `quotes` and targeted `customer_messages` ownership patch after verified email-match claim.
- No change to Stripe configuration/payment policy.

## Release gate
Not live until all of the following are true:
1. PR exact head full GitHub CI SUCCESS;
2. exact-head Vercel preview READY;
3. errors-only preview build clean;
4. PR merged from the exact tested head;
5. production deployment READY + `/api/health` 200;
6. live `conversion.js`, `booking-journey.js`, `account.js`, `account-booking-journey.js` and claim API presence verified.

Do not create a real customer/quote/booking/payment merely as a deployment test. Final interactive browser verification should be user-driven after release.

## Stable systems that must not regress
- Security Hardening from PR #71: private rate limits, secure invitations, owner-confirmed email changes, administrator lifecycle safeguards and Admin inactivity timeout.
- Account auth remains pinned to Supabase JS `2.116.0` through `account.js`.
- Staff My jobs auth recovery from PR #73 remains live and user-confirmed fixed.
- Privileged APIs keep AAL2/TOTP MFA + CAPTCHA.
- Window Cleaning only live; later services planned.
- Business Finance / Smart Receipts private; Stripe sandbox excluded; commercial payments OFF.
- Supabase Leaked Password Protection remains a manual enable/re-verify item.

## Next action
Open/verify the feature PR, run full CI + exact preview, merge only if clean, then verify production assets/health. Afterward ask the user to smoke postcode → estimate → My Namdar without sharing credentials.
