# Namdar AI fast resume

Last verified: 2026-09-14 UTC

Read this first. Use `docs/AI_HANDOFF.md` for implementation detail and `docs/PROJECT_STATUS.md` for roadmap/status.

## Production source of truth
- Repo `pchroonic/pchroonic`, default `main`.
- Current live product release: PR #75 `Improve customer quote-to-booking journey`.
- Exact tested PR head: `7610856d2d9a20280897f019c1b61415472b8596`.
- GitHub CI run `34888850208`: SUCCESS.
- Exact-head Vercel preview `dpl_2xEFQ4vf4ERB1P5Q4TxYrmbKTobR`: READY; errors-only build log clean; Vercel commit status SUCCESS.
- PR #75 merge/main product commit: `09d3ed99ab63652cb165cc409bf7b69f20e629f0`.
- Production deployment: `dpl_FUv52bL3ZgdDGLYrnGVSS58D96id`: READY on `https://namdar.co.uk`; errors-only build clean.
- Production `/api/health`: HTTP 200 after release.
- Live customer journey version: `6.4.32-booking-journey-1`.
- Live `conversion.js`, `booking-journey.js`, `account.js`, and `account-booking-journey.js`: HTTP 200/current.
- Safe GET check of `/api/customer-quote-claim`: HTTP 405 as designed; no quote/customer mutation performed.
- Post-release production error/fatal runtime log check: no matching logs.
- Supabase production: `qjigldxjcpnrlyxgmlqq`.
- Vercel project: `prj_4fILo0pCaLGUSUIMWrBIVGzeWVDC`, team `team_8Az8WtWcnfwtYRdhR8vGqC3L`.
- Window Cleaning is the only live/quotable/bookable service.
- Privileged Staff/Admin requires CAPTCHA + AAL2/MFA.
- Stripe commercial customer payment policy remains OFF; no live Stripe credentials.
- Ask Namdar provider AI remains disabled (`aiEnabled:false`).

## Customer booking journey — LIVE
Version: `6.4.32-booking-journey-1`

Live behavior:
- postcode/coverage checking is moved to the beginning of the Window Cleaning quote journey;
- the existing postcode verifier remains authoritative on the client and server coverage checks remain authoritative on quote creation;
- postcode/address UI appears before property/job detail fields; promo/reward fields remain available but are collapsed as optional extras;
- selected public address is retained without requiring the guest browser to call customer-only `/api/address-get` merely to select the returned address;
- selected address is stored with the quote request in a structured `[Requested address]` block inside existing quote notes;
- the guide-estimate result clearly explains estimate saved → final quote review → customer decision → appointment selection;
- Continue sends the customer to the exact quote in My Namdar;
- guest journey context is kept in session storage only;
- protected `/api/customer-quote-claim` lets an authenticated active customer attach an unowned guest quote only when the authenticated Auth email exactly matches the quote email;
- quotes already owned by another account are refused;
- My Namdar pre-fills the matching email, claims the quote after sign-in/auth-state changes, reloads the portal and shows Request → Final quote → Decision → Appointment progress;
- when scheduling an accepted quote, saved profile address remains first choice; if blank, the requested quote address can be reused;
- no automatic quote acceptance, booking creation, pricing change, payment, or Stripe enablement was added.

Verification notes:
- the first PR CI run failed only because the new regression test expected literal `[Requested address]` text while the parser source contains an escaped regex. Product code was unchanged for that correction.
- no real customer, quote, booking, payment or account was created as a deployment test.
- final interactive browser smoke from postcode → estimate → My Namdar remains user-driven; do not create an operational test quote unless the user intentionally wants one.

## Recent stable releases
- Staff My Jobs auth recovery PR #73 remains live; user explicitly confirmed the old null-`auth` / hard-refresh problem is fixed.
- Security Hardening PR #71 remains live: rate limits, secure invitations, owner-confirmed email changes, admin lifecycle safeguards and Admin inactivity timeout.

## Existing invariants / open items
- Security Hardening remains live; Supabase Leaked Password Protection remains a manual Auth-setting follow-up until enabled and re-verified.
- Business Finance remains private/sole-trader-first; Smart Receipts remain private and review-first.
- Customer payment policy stays OFF until a separate deliberate decision.
- Do not create real invitation/marketing/quote/chat/payment records merely as deployment tests.
