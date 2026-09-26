# Namdar AI handoff

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

Read `docs/AI_START.md` first. Use `docs/PROJECT_STATUS.md` for roadmap/status.

## Production baseline
- Repo `pchroonic/pchroonic`, default `main`.
- Current production main merge `a3e65a0bb13982841b5ece319fbc859d27ed90ae` from PR #125. PR #102 Payment Receipt Tracking remains live below it.
- Customer base loader `6.4.35-payment-policy-engine-1`; Post-job Customer Experience `6.4.42-post-job-experience-1`; Staff operations/ETA `6.4.41-staff-operations-v3-1`.
- Admin base `6.4.37-admin-website-crash-fix-1`; Google Reviews `6.4.43-google-reviews-1`; Stripe readiness `6.4.44-stripe-live-readiness-1`; payment receipts `6.4.45-payment-receipts-1`.
- Supabase production `qjigldxjcpnrlyxgmlqq`.
- Vercel project `prj_4fILo0pCaLGUSUIMWrBIVGzeWVDC`; team `team_8Az8WtWcnfwtYRdhR8vGqC3L`.
- Vercel team is on Pro. Production deployment `dpl_3M7PRirsVVwfFgTkDxqGFs5qnUNH` is READY on `namdar.co.uk`.
- Health HTTP 200 / `ok:true` at `2026-09-25T14:01:35.488Z`.
- Hourly booking-notification cron (`7 * * * *`) is restored.
- Window Cleaning only live. Provider AI OFF. Privileged access requires CAPTCHA + AAL2/TOTP.
- Customer Stripe is ACTIVE for new Window Cleaning bookings. Production `site_settings.payments` revision 1 is `deposit_required`: flat 20%, minimum £0.50, full payment allowed, balance due at completion.

# Stripe live readiness — LIVE
PR #100 remains the production credential guard. Production requires a recognised LIVE Stripe secret plus a configured webhook before payment policy can become effective. TEST credentials remain preview/sandbox-only. Existing hosted Checkout, frozen booking payment-policy snapshots, deposits/balances, signed webhook authority, refunds and processor-cost reconciliation remain in place.

Stripe account `acct_1UFAd1Cu9tojH31y` is live and fully onboarded: `charges_enabled=true`, `payouts_enabled=true`, `details_submitted=true`, verification complete, card payments and transfers active. Live production webhook `https://namdar.co.uk/api/stripe-webhook` is enabled for checkout completion/async success and refund events. Production `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` were updated by the owner and are present in the verified production runtime.

# Payment Receipt Tracking — LIVE

Product PR #102: `Add traceable payment receipt references`.
Exact tested head `e3c4e3147716d9697b2692aafe89a73454694cee`; merge `95cda91adb2fe7276f49a73d8626f97d87c2521e`.
Asset token: `6.4.45-payment-receipts-1`.

## Goal and identity
Every Namdar payment/refund has one stable customer-facing receipt reference that customer and staff can quote to trace the transaction.

`lib/payment-receipts.js` derives it deterministically from immutable `payment_records.id`:
- format `RCP-XXXXXXXX-XXXXXXXX`;
- the same payment always produces the same number;
- it contains no Stripe secret/provider token;
- no schema change or payment-row rewrite is needed.

## Stripe payment/refund email
`api/stripe-webhook.js` sends a receipt email only when an idempotent new Stripe payment/refund row is actually recorded. Payment email includes:
- Namdar receipt number;
- invoice number;
- amount;
- payment type and method;
- payment date/time;
- net paid and outstanding invoice balance;
- My Namdar Billing link;
- instruction to quote the receipt number for support.

Stripe refund emails use the same receipt standard. `archiveForCustomer:true` keeps billing messages in the customer's Namdar message history. Provider-reference idempotency still prevents duplicate payment rows and duplicate receipt emails on repeated webhook delivery.

## Manual non-Stripe payments/refunds
`api/admin-payments.js` uses the same receipt number and email standard for staff-recorded cash, bank-transfer, card or other payments/refunds. Manual `method='stripe'` remains rejected so staff cannot impersonate a verified Stripe webhook. Manual payment audit summaries/metadata include the receipt number.

## My Namdar
`api/customer-billing.js` exposes only the customer-safe receipt number with each payment/refund. Internal processor-cost fields and provider payment IDs remain excluded.

`account-payments.js` shows the receipt number in Billing payment history and provides the authenticated Receipt PDF button. Receipt download filenames use the same receipt number. `account.js` loads the receipt asset at `6.4.45-payment-receipts-1`.

## Receipt/invoice PDF
`api/billing-document.js` uses the same receipt number on the receipt PDF and filename and includes receipt references in invoice payment history. It tells the customer to quote the number if contacting Namdar. Existing ownership/Admin/Staff-payment permission checks remain in force.

## Admin tracking
`api/admin-payments.js` supplies `receipt_number` to the privileged Admin payment payload.

`admin-payment-receipts.js`:
- displays the receipt number on transaction receipt controls;
- extends Payments search so an `RCP-...` value locates the matching payment row;
- does not expose Stripe secrets.

`admin.js` loads this extension at `6.4.45-payment-receipts-1`.

## Release evidence
Exact-head checks on `e3c4e3147716d9697b2692aafe89a73454694cee`:
- Stripe live readiness `35264280479` SUCCESS;
- AI handoff/full JavaScript `35264280446` SUCCESS;
- Google Review compatibility `35264280451` SUCCESS;
- Staff v3 compatibility `35264280558` SUCCESS;
- Post-job compatibility `35264280869` SUCCESS.

Exact-head preview `dpl_BNvoECAundwwbcB95Rh79nKKJyEV` READY with clean errors-only build log.

Production verification after merge:
- deployment `dpl_HmwxY6oHCiCX8s14xrtHCK6CVpHz` READY and aliased to `namdar.co.uk`;
- `/api/health` HTTP 200 / `ok:true` at `2026-09-17T19:23:15.221Z`;
- live `account.js` HTTP 200 and loads `account-payments.js` at `6.4.45-payment-receipts-1`;
- live `admin.js` HTTP 200 and loads `admin-payment-receipts.js` at `6.4.45-payment-receipts-1`;
- both live receipt assets returned HTTP 200;
- production release 5xx scan found no 5xx logs;
- Supabase readback after deployment: 4 payment records, zero payment-setting rows, zero active payment policies;
- payment-record count was 4 before and after release, so verification created no synthetic payment row.

## Safety invariants
- customer receipt numbers are Namdar references, not Stripe secrets;
- Stripe provider references/payment IDs remain internal reconciliation evidence;
- customer billing/PDF surfaces do not expose processor fee/net/balance-transaction/provider-payment fields;
- do not manufacture production customers/payments for smoke testing;
- new bookings snapshot payment-policy revision 1 so later policy edits cannot rewrite accepted terms;
- the first genuine live Stripe payment is still the required end-to-end checkout/webhook/receipt validation.

# Booking/payment launch policy — LIVE
Production booking operations: manual confirmation, Monday–Saturday, three daily windows (08–11 / 11–14 / 14–17), 3 jobs/day, 24-hour minimum notice and 21-day horizon. Route density remains grouped by postcode area.

# Admin inbox workflow — LIVE
`admin-inbox-safety.js` live asset `6.4.48-inbox-workflow-polish-fix-1` builds on PR #104 and adds:
- open the next visible conversation after Close/Reopen when one exists;
- selection mode with Select visible, Mark read, Mark unread, Assign to me and Close selected;
- bulk Close excludes Closed/Spam conversations;
- registered-customer context with customer-since/activity counts and Open customer shortcut; unlinked senders are labelled External sender.
- NodeList iteration hotfix uses `document.querySelectorAll(...).forEach(...)` for bulk-row loops instead of the single-element `$()` helper.

# Professional Page Analytics — LIVE
Asset `6.4.49-page-analytics-1` is live and adds `admin-page-analytics.js/css` plus `api/admin-page-analytics.js`.

The analytics endpoint requires Staff/Admin `analytics` permission and aggregates existing `page_views(path, referrer_host, created_at)` together with quote/booking creation timestamps. The Admin Reporting period selector controls both business and website analytics. Surfaces include page-view trend, same-length previous-period comparison, average views/day, search/direct shares, views-to-quotes/bookings business ratios, landing pages and referrers.

Privacy invariant: these are page-load counts, not unique-user analytics. Do not label them as unique visitors or sessions unless the data model is explicitly extended later with an approved privacy design.

Release evidence: PR #107 merged at `b851660b8285c2ad74c01f00fe240e5be0dd86d5`; production `dpl_BcXGivSXztjCAEg4WZyiZr1Zb1XH` READY; live loader pins `6.4.49-page-analytics-1`; unauthenticated analytics endpoint check returns HTTP 401; `/api/health` remains HTTP 200 / `ok:true`.

# Analytics v2 — LIVE
Live Admin analytics asset `6.4.51-analytics-v2-revenue-fix-1`; browser tracker remains `6.4.50-analytics-v2-1`. Production migration `20260924234226_analytics_v2_session_funnel` is already applied and committed.

Architecture:
- `analytics-v2.js`: temporary first-party session ID in sessionStorage, first-party page/event tracking, contact/quote/booking/checkout interactions and privacy-choice hooks.
- `api/track-view.js`: records only production `namdar.co.uk` page views; accepts optional session + marketing-consented UTM fields.
- `api/funnel-event.js`: validated Window Cleaning event vocabulary, production-host guard and short duplicate suppression.
- `api/analytics-opt-out.js`: Essential-only objection deletes the current session from `page_views`, `conversion_events` and `quote_funnel_links`.
- `api/admin-page-analytics.js`: joins sessions → quote links → bookings → invoices/payment records for source/campaign conversion and net-revenue attribution.
- `admin-page-analytics.js/css`: Analytics v2 dashboard in Reporting.
- `scripts/analytics-v2.test.mjs`: privacy, production-host, funnel, attribution and migration regression checks.

Privacy invariant: no device fingerprint, user-agent fingerprint or persistent analytics visitor ID. Campaign/advertising attribution is only captured after Allow marketing. Essential only disables v2 collection and deletes the current v2 session. Published Cookie Policy v3 now accurately describes this model, including the Essential-only objection and marketing-only campaign attribution.

Legacy page-view rows pre-date session attribution and remain usable only for historical page-view totals; v2 sessions/funnel/campaign attribution should be interpreted from the release onward.

PR #109 launched Analytics v2 and PR #110 is live with the attributed-revenue accuracy fix. `totalRevenue`, `attributedRevenue` and `unattributedRevenue` are calculated separately; only payments linked through the v2 quote/session chain count as attributed.

# Smart receipt Vercel PDF fix — CANDIDATE
Target `6.4.52-receipt-unicode-currency-1`.

Root cause was reproduced against the real Vercel invoice PDF: text extraction yields seven NUL characters (for example inside the invoice reference/date punctuation). PostgreSQL text/jsonb rejects those characters with “unsupported Unicode escape sequence”. The fix sanitizes receipt text server-side through `lib/db-safe-text.js` before parsing/storage, including lone-surrogate handling.

Receipt intelligence improvements:
- skip PDF page headers when choosing supplier;
- Vercel/hosting/domain → Software;
- parse month-first dates;
- preserve source currency/original amount/VAT;
- for non-GBP receipts, leave GBP ledger amount blank and warn the reviewer to use the actual GBP card/bank charge;
- failed receipt rows are retriable with the same file using authenticated storage upsert.

The existing production Vercel receipt row is status `error` and has no `expense_id`, so release does not mutate accounting data automatically.

# Smart receipt flattened-PDF fix — LIVE
Live asset `6.4.53-receipt-pdf-layout-1`.

After PR #112 removed the PostgreSQL/NUL crash, the real Vercel retry exposed a second issue: PDF.js flattened the page into one long line, so line-oriented receipt heuristics returned blank supplier, a subscription-range-derived date and zero VAT.

Fixes:
- browser PDF extraction preserves `TextItem.hasEOL` line breaks;
- supplier fallback can recover a legal entity such as Vercel Inc. from flattened text;
- labelled invoice dates such as “Date of issue” outrank generic date-range matches;
- explicit Amount due / Standard Rate VAT parsing works even when the page is one line;
- regression test covers the exact flattened Vercel invoice shape.

# Smart receipt draft re-read — CANDIDATE
Target `6.4.54-receipt-reread-draft-1`. Receipt prepare now allows same-file retry for unattached `error` or `review` drafts. This is required so a previously mis-parsed draft can be re-analysed after parser improvements. Receipts with an `expense_id` remain duplicate-protected and cannot be re-read through this path.

# Smart receipt form persistence — LIVE
Live `6.4.55-receipt-form-persistence-1`. The Smart Receipt UI now stores the active extracted suggestion and uses a MutationObserver on the Business Finance expense-form host to re-apply the draft after finance-panel re-renders. This fixes the observed state where Supabase held the correct Vercel extraction but the visible form reset to default values. The invoice-reference parser also normalizes a spaced PDF.js value like `YYVCYYP4 0004` to `YYVCYYP4-0004`.

Current Vercel draft remains unattached and was corrected in-place to supplier Vercel Inc., date 2026-09-24, category software, USD 24 original total, USD 4 original VAT, reference YYVCYYP4-0004.

# Smart receipt manual-edit persistence — CANDIDATE
Target `6.4.56-receipt-manual-edits-1`.

After the form-persistence release, a remaining edge case was observed for foreign-currency receipts: reapplying the extracted suggestion after a Business Finance rerender intentionally blanked the GBP amount again. The receipt UI now tracks reviewer overrides in `currentEdits` via delegated input/change events and reapplies those values after the extracted suggestion. This applies to all editable expense fields, not just amount, and preserves the review-first accounting model.

# Analytics v2 loading lifecycle — CANDIDATE
Target `6.4.57-analytics-load-lifecycle-1`.

Production runtime logs showed authenticated `GET /api/admin-page-analytics` calls returning HTTP 200 while the Admin Analytics v2 shell could remain at “Loading…”. The fix decouples Analytics v2 from a single page-initialization timing path: it binds explicit reloads to the Reporting tab, range selector and Refresh control, polls briefly for the secure admin session after boot, and provides a 15-second timeout with a retry UI. Existing analytics calculations/API remain unchanged.

# Receipt expense source constraint — PRODUCTION FIX APPLIED
Migration `20260925122723_allow_receipt_expense_source` updates `business_expenses_source_check` to allow `receipt` alongside `manual`, `import`, and `job_cost_sync`.

Observed failure: `api/admin-finance-expenses.js` intentionally sets `row.source='receipt'` when a reviewed Smart Receipt is attached, but the older ledger constraint rejected that value. Production schema now matches the application model. The receipt remains review-first and no accounting entry is created until explicitly saved.

# Automatic foreign-currency expenses — LIVE / ECB VERIFIED
Target Admin assets `6.4.58-expense-fx-1`. Production migration `20260925125132_foreign_currency_expense_audit` is applied.

Components:
- `lib/fx-rates.js`: ECB-only historical reference lookup through Frankfurter's direct ECB provider route, explicit no-store/no-cache fetches, seven-day prior-working-day fallback, money-safe two-decimal conversion.
- `api/admin-fx-rate.js`: staff/settings-protected USD/EUR/etc. → GBP conversion endpoint.
- `api/admin-finance-receipts.js`: enriches detected foreign receipts with reference GBP amount/rate before draft storage.
- `admin-business-finance.js`: original currency/amount controls, automatic conversion, override detection, FX audit display.
- `admin-finance-receipts.js`: Smart Receipt integration and preservation of manual GBP overrides through rerenders.
- `api/admin-finance-expenses.js`: persists `original_currency`, `original_amount`, `original_vat_amount`, `fx_rate`, `fx_rate_date`, `fx_provider`, `fx_reference_gbp`, and `fx_method`.

Save integrity: `api/admin-finance-expenses.js` now re-fetches and verifies the ECB reference server-side before persisting automatic FX metadata, so browser-supplied rate/date/provider values are not trusted. If automatic ECB verification fails, an automatic-reference save is blocked; an explicitly entered actual/manual GBP amount may still be saved without pretending an unverified reference is authoritative.

Save-time freshness invariant: the browser now sends whether the GBP value is automatic or reviewer-entered. On save, the server re-fetches ECB. Automatic values are recalculated from the verified rate (including VAT where an original foreign VAT amount is present); reviewer-entered GBP values are preserved as `actual_override`. This prevents a form opened before the ECB daily publication from saving yesterday's automatic GBP amount after today's rate has become available.

Production: PR #125 is live on deployment `dpl_3M7PRirsVVwfFgTkDxqGFs5qnUNH`.

Accounting invariant: automatic FX is a reference amount, not an assertion of the card issuer's exact rate. If staff enter a different GBP amount (for example the actual card statement charge), the ledger stores that GBP amount as the expense and marks the FX method `actual_override` while preserving the historical reference conversion.

# Smart Receipt extraction + Finance draft stability — CANDIDATE
Target assets `6.4.59-finance-receipt-stability-1`.

Observed production failure on an Amazon VAT invoice for an Equip2clean water filter: total/category were broadly correct but supplier became a table header, reference became `date`, VAT was zero, and the expense date followed the order date rather than the explicit invoice/delivery date. The parser now prefers explicit/legal seller names and properly labelled invoice numbers/dates, reads VAT summary rows, and extracts an item description around ASIN/product-table context.

Browser PDF extraction now groups PDF.js text items by visual Y coordinate and sorts each row by X before analysis (`browser_pdf_text_rows_v2`) instead of relying only on `hasEOL`, which was weak for invoices with columns/tables.

Finance UX: `admin-business-finance.js` no longer redraws the page on routine auth token refresh events. It only reacts to meaningful auth state changes and captures/restores the full active expense draft (including FX metadata/manual overrides and selection focus) around legitimate data reloads.

Draft recovery: unattached receipt drafts can use **Re-read** (`action='reanalyze'`) to run the current parser against stored `ocr_text`; this updates the review draft and audit log without re-uploading the original file. Attached accounting records return 409 and are never silently reinterpreted.

# Reporting hub + focused report pages — LIVE
Live Admin asset `6.4.60-report-hub-1`.

`admin-report-hub.js/css` restructures the existing `#reports` tab at runtime without duplicating report element IDs. The top-level route `/admin?tab=reports` is a hub. Focused pages use `?report=overview|revenue|quotes|services|staff|feedback|website|window|finance`.

Static report content is moved into dedicated subpage containers. Dynamic panels (`websiteAnalyticsPanel`, `windowPerformancePanel`, `businessFinancePanel`) are adopted with a MutationObserver, so their existing modules remain independent. The router dispatches `namdar:report-view`; Website Analytics, Window Performance and Business Finance listen for their own route and refresh only when opened. Browser `popstate` restores report-page navigation.

Shared controls remain single-instance to avoid duplicate IDs. Period/export visibility is contextual per report; Finance is tax-year based and does not show the generic period/export controls.

PR #122 is live on production deployment `dpl_DDxDa9B2DWqDbDjF6U8jw4Rg3w9z`.

# Window Cleaning SEO foundation — LIVE
SEO deliberately follows the service-catalog truth: only Window Cleaning is live.

Public search architecture:
- homepage: Window Cleaning in South London & Lewisham | Namdar; descriptive Window Cleaning H1; Organization/WebSite/Service JSON-LD;
- live service: /services/window-cleaning, with Exterior Window Cleaning intent, Service + BreadcrumbList schema, and internal local-area links;
- local landing pages: /areas/london, /areas/south-london, /areas/lewisham; each has unique title/description/H1/content and Window Cleaning-only Service schema;
- planned service pages: static noindex,follow in source, in addition to the existing runtime service gate; sitemap already excludes non-live services;
- sitemap: dynamic live-service catalog plus accurate lastmod signals for the homepage/service/local pages changed in this release.

Do not create thin postcode/neighbourhood doorway pages without genuine coverage/content. Do not claim LocalBusiness address/telephone structured-data fields unless real public business details are available. Search Console/Business Profile should be connected separately for measured indexing/query/local visibility.

Production: PR #127 is live on deployment dpl_C3gf98ZruxSBfckd9uSiuEmz1xMJ. The sitemap pins the Window Cleaning public-page lastmod to 2026-09-25 because the SEO page content changed independently of the older service-catalog DB timestamp.

# Portfolio SEO fail-closed — LIVE
The portfolio is now tied to genuine published work instead of being an always-indexable empty shell.

Architecture:
- `vercel.json` rewrites exact `/work` to `api/public-work-page.js`; `/work/:id` keeps the existing individual public-job handler.
- `api/public-work-page.js` loads the service catalog and published portfolio jobs, filters jobs to currently live service keys, and returns HTTP 404 + noindex when none exist. When jobs exist it server-renders the portfolio, case-study links and CollectionPage/ItemList/BreadcrumbList structured data.
- `api/sitemap.js` derives `publicJobs` from published jobs whose service key is live and conditionally includes `/work` plus those job URLs only when eligible content exists.
- `index.html` and indexable service/area pages hide portfolio navigation in source. `app.js` / `seo-page.js` only reveal it after `/api/public-data` returns genuine public jobs.
- The legacy `work.html` file is removed. This is required because Vercel clean-URL filesystem routing otherwise wins before the `/work` rewrite and would shadow the dynamic handler.

Safety invariant: never create synthetic portfolio jobs, reviews, locations or images for SEO. Search visibility for “Our work” must come from genuine completed jobs deliberately published by Namdar staff.

Production proof: PR #133 / main `5e824312a5768cfa41ce992da6f0c148df6055f8` is live on `dpl_9X7fXDm4cYfvR9BKgkk74QV1ihr8`. With the current zero published jobs, `/work` returns 404 with meta robots and `X-Robots-Tag: noindex, follow`; `/sitemap.xml` omits `/work`; public navigation starts hidden; health is HTTP 200 / `ok:true` at `2026-09-25T20:29:18.283Z`.

# Other live layers
Google Review System PR #98 remains live but the official Google Business review URL is still unconfigured/off. Post-job Customer Experience PR #96 and Staff operations v3 PR #94 remain live.

Production: PR #130 is LIVE on `dpl_CEjJJTQVDgkfCw53YvwHBdaeeYYV`; health HTTP 200 / `ok:true` at `2026-09-25T17:55:13.522Z`.

Search Console: the GSC connector is authorised, but `list_sites` currently returns no properties and both `sc-domain:namdar.co.uk` and `https://namdar.co.uk/` are absent from the owner's Google Search Console account. The first property must be added/verified in Google Search Console before GSC Wizard can register it, inspect URLs, submit the sitemap, or report query/impression data.

Live local-SEO coverage source: production `service_areas` currently contains the five administrative areas Lewisham, Southwark, Lambeth, Wandsworth and Greenwich. Homepage/service/London/South London structured data and copy must stay aligned to those actual boroughs; the postcode checker remains authoritative for each property. Avoid creating thin doorway pages for every borough/postcode without substantive local content.

Rendered-home SEO invariant: Google can render JavaScript, so conversion.js must not overwrite the initial local SEO title/description/H1 with older generic London copy. Initial HTML hides future-service cards/radios and the 3D nav/section; applyServiceAvailability may unhide a service only when its catalog status becomes live, coming_soon or paused.

## Next steps
1. use the first genuine payment for authenticated end-to-end checkout/webhook/receipt/email/My Namdar verification rather than manufacturing production transactions;
2. configure the real Google Business Profile review URL later;
3. complete authenticated real-world Staff/Post-job smokes when genuine jobs occur.
