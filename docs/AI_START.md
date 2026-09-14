# Namdar AI fast resume

Last verified: 2026-09-14 UTC

Read this first. Use `docs/AI_HANDOFF.md` for implementation detail and `docs/PROJECT_STATUS.md` for roadmap/status.

## Production source of truth
- Repo `pchroonic/pchroonic`, default `main`.
- Current live product release remains PR #73 `Fix Staff My jobs auth recovery`.
- Current main before this feature branch: `a8dfdf7b57eb0fcff6c183db7190483e961f9c47` (PR #74 docs sync).
- PR #73 exact tested head `43c8b678f38549d9bce674c1e4ae8ab0eed889c4`; CI `34886442615` SUCCESS; production `dpl_FP8WnzuPGtYwxNKLpMsGjpc7pPRo` READY.
- User has now confirmed the Staff My jobs browser fix works without the old hard-refresh failure.
- Production `/api/health` was HTTP 200 after that release.
- Window Cleaning is the only live/quotable/bookable service.
- Privileged Staff/Admin requires CAPTCHA + AAL2/MFA.
- Stripe commercial customer payment policy remains OFF; no live Stripe credentials.
- Ask Namdar provider AI remains disabled (`aiEnabled:false`).

## Customer booking journey — IMPLEMENTED ON BRANCH, NOT LIVE YET
Branch: `feature/customer-booking-journey-20260914`
Version: `6.4.32-booking-journey-1`

Changes:
- homepage quote journey checks postcode/coverage earlier and automatically reuses the existing postcode verifier before quote creation;
- postcode/address UI is moved to the start of the quote journey; promo/reward fields are collapsed as optional extras;
- only live Window Cleaning remains available; pricing rules are unchanged;
- selected address can be retained without the guest browser calling the customer-only `/api/address-get` endpoint;
- selected address is appended to the quote request notes as a structured `[Requested address]` block so it survives the review journey;
- estimate result clearly explains the next steps and sends the customer to My Namdar;
- guest quote context is kept in session storage only for journey continuity;
- new protected `/api/customer-quote-claim` lets an authenticated active customer attach an unowned guest quote only when the Auth email exactly matches the quote email;
- My Namdar pre-fills the matching email, claims the quote after sign-in (including auth-state changes), shows quote-to-booking progress, and reuses the requested address when scheduling if the saved profile address is empty;
- no automatic quote acceptance, booking creation, payment, pricing change, or Stripe enablement was added.

Files added:
- `booking-journey.js`
- `booking-journey.css`
- `account-booking-journey.js`
- `api/customer-quote-claim.js`
- `scripts/customer-booking-journey.test.mjs`

Loaders/CI updated:
- `conversion.js` loads the homepage journey;
- `account.js` loads the My Namdar journey at `6.4.32-booking-journey-1`;
- CI syntax-checks the new modules/API and runs the booking-journey regression suite.

## Release status / next action
- No database migration.
- No environment-variable change.
- No real quote/customer/booking/payment record should be created just to verify deployment.
- Next: open PR, require full GitHub CI SUCCESS + exact-head Vercel preview READY/clean, then merge and verify production assets/health. After release, user should smoke the real browser path from postcode → estimate → My Namdar; use a controlled request only if they intentionally want to create one.

## Existing invariants
- Security Hardening remains live; Supabase Leaked Password Protection remains a manual Auth-setting follow-up.
- Business Finance remains private/sole-trader-first; Smart Receipts remain private and review-first.
- Customer payment policy stays OFF until a separate deliberate decision.
