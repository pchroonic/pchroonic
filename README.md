# Namdar v6.4.78 — Account boot watchdog

My Namdar now has an independent startup watchdog embedded directly in `account.html`, before the account JavaScript loader. If any pre-init dependency stalls (config fetch, Supabase library/client setup, initial session, or rendering), the “Restoring your secure session” screen can no longer remain indefinitely. After 8 seconds the loading shell is dismissed and a diagnostic code identifies the last startup phase. `account-original.js` records phases from `html-ready` through `ready` and clears the watchdog on successful render. This is diagnostic/failsafe protection only and does not change authentication semantics. No database or environment change.

# Namdar v6.4.77 — Homepage auth lock fix

The public homepage no longer re-enters `sb.auth.getSession()` from inside `onAuthStateChange`. The auth callback now receives the Supabase session directly and defers profile/UI refresh to the next tick, while the initial homepage load still performs one normal session read outside the callback. This removes a cross-tab auth lock pattern that could let the homepage show “My account” while a second `/account` tab remained stuck on “Restoring your secure session.” The homepage loader is cache-busted and regression coverage requires the callback to remain free of `getSession()` re-entry. No database or environment change.

# Namdar v6.4.76 — Non-blocking My Namdar auth bootstrap

My Namdar no longer blocks the entire page on an initial `await sb.auth.getSession()`. Startup now resolves the first browser session from Supabase's `INITIAL_SESSION` auth event, and later auth changes are rendered on the next tick instead of doing database/portal work directly inside `onAuthStateChange`. This avoids the cross-tab/session-lock deadlock pattern that could leave signed-in customers stuck on “Restoring your secure session.” The initial wait is bounded at 5 seconds and regression tests require both non-blocking startup and deferred auth rendering. No database or environment change.

# Namdar v6.4.75 — Native My Namdar session flow

My Namdar now uses Supabase's native persisted-session lifecycle instead of the custom `account-auth-hotfix.js` wrapper that had accumulated timeout/recovery logic and was causing signed-in customers to hang on “Restoring your secure session.” The account loader now loads one pinned Supabase browser build (2.117.1) and then the normal account bootstrap, which already uses `persistSession`, `autoRefreshToken`, `detectSessionInUrl`, native `getSession()`, and `onAuthStateChange`. The custom hotfix file remains in the repository for historical tests/reference but is no longer loaded by My Namdar. Regression coverage now fails if the wrapper is reintroduced into the account loader. No database or environment change.

# Namdar v6.4.74 — Faster account startup

Signed-out customers no longer wait through the full secure-session restore timeout before seeing the login form. Once the Supabase auth client is ready, if no valid cached session exists, My Namdar reveals sign-in after about 2.2 seconds. Customers with a valid cached session still stay on the protected restore path. The full 12-second recovery timeout remains available for genuine session restoration, so this improves perceived speed without weakening session handling. Regression tests cover both signed-out and cached-session startup paths. No database or environment change.

# Namdar v6.4.73 — Login auth-client readiness

Fixes a My Namdar login crash where the visible sign-in form could be used before the Supabase client had finished initialising, causing `Cannot read properties of null (reading 'auth')`. The password sign-in handler now fails safely if the auth client is not ready, and the session watchdog no longer exposes the sign-in form while `sb` is still null. Regression tests cover both conditions. No database or environment change.

# Namdar v6.4.72 — Fresh sign-in state cleanup

When My Namdar falls back to the sign-in form after an unrecoverable old browser session, the recovery warning no longer remains underneath a new login attempt. Editing the email/password or submitting Sign in clears the stale recovery message first, so customers only see feedback from the current authentication attempt. No auth protocol, database, or environment change.

# Namdar v6.4.71 — Auth client readiness guard

Fixes a My Namdar startup failure where cached-session recovery could call the portal renderer before the Supabase client existed, causing `Cannot read properties of null (reading 'from')`. Recovery now renders only after the auth client is ready; otherwise it uses the existing one-time guarded reload. The MFA wrapper was also corrected so only MFA challenge failures are labelled as two-step verification errors—ordinary portal render failures now propagate normally. Regression coverage blocks both failures. No database or environment change.

# Namdar v6.4.70 — Account loader cache-chain fix

My Namdar now cache-busts the top-level `account.js` loader from `account.html`, preventing browsers/CDNs from continuing to execute stale auth-recovery code after a deployment. The duplicate unpinned Supabase preload was also removed so the account startup path uses only the pinned Supabase version loaded by `account.js`. The auth regression suite now requires the loader version and verifies that account.html does not preload a second Supabase build. No database or environment change.

# Namdar v6.4.69 — Auth spinner recovery

Fixes a remaining My Namdar session-recovery regression where the account could stay indefinitely on “Opening My Namdar… Restoring your secure session.” If the watchdog finds a valid cached Supabase session while the normal bootstrap is stalled, it now actively resumes the account renderer. If the renderer is unavailable, it performs at most one guarded reload before falling back to sign-in. The auth regression suite now reproduces and blocks this exact stuck-spinner failure. No database or environment change.

# Namdar v6.4.68 — Auth session recovery guard

My Namdar no longer treats a slow Supabase session restore as an immediate logout. The legacy session guard now waits 12 seconds, recovers a still-valid cached Supabase session when the normal restore is blocked/slow (for example with multiple Namdar tabs), and only shows sign-in when no recoverable session exists. The watchdog no longer overwrites a valid cached customer session with the login screen. The existing account-auth regression suite now requires this recovery behaviour, so future PRs that reintroduce the false-logout condition fail CI. No database or environment change.

# Namdar v6.4.67 — Verified contact + explicit property details

My Namdar profile onboarding now requires explicit customer choices instead of silent defaults. Mobile entry supports local UK, +44 and 0044 formats plus selectable country calling codes, normalizes numbers to international format, and exposes SMS OTP verification in My details using Supabase phone-change verification. Area/region, borough/district and property type start unselected; choosing Other reveals a required free-text field whose value is saved into the existing profile field. Editing a previously verified postcode immediately clears stale map/location verification. Address-search provider failures are shown as temporary lookup outages instead of misleading zero-result messages. No database migration or new environment variable is required. GetAddress itself is still returning Unauthorized in production and remains a separate credential/provider issue.

# Namdar v6.4.66 — Studio-style customer notifications

The My Namdar header notification control now behaves like a compact notification centre: an icon bell with unread badge opens an anchored dropdown showing recent notifications, unread state, category icons, filters (All, Quotes, Bookings, Billing, Support), relative time and a direct link to the full Notification Centre. The existing full notification page remains unchanged for search, archive and complete history. Responsive styling keeps the panel usable on mobile. No database migration or environment-variable change is required.

# Namdar v6.4.65 — Signup profile redirect

Newly signed-in customers with incomplete account details are now routed directly to **My details** unless they arrived with an explicit quote/booking/message/tab destination. If the mobile number is missing, the Mobile field receives focus first. This especially improves social/OAuth signup and any account created without a complete profile. Existing email/password signup still collects a mobile number during registration. No database migration or new environment variable is required.

# Namdar v6.4.64 — Human postcode lookup + safe address cache

Customer postcode verification now prefers a real, human-triggered GetAddress.io postcode autocomplete lookup when that postcode is not already cached. The complete returned address list is saved into Namdar's private `master_addresses` cache and reused on future lookups. GetAddress is never called by the customer endpoint for bulk discovery or background harvesting; the existing provider-rights gate requires `operational_use_allowed=true` and `human_input_required=true`. Fresh zero-result responses are cached for 24 hours and provider errors for 10 minutes to avoid repeated paid calls. Once a GetAddress postcode set exists, partial OpenStreetMap rows are not mixed into the customer selector; OSM remains a fallback when GetAddress is unavailable and no cached master data exists. Public lookup rate limiting is tightened to 12 postcode requests per IP per 10 minutes. No database migration is required.

# Namdar v6.4.16 — Customer-only Support Tickets

This release moves support-ticket creation out of the public website and into My Namdar. Public visitors can request a quote, use the assistant for general guidance or email Namdar; inbound email remains in Admin → Email inbox and does not create a ticket. A signed-in customer can create a ticket only after the account has an existing quote, booking, subscription or project. The rule is enforced both in the customer interface and by the server API. Authenticated ticket creation no longer depends on Cloudflare Turnstile; Turnstile remains in place for public sign-in, registration and guest chat.

No Supabase migration or new environment variable is required.

# Namdar v6.4.15 — Email / Ticket Separation

This release separates external email conversations from website support tickets. Incoming mail to Namdar role addresses remains in Admin → Email inbox and no longer creates or synchronises duplicate `support_tickets` records. Admin and customer ticket views hide legacy email-generated copies without deleting the historical data. Website/My Namdar tickets are explicitly tagged `source=website`, feedback escalations use `source=feedback`, and system alert emails are prevented from looping back into Namdar-managed inbound addresses; Management Notifications remain the staff alert channel.

# Namdar v6.4.8 — Customer Notification Centre

This release upgrades My Namdar notifications without requiring a database migration. Customers can search and filter notification history, switch between Inbox and Archived views, mark individual items read or unread, archive and restore notifications, and scan compact category-coded previews before expanding full message content. The notification bell/popover remains tied to active inbox unread items and existing quote/booking/billing/support deep links are preserved. Mobile and dark-mode layouts are included.

# Namdar v6.4 — Staff PWA / Mobile App Experience

This release turns `/staff` into an installable Progressive Web App while preserving the existing staff permissions, job workflow and route planner. Staff can install Namdar Staff to the phone home screen, use a thumb-friendly bottom navigation, see online/offline sync state, and reopen a privacy-limited read-only copy of essential assigned jobs when connectivity drops.

Key changes:
- Web app manifest with Namdar Staff icons, standalone display mode and Today/Route app shortcuts.
- Service worker caches only the staff application shell and required front-end libraries; `/api/*`, Supabase data calls and OpenStreetMap tiles are never cached.
- A successful online job sync stores only essential field details for today/near-term assigned work (name, phone, postcode/address, appointment, service and saved coordinates). The offline copy excludes email, photos, staff/customer notes, price and payment data, expires after 18 hours, and is cleared on sign-out.
- Offline mode is deliberately read-only: job-state changes, notes and photo uploads require reconnection, avoiding queued-write conflicts.
- Mobile job tabs become a fixed bottom app navigation; dialogs, safe-area padding and touch targets are tuned for installed/mobile use.
- Camera uploads retain the existing environment-camera capture and image compression flow, with clearer field wording.
- The app refreshes after returning online and when reopened after being in the background.
- No Supabase migration or new environment secret is required. Stripe remains untouched.

# Namdar v6.3 — Admin Audit Log & Activity History

This release adds an administrator-only activity history without touching Stripe. Important staff/admin mutations are recorded server-side with actor, action, affected record, timestamp, redacted before/after snapshots and safe request metadata. Direct authenticated dashboard writes to selected configuration tables are also captured by database triggers. The audit table has RLS enabled and no browser policies.

Key changes: Admin → Activity, searchable/filterable audit history, admin-only API, secret/token redaction, IP hashing rather than raw IP storage, semantic logs for quotes/bookings/payments/customers/staff/follow-ups/tickets/projects/address administration/newsletter/live chat/field-job actions, and database-trigger coverage for selected direct dashboard writes.

# Namdar Website v6.0.0

## v6.0 Automatic business follow-ups
- Extends the existing hourly `/api/booking-notifications` cron so one protected worker handles both appointment notifications and business follow-ups.
- Unanswered final quotes receive at most two operational reminders: roughly 2 and 7 days after the final quote is sent, provided the quote is still valid and still awaiting a decision.
- Overdue invoices receive staged reminders at roughly 1, 8, 15 and 29 days overdue while a balance remains outstanding. No Stripe/payment-provider change is included.
- Cancelled appointments queue a next-morning customer follow-up offering help to arrange a new service.
- Admin receives an alert when a confirmed job starts within 24 hours with no staff assigned.
- Admin also receives an attention alert when a confirmed job is still marked Scheduled more than two hours after its booked end time, so staff can resolve completed/cancelled/rescheduled/missed jobs accurately.
- New Admin → Follow-ups workspace shows pending/sent/failed/cancelled notifications and supports safe retry/cancel plus a manual `Run check now` control.
- Every notification is idempotent, atomically claimed, retried up to five attempts, and revalidated against the current quote/invoice/booking before send. Stale reminders are cancelled automatically.
- The new `business_notifications` table is server-only: RLS is enabled with zero browser policies.
- The existing CRON_SECRET, Resend setup, booking reminders and account-purge cron are reused; no new secret is required.

## v5.9 Staff route planning
- Adds a Route tab to `/staff` with appointment-safe job ordering, map markers, travel estimates, tight-gap warnings and next-job navigation.
- Optional staff geolocation is browser-only and is not stored by Namdar.

## v5.8 Smarter quote workflow
- Adds private quote photos, final quote expiry, customer accept/decline and live appointment selection after acceptance.
- Staff-only quote notes are separated from customer-visible quote messages.

## v5.7 Customer self-service booking changes
- Upcoming pending/confirmed bookings can be managed from My Namdar without contacting support manually.
- Customers can see free 08:00–11:00, 11:00–14:00 and 14:00–17:00 windows across the next 21 days.
- Customers can request a reschedule or cancellation, add an optional note, and withdraw a pending request.
- Existing appointments remain unchanged until Namdar approves a request.
- Admin → Bookings includes a Customer change requests queue with approve/decline controls.
- Approval re-checks diary conflicts before changing the live booking and automatically refreshes the 24-hour reminder schedule.
- Cancellation approval cancels pending reminder/follow-up notifications while leaving payment/refund handling under the existing Payments workflow.
- Direct staff edits or the start of field work automatically supersede stale pending customer requests.
- The new `booking_change_requests` table is RLS-protected with no browser policies; customer/admin access is through authenticated server APIs only.
- Existing v5.6 security hardening, v5.5 reporting, v5.4 feedback, v5.3 reminders, v5.2 billing and staff workflow remain intact.

## v5.6 Admin reporting
- Adds a protected Admin → Reporting workspace using the existing `analytics` permission.
- Period filters: last 30 days, last 90 days, year to date and all time.
- KPI reporting for net revenue, invoiced value, current outstanding balance, overdue invoices, quote conversion, completed jobs, average job value and customer rating.
- Revenue trend, quote funnel, payment-method and feedback-distribution visual summaries without an external charting dependency.
- Service-performance table combines quote volume, conversion, appointments, completions, collected revenue and average job value.
- Staff-workload table shows scheduled jobs/hours, completed jobs/hours and completion rate.
- One-click CSV export for management reporting.
- Reporting is calculated from the existing quotes, bookings, invoices, payment ledger, feedback and staff tables; **no Supabase migration is required for v5.6**.
- Existing v5.4 feedback, v5.3 reminders, v5.2 billing, v5.1 tracking, v5.0 staff jobs and v4.9 diary remain intact.

## v5.4 Reviews & customer feedback
- Secure one-time-style feedback links are generated for completed bookings and included in the automated 24-hour follow-up email.
- Customers rate service from 1–5 stars on `/feedback`.
- 1–3 star feedback remains private, is routed to Namdar support, and is attached to an existing open ticket or creates a new complaint ticket.
- 4–5 star feedback can offer a configurable public review link.
- Admin has a Feedback dashboard with average rating, needs-attention count, public review clicks, comments, support links, internal resolution notes, and resolve/reopen controls.
- Public review URL is managed under Admin → Website & legal; no redeploy is required when it changes.
- Feedback tokens are handled server-side and are not returned by the admin API.
- The `booking_feedback` table has RLS enabled with no browser policies; all feedback access is through protected server APIs.
- Existing v5.3 reminder queue, v5.2 billing, v5.1 tracking, v5.0 staff jobs and v4.9 diary remain intact.

# Namdar v5.3

Automated booking-notification release. Adds a server-side notification queue with duplicate protection and retries, confirmed-booking emails, 24-hour appointment reminders, logged/idempotent on-the-way and completion messages, and a 24-hour post-completion follow-up. Vercel runs `/api/booking-notifications` hourly. The v5.3 notification queue migrations have already been applied to production. `CRON_SECRET` must be configured in Vercel for both booking reminders and the existing account-purge cron.

# Namdar v5.2

Payments and invoicing release. Adds server-managed invoices, an auditable payment/refund ledger, admin Payments workspace, customer Billing tab, secure PDF invoice/receipt downloads, manual cash/bank/card recording, invoice emailing, overdue visibility, and Stripe-ready deposit/balance charging. Booking payment status is now derived from transaction history instead of being manually editable. The v5.2 database migration has already been applied to production.

# Namdar v5.1

Customer job tracking release. Customers can follow scheduled/on-the-way/in-progress/completed work, see the assigned Namdar team member, receive customer-safe completion notes, and view private before/after photos after completion.

# Namdar v5.0

Mobile staff jobs release. Staff see their assigned work at `/staff`, can mark On my way / Started / Completed, save private staff notes and customer updates, and upload private before/after photos.

# Namdar v4.9

Admin Work Diary release. Adds month/week/day booking calendar views, team-member assignment, staff filtering, job price/status visibility, schedule editing from calendar events, and per-team-member overlap checks. Existing bookings remain valid and appear as Unassigned until allocated. The v4.9 `assigned_staff_id` migration has already been applied to production.

# Namdar v4.8

Security hardening: Vercel deploys now publish only public website assets. Admin customer create/edit now persists the full address profile, and public/account headers have a mobile navigation menu.

# Namdar v4.5

This release improves booking UX, transactional email presentation, chat wording, and address-verification data integrity while preserving the v4.4.1 OSM fallback.

# Namdar v4.2.2

Hotfix after v4.2.1 production deployment:
- Enables Vercel Node request helpers in the Build Output deployment wrapper (`shouldAddHelpers: true`) so `req.query` and parsed `req.body` are available.
- Adds a URL-based `queryParam()` fallback for all query-string endpoints.
- Fixes postcode/address lookup returning `Enter a postcode.` even when a postcode is supplied.
- Protects address-get, legal, payment status, admin filters, and other query-driven endpoints from the same issue.

# Namdar v4.2

Self-managed postcode + approved full-address directory with admin CSV import and customer pending-address approval.

# Namdar v4.1 — customer CRM, postcode system, tickets, rewards, service areas and live chat

This package extends Namdar into a customer/staff platform. It includes:

- Editable customer records and staff accounts with section-level permissions
- Namdar-owned UK postcode verification/cache with structured customer-entered addresses
- Country/region/borough fields, with London borough handling
- Google / Apple / Facebook OAuth buttons (providers must be enabled in Supabase Auth)
- Cloudflare Turnstile hooks for sign-up, sign-in, tickets and guest chat
- Phone verification and optional authenticator MFA (SMS provider required for phone OTP)
- Support ticket threads for registered customers and guest-ticket claiming after registration
- Service-area map and postcode coverage checks
- Customer projects, before/after media, 3D tour links and share pages
- Namdar Points, reward catalogue, referrals, recurring-service bonuses and promotion codes
- Editable brand/logo/theme/Christmas/maintenance settings
- Editable Privacy, Terms and Cookies pages
- FAQ/AI assistant, saved chats, staff online presence and human replies
- 30-day customer account deletion/recovery flow plus a daily purge endpoint

## Database

The production `namdar-production` Supabase database has the required v4 through v5.4 migrations applied, including work-diary staff assignment, staff job progress/photo fields, customer-visible job notes, the v5.2 invoice/payment ledger, and the v5.3 booking-notification queue. Do **not** re-run those production migrations on that same project. Keep the SQL files as references / fresh-environment migrations.

## Required / optional environment variables

Existing core variables:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY` (or publishable equivalent)
- `SUPABASE_SERVICE_ROLE_KEY` (server-side only)
- `RESEND_API_KEY`
- `NAMDAR_FROM_EMAIL` (recommended `Namdar <hello@namdar.co.uk>`)
- `NAMDAR_SUPPORT_EMAIL` (recommended `support@namdar.co.uk`)
- `NAMDAR_NOTIFY_EMAIL` (where staff notifications should arrive)

Feature variables:

- `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` — bot protection for Namdar forms
- `OPENAI_API_KEY` and `OPENAI_MODEL` — advanced assistant responses; without these, editable FAQ fallback still works
- `STRIPE_SECRET_KEY` — payments
- `CRON_SECRET` — required; protects the hourly booking-reminder scheduler, daily account-purge cron and daily address-harvest cron
- `GETADDRESS_API_KEY` — optional until GetAddress database growth is activated; server-side only, required for real harvest runs
- `GETADDRESS_ADMIN_KEY` — optional server-side GetAddress usage/daily-limit readback

## Supabase Auth dashboard settings still required

Some hosted Auth settings are not controlled by the database migration:

1. Site URL: `https://namdar.co.uk` and redirect allowlist `https://namdar.co.uk/**`.
2. Custom SMTP sender: `Namdar <accounts@namdar.co.uk>`.
3. Enable Google, Apple and Facebook providers after creating each provider's OAuth credentials.
4. Enable Cloudflare Turnstile under Auth bot/abuse protection and use the same Turnstile secret.
5. Configure an SMS provider such as Twilio before phone OTP verification can send real texts.

## Address system

Namdar's customer address flow does not depend on a live paid lookup to function: it validates UK postcodes, searches the private `master_addresses` cache, merges approved Namdar/customer corrections, can use the OpenStreetMap fallback, and still allows manual address entry when needed. In addition, Namdar now has an **optional server-side GetAddress database-growth worker** that can use a controlled daily allowance to prefill reusable full addresses into `master_addresses`; GetAddress keys never go to browser code, and automatic harvesting remains off until a controlled provider run is verified.

## Account deletion

A customer requests deletion, confirms by email, then enters a 30-day recovery period. `vercel.json` calls `/api/account-purge` daily. The same long random `CRON_SECRET` also secures the hourly `/api/booking-notifications` scheduler and daily address-harvest cron.

## Deploy

Clean URLs are enabled in `vercel.json`; internal links and Auth callbacks use `/account`, `/admin`, `/privacy`, etc. Vercel redirects legacy `.html` URLs to their clean equivalents.


From the extracted folder linked to `namdar-website-starter-1`:

```cmd
npx vercel link
npx vercel --prod --force
```

Then test:

- `https://namdar.co.uk`
- `https://namdar.co.uk/account`
- `https://namdar.co.uk/admin`
- `https://namdar.co.uk/api/health` (confirm `reminders: true`)
- a fresh registration, postcode lookup, ticket, staff permission, reward and account-deletion flow

Before a public advertising launch, complete Stripe, Turnstile, OAuth, SMS, legal review and the official company receiving-mail setup.

## v4.1 Namdar-owned postcode/address flow

The v4.1 customer flow removed the requirement for GetAddress.io. Postcodes are validated by `/api/postcode`, cached in the private `postcode_directory` table, and used to auto-fill region/city/district/coordinates and check Namdar service coverage. Customers can still enter their exact house/flat/unit and street themselves. Later releases added an optional server-side GetAddress cache-growth worker, but the customer-facing address flow still does not require a live GetAddress request.

Production database migration: `production/v4-1-address-system.sql` (already applied if this package was supplied after the production upgrade).

## v4.3 master UK address database

Namdar now supports a separate `master_addresses` store for licensed authoritative UK address data (Royal Mail PAF or OS AddressBase Core). Postcode lookup searches this master dataset first and then merges approved Namdar/customer-entered corrections. Master records do not require individual staff approval. See `production/v4-3-master-address-database.sql` and `tools/import-master-addresses.md`.


## v4.4.1 free open-address fallback

When the local master address database has no records for a postcode, `/api/address-search` can query an OpenStreetMap Overpass endpoint server-side, cache matching `addr:*` records in `master_addresses`, and then serve them locally on later lookups. Successful and empty lookups are cached for 30 days; errors are retried after one hour. The endpoint can be overridden with `OVERPASS_API_URL`.

OpenStreetMap coverage is community-maintained and incomplete, so manual entry remains available. Where OSM-derived address data is displayed, the UI includes OpenStreetMap contributor attribution and the data is governed by the Open Data Commons Open Database License (ODbL). For complete authoritative UK postal coverage, a licensed PAF/AddressBase source can still be imported later without changing the customer flow.

## v4.7.1 authentication upgrade

- Two-step customer signup: account credentials first, property details second.
- Password confirmation and live strength requirements (10+ characters, upper/lowercase, number).
- UK mobile normalization for common `07...` entries.
- Required Terms + Privacy acceptance, with marketing consent kept optional.
- Password visibility toggles.
- Passwordless email magic-link sign-in for existing users (`shouldCreateUser: false`).
- Resend signup-confirmation email action.
- Proper Supabase `PASSWORD_RECOVERY` handling that opens the Security tab and guides the user to set a new password.
- Google / Apple / Facebook buttons now reflect Supabase provider availability rather than appearing active when a provider is disabled.
- Social-login users are prompted to complete their Namdar property profile after first sign-in.
- Existing postcode/address verification, Turnstile, MFA, account deletion/recovery and customer portal features are retained.

No database migration is required for v4.7.1. The existing `handle_new_user()` trigger already copies signup metadata (including address fields) into `public.profiles`.


## v4.7.1 auth patch
- Google web login uses Google Identity Services + Supabase ID-token sign-in, avoiding the raw Supabase callback hostname in the Google account chooser.
- Authentication email/OAuth redirects are pinned to https://namdar.co.uk/account.
- Legacy stable Vercel aliases redirect to the canonical Namdar domain.

## v4.8 admin CRM workflow

- Customers now have search/status filters and a single account-history view showing contact/property details, quotes, bookings, projects and support tickets (subject to staff permissions).
- Quote management now has search/status/service filters, job-detail expansion, contact shortcuts, clearer pricing/status controls and direct quote-to-booking scheduling.
- Creating a booking from a quote marks the quote approved, prevents duplicate active bookings, checks calendar conflicts, preserves promo/reward redemption handling and emails the customer.
- Booking management now shows the related customer/service, prioritises upcoming work, flags past-due visits and supports rescheduling, duration and service-address editing.
- Quote/booking update emails are only sent for meaningful customer-facing changes, avoiding duplicate notifications when staff save unchanged records.
- No database migration is required for v4.8; it uses the existing quote, booking, profile, project, rewards and support tables.

## v5.0 staff mobile jobs
- `/staff` is the mobile-first field-team screen.
- Staff only see bookings assigned to their own user ID.
- Job workflow: Scheduled → On my way → Started → Completed.
- On-my-way and completion actions send customer transactional emails when email is configured.
- Before/after photos upload to the private `customer-project-files` bucket under the customer's folder and remain non-public.
- Staff notes are stored against the booking for office visibility.
- Production database migration `v5_0_staff_mobile_jobs` has already been applied to the current Namdar Supabase project.

## v5.1 customer job tracking
- Customer bookings now show live Scheduled → On my way → In progress → Completed progress.
- Customer sees appointment, assigned Namdar team member, price/payment status and activity times.
- Completed job before/after photos are shown through private signed URLs.
- Added a customer-visible job update note separate from private staff notes.
- Internal staff notes remain staff/admin only.

## v5.6 mobile and security hardening
- Restores full Admin navigation on phone/tablet with a sticky horizontal section bar.
- Improves touch targets, forms, dialogs, tables, customer tabs, job cards and small-screen layouts.
- Adds consistent CSP, frame protection, permissions policy, no-sniff and referrer headers.
- Private portal pages are no-index/no-store.
- Removes inline account-security scripts so CSP can block inline JavaScript.
- Sanitizes published legal HTML and external tour/review URLs.
- Public site-settings output is explicitly whitelisted.
- Uses the canonical SITE_ORIGIN for transactional links instead of trusting request host headers.

## Namdar v5.8.0 — smarter quote workflow

- Private quote photos for signed-in customers, with customer-owned upload paths in the existing private `customer-project-files` bucket.
- Final quote expiry dates.
- Customer accept / decline actions in My Namdar.
- Accepted quotes can choose one of the live available 08:00–11:00, 11:00–14:00 or 14:00–17:00 appointment windows for the next 21 days.
- Public booking API now requires an authenticated customer, an accepted final quote and a standard available Namdar booking window.
- One active booking per quote.
- Separate customer-visible final quote message from internal Namdar admin notes.
- Admin can review private quote photos, set final price/expiry, send the final quote and see the customer response.
- Stripe remains disabled/unchanged.

## Namdar v5.9.0 — staff route planning

- Adds a Route tab to the mobile `/staff` portal for the signed-in team member's assigned jobs today.
- Route order remains appointment-safe: booked start/end times are never changed by route planning. Where jobs share an identical booked start time, the route view prefers the shortest next hop.
- Shows numbered job markers on a private staff-only route map using OpenStreetMap tiles.
- Uses saved customer coordinates when available and falls back to Namdar's postcode directory lookup for route plotting.
- Shows rough distance and drive-time estimates between mapped jobs plus warnings when the planned travel time is tighter than the diary gap.
- Staff can optionally use their current device location to estimate the first drive. The browser location is kept on-device and is not sent to or stored by Namdar.
- Adds one-tap "Navigate to next job" and per-job navigation links using the device's normal Google Maps flow.
- Route estimates are planning aids only; live traffic/road ETA remains the responsibility of the navigation app.
- No database migration is required for v5.9. Stripe remains disabled/unchanged.


# Namdar v6.2 — SEO & local service pages

Adds indexable service/location landing pages, canonical/OG metadata, Organization + Service JSON-LD, dynamic sitemap, robots.txt, SEO-friendly public completed-job pages, stronger internal links and public service-area coordinate validation. No database migration is required.