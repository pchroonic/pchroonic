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
| Admin workspace | `admin.html`, `admin.js`, `admin-original.js`, `admin-inbox-safety.js`, admin APIs | Email spam protection + Inbox Security v2 live |
| Staff PWA | `staff.html`, `staff.js`, manifest and service worker | Present |
| Server functions | `api/` | Hardened inbound email and inbox APIs live |
| Shared server utilities | `lib/server.js` | Present |
| Production database | Supabase | Healthy; inbox/security migrations applied |

## Inbox Security v2 scope

- Strict recipient allowlist: unknown Namdar catch-all aliases are ignored instead of routed to Support.
- Internal `@namdar.co.uk` inbound is ignored to prevent loops and system-email pollution.
- Invalid reply tokens are ignored; only a resolved existing thread counts as reply context.
- Sender + Message-ID duplicate suppression handles the same email delivered to multiple Namdar aliases.
- Repeated identical/near-identical campaign content from multiple unknown senders is quarantined.
- Explicit DMARC failure is a security quarantine; SPF+DKIM failure contributes to conservative unknown-sender scoring.
- Dangerous executable/script/macro attachment metadata triggers quarantine; archive/active-content files carry a caution label.
- Admin UI includes **Report phishing**, hides unsafe whole-domain blocking for shared providers, and labels risky attachments.
- Blocking a private/non-shared domain quarantines existing matching threads as well as future inbound.
- Customer support-ticket rules are unchanged.

## Database and provider security status

Applied production migrations:

- `20260911213820 inbox_spam_controls`
- `20260911213842 inbox_spam_blocklist_fk_index`
- `20260911220343 inbox_security_indexes`
- `20260911220415 harden_invoice_number_function_search_path`

The inbox indexes cover inbound sender/time, Message-ID/from and subject/time lookups. The invoice trigger search path is pinned to `pg_catalog, public`; the prior Supabase Security Advisor mutable-search-path warning is removed.

Resend receiving is protected by the existing signed webhook verification in `api/resend-inbound.js`. No secret value is stored in repository documentation.

Latest Supabase Security Advisor state:
- RLS-enabled/no-policy INFO findings remain on server-only operational tables and are intentional under the current service-role-only access model.
- **WARN: Leaked Password Protection is disabled** in hosted Supabase Auth. This should be enabled in the Supabase Auth dashboard; the current connector does not expose a hosted Auth-setting mutation for it.

No new environment variable was required for Inbox Security v2.

## Verification status

- First Email inbox spam-protection release: CI/preview/production verified live; production contains quarantined spam threads and active block rules.
- Inbox Security v2 PR #5 merged successfully.
- Exact feature commit: `5aab371098e40ce664aa19b4f71ce5dd312c9f06`.
- GitHub CI run `34652942698`: completed successfully.
- Exact Vercel preview `dpl_6nLof8eSFXEVePbB1VEB4VsEHKre`: READY.
- Main production commit: `c3d788dfd61751faf888197801b0fce587d97d38`.
- Production deployment `dpl_CA4tTdYrtjxvxQR6jor1cs3Lvjwn`: READY, target production, `namdar.co.uk` alias present, no alias error.
- Duplicate concurrent hardening PR #6 was closed without merge because PR #5 already contained the stronger implementation.
- A safe recognized-mailbox/unknown-alias post-deployment behavior test is still recommended; do not overstate it as exercised until completed.

## Outstanding work

1. Enable Supabase Auth Leaked Password Protection in the hosted Auth security/password settings.
2. Run a safe recognized-mailbox inbound test and an unknown-alias test; confirm only the recognized mailbox creates an inbox conversation.
3. Confirm customer Support tickets remain unchanged during that test.
4. Complete the controlled authenticated customer-support ticket test.
5. Continue production schema/migration source reconciliation.
6. Confirm launch readiness for Stripe, Turnstile, OAuth, SMS, Resend and legal configuration.
7. Confirm intended database/application double-booking protections.

## Handoff maintenance rule

Any substantial change must update this file and `docs/AI_HANDOFF.md` in the same commit. Never include credentials or customer data.
