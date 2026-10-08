# Namdar AI fast resume

## 8 Oct 2026 — Free organic growth: borough conversion SEO — LIVE
- User chose the **free traffic** path rather than paid ads. Goal is qualified local quote requests/jobs, not raw page-view volume.
- Strengthened the five live borough landing pages: Lewisham, Southwark, Lambeth, Wandsworth and Greenwich.
- Each page now includes a natural high-intent `window cleaner in <borough>` section, at least four genuinely relevant borough-specific customer questions, and a strong direct quote CTA after the answers.
- Meta descriptions now reflect `window cleaner` search intent while preserving the truthful exterior Window Cleaning offer, postcode check and reviewed final quote model.
- No fake reviews, fake job counts, invented prices, unsupported availability promises or thin doorway-page duplication were added. FAQ content is visible HTML only; no `FAQPage` rich-result markup is used.
- Existing homepage/service internal links to all five borough pages remain in place. Next free-growth leverage after this release is genuine completed-work pages + real customer reviews/photos, followed later by the deferred UK citation work.
- PR #203 merged as `83c3d8b5985cba29d33b952cafbae4c95354a90e`. Production deployment `dpl_3NsEApzT4g6bX8p5h5JTeWkdNok4` is READY on `namdar.co.uk`. Live verification confirmed the new Lewisham high-intent section, FAQ block and quote CTA; the preview verified the same structure across all five borough pages before merge.
- After production release, IndexNow was notified for the five materially updated borough URLs (Lewisham, Southwark, Lambeth, Wandsworth, Greenwich) and returned HTTP 200. The temporary preview-only refresh endpoint was removed immediately afterward and was never merged to production.

## Future SEO follow-up — local citations + Apple Business
- Apple Business setup is intentionally paused for now. Domain verification was started, but the full managed-organisation flow requires a second verification method/document that Namdar does not currently have. Do not invent or upload unsupported documents.
- Future local citation work: create consistent Namdar listings on reputable UK directories, starting with Cylex UK and FreeIndex, using the same business name, phone, website, hours and service areas as Google/Bing. Preserve the service-area/no-public-address model wherever the directory supports hidden addresses.
- Defer Yell until its address-publication behaviour is verified for service-area businesses.
- This work is intentionally deferred; Google Business Profile, Google Search Console, Bing Places, Bing Webmaster Tools, sitemap and IndexNow are already the higher-priority completed foundations.

## 8 Oct 2026 — IndexNow integration — LIVE
- Bing Webmaster Tools is verified for `https://namdar.co.uk/` via the root `BingSiteAuth.xml` file.
- IndexNow owner key supplied by Bing: `9b012fe757f449ddaf8832421f580676`; candidate root file: `https://namdar.co.uk/9b012fe757f449ddaf8832421f580676.txt`. Keep this file deployed while IndexNow is in use.
- Added `lib/indexnow.js`, which submits only HTTPS URLs on the exact `namdar.co.uk` host to `https://api.indexnow.org/indexnow`, using the root key location. HTTP 200 and first-request HTTP 202 are treated as accepted responses.
- Public portfolio publication now notifies IndexNow for `/work` and `/work/{id}`. Deleting a previously published case study also notifies IndexNow for those URLs. Draft-only changes do not notify search engines.
- Admin portfolio deletion now routes through the protected server API instead of deleting the database row directly, so delete notifications and audit logging cannot be bypassed by the normal Admin flow.
- IndexNow should be used for URLs that are actually added, updated or deleted; do not repeatedly submit unchanged pages.
- PR #200 merged as `48c929c371696ff800a613c01ca254bdf3572712`. Production deployment `dpl_D4VsdZgcdqGd4tDizfd5ixYu67Wn` is READY on `namdar.co.uk`; the root IndexNow key URL returns HTTP 200 with the exact key.
- Initial IndexNow bootstrap submitted 9 public URLs changed on 8 Oct 2026: homepage, Window Cleaning service page, London/South London and the five borough pages. IndexNow returned HTTP 202 (accepted; first-request key validation pending), which is a valid successful receipt state for a first submission.
- The temporary preview-only bootstrap trigger was removed immediately after the accepted submission and was never merged to production.

## 8 Oct 2026 — Bing Webmaster Tools verification — LIVE
- Bing Places for Business has been created for Namdar, synced from Google, verified, and is pending publication.
- Bing Webmaster Tools manual verification is using the XML-file method.
- Added root verification file `BingSiteAuth.xml` with the exact token supplied by Bing. Keep this file deployed after verification so ownership remains verifiable.
- Target verification URL: `https://namdar.co.uk/BingSiteAuth.xml`.
- PR #198 merged as `85744353623d1da7037c9e83e089ddceadd4fe1c`. Production deployment `dpl_3BwSD9tgNNj14RMzzhN3tajnxqPs` is READY. Live verification confirmed `https://namdar.co.uk/BingSiteAuth.xml` returns HTTP 200 with the exact Bing token.

## 8 Oct 2026 — Google Business Profile review link — LIVE
- Official Google Business Profile **Ask for reviews** URL configured in production: `https://g.page/r/CSGKgJbnDkHYEBM/review`.
- `site_settings.reviews.review_requests_enabled=true`, so future completed-job follow-up emails can include the same optional honest Google-review link for every customer regardless of private rating.
- Automatic Google-review reminders remain OFF (`review_reminders_enabled=false`; stored delay 7 days) until deliberately enabled later.
- Safety verification before enabling: the only completed booking is the explicit TEST JOB; its follow-up had already been sent on 25 Sep 2026 before the review link existed, and there were 0 pending/sending `review_reminder` notifications, so enabling the URL did not trigger a retroactive review email.

## 8 Oct 2026 — Real completed-work portfolio + review flow — LIVE
- The existing public `/work` and `/work/{id}` pages already fail closed when there is no published genuine work. Production currently has **0 portfolio jobs** and the only completed booking is explicitly a **TEST JOB**, so nothing fake is being published.
- Added a verified portfolio workflow: Admin → Offers & jobs now sources case studies only from eligible completed Window Cleaning bookings, excludes obvious test/demo bookings, requires a borough-only public location, blocks customer name/address/email/phone/postcode leakage, validates up to 8 real work photos, and requires publication permission before an item can go live.
- Added `portfolio_jobs.source_booking_id`, `publication_consent_at`, `publication_consent_by`, and `published_at`. Database constraint `portfolio_jobs_publish_integrity_chk` prevents a published case study unless it has a source booking, recorded permission, and at least one public image. A partial unique index prevents duplicate case studies from the same booking.
- Private quote photos are never copied into the public portfolio automatically. Staff must deliberately upload the public work photos they are permitted to publish.
- The Google review system was already non-gated: the optional public review choice is available regardless of the private 1–5 rating, while 1–3 star feedback still routes privately to support. Review requests remain disabled until the official Google Business Profile **Ask for reviews** URL is pasted into Admin → Bookings → Google reviews & post-job feedback.
- Admin review guidance now explains how to copy the official Google review link. Do not invent or derive a review URL from the Business Profile ID.
- PR #195 merged as `aede0bb7480b907ead7bfdef0a807d31439b2278`. Production deployment `dpl_92XQGfLCkzikb4AStgrG8cSiYpdf` is READY on `namdar.co.uk`. Live verification confirmed the new Admin real-work publishing controls, while `/work` correctly remains HTTP 404 + `noindex,follow` because there are still 0 genuine portfolio jobs. Production DB verification: 0 total, 0 linked and 0 published portfolio jobs.

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

### Admin Stripe refund — LIVE
- Admin Payments keeps manual refunds for cash/bank/card, and now sends Stripe refunds back through Stripe instead of only writing a local refund record.
- Refunds are tied to the original PaymentIntent, enforce remaining refundable amount, use an idempotency key, block test/live mode mismatches, and require an admin confirmation click.
- Successful Stripe refunds reuse the existing verified refund-processing path for Namdar receipt/audit/customer email state; pending Stripe refunds wait for the webhook confirmation.
- No database migration and no new environment variable.
- PR #179 merged at `1e852096dc0e148b813cdc5fb0e6533b2595b23d`; production deployment `dpl_A6Y7THjZ226yFG2fHY12wHgiFz33` is READY and aliased to `namdar.co.uk`.
- `AI handoff and JavaScript checks` passed, including `scripts/stripe-payments.test.mjs` and `scripts/payment-policy-engine.test.mjs`; Google Review and post-job compatibility checks also passed.
- Live verification: `/admin` serves `admin.js?v=6.4.95-stripe-refund-1`; the loaded admin runtime contains `Refund via Stripe`, the original-payment confirmation, Stripe refund target selection and `providerPaymentId`; `/api/health` returned HTTP 200 with database, Stripe, Stripe webhook and email healthy.

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


Last verified: 2026-09-25 UTC

Read this first. Use `docs/AI_HANDOFF.md` for implementation detail and `docs/PROJECT_STATUS.md` for roadmap/status.

## Production source of truth
- Repo `pchroonic/pchroonic`, default `main`.
- Current production main merge: `a3e65a0bb13982841b5ece319fbc859d27ed90ae` (PR #125 ECB save-refresh release). Payment Receipt Tracking PR #102 remains live beneath it.
- Customer base loader remains `6.4.35-payment-policy-engine-1`; post-job extension `6.4.42-post-job-experience-1`; Staff operations/ETA `6.4.41-staff-operations-v3-1`.
- Admin base remains `6.4.37-admin-website-crash-fix-1`; Google Review System `6.4.43-google-reviews-1`; Stripe readiness `6.4.44-stripe-live-readiness-1`; payment receipts `6.4.45-payment-receipts-1`.
- Supabase production project: `qjigldxjcpnrlyxgmlqq`.
- Production health remains HTTP 200 / `ok:true`.
- Window Cleaning is the only live/quotable/bookable service.
- Customer Stripe is ACTIVE for new Window Cleaning bookings: payment-policy revision 1 requires a 20% deposit, allows full upfront payment, and makes the remaining balance due at job completion.
- Ask Namdar provider AI remains OFF.
- Privileged Staff/Admin access requires CAPTCHA + AAL2/TOTP MFA.
- No real Google Business review URL is configured yet, so public Google review requests/reminders remain off.

## Stripe live readiness — LIVE / CUSTOMER PAYMENTS ACTIVE
PR #100 remains live below this release. Production payment provider readiness requires a recognised LIVE Stripe secret plus a configured webhook.

Verified 2026-09-22:
- Stripe account `acct_1UFAd1Cu9tojH31y` is live and fully onboarded;
- `charges_enabled=true`;
- `payouts_enabled=true`;
- `details_submitted=true`;
- individual verification status is `verified`;
- no currently-due, past-due or eventually-due account requirements;
- card payments and transfers capabilities are active;
- a live GBP payout bank account is connected;
- live production webhook endpoint `https://namdar.co.uk/api/stripe-webhook` exists and is enabled;
- webhook listens to exactly: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `refund.created`, `refund.updated`, `charge.refunded`;
- owner updated the Vercel Production `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` values on 2026-09-22;
- Vercel team is now on Pro; production deployment `dpl_AZJPSx4HfaAXcb8GuJNjYqKwr82Y` is READY and aliased to `namdar.co.uk`;
- production `/api/health` returned HTTP 200 / `ok:true` at `2026-09-24T22:49:08.728Z` with database, Stripe secret/webhook, email, reminders and followups all present;
- hourly booking-notification cron (`7 * * * *`) is restored on Vercel Pro.

Live provider deployment is verified. Production payment-policy revision 1 is active for new Window Cleaning bookings: `deposit_required`, flat 20%, minimum deposit £0.50, full payment allowed, balance due at completion. Existing bookings keep their locked/legacy terms.

## Booking operations — LIVE LAUNCH POLICY
- Manual booking confirmation.
- Monday–Saturday operating days; Sunday closed.
- Customer windows: 08:00–11:00, 11:00–14:00, 14:00–17:00.
- Maximum 3 jobs/day, minimum 24 hours notice, 21-day booking horizon.
- Route-density grouping remains enabled by postcode area.

## Payment Receipt Tracking — LIVE
Product PR #102: `Add traceable payment receipt references`.
Exact tested head: `e3c4e3147716d9697b2692aafe89a73454694cee`.
Merge/main: `95cda91adb2fe7276f49a73d8626f97d87c2521e`.

Live behavior:
- every payment/refund has a stable Namdar receipt number derived from immutable `payment_records.id`, format `RCP-XXXXXXXX-XXXXXXXX`;
- the same receipt number appears in Stripe/manual payment or refund emails, My Namdar Billing, receipt PDFs, Admin payment tracking and manual-payment audit history;
- customer billing email includes invoice, amount, payment type/method, payment date, current paid/outstanding balance and a My Namdar Billing link;
- billing email is archived in the customer's Namdar message history;
- My Namdar shows receipt number beside each transaction and offers an authenticated receipt PDF download;
- receipt PDF and filename use the same receipt number and tell the customer to quote it for support;
- Admin transaction rows show the receipt number and Payments search supports `RCP-...` lookup;
- Stripe provider references/payment IDs remain internal reconciliation evidence and processor fee/net fields remain excluded from customer surfaces;
- duplicate Stripe webhook events remain provider-reference idempotent, preventing duplicate payment rows/receipt emails;
- no database migration was needed and existing payment rows were not rewritten.

## Existing live layers
Google Review System PR #98 remains live, but its official Google review URL is intentionally unconfigured/off. Post-job Customer Experience PR #96 remains live. Staff operations v3 PR #94 remains live.

## Admin inbox workflow — LIVE
- Existing PR #104 behavior remains: Close/Reopen preserves the current folder.
- Live asset `6.4.48-inbox-workflow-polish-fix-1` adds automatic next-conversation opening after Close/Reopen, bulk selection/actions, and registered-customer context with account shortcut.
- Bulk Close excludes conversations already Closed or Spam so quarantine state is not changed accidentally.
- NodeList iteration hotfix replaces the incorrect single-element selector used by bulk-row enhancement so selection mode can initialize safely.

## Professional Page Analytics — LIVE
- Admin analytics asset: `6.4.49-page-analytics-1`.
- New privileged endpoint `/api/admin-page-analytics` uses existing privacy-friendly `page_views` data only: path, referrer host and timestamp.
- Reporting now adds selected-period page views, previous-period comparison, average/day, Google/Bing share, direct/unknown share, views-to-quotes, views-to-bookings, traffic trend, landing pages and top referrers.
- No persistent visitor/device identifier, fingerprint or third-party analytics tracker is added; the UI explicitly states that views are page loads, not unique people.
- Production deployment `dpl_BcXGivSXztjCAEg4WZyiZr1Zb1XH` is READY on `namdar.co.uk`; the analytics endpoint rejects unauthenticated access with HTTP 401.

## Analytics v2 — LIVE
- Asset target: `6.4.50-analytics-v2-1`.
- Production migration `20260924234226_analytics_v2_session_funnel` is applied and mirrored in the repo.
- Existing first-party `page_views` now supports temporary session ID plus UTM source/medium/campaign; existing rows remain valid with null v2 fields.
- Existing `conversion_events` is extended from postcode-only into the Window Cleaning funnel: service interest, quote start, postcode coverage, quote submit/continue/accept/decline, booking start/submit, checkout start, payment confirmation and contact actions.
- Homepage quote creation now sends the temporary analytics session into the existing `quote_funnel_links`, enabling quote→booking→payment and net-revenue attribution without a device fingerprint.
- Admin Reporting v2 surfaces sessions, views/session, traffic trend, full conversion funnel, acquisition sources, UTM campaigns, engagement, landing pages, raw referrers and source-attributed revenue.
- Vercel preview/non-production hosts are ignored by tracking endpoints.
- Privacy design: session ID is stored in `sessionStorage`, not a persistent analytics cookie/device identifier; Essential only is a free objection that deletes the current session's raw page views/events/quote link and disables future v2 tracking; UTM campaign/advertising fields are stored only after Allow marketing.
- Published Cookie Policy v3 now describes the statistical-purpose analytics session, Essential-only objection/deletion, and marketing-only campaign measurement.
- Older page-view rows remain valid but have no v2 session/campaign fields; session, funnel and attribution metrics become meaningful from the v2 release onward.
- PR #109 launched Analytics v2; PR #110 corrected attributed-revenue reporting. Production deployment `dpl_5ejdx52DnrLFJzctMhpJe88iGc7q` is READY on `namdar.co.uk`.

## Smart receipt Vercel PDF fix — CANDIDATE
- Target Admin asset: `6.4.52-receipt-unicode-currency-1`.
- Reproduced with the real Vercel invoice `Invoice-YYVCYYP4-0004.pdf`: extracted PDF text contains seven NUL characters, which PostgreSQL rejects as an unsupported Unicode escape sequence.
- New `lib/db-safe-text.js` repairs NUL/control/lone-surrogate text before receipt intelligence or database storage. Between alphanumeric characters, a NUL is reconstructed as a hyphen where practical.
- Failed receipt rows can be retried with the same selected file; the private storage object is safely upserted because Finance staff already have INSERT/SELECT/UPDATE storage policies.
- Vercel/hosting/domain suppliers are recognised as Software.
- Month-first dates such as `September 24, 2026` are parsed.
- Foreign-currency invoices are never silently treated as GBP. The source currency/amount/VAT are shown, while GBP amount/VAT are left for the reviewer to enter from the actual card/bank charge.
- Production receipt record for `Invoice-YYVCYYP4-0004.pdf` is currently status `error`, unattached to any expense, ready for retry after release.

## Smart receipt flattened-PDF fix — LIVE
- Live Admin asset: `6.4.53-receipt-pdf-layout-1`.
- Real production retry proved PDF.js can flatten the Vercel invoice page into one long text line, which caused supplier/date/VAT misreads even though the Unicode crash was fixed.
- Browser PDF extraction now preserves PDF.js `hasEOL` line endings when available.
- Server parser is hardened for flattened PDFs: legal-entity supplier fallback, explicit labelled invoice-date priority, specific amount-due parsing and Standard Rate VAT parsing.
- Exact flattened Vercel regression resolves to Vercel Inc., 2026-09-24, USD 24.00 total and USD 4.00 VAT.
- Production deployment `dpl_CQFiX2Dft2nc2KYYt9d6wysfdMXc` is READY and aliased to `namdar.co.uk`; live health remains HTTP 200 / `ok:true`.

## Smart receipt draft re-read — CANDIDATE
- Target asset: `6.4.54-receipt-reread-draft-1`.
- Unattached receipt rows in either `error` or `review` state can be safely re-read with the same file, reusing the existing private storage object instead of being blocked as a duplicate.
- Attached receipts remain immutable through this path.

## Smart receipt form persistence — LIVE
- Live asset: `6.4.55-receipt-form-persistence-1`.
- Active receipt suggestion is now kept in memory and automatically re-applied if the Business Finance expense form re-renders after authentication/report refresh activity.
- Spaced PDF invoice references such as `YYVCYYP4 0004` normalize to `YYVCYYP4-0004` without greedily capturing following labels.
- This prevents a successfully analysed receipt from visually reverting to today's date/default category/blank supplier before save.
- Production deployment `dpl_57PNhT8E2ZVtfwwuNKx7eDfnkvtU` is READY on `namdar.co.uk`; the current Vercel draft was corrected in-place while still unattached.

## Smart receipt manual-edit persistence — CANDIDATE
- Target asset: `6.4.56-receipt-manual-edits-1`.
- Root cause: receipt suggestion re-application correctly restored extracted fields after a Finance rerender, but for non-GBP receipts it also re-cleared the GBP amount field. Manual reviewer edits were not stored separately.
- Active receipt drafts now capture reviewer input/change values for date, category, description, supplier, GBP amount, business-use %, tax treatment, payment method, reference, GBP VAT and notes.
- After any Finance form rerender, extracted receipt values are restored first, then the reviewer’s manual overrides are reapplied.
- This keeps the deliberate “do not auto-convert USD to GBP” safeguard while ensuring an entered GBP amount is not wiped.

## Analytics v2 loading lifecycle — CANDIDATE
- Target Admin analytics asset: `6.4.57-analytics-load-lifecycle-1`.
- Observed production symptom: Analytics v2 panel shell rendered with “Loading…” while all cards remained blank, even though `/api/admin-page-analytics` returned HTTP 200.
- The client now loads explicitly after secure session availability and on Reporting tab open, reporting-range change, and Refresh click.
- A 15-second timeout and visible “Try again” state replace indefinite blank loading.
- Loading placeholders make it clear when traffic/funnel data is still being fetched.

## Receipt expense source constraint — PRODUCTION FIX APPLIED
- Production migration `20260925122723_allow_receipt_expense_source` is applied.
- Root cause: Smart Receipt correctly saved reviewed receipt expenses with `source='receipt'`, while `business_expenses_source_check` still allowed only `manual`, `import`, and `job_cost_sync`.
- The constraint now allows `receipt` as a first-class expense source, preserving accurate audit/source classification.
- No expense was auto-created during the fix; the current Vercel receipt remains review-first until the owner clicks Add expense.

## Automatic foreign-currency expenses — LIVE / ECB VERIFIED
- Existing FX base: `6.4.58-expense-fx-1`; live hardening: `6.4.62-ecb-save-refresh-1`.
- Production migration `20260925125132_foreign_currency_expense_audit` is applied and mirrored in the repo.
- Business expenses can retain original currency/amount/VAT plus FX rate, rate date/provider, reference GBP value and whether the final GBP amount was the automatic reference or a reviewer override.
- Staff expense form supports GBP, USD, EUR, CAD, AUD, NZD, CHF and JPY. Entering a foreign amount/date triggers historical GBP conversion through the staff-only `/api/admin-fx-rate` endpoint.
- FX source is now pinned to the European Central Bank reference-rate provider through Frankfurter. No blended-rate fallback is permitted for automatic accounting references. The service fetches with no-store/no-cache semantics and can use an earlier ECB working-day rate for weekends, TARGET closing days, or before the current working day's ECB publication.
- Smart Receipt foreign invoices are enriched server-side with the historical GBP reference amount; the reviewer can replace it with the actual card/bank GBP charge without losing the original rate audit trail.
- Expense creation/update now re-verifies the ECB reference on the server before saving FX metadata; automatic conversions are not persisted if that verification fails.
- Save-time freshness invariant: if the visible GBP amount was still an automatic reference, the server replaces it with the newest verified ECB amount at save time. If staff manually entered the actual bank/card GBP amount, that amount is preserved and recorded as an override.
- Production deployment `dpl_3M7PRirsVVwfFgTkDxqGFs5qnUNH` is READY on `namdar.co.uk`; live health HTTP 200 / `ok:true` at `2026-09-25T14:01:35.488Z`.
- Ledger rows show original foreign amount and whether GBP was an automatic reference conversion or actual/manual override.
- HMRC guidance permits reputable exchange-rate sources and commonly accepts the actual sterling amount shown by a bank/card provider; actual card/bank charge therefore takes priority when the reviewer supplies it.

## Smart Receipt extraction + Finance draft stability — CANDIDATE
- Target assets: `6.4.59-finance-receipt-stability-1`.
- Real Amazon/Equipmart VAT invoice regression added from the 20 Jul 2026 water-filter purchase.
- Receipt extraction now prioritises explicit/legal seller names, compound invoice-date labels, invoice-number labels, VAT-summary tables, and the purchased item description instead of layout/header fragments.
- Expected Amazon fields: Equipmart Ltd; invoice date 2026-07-20; invoice GB6001L14F5R3I; total GBP 24.95; VAT GBP 4.16; category equipment; product description from the invoice item.
- PDF.js embedded text is reconstructed by visual row coordinates before server analysis, reducing multi-column/table flattening errors.
- Finance no longer reloads on routine Supabase TOKEN_REFRESHED events. Any legitimate Finance reload captures and restores the active expense form values and cursor position.
- Paid invoices without an explicit payment date now warn staff to confirm Date paid against the actual bank/card transaction.
- Unattached review drafts now expose **Re-read**, which re-runs the current parser against the already-saved receipt text without requiring another upload. Attached accounting records are deliberately excluded from automatic re-reading.

## Reporting hub + focused report pages — LIVE
- Live Admin asset: `6.4.60-report-hub-1`.
- Reporting is no longer designed as one long stacked page. `/admin?tab=reports` is the report-centre home with nine focused report cards.
- Routed report URLs: `overview`, `revenue`, `quotes`, `services`, `staff`, `feedback`, `website`, `window`, and `finance` via `?tab=reports&report=<id>`.
- Existing report DOM/data is preserved and reorganised rather than duplicated: Overview KPIs; Revenue + payment methods; Quotes funnel; Service performance; Staff workload; Feedback; Analytics v2; Window Cleaning performance; Business Finance.
- Browser Back works between the report hub and individual report pages. Clicking Reporting in the sidebar returns to the hub.
- Period/Refresh/Export controls are contextual: Finance hides the period/export controls; Website and Window reports use the selected period without showing the generic CSV export.
- Dynamic Analytics/Window/Finance panels are adopted into dedicated report workspaces, and opening those routes dispatches `namdar:report-view` so the relevant module refreshes.
- Production deployment `dpl_DDxDa9B2DWqDbDjF6U8jw4Rg3w9z` is READY and `namdar.co.uk` serves the hub assets; live health HTTP 200 / `ok:true` at `2026-09-25T13:41:17.561Z`.

## Window Cleaning SEO foundation — LIVE
- SEO scope is intentionally aligned to the commercial truth: Window Cleaning is the only live/quotable/bookable service.
- Homepage title, description, hero H1 and JSON-LD now target Window Cleaning in South London/Lewisham instead of generic multi-service property care.
- Live service page targets Exterior Window Cleaning in London and includes Organization + Service + BreadcrumbList structured data plus strong internal links to London, South London and Lewisham.
- /areas/london, /areas/south-london, and /areas/lewisham are rewritten as unique Window Cleaning landing pages. They no longer statically advertise gutter/roof/jet-wash/handyman/3D as currently available.
- Planned service pages carry static noindex,follow in their source until deliberate service launch.
- Sitemap remains catalog-driven for live services only and now emits accurate lastmod for the pages changed in this SEO release.
- Regression coverage: scripts/seo-foundation.test.mjs.
- Google Search Console connection/URL Inspection remains an owner connection step; use real Search Console query/impression/indexing data after connection rather than guessing rankings.
- PR #127 is live on production deployment dpl_C3gf98ZruxSBfckd9uSiuEmz1xMJ; production health HTTP 200 / ok:true at 2026-09-25T14:50:21.502Z.
- Window Cleaning public page and homepage/local pages were updated on 2026-09-25; sitemap explicitly reports that date for the Window Cleaning page rather than the older service-catalog row date.

- PR #130 is LIVE on production deployment `dpl_CEjJJTQVDgkfCw53YvwHBdaeeYYV`; production health HTTP 200 / `ok:true` at `2026-09-25T17:55:13.522Z`.
- Google Search Console connector is authorised for the owner Google account, but Google Search Console currently has no `namdar.co.uk` property. Add and verify the first top-level property in Google Search Console before URL Inspection/search-performance tools can run.
- Live service-area SEO source of truth: production `service_areas` currently covers Lewisham, Southwark, Lambeth, Wandsworth and Greenwich. Public SEO now names those five boroughs in homepage/service/South London/London content and `areaServed` schema, while the postcode checker remains the final property-level coverage gate. Do not create thin borough/postcode doorway pages just for keywords.

- Rendered-home SEO invariant: conversion.js must preserve the same South London/Lewisham title, meta description and hero copy as the initial HTML. Future-service cards, quote radios, the 3D nav item and the 3D section start hidden and are only unhidden by the live service-catalog state.

## Portfolio SEO fail-closed — LIVE
- Public portfolio search visibility now follows genuine published work, not page existence.
- `/work` is routed through `api/public-work-page.js`. With no published jobs belonging to a currently live service it returns HTTP 404 plus `X-Robots-Tag: noindex, follow`; with genuine published live-service work it becomes a server-rendered, indexable Window Cleaning case-study page.
- `/api/sitemap` includes `/work` and individual `/work/:id` URLs only when published jobs belong to a live service. The current production state has zero published jobs, so `/work` should disappear from the sitemap after release.
- Homepage and indexable Window Cleaning/location pages keep “Our work” links hidden in raw HTML and only unhide them after `/api/public-data` returns real public jobs.
- The legacy static `work.html` file is removed so Vercel clean-URL filesystem routing cannot shadow the canonical dynamic `/work` handler.
- Regression coverage lives in `scripts/seo-foundation.test.mjs`.
- Production verified on deployment `dpl_9X7fXDm4cYfvR9BKgkk74QV1ihr8` (main `5e824312a5768cfa41ce992da6f0c148df6055f8`): `/work` HTTP 404 with HTML robots + `X-Robots-Tag: noindex, follow`; sitemap excludes `/work`; homepage/live service raw HTML keeps portfolio links hidden; `/api/health` HTTP 200 / `ok:true` at `2026-09-25T20:29:18.283Z`.

## Open items
- Use the first genuine payment for authenticated receipt/email/My Namdar verification; do not manufacture a production payment.
- Configure the real Google Business Profile review-request URL later.
- Real-world authenticated review/post-job smoke with the first genuine completed customer job.
- Authenticated Staff v3 mobile smoke test with a real assigned job.
- Window real-job pricing calibration after genuine completed jobs accumulate.
- ICO self-assessment, Supabase Leaked Password Protection, SMS/legal checks, Node `url.parse()` cleanup and the parked address-data pilot remain open.
\n## 8 Oct 2026 — Google Business Profile contact/hours sync — LIVE\n- Google Business Profile is now created for `Namdar` as a service-area `Window cleaning service` covering Lewisham, Southwark, Lambeth, Wandsworth and Greenwich.\n- Public GBP phone confirmed as `07946 679694` (`+44 7946 679694` in machine-readable international form).\n- GBP opening hours confirmed: Monday–Thursday `08:00–17:00`, Friday `09:00–15:00`, Saturday–Sunday closed.\n- Candidate website changes publish the same phone and hours in the homepage contact section, keep the exact five-borough coverage text, and add the international phone plus `ContactPoint.hoursAvailable` to the existing `Organization` structured data on the homepage, live service page and all seven indexable area pages.\n- Namdar remains a service-area business with no public customer-facing address. Do not add a fake or private address to markup just to satisfy LocalBusiness rich-result fields.\n- Production `site_settings.contact` now stores the same public phone, business-hours text and structured weekly opening-hours object, so runtime settings and static crawlable HTML are aligned.
- PR #193 merged as `1d874eab5a506170b541ebb9adfbd4fb428533da`. Production deployment `dpl_6psavVqQ5yBXRvsJxWzT7sTutuue` is READY on `namdar.co.uk`. Live verification confirmed the phone, hours, service areas and `+447946679694` Organization/ContactPoint markup.\n