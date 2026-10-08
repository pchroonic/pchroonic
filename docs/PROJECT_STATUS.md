# Namdar project status

## 8 Oct 2026 — Google Business Profile / local trust readiness — LIVE
- Namdar should be configured as a **service-area business** if customers are not served at a staffed, signed customer-facing premises. Google specifically treats cleaning services as service-area businesses; in that setup the business address should be hidden from customers rather than using a virtual office.
- Use one profile for the current Namdar operation. Business name: `Namdar`. Website: `https://namdar.co.uk`. Service areas: `Lewisham`, `Southwark`, `Lambeth`, `Wandsworth`, `Greenwich`. Google allows up to 20 named service areas; keep them specific rather than using a radius.
- Primary category target: choose the most specific category Google currently offers for the core business, expected to be `Window cleaning service` if that category is available in the live category picker. Do not add categories merely as SEO keywords.
- Suggested Business Profile description: `Namdar provides exterior window cleaning for homes, flats and commercial properties across Lewisham, Southwark, Lambeth, Wandsworth and Greenwich. Customers can check their postcode and request a guide estimate online. Namdar reviews access, condition and job details before sending the final quote, with one-off and regular cleaning options available.`
- Production `site_settings.contact.service_area_text` was corrected from the generic `London and surrounding areas` to `Lewisham, Southwark, Lambeth, Wandsworth & Greenwich` so the public site and future Google profile use the same coverage wording.
- Production currently has no public business phone, no saved opening hours and no uploaded brand logo URL. Do not invent these values. The homepage candidate now hides the unfinished `Business phone coming soon` row until a real phone number is configured, and its static service-area fallback uses the exact five boroughs.
- Once a real Google Business Profile exists and is verified, add its canonical profile URL to Namdar's public entity signals (`sameAs`) and add the genuine Google review link/CTA only after the URL is known. Do not create fake reviews or self-written customer reviews.
- Windsor.ai connection was skipped because the user could not connect it. This does not block the website-side local SEO work. Google Business Profile creation/verification and direct profile edits remain manual unless a working profile integration is connected later.
- PR #191 merged as `a4b0a70861d489fc19858d06f299c8fecb6414e8`. Production deployment `dpl_BZqQAXSnUuWEBPWeTFGXmcpUxtWW` is READY and aliased to `namdar.co.uk`. Live verification confirmed the exact five-borough public service-area text and the removal of the unfinished public phone placeholder.

## 8 Oct 2026 — Local borough SEO expansion — LIVE
- Added dedicated, indexable Window Cleaning pages for `/areas/southwark`, `/areas/lambeth`, `/areas/wandsworth`, and `/areas/greenwich` so all five live boroughs now have their own local landing page.
- Each new page has unique borough-specific copy, a self-referencing canonical, `Service` + `BreadcrumbList` structured data, links to the other live borough pages, and repeated wording that the exact postcode remains the final availability check. The pages do not promise blanket borough-wide booking.
- Homepage, live Window Cleaning service page, London/South London coverage pages and Lewisham page now link the complete five-borough set. This replaces the old anti-doorway guardrail with regression checks that require unique copy/canonicals/local schema instead of forbidding borough links.
- `api/sitemap.js` now includes all four new borough URLs. Homepage, Window Cleaning and area `lastmod` values move to `2026-10-08` because those pages genuinely changed in this release; do not bump them on future redeploys without content changes.
- Semrush is connected but the account currently has no API units, so keyword-volume / difficulty validation is pending and did not block the structurally correct local-page release.
- PR #189 merged as `6ad10b0a29b2afb5d38799e74b82ab66c9dc5818`. Production deployment `dpl_Fe8r1MmN41fn7usrMZ4C3fwTkTaS` is READY and aliased to `namdar.co.uk`. Live verification confirmed HTTP 200 for Southwark, Lambeth, Wandsworth and Greenwich pages plus all four entries in `/sitemap.xml`.

### SEO improvement roadmap
1. **Borough landing pages** — LIVE: all five boroughs now have dedicated local pages and a complete internal-link graph, protected by anti-duplication/SEO regressions.
2. **Google Business Profile** — strengthen service areas, hours, photos, reviews and ongoing profile activity once the profile/business details are ready.
3. **Real completed-work pages** — publish customer-approved before/after jobs through the existing `/work` system with no private address exposure.
4. **Original photography** — replace generic/interface-only trust with genuine Namdar equipment, team and completed-work images as they become available.
5. **Homepage local-area hub** — keep a clear customer-facing area section linking every live borough and the wider London/South London coverage pages.
6. **Local-business structured data** — add stronger public business details such as phone/hours/logo/service-area data once those details are final and intended for publication.
7. **Trust and conversion proof** — add only genuine reviews, credentials, completed-job proof and service guarantees that Namdar can substantiate.
8. **Core Web Vitals / mobile performance** — monitor LCP, INP and CLS as Search Console gathers enough production data, and fix regressions before adding visual weight.

## 7 Oct 2026 — Google indexing requests submitted
- Google Search Console reported 7 sitemap URLs as `Discovered - currently not indexed`; all had `Last crawled: N/A`. The four commercially important SEO pages were live-tested successfully and Google reported `URL is available to Google` / `Page can be indexed`.
- Manual indexing requests were submitted for `/services/window-cleaning`, `/areas/lewisham`, `/areas/south-london`, and `/areas/london`. Do not repeatedly resubmit; wait for Google to crawl them and recheck Search Console after about 7 days.
- The separate `Page with redirect` example is only `http://namdar.co.uk/` redirecting to HTTPS, which is intentional and requires no fix.
- Live robots.txt allows public pages and advertises `https://namdar.co.uk/sitemap.xml`; the four SEO pages return HTTP 200, use self-referencing canonicals and valid breadcrumb structured data.
- Sitemap `lastmod` dates were verified against Git history. The homepage was last changed 25 Sep 2026 and the Window Cleaning / London / South London / Lewisham SEO pages were also last changed 25 Sep 2026. Keep those dates until page content genuinely changes; do not bump `lastmod` merely because Vercel redeploys.

## 7 Oct 2026 — Customer VAT engine — LIVE
- Upgrades the existing bookkeeping-only Business Finance VAT flag into a future customer-pricing control while keeping VAT OFF unless Namdar deliberately enables it.
- Admin → Reporting → Business Finance now stores VAT registered status, effective registration date, VAT registration number and VAT rate (default 20%). Customer VAT becomes effective only when the switch is on, date + number are present, and the registration date has arrived.
- New quotes lock a VAT snapshot in `quotes.inputs.salesVat`; accepted bookings carry it in `payment_policy_snapshot.salesVat`; invoices preserve the same snapshot. Later VAT-setting changes do not silently rewrite existing customer agreements.
- Customer quote totals are VAT-inclusive when active. Admin quote review shows net/VAT/gross context; My Namdar quote and Billing views show VAT included; invoice PDFs show subtotal, VAT rate/amount, gross total and VAT registration number; payment receipts show invoice VAT context.
- The Window Cleaning headline processing-cost allowance remains part of the ordinary service price, not a card surcharge. Its percentage gross-up now accounts for Stripe charging its percentage against the VAT-inclusive card total, and quote allowance arithmetic retains pennies instead of rounding back to whole pounds.
- Business Finance excludes output VAT collected on VAT-active invoice payments from its management trading-profit receipt estimate and uses net taxable invoice value for the VAT-threshold turnover monitor. VAT-return/input-VAT recovery remains explicitly outside this estimator.
- Production state verified after release: `finance_private` still has no saved row, so customer VAT is OFF. The release did not create or enable VAT settings. Current payment policy revision 2 has the 1.5% + £0.20 headline allowance ON.
- Database schema impact: none; existing JSON settings/snapshot columns are reused. Environment-variable impact: none.
- Release asset `6.4.97-sales-vat-1` is live. `scripts/sales-vat.test.mjs` and the existing payment-policy/JavaScript CI passed before merge.
- PR #186 merged as `599c636c161eb22ffa0cd5644717f370986c3126`. Production deployment `dpl_9pA6Mez44zzD8PxPKXRgwbiTgCHu` is READY. VAT remains OFF until Namdar deliberately saves valid registration details and enables it.

## 7 Oct 2026 — live £0.50 Stripe refund verified
- Invoice `NMD-2026-001003` was successfully refunded through Stripe after the Admin selector fix. Stripe refund `re_3UK2UcCu9tojH31y0qLRDGcz` is `succeeded`; Namdar invoice and booking are both `refunded` with £0.00 paid balance.
- The original £0.50 charge had a £0.21 Stripe processing fee and £0.29 net; the £0.50 refund had no extra refund fee, leaving the Stripe balance at -£0.21 because Stripe retained the original processing fee.


## 7 Oct 2026 — Admin Stripe refund selector fix
- Root cause confirmed from production: `admin-payment-settings.js` removed the `Stripe` option from `#paymentMethod` during boot. This overrode the PR #179 refund UI, so a refundable Stripe payment was detected but the modal fell back to Bank transfer.
- Removed that conflicting DOM mutation. Stripe remains blocked for manual payment entry by the server/UI, but stays available for genuine refunds tied to an original Stripe PaymentIntent.
- Cache tokens updated to `6.4.96-stripe-refund-method-fix-1` and regression coverage now fails if the payment-settings extension removes the Stripe refund option again.
- The accidental £0.50 bank-transfer refund row created while reproducing the bug on invoice `NMD-2026-001003` was removed; the invoice is restored to `part_paid` / £0.50 paid and the linked booking to `deposit_paid`. No Stripe refund was sent by that repair.
- Database schema impact: none. Environment-variable impact: none.

### Production verification
- PR #184 merged at `ff680e1ce57490dd10535d5c45deb3fc58cc699a`.
- Vercel production deployment `dpl_26fPDE7aNY4TC61YfronpLDjHNW5` is READY and aliased to `namdar.co.uk`.
- Live `/admin.js` serves payment asset `6.4.96-stripe-refund-method-fix-1`; live `/admin-payment-settings.js` no longer removes the Stripe method option.
- `/api/health` returned HTTP 200 / `ok:true` with database, Stripe, webhook and email healthy.
- Production invoice `NMD-2026-001003` verified after repair: `part_paid`, £0.50 paid, booking `deposit_paid`, one Stripe payment, zero refund rows, one refundable Stripe target.

## 7 Oct 2026 — legacy £0.50 refund test data repaired
- Production test invoice `NMD-2026-001003` had a genuine £0.50 Stripe deposit plus an incorrect £0.50 manual `card` refund row created on 5 Oct 2026 before the live Admin Stripe refund fix.
- The incorrect manual refund row was removed from `namdar-production`; invoice state was restored to `part_paid` / £0.50 paid and the linked booking to `deposit_paid`.
- Verification after repair: one Stripe payment row, zero refund rows, ledger net £0.50. No Stripe refund was sent by this repair.
- Production already runs the PR #179 Stripe-refund flow; Admin → Payments should now expose the normal `Refund via Stripe` action for this invoice. The actual refund still requires the Admin confirmation click.
- An audit entry `payment.refund_repair` records the correction.

## CURRENT CHECKPOINT — 5 Oct 2026

### Production
- GitHub main: `1e852096dc0e148b813cdc5fb0e6533b2595b23d` (PR #179).ntinuity update).
- Latest verified production Vercel deployment: `dpl_A6Y7THjZ226yFG2fHY12wHgiFz33`, READY and aliased to `namdar.co.uk`, from main `1e852096dc0e148b813cdc5fb0e6533b2595b23d`.nXk7BymZvPHR7QuMaDeicY3`, READY on `namdar.co.uk`, from main `d77e4e5c5e9dec31693225b72f1c1b6d8b5ac4ba`.
- PR #162 browser GetAddress domain-token lookup is live.
- PR #163 admin-only GetAddress subscription/usage diagnostic is live.

## Admin Stripe refund — LIVE
- Admin → Payments already had a generic Refund action, but Stripe was intentionally blocked from manual ledger entry. The candidate now makes that action perform a real Stripe refund when the invoice has a refundable Stripe transaction.
- Server flow: validate invoice/net paid → validate the selected original Stripe PaymentIntent and its remaining refundable amount → verify the payment's test/live mode matches the configured secret → create the refund through Stripe using an idempotency key → feed successful refunds through the existing `processRefund` path so payment records, receipt numbers, customer email, staff notification and invoice/payment state remain authoritative and idempotent.
- Pending provider refunds are not falsely marked complete; the verified webhook remains the confirmation path.
- UI defaults to Stripe only when a refundable Stripe payment exists, disables Stripe for manual payment entry, requires a confirmation prompt before money is sent back, and retains manual cash/bank/card refund recording.
- Files: `lib/stripe-payments.js`, `api/admin-payments.js`, `admin-original.js`, `admin.js`, `admin.html`, `scripts/stripe-payments.test.mjs`, Stripe CI workflow.
- Database impact: none. Environment-variable impact: none; existing `STRIPE_SECRET_KEY` and verified webhook remain the provider controls.
- Regression coverage includes Stripe refund request payload/idempotency and Admin wiring.
- PR #179 merged at `1e852096dc0e148b813cdc5fb0e6533b2595b23d`; production deployment `dpl_A6Y7THjZ226yFG2fHY12wHgiFz33` is READY and aliased to `namdar.co.uk`.
- `AI handoff and JavaScript checks` passed, including Stripe/payment-policy regression tests; Google Review and post-job compatibility checks passed.
- Live verification confirmed the `6.4.95-stripe-refund-1` admin bundle and refund confirmation/runtime wiring, and `/api/health` returned HTTP 200 with database, Stripe, Stripe webhook and email healthy.

### My Namdar / account
- Account startup regressions from the notification/profile-menu work are fixed and protected by CI.
- Postcode is now entered before Area/Region and Borough/District.
- Typing a postcode no longer immediately clears the existing derived location fields.
- Phone SMS verification is implemented behind `NAMDAR_PHONE_VERIFICATION_ENABLED` and remains OFF by default.

### GetAddress / address lookup — ACTIVE BLOCKER
The customer address picker is structurally ready, but GetAddress authentication is currently unusable:
- GetAddress dashboard shows subscription **Active**, free plan **20 lookups/day**, current usage 0.
- Production server lookup with `GETADDRESS_API_KEY` returns HTTP 401 / Unauthorized.
- Server retry using `GETADDRESS_DOMAIN_TOKEN` also returns Unauthorized.
- Admin-only diagnostic using `GETADDRESS_ADMIN_KEY` also reports that GetAddress rejected the Administration Key.
- The domain-restricted browser lookup from PR #162 is live, but no successful GetAddress lookup has yet been confirmed.
- Namdar data-rights policy is NOT the blocker: operational human-triggered lookup is allowed; automated/bulk harvesting remains intentionally blocked.
- Do not loosen the address-data rights/harvest controls to solve this.

### Current GetAddress code protections
- Unauthorized provider failures are not cached.
- `/api/address-search` exposes a safe `providerReason` diagnostic.
- API-key → Domain Token fallback exists.
- Browser Domain Token flow exists for explicit customer `Find address` actions.
- Admin diagnostic endpoint: `/api/admin-getaddress-status` (staff/settings protected, never exposes secrets).
- Full-postcode customer lookup requests the full suggestion set; manual entry remains fallback.

### Next recommended action
Start the next chat by verifying the live browser-domain-token request in DevTools/network or directly testing the GetAddress browser request from `namdar.co.uk`. If GetAddress still returns Unauthorized for the browser token, stop spending time on Namdar-side auth changes and either:
1. escalate the GetAddress subscription/credential issue to GetAddress support, or
2. evaluate and migrate to another UK address-lookup provider.

Any replacement provider should support:
- full UK postcode → selectable premise/flat/house list;
- browser-safe or server API authentication;
- clear commercial/operational rights;
- low-volume/pay-as-you-go pricing suitable for early Namdar usage;
- structured address fields and postcode coordinates;
- caching/reuse terms compatible with Namdar's private customer address cache.

### Security note
API credentials were visible in screenshots during troubleshooting. Any exposed GetAddress API/domain/admin credentials should be treated as compromised and rotated. Do not paste replacement secrets into chat; store them only in provider/Vercel secret controls.


## Booking change calendar + cancellation acknowledgement — LIVE
- Replaces the customer reschedule dropdown with the same calendar + time-button picker used for first-time appointment selection.
- Only dates with live availability are selectable; the chosen replacement time is written into the existing `#bookingChangeSlot` contract, so the current booking-change API remains compatible.
- Cancellation requests now require an explicit checkbox confirming the customer has read and accepted the cancellation terms and understands the current appointment stays booked until Namdar approves the request.
- The submit button is disabled in cancellation mode until that acknowledgement is ticked; the API also rejects bypass attempts without `cancellationTermsAccepted:true`.
- Production schema records `cancellation_policy_acknowledged_at` and `cancellation_policy_version` on cancellation requests for audit evidence.
- Migration: `supabase/migrations/20260926220500_booking_change_cancellation_ack.sql` is applied to `namdar-production` and verified.
- Account booking journey asset: `6.4.94-booking-change-calendar-1`; booking policy asset: `6.4.94-cancellation-ack-1`.
- PR #177 merged at `144e178634e25be5ef8303a42be8da6a52064130`; production deployment `dpl_2o63nDpGZu6owf2WZ4GSXq9fSGDh` is READY and aliased to `namdar.co.uk`.
- Release checks: AI handoff/JavaScript, Google Review compatibility and Post-job compatibility all passed; live account assets contain the reschedule calendar and required cancellation-acceptance flow; production `/api/health` returned HTTP 200 / `ok:true`.
- No new environment variable.


## Invoice PDF attached to payment email — CANDIDATE
- After a verified Stripe payment is recorded, Namdar now generates the customer's updated invoice PDF and attaches it directly to the payment receipt email.
- The attachment uses the same shared invoice-PDF generator as the My Namdar Billing download so emailed and portal invoices stay consistent.
- Resend attachments are sent as base64 PDF content with an explicit `application/pdf` content type.
- If PDF generation fails, payment recording and the receipt email still continue, with My Namdar kept as the fallback download path.
- The attached invoice reflects the post-payment state (for example part paid, paid amount and outstanding balance).
- Changes: `lib/invoice-pdf.js`, `api/billing-document.js`, `api/stripe-webhook.js`, `lib/server-original.js`, and `scripts/stripe-payments.test.mjs`.
- No database migration or environment-variable change.
- Not deployed until this candidate is merged and production is verified.


## Required booking payment handoff — LIVE
- Fixes the accepted-quote flow where a required-payment booking could be created as unpaid and then land in My Bookings without opening Stripe.
- After a booking is created, any required initial payment greater than £0 immediately opens a secure Stripe Checkout session.
- If Checkout cannot open or the customer returns without paying, My Bookings exposes the recorded required amount and shows a clear Pay action on the booking card.
- Unpaid required-payment bookings use a Payment required status treatment instead of appearing fully settled/scheduled.
- `api/customer-jobs.js` now returns the booking's recorded `deposit_required` amount so the customer recovery UI uses the locked booking value rather than recalculating current policy.
- Existing server safeguards remain: Checkout requires recorded booking-policy acceptance and statutory service-start acknowledgement, and accepts pending/confirmed bookings.
- Account/policy/style cache token: `6.4.93-payment-handoff-1`.
- Regression coverage: `scripts/booking-cancellation-policy.test.mjs` plus updated account cache/version regressions.
- No database migration or environment-variable change.
- PR #173 merged at `49a54f476db0c62be0a1817af6eeb51e4c83b997`; production deployment `dpl_Fa91VMTTDhVpCPiDx4j4FBhqqxQL` is READY and aliased to `namdar.co.uk`.
- Release checks: AI handoff/JavaScript, Staff operations v3, Google Review compatibility and Post-job compatibility all passed; live `/account` serves the `6.4.93-payment-handoff-1` account/policy/style assets; live booking policy code opens `/api/create-checkout` when a required amount is returned; live account code shows a Payment required recovery action using the booking's recorded deposit amount; `/api/health` returned HTTP 200 / `ok:true` with Stripe and webhook readiness true.
- Production database verification for booking `76a44d33-f5f0-4e73-879e-092875963752`: status `pending`, payment status `unpaid`, locked required deposit `£0.50`, booking-policy acceptance recorded, early-service acknowledgement true, invoice total `£1.00` and paid amount `£0.00`.


## Compact booking terms review — LIVE
- Removes the long booking/cancellation/payment wording from the main accepted-quote appointment screen.
- The appointment screen now shows a compact Booking terms card with the current payment summary, acceptance status and a Review & accept terms action.
- Full payment, cancellation, statutory consumer-rights and service-start wording is moved into a dedicated modal review step.
- Both existing acknowledgements remain mandatory; the booking API still records them and Stripe checkout still rejects bookings without recorded policy acceptance.
- Acceptance state resets when the appointment dialog closes, preventing stale consent from carrying into another booking.
- Customer booking policy asset/cache token: `6.4.92-compact-booking-terms-1`.
- Regression coverage: `scripts/booking-cancellation-policy.test.mjs`.
- No database migration or environment-variable change.
- PR #171 merged at `e414f7ba9c30a42ecf2bf0e73bce8c9726605341`; production deployment `dpl_FXumzq7Q4EW3erwCFZi2nTyaFZiJ` is READY and aliased to `namdar.co.uk`.
- Release checks: AI handoff/JavaScript, Google Review compatibility and Post-job compatibility all passed; live `/account` loads `account-booking-policy.js?v=6.4.92-compact-booking-terms-1`; live JS contains the compact Booking terms card, required Review & accept terms modal and Stripe-before-payment acceptance wording; live CSS contains desktop/mobile compact terms rules; `/api/health` returned HTTP 200 / `ok:true`.


## Customer booking calendar picker — LIVE
- Replaces the long accepted-quote appointment dropdown with a calendar-first picker in My Namdar.
- Step 1 shows only dates with live available windows as selectable calendar days; unavailable dates stay disabled.
- Step 2 shows the selected day's available time windows as clear buttons, highlights the chosen window and shows a selected-appointment summary.
- Supports availability spanning multiple months with previous/next available-month controls and displays times explicitly in Europe/London.
- Keeps the existing hidden `#quoteScheduleSlot` value as the source for the current booking submit/payment-policy flow, so no booking API or database contract changes.
- Customer booking journey asset/cache token: `6.4.91-booking-calendar-1`.
- Regression coverage: `scripts/customer-booking-journey.test.mjs`.
- No database migration or environment-variable change.
- PR #169 merged at `3f9d62c1115aa3457282bd80c749b6c643375818`; production deployment `dpl_2kqK5jpFN8aMMSXBaBDbjFnsvgzB` is READY and aliased to `namdar.co.uk`.
- Release checks: AI handoff/JavaScript, Google Review compatibility and Post-job compatibility all passed; live `/account` loads `account-booking-journey.js?v=6.4.91-booking-calendar-1`; live JS contains the calendar/time-button picker and preserves writes into the existing slot select; live CSS contains desktop/mobile calendar rules; `/api/health` returned HTTP 200 / `ok:true`.


## Accepted quote appointment modal layout — LIVE
- Fixes the My Namdar accepted-quote appointment dialog overflowing horizontally because the base dialog was capped at 520px while its `.wide` card could be about 940px.
- Gives the quote-scheduling and booking-change dialogs a viewport-safe 820px desktop width, 16px mobile gutters, full-width inner cards and no horizontal overflow.
- Keeps the existing appointment, cancellation, statutory-rights and payment-policy logic unchanged.
- Account stylesheet cache-busted to `6.4.90-booking-modal-layout-1` and regression coverage added to `scripts/booking-cancellation-policy.test.mjs`.
- No database migration or environment-variable change.
- PR #167 merged at `64f172d79321cd78db0c0bc8ace972a4d82931a2`; production deployment `dpl_D2AwJVcDtTiir9FpsvozW7zXWQns` is READY and aliased to `namdar.co.uk`.
- Release checks: AI handoff/JavaScript, Google Review compatibility and Post-job compatibility all passed; live `/account` serves `styles.css?v=6.4.90-booking-modal-layout-1`; live CSS contains the scoped 820px booking-dialog rule and full-width inner-card rule; `/api/health` returned HTTP 200 / `ok:true`.


## Compact My Namdar notifications — LIVE
- Removes the large inline unread-notification card from My Namdar because the same unread item is already available from the top-right bell/popover.
- Keeps the bell unread badge, notification popover, filters, Notification Centre and quote journey/status messaging intact.
- Customer notification data, read/unread actions and polling are unchanged; only the duplicate page-level renderer is removed.
- Changes: `account.html`, `account-original.js`, `scripts/notification-popover-ui.test.mjs`, plus the existing account regression tests that pin the cache-busted `account-original.js` loader version.
- No database migration or environment-variable change.
- PR #165 merged at `534f3d48256b2a79e03a481f4ef9a5afdfad4932`; production deployment `dpl_9n1AQqzMpf5VfQLNyUoM4AM3aXKG` is READY and aliased to `namdar.co.uk`.
- Release checks: AI handoff/JavaScript, Google Review compatibility and Post-job compatibility all passed; live `/account` contains the bell and `6.4.89-compact-notifications-1` runtime but no `accountNotificationBar`; `/api/health` returned HTTP 200 / `ok:true`.


## GetAddress admin diagnostic — CANDIDATE
- Adds `/api/admin-getaddress-status` protected by `requireStaff(req,'settings')`.
- Reads `GETADDRESS_ADMIN_KEY` server-side only.
- Checks GetAddress `/v2/subscription` and `/v3/usage`.
- Returns safe subscription/usage fields only; no secret values.
- CI covers endpoint syntax and secret-handling expectations.


## Browser GetAddress domain-token lookup — CANDIDATE
- `/api/config` exposes only the domain-restricted `GETADDRESS_DOMAIN_TOKEN`, never the API key.
- Customer Find address first calls GetAddress autocomplete from the browser with `all=true`.
- Selected suggestion resolves through GetAddress `/get/{id}` and maps into structured Namdar address fields.
- Existing `/api/address-search` remains fallback.
- Regression: `scripts/address-browser-domain-token.test.mjs` wired into CI.


## GetAddress domain-token fallback — CANDIDATE
- API key remains primary for customer postcode lookup.
- On 401/Unauthorized, automatically retry `GETADDRESS_DOMAIN_TOKEN`.
- Domain-token retry sends `Origin: https://namdar.co.uk` and matching Referer.
- Shared GetAddress autocomplete client now accepts request headers.
- Regression coverage added to `scripts/address-customer-lookup.test.mjs`.


## GetAddress live lookup recovery — CANDIDATE
- Do not cache GetAddress 401/Unauthorized failures.
- Return non-secret `providerReason` diagnostics from `/api/address-search`.
- Support `GETADDRESS_API_KEY` with optional `GETADDRESS_DOMAIN_TOKEN` fallback.
- Keep customer lookup human-triggered, rate-limited and dataset-policy gated.
- Current production log diagnosis: GetAddress returns `Unauthorized`; credential replacement is required for full house/flat results.


## Postcode-first customer address flow — CANDIDATE
- Moves Postcode + Find address above Area/Region and Borough/District in signup and My details.
- Successful postcode lookup remains the source of truth for Area/Region, Borough/District and Town/City.
- Editing postcode marks verification stale but no longer erases the current location selections before lookup succeeds.
- Adds `scripts/account-postcode-first.test.mjs` and wires it into account CI.
- Account runtime cache-busted to `6.4.88-postcode-first`.


## Phone verification ready, disabled by default — CANDIDATE
- Adds public config flag `phoneVerificationEnabled` from `NAMDAR_PHONE_VERIFICATION_ENABLED`; default is OFF.
- Customers can save phone numbers while SMS is off; unverified state does not block account completion until verification is enabled.
- My details and Security SMS actions are guarded and disabled while OFF, so no provider call/cost occurs.
- Existing Supabase phone-change OTP flow is preserved for future activation.
- Activation runbook: `docs/PHONE_VERIFICATION.md`.
- Regression: `scripts/account-phone-verification-ready.test.mjs`, wired into main JS CI.
- No database migration; `profiles.phone_verified` already exists.


## Fix profile-menu runtime typo — CANDIDATE
- Fixes `ReferenceError: $$$ is not defined` in `account-original.js`.
- Portal-tab binding now uses the valid `$$()` collection helper.
- CI now rejects any `$$$(` token in the account runtime.
- No database migration, auth protocol, or environment-variable change.


## My Namdar profile menu — CANDIDATE
- Adds a top-right initials/avatar menu to My Namdar.
- Moves My details, Notifications, Security, Back to website, Admin dashboard (role-gated), and Sign out into the menu.
- Keeps core workflow tabs visible: Overview, Quotes, Bookings, Billing, Support, Projects & 3D, Subscriptions, Rewards.
- Utility panels remain deep-linkable and open correctly without horizontal tab buttons.
- Menu closes on selection, outside click, and Escape.
- Regression: `scripts/account-profile-menu.test.mjs`, wired into main JS CI.
- No database migration, auth protocol, or environment-variable change.


## Enforced My Namdar regression gate — CANDIDATE
- Main JS CI now runs all five `scripts/account-*.test.mjs` regression tests relevant to My Namdar startup.
- Global guard rejects any `$().forEach()` misuse in `account-original.js`; collections must use `$$()`.
- Protects against boot-spinner, session-startup, Supabase-load and notification-handler regressions before merge.
- CI-only safety change; no runtime, database, auth, or environment change.


## Fix My Namdar pre-init notification crash — CANDIDATE
- Fixes `TypeError: $(...).forEach is not a function` at account startup.
- Three `[data-pop-filter]` handlers now use `$$()` instead of `$()` before `.forEach()`.
- The crash occurred before `init()`, causing repeated `ACCOUNT-BOOT-HTML-READY`.
- Regression: `scripts/account-pop-filter-foreach.test.mjs`.
- No database migration, auth protocol, or environment-variable change.


## Account runtime diagnostics — CANDIDATE
- Diagnostic-only change; no auth/session behavior change.
- External boot watchdog captures JS errors, unhandled rejections, and failed script/resource loads.
- Stalled `ACCOUNT-BOOT-HTML-READY` now includes the browser error detail or `NO-BROWSER-ERROR-CAPTURED`.
- No database migration or environment-variable change.


## Non-blocking Supabase account startup — CANDIDATE
- Removes the blocking external Supabase script from account.html.
- account-original.js starts first and then loads Supabase dynamically.
- Primary jsDelivr load is bounded at 4.5s; unpkg is used as a second bounded fallback.
- Targets repeated `ACCOUNT-BOOT-HTML-READY`, proving startup was blocked before init().
- Regression: `scripts/account-nonblocking-supabase.test.mjs`.
- No database migration or environment-variable change.


## Direct My Namdar script loading — CANDIDATE
- Removes `account.js` / `document.write(...)` from the live My Namdar startup path.
- Loads Supabase 2.117.1, `account-original.js`, MFA/security, payment, booking, privacy and post-job scripts directly from `account.html` in fixed order.
- Targets diagnostic `ACCOUNT-BOOT-HTML-READY`, which proved account-original.js never reached init().
- Regression tests forbid reintroducing account.js into live account startup.
- No database migration or environment-variable change.


## CSP-safe account boot watchdog — CANDIDATE
- Moves the My Namdar watchdog out of inline HTML into `account-boot-watchdog.js`.
- Fixes CSP blocking of the previous inline watchdog.
- Loads before account.js and uses same-origin script loading permitted by CSP.
- Regression fails if the watchdog is moved inline again.
- No database migration or environment-variable change.


## Account boot watchdog — CANDIDATE
- Independent 8-second watchdog starts in `account.html` before account.js or external auth dependencies.
- Prevents an endless “Restoring your secure session” screen if startup never reaches the internal auth timeout.
- Records exact boot phases: init, config, Supabase library/client, initial session, render, ready.
- On failure the UI exposes an `ACCOUNT-BOOT-<PHASE>` code instead of hanging silently.
- Watchdog clears on successful render.
- No authentication protocol, database, or environment change.


## Homepage auth lock fix — CANDIDATE
- Homepage auth callback now uses the session passed by Supabase instead of calling `getSession()` again inside `onAuthStateChange`.
- Profile/UI refresh is deferred to the next tick.
- Initial homepage load still does one normal session read outside the callback.
- Targets the cross-tab lock where the homepage showed “My account” while `/account` hung restoring the same session.
- Regression: `scripts/homepage-auth-lock.test.mjs`.
- No database migration or environment-variable change.


## Non-blocking My Namdar auth bootstrap — CANDIDATE
- Replaces blocking initial `getSession()` with Supabase `INITIAL_SESSION` event handling.
- Auth listener no longer performs awaited portal/database work directly inside `onAuthStateChange`; rendering is deferred to the next tick.
- Initial session wait is bounded at 5 seconds.
- Targets the remaining multi-tab/session-lock stall on My Namdar while the homepage already detects the same signed-in session.
- Regression: `scripts/account-initial-session-event.test.mjs`.
- No database migration or environment-variable change.


## Native My Namdar session flow — CANDIDATE
- Removes `account-auth-hotfix.js` from the live My Namdar loader.
- Uses Supabase native persisted-session lifecycle: `persistSession`, `autoRefreshToken`, `detectSessionInUrl`, native `getSession()`, and `onAuthStateChange`.
- Pins the browser client to Supabase JS 2.117.1.
- Keeps the historical hotfix file in-repo but unused by production account startup.
- Regression checks now require that the account loader does not load the custom session wrapper.
- No database migration or environment-variable change.


## Faster account startup — CANDIDATE
- Signed-out customers see the login form after ~2.2s once the auth client is ready instead of waiting through the full restore timeout.
- Customers with a valid cached session remain on the protected restore path.
- Full 12s session recovery remains intact for genuine restores.
- Regression tests cover both paths.
- No database migration or environment-variable change.


## Login auth-client readiness — CANDIDATE
- Prevents password sign-in from calling `sb.auth` before the Supabase client exists.
- Prevents the session watchdog from exposing the sign-in form while the auth client is still null.
- Fixes the visible `Cannot read properties of null (reading 'auth')` failure.
- Regression tests cover both paths.
- No database migration or environment-variable change.


## Fresh sign-in state cleanup — CANDIDATE
- Clears the stale “We could not restore your secure session” message when the customer edits login fields or starts a new sign-in.
- Prevents old recovery UI from being mistaken for the result of the current password attempt.
- No authentication protocol, database, or environment change.
- Regression: `scripts/auth-stale-recovery-message.test.mjs`.


## Auth client readiness guard — CANDIDATE
- Prevents cached-session recovery from calling renderState before the Supabase auth client exists.
- Fixes the resulting `Cannot read properties of null (reading 'from')` startup failure.
- MFA guard now scopes “Two-step verification could not be completed” only to the MFA challenge step, not downstream portal rendering.
- Regression tests cover both conditions.
- No database migration or environment-variable change.


## Account loader cache-chain fix — CANDIDATE
- `account.html` now versions the top-level `account.js` loader so auth fixes actually reach existing browsers after deployment.
- Removed the duplicate unpinned Supabase script from account.html; account.js remains the single source for the pinned auth library.
- Added regression coverage to fail CI if the account loader version becomes stale or a second Supabase preload is reintroduced.
- No database migration or environment-variable change.


## Auth spinner recovery — CANDIDATE
- Fixes indefinite “Opening My Namdar… Restoring your secure session” state after a valid cached session is detected.
- Watchdog now actively calls the account renderer with the recovered session instead of returning and leaving the loading shell visible.
- If the renderer is unavailable, a sessionStorage guard allows at most one recovery reload; no reload loop.
- Regression added to `scripts/account-auth-hotfix.test.mjs` for the exact visible-spinner failure.
- No database migration or environment-variable change.


## Auth session recovery guard — CANDIDATE
- Fixes false logout/login screen when Supabase session restoration exceeds the old 5-second hard timeout.
- Auth guard now allows 12 seconds and recovers a valid unexpired cached Supabase session before returning a null session.
- Session watchdog no longer switches a customer to the login form when a valid cached session exists.
- Failure copy no longer tells users to close tabs; it only appears when there is no recoverable session.
- Existing `scripts/account-auth-hotfix.test.mjs` now includes a mandatory cached-session recovery regression test, and it is already part of the PR JavaScript gate.
- No database migration or environment-variable change.


## Verified contact + explicit property details — CANDIDATE
- Mobile entry supports 07…, +44… and 0044… plus selectable calling codes and normalizes to E.164-style international format.
- My details now includes SMS OTP verification; `profiles.phone_verified` is set true only after successful Supabase phone-change verification.
- Region, district and property type have no silent default. Each is required; Other reveals a required custom text input saved into the existing profile field.
- Editing the postcode invalidates old verification, hides/clears the map and clears derived region/district/city until Find address runs again.
- Address provider outages are distinguished from genuine no-address results.
- No database migration or new env var.
- Production GetAddress currently still returns Unauthorized; this branch improves the customer-facing fallback but does not mask that provider issue.
- Regression: `scripts/profile-contact-location-validation.test.mjs`.


## Studio-style customer notifications — CANDIDATE
- Header notification control is now an icon bell with unread badge.
- Clicking it opens an anchored recent-notifications panel rather than immediately navigating away.
- Dropdown includes All, Quotes, Bookings, Billing and Support filters, unread dots, category icons, excerpts and relative timestamps.
- Full Notification Centre remains available from the dropdown footer for search/archive/history.
- Mobile uses a near-full-width fixed panel below the header.
- No database migration or environment-variable change.
- Regression: `scripts/notification-popover-ui.test.mjs`.


## Signup profile redirect — CANDIDATE
- Newly signed-in customers with incomplete profile data are automatically taken to My details when no explicit quote/booking/message/tab destination is present.
- Missing mobile number is prioritised and the Mobile field is focused first.
- Explicit deep links remain authoritative, so checkout returns and customer links are not hijacked.
- Email/password registration still requires a mobile number during signup; this primarily protects social/OAuth and incomplete-profile paths.
- No database migration or environment change.
- Regression: `scripts/signup-profile-redirect.test.mjs`.


## Customer GetAddress postcode lookup — CANDIDATE
- Fixes the public quote postcode selector using only partial cached/OpenStreetMap results even when GetAddress is configured.
- A real customer-entered postcode may trigger one GetAddress autocomplete request only when Namdar has no cached GetAddress rows for that postcode; returned addresses are cached in private `master_addresses` and then reused.
- Provider policy fails closed: the customer path requires the GetAddress dataset to be active with `operational_use_allowed=true` and `human_input_required=true`; automated/bulk harvesting remains blocked.
- Fresh zero-result lookups are cached for 24 hours and provider errors for 10 minutes to avoid repeated charge/rate-limit pressure.
- If a complete GetAddress cache exists, partial OSM rows are omitted from the customer picker; OSM/manual entry remain fallbacks.
- Public address lookup throttle is 12 requests/IP/10 minutes.
- No Supabase migration or new environment variable is required; existing `GETADDRESS_API_KEY` is used server-side when configured.
- Regression: `scripts/address-customer-lookup.test.mjs`.
- Not yet merged/deployed at this checkpoint.


Last updated: 2026-09-25 UTC

## Production baseline
- Repo `pchroonic/pchroonic`, default `main`.
- Current production main merge `a3e65a0bb13982841b5ece319fbc859d27ed90ae` (PR #125 ECB save-refresh release). PR #102 Payment Receipt Tracking remains live.
- Customer base loader `6.4.35-payment-policy-engine-1`; post-job extension `6.4.42-post-job-experience-1`; Staff operations/ETA `6.4.41-staff-operations-v3-1`.
- Admin base `6.4.37-admin-website-crash-fix-1`; Google Review System `6.4.43-google-reviews-1`; Stripe readiness `6.4.44-stripe-live-readiness-1`; Payment Receipt Tracking `6.4.45-payment-receipts-1`.
- Supabase production `qjigldxjcpnrlyxgmlqq`.
- Vercel team is on Pro. Production deployment `dpl_3M7PRirsVVwfFgTkDxqGFs5qnUNH` is READY and aliased to `namdar.co.uk`; health HTTP 200 / `ok:true` at `2026-09-25T14:01:35.488Z`.
- Hourly booking-notification cron (`7 * * * *`) is restored.
- Window Cleaning only live.
- Privileged Staff/Admin requires CAPTCHA + AAL2/TOTP MFA.
- Customer Stripe is ACTIVE for new Window Cleaning bookings: revision 1, required 20% deposit, full upfront payment allowed, remaining balance due at completion.
- Ask Namdar provider AI remains disabled.
- Google Business review URL remains unconfigured/off.

## Stripe live readiness — LIVE
PR #100 / Admin extension `6.4.44-stripe-live-readiness-1` remains live. Production provider readiness requires recognised LIVE Stripe credentials plus configured webhook; TEST credentials remain preview/sandbox-only and cannot activate production payments.

Stripe account `acct_1UFAd1Cu9tojH31y` is live and fully onboarded: charges/payouts enabled, details submitted, verification complete, card payments and transfers active. Live production webhook `https://namdar.co.uk/api/stripe-webhook` is enabled and production runtime has the live Stripe secret plus webhook secret. Customer payments are active under payment-policy revision 1; the first genuine live payment remains the end-to-end checkout/webhook/receipt validation.

## Payment Receipt Tracking — LIVE
PR #102 / customer+Admin asset `6.4.45-payment-receipts-1`.

Live improvements:
- stable Namdar receipt number for every payment/refund, derived deterministically from immutable payment UUID (`RCP-XXXXXXXX-XXXXXXXX`);
- Stripe payment/refund emails include receipt number, invoice, amount, date, payment type/method and current invoice balance;
- manually recorded non-Stripe payments/refunds use the same receipt-number/email standard;
- billing emails remain archived in the customer's Namdar messages;
- My Namdar Billing shows the receipt number beside every transaction and offers authenticated receipt-PDF downloads;
- receipt PDFs and filenames use the same receipt number and invoice PDFs show receipt references in payment history;
- Admin payment transaction rows display the receipt number and Payments search supports `RCP-...` lookup;
- manual payment/refund audit records include the receipt number;
- Stripe provider IDs remain separate internal reconciliation evidence and customer surfaces still exclude processor fee/net data;
- no database migration or payment-row rewrite was needed;
- duplicate Stripe webhook deliveries remain idempotent and do not create duplicate payment rows/receipt emails.

Release evidence:
- exact tested head `e3c4e3147716d9697b2692aafe89a73454694cee`;
- Stripe live-readiness check `35264280479` SUCCESS;
- full/handoff JavaScript check `35264280446` SUCCESS;
- Google Review compatibility `35264280451` SUCCESS;
- Staff v3 compatibility `35264280558` SUCCESS;
- Post-job compatibility `35264280869` SUCCESS;
- exact-head preview `dpl_BNvoECAundwwbcB95Rh79nKKJyEV` READY / clean;
- merge `95cda91adb2fe7276f49a73d8626f97d87c2521e`;
- production `dpl_HmwxY6oHCiCX8s14xrtHCK6CVpHz` READY / `namdar.co.uk` alias;
- health HTTP 200;
- live Account and Admin loaders pin `6.4.45-payment-receipts-1`;
- live receipt assets return HTTP 200;
- production 5xx scan found no 5xx logs;
- Supabase readback after release: 4 payment records, zero payment settings rows and zero active payment policies;
- the payment-record count remained 4 before and after deployment, so release verification created no synthetic transactions.

## Booking/payment launch policy — LIVE
- Manual booking confirmation.
- Monday–Saturday; Sunday closed.
- 08:00–11:00, 11:00–14:00, 14:00–17:00.
- Maximum 3 jobs/day, 24-hour notice, 21-day horizon, postcode-area route density enabled.
- New bookings require 20% deposit; customers may pay 100% upfront; balance due at completion.

## Admin inbox workflow — LIVE
- Existing PR #104 preserves the current folder on Close/Reopen.
- Live `6.4.48-inbox-workflow-polish-fix-1` adds next-conversation flow, bulk selection/actions, and customer context/profile shortcuts.
- Bulk Close deliberately skips Closed/Spam rows.
- NodeList iteration hotfix corrects the bulk-row selector so selection mode does not throw during initialization.

## Professional Page Analytics — LIVE
PR #107 / `6.4.49-page-analytics-1`.
- Asset `6.4.49-page-analytics-1`.
- Adds professional Website Analytics inside Reporting: page views, period change, average/day, search/direct traffic shares, views→quotes, views→bookings, traffic trend, landing pages and referrers.
- Uses existing first-party page-view data only; no visitor fingerprinting, device ID or third-party tracker added.
- UI explains that page views are not unique visitors and business ratios are based on page loads rather than person-level attribution.

## Analytics v2 — LIVE
- Live Admin analytics asset `6.4.51-analytics-v2-revenue-fix-1`; browser tracker remains `6.4.50-analytics-v2-1`; migration `20260924234226_analytics_v2_session_funnel` is applied in production and committed.
- Adds browser sessions, quote/booking/payment funnel, acquisition sources, UTM campaigns, source-attributed revenue and contact engagement to Reporting.
- Preview hosts are ignored.
- No fingerprinting/persistent analytics ID: sessionStorage only. Essential only deletes/disables the current v2 analytics session; UTM campaign/advertising measurement requires Allow marketing.
- Published Cookie Policy v3 now describes the statistical analytics objection/deletion and marketing-only campaign attribution.
- Historical page views before v2 remain in totals but have no session/campaign attribution.
- PR #109 launched Analytics v2; PR #110 is live and separates total, attributed and unattributed payment revenue so only v2-linked payments appear as attributed.

## Smart receipt Vercel PDF fix — CANDIDATE
- Target `6.4.52-receipt-unicode-currency-1`.
- Real Vercel invoice reproduced the PostgreSQL Unicode error because PDF text includes hidden NUL characters.
- Server sanitization, same-file retry, Vercel→Software recognition, month-first date parsing, and foreign-currency GBP safety are implemented.
- Existing Vercel receipt remains unattached and status `error` until the owner retries it after release.

## Smart receipt flattened-PDF fix — LIVE
- Live `6.4.53-receipt-pdf-layout-1`.
- Preserves PDF line endings and hardens supplier/date/total/VAT parsing when PDF.js flattens a page.
- Exact Vercel flat-text regression passes with supplier Vercel Inc., date 2026-09-24, USD 24.00 total and USD 4.00 VAT.

## Smart receipt draft re-read — CANDIDATE
- Target `6.4.54-receipt-reread-draft-1`.
- Same-file re-read is allowed for unattached error/review drafts; attached receipts remain protected.

## Smart receipt form persistence — LIVE
- Live `6.4.55-receipt-form-persistence-1`.
- Active receipt values survive Business Finance re-renders.
- Spaced PDF invoice numbers normalize correctly.
- Current Vercel draft was corrected while still unattached; no expense ledger entry was created automatically.

## Smart receipt manual-edit persistence — CANDIDATE
- Target `6.4.56-receipt-manual-edits-1`.
- Manual reviewer edits now survive Finance-panel rerenders and override re-applied receipt suggestions.
- Foreign-currency GBP amount remains manual, but once entered it is no longer wiped.

## Analytics v2 loading lifecycle — CANDIDATE
- Target `6.4.57-analytics-load-lifecycle-1`.
- Fixes blank/stuck Analytics v2 “Loading…” state while the backend is healthy.
- Explicit reload hooks: secure-session boot, Reporting tab, range changes and Refresh.
- Adds timeout/retry/error UI instead of indefinite blank panels.

## Receipt expense source constraint — PRODUCTION FIX APPLIED
- Migration `20260925122723_allow_receipt_expense_source` is applied in production.
- Receipt-created ledger entries may now use `source='receipt'`; manual/import/job-cost sources remain valid.
- Fixes Add expense failure on reviewed Smart Receipts without weakening review or attachment safeguards.

## Automatic foreign-currency expenses — LIVE / ECB VERIFIED
- Base `6.4.58-expense-fx-1`; ECB hardening live `6.4.62-ecb-save-refresh-1`; migration `20260925125132_foreign_currency_expense_audit` is applied in production.
- Manual and Smart Receipt expenses support automatic historical FX → GBP conversion.
- Original currency/amount and reference rate/date/provider are preserved for audit.
- Reviewer-entered actual GBP charge overrides the reference conversion without losing the FX trail.
- Automatic reference metadata is re-verified server-side against the ECB provider at save time; browser FX metadata is not trusted.
- Save-time freshness: automatic GBP values are recalculated from the newly verified ECB rate when the expense is saved; reviewer-entered actual GBP charges are preserved as overrides.
- Staff-only FX lookup is pinned to the ECB provider through Frankfurter; no blended-rate fallback is used for automatic accounting references.

## Smart Receipt extraction + Finance draft stability — CANDIDATE
- Target `6.4.59-finance-receipt-stability-1`.
- Fixes Amazon/Equipmart invoice extraction: seller, invoice date, invoice number, VAT and purchased-item description.
- PDF text extraction is row-aware for multi-column/table invoices.
- Routine auth token refreshes no longer redraw the Finance form; legitimate reloads preserve the active draft and cursor.
- Paid invoices with no explicit payment date show a confirmation warning.
- Review drafts include Re-read so stored receipt text can be reparsed after parser improvements without another file upload; attached expense receipts are immutable to this action.

## Reporting hub + focused report pages — LIVE
- Live `6.4.60-report-hub-1`.
- Reporting now opens a report-centre hub instead of exposing every section in one long page.
- Nine focused routes: overview, revenue/payments, quotes/conversion, services, staff, feedback, website analytics, Window Cleaning performance and Business Finance.
- Each report has a stable `?tab=reports&report=...` URL and browser Back support.
- Existing reporting calculations and live panels are reused, not duplicated.
- Shared period/refresh/export controls are shown only where relevant.

## Window Cleaning SEO foundation — LIVE
- SEO is now aligned to the live service catalog: Window Cleaning only.
- Homepage, live service page and London/South London/Lewisham landing pages target Window Cleaning search intent with unique metadata and structured data.
- Planned services are statically noindex,follow until launch and stay out of the live-service sitemap.
- Local landing pages no longer tell crawlers that future services are currently available.
- Sitemap includes lastmod signals for the SEO pages changed on 2026-09-25.
- Regression test: scripts/seo-foundation.test.mjs.
- Next measurement layer: connect Google Search Console and inspect indexing, queries, impressions, CTR and positions; configure the genuine Google Business Profile separately.
- PR #127 is live on production deployment dpl_C3gf98ZruxSBfckd9uSiuEmz1xMJ; health HTTP 200 / ok:true at 2026-09-25T14:50:21.502Z.
- Window Cleaning sitemap lastmod is pinned to 2026-09-25 to reflect the actual public SEO page update.

- PR #130 is LIVE on production deployment `dpl_CEjJJTQVDgkfCw53YvwHBdaeeYYV`; production health HTTP 200 / `ok:true` at `2026-09-25T17:55:13.522Z`.
- Search Console integration is authorised, but Google currently has no `namdar.co.uk` property for the connected account; first-property add/verification remains the only blocker to URL Inspection and query/indexing reporting.
- Real service-area SEO: homepage/service/London/South London copy and `areaServed` schema now reflect the production borough set Lewisham, Southwark, Lambeth, Wandsworth and Greenwich; exact property coverage is still determined by the live postcode checker.
- Rendered-home SEO invariant keeps initial and JavaScript-rendered title/description/hero aligned to South London/Lewisham Window Cleaning, while future-service cards/radios/3D content start hidden until catalog status permits them.

## Portfolio SEO fail-closed — LIVE
- Current production database has 0 published portfolio jobs.
- Candidate release makes `/work` dynamic: 404 + noindex while no genuine published live-service work exists; server-rendered/indexable when qualifying work is later published.
- Empty `/work` is conditionally removed from the sitemap and hidden from public navigation.
- Individual case-study URLs enter the sitemap only when their published job belongs to a currently live service.
- Legacy `work.html` is removed so Vercel cannot serve the static clean URL ahead of the dynamic `/work` gate.
- No synthetic case studies or reviews are created for SEO.
- Production proof: PR #133 / main `5e824312a5768cfa41ce992da6f0c148df6055f8` is live on `dpl_9X7fXDm4cYfvR9BKgkk74QV1ihr8`; `/work` is 404 + noindex with zero published jobs, sitemap omits it, portfolio nav is hidden, and health is green.

## Google Review System — LIVE
PR #98 / `6.4.43-google-reviews-1` remains live. Owner-controlled fair review requests, one-time reminders, tracked clicks and 30/90/365-day reporting are available, but the official Google Business review URL remains intentionally unconfigured/off.

## Post-job Customer Experience — LIVE
PR #96 / `6.4.42-post-job-experience-1`: completed-job panel, private feedback, fair Google review access when configured, safe repeat quoting and recurring next-clean guidance remain live.

## Staff operations v3 — LIVE
PR #94 remains the field-operations layer: six-step Window Cleaning quality checklist, server completion gate, incidents/evidence, Admin incident handling, On My Way ETA and customer ETA.

## Owner & custom access roles — LIVE
Protected Owner/Administrator system roles and reusable custom Staff roles remain live with hierarchy-sensitive safeguards.

## Other live systems
- Responsive Admin booking editor.
- Secure Admin logo upload and Website/Legal crash fix.
- Flexible payment/deposit policy engine with live Stripe active under the current 20% deposit launch policy.
- Fair cancellation terms and Privacy Centre.
- Security Hardening and Staff auth recovery.
- Business Finance and Smart Receipts.
- Newsletter Centre and guided Ask Namdar.

## Open roadmap
- First genuine payment should be used for authenticated end-to-end receipt/email/My Namdar confirmation; do not manufacture a production transaction just to test.
- Configure the real Google Business Profile review-request URL later.
- Real-world Google review/post-job smoke with a genuine completed job.
- Authenticated Staff v3 mobile smoke test.
- Window real-job pricing calibration after genuine completed jobs accumulate.
- ICO data-protection fee self-assessment.
- Supabase Leaked Password Protection.
- SMS/legal checks.
- Node `url.parse()` deprecation cleanup.
- Address-data pilot remains parked.
\n## 8 Oct 2026 — Google Business Profile contact/hours sync — CANDIDATE\n- Google Business Profile is now created for `Namdar` as a service-area `Window cleaning service` covering Lewisham, Southwark, Lambeth, Wandsworth and Greenwich.\n- Public GBP phone confirmed as `07946 679694` (`+44 7946 679694` in machine-readable international form).\n- GBP opening hours confirmed: Monday–Thursday `08:00–17:00`, Friday `09:00–15:00`, Saturday–Sunday closed.\n- Candidate website changes publish the same phone and hours in the homepage contact section, keep the exact five-borough coverage text, and add the international phone plus `ContactPoint.hoursAvailable` to the existing `Organization` structured data on the homepage, live service page and all seven indexable area pages.\n- Namdar remains a service-area business with no public customer-facing address. Do not add a fake or private address to markup just to satisfy LocalBusiness rich-result fields.\n- Production `site_settings.contact` should store the same public phone and business-hours text after the code release so runtime settings and static crawlable HTML remain aligned.\n