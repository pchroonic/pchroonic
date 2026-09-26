# Namdar project status

## CURRENT CHECKPOINT — 26 Sep 2026

### Production
- GitHub main: `5c06312d3e4b6f5ec04d5c1a8207554e37f7239e` (PR #163).
- Latest production Vercel deployment is READY on `namdar.co.uk`.
- PR #162 browser GetAddress domain-token lookup is live.
- PR #163 admin-only GetAddress subscription/usage diagnostic is live.

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


## Compact My Namdar notifications — CANDIDATE
- Removes the large inline unread-notification card from My Namdar because the same unread item is already available from the top-right bell/popover.
- Keeps the bell unread badge, notification popover, filters, Notification Centre and quote journey/status messaging intact.
- Customer notification data, read/unread actions and polling are unchanged; only the duplicate page-level renderer is removed.
- Changes: `account.html`, `account-original.js`, and `scripts/notification-popover-ui.test.mjs`.
- No database migration or environment-variable change.
- Not deployed until this candidate is merged and production is verified.


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
