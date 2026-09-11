# Namdar project status

Last updated: 2026-09-11 UTC

## Current baseline

- Release documented in `README.md`: v6.4.16.
- Source branch: GitHub `main` in `pchroonic/pchroonic`.
- Delivery: Vercel project `namdar-website-starter-1` with `namdar.co.uk` assigned.
- Data/auth/storage: Supabase.
- Application shape: static multi-page front end plus Vercel Node serverless APIs.

## Main product areas

| Area | Primary source | Status summary |
| --- | --- | --- |
| Public website | `index.html`, `app.js`, `styles.css`, `services/`, `areas/` | Present; homepage JS hotfix live |
| Customer portal | `account.html`, `account.js`, `account-original.js`, `account-auth-hotfix.js`, customer APIs | Present; session-bootstrap hotfix live |
| Admin workspace | `admin.html`, `admin.js`, `admin-original.js`, `admin-inbox-safety.js`, admin APIs | Email spam v1 live; Security v2 in feature branch |
| Staff PWA | `staff.html`, `staff.js`, manifest and service worker | Present |
| Server functions | `api/` | Spam v1 live; inbound security v2 prepared in `resend-inbound.js` / `support-inbox.js` |
| Shared server utilities | `lib/server.js` | Present |
| Production database | Supabase | Healthy; inbox/security migrations applied |

## Inbox Security v2 scope

- Strict recipient allowlist: unknown Namdar catch-all aliases are ignored instead of routed to Support.
- Internal `@namdar.co.uk` inbound is ignored to prevent loops and system-email pollution.
- Invalid reply tokens are ignored; only a resolved existing thread counts as reply context.
- Sender + Message-ID duplicate suppression handles the same email delivered to multiple Namdar aliases.
- Repeated identical campaign content from multiple unknown senders is quarantined.
- Explicit DMARC failure is a security quarantine; SPF+DKIM failure contributes to conservative unknown-sender scoring.
- Dangerous executable/script/macro attachment metadata triggers quarantine; archive/active-content files carry a caution label.
- Admin UI adds **Report phishing**, hides unsafe whole-domain blocking for shared providers, and labels risky attachments.
- Blocking a private/non-shared domain quarantines existing matching threads as well as future inbound.
- Customer support-ticket rules are untouched.

## Database and provider security status

Applied production migrations:

- `20260911213820 inbox_spam_controls`
- `20260911213842 inbox_spam_blocklist_fk_index`
- `20260911220343 inbox_security_indexes`
- `20260911220415 harden_invoice_number_function_search_path`

The new inbox indexes cover inbound sender/time, Message-ID/from, and subject/time lookups. The invoice trigger search path is now pinned to `pg_catalog, public`; Supabase Security Advisor no longer reports the mutable-search-path warning.

Resend has one enabled webhook at `https://namdar.co.uk/api/resend-inbound`, subscribed to `email.received`. The application already requires a valid signed Svix/Resend webhook with a five-minute timestamp window. No webhook secret value is stored in repository docs.

Security Advisor still reports **Leaked Password Protection disabled** in hosted Supabase Auth. That should be enabled separately in the Supabase Auth dashboard. RLS-with-no-policy INFO findings on the server-only operational tables are intentional.

No new environment variable is required for Inbox Security v2.

## Verification status

- First Email inbox spam-protection release: CI/preview/production assets verified live.
- Production now contains quarantined spam threads and active block rules, confirming the real Admin spam/block path has been used after deployment.
- New database indexes: applied and visible; Performance Advisor sees them.
- `namdar_set_invoice_number()` search path hardening: applied and verified via `proconfig`; Security Advisor warning removed.
- Resend receiving webhook: enabled on the correct endpoint for `email.received`.
- Local syntax checks passed for the prepared `admin.js`, `admin-inbox-safety.js`, `api/support-inbox.js`, and `api/resend-inbound.js` changes.
- Feature branch CI/preview/merge/production verification for Security v2 is still pending; do not claim the new behavior is live yet.

## Outstanding work

1. Finish CI/preview/merge/production verification for `feature/inbox-security-v2-20260911`.
2. Run a safe recognized-mailbox inbound test and an unknown-alias test after deployment; confirm only the recognized mailbox creates an inbox conversation.
3. Enable Supabase Auth Leaked Password Protection in the hosted Auth security/password settings.
4. Complete the controlled authenticated customer-support ticket test.
5. Continue production schema/migration source reconciliation.
6. Confirm launch readiness for Stripe, Turnstile, OAuth, SMS, Resend and legal configuration.
7. Confirm intended database/application double-booking protections.

## Handoff maintenance rule

Any substantial change must update this file and `docs/AI_HANDOFF.md` in the same commit. Never include credentials or customer data.
