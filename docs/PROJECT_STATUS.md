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
| Admin workspace | `admin.html`, `admin.js`, `admin-original.js`, `admin-inbox-safety.js`, admin APIs | Inbox spam-protection upgrade in feature branch |
| Staff PWA | `staff.html`, `staff.js`, manifest and service worker | Present |
| Server functions | `api/` | Spam enforcement prepared in `support-inbox.js` and `resend-inbound.js` |
| Shared server utilities | `lib/server.js` | Present |
| Production database | Supabase | Healthy; inbox spam migrations applied |

## Recently documented capabilities

- v6.4.16: public enquiries separated from relationship-gated customer support tickets.
- v6.4.16 homepage/support-routing fixes.
- v6.4.16 My Namdar session restore hotfix.
- Post-release Email inbox safety upgrade in progress: Spam/quarantine folder, manual spam restore, exact-sender/domain blocklist, admin unblock manager, conservative automatic marketing/bot quarantine, and staff-notification suppression for quarantined inbound mail.
- v6.4.15: external email and website ticket separation.
- v6.4.8: customer notification centre.
- v6.4: installable staff PWA.
- v6.3: admin audit history.
- v6.0: business follow-ups.

## Email inbox spam-protection design

- `spam` is a separate thread state and is excluded from Open/unread working counts.
- Inbox staff can mark or restore spam.
- Only administrators can create/remove persistent block rules.
- Sender blocks are exact email addresses.
- Domain blocks affect future inbound mail from that domain, but the API refuses broad shared providers such as Gmail, Outlook, Yahoo, iCloud, Proton and Namdar’s own domain.
- Automatic classification applies only to unknown, non-reply senders and uses conservative signals for SEO/link-building/cold-marketing outreach plus high-frequency unknown senders.
- Known customers and genuine email-reply context bypass automatic marketing heuristics.
- Blocked/auto-spam mail remains quarantined for audit/recovery and does not create a staff notification.
- This is application-level quarantine after Resend receiving; it does not claim to reject SMTP upstream.

## Database and configuration status

Applied production migrations:
- `20260911213820 inbox_spam_controls`
- `20260911213842 inbox_spam_blocklist_fk_index`

Repository migration source is being added under `supabase/migrations/` in the same feature commit.

The first migration extends inbox thread status/metadata and creates `support_inbox_blocklist`; the second adds the covering index for `created_by` after the performance advisor flagged it.

`support_inbox_blocklist` is RLS-enabled, has no browser policies, and `anon`/`authenticated` privileges are revoked; it is server/service-role managed like other private operational tables.

No environment variable change is required.

## Verification status

- Repository ↔ Vercel production linkage: verified.
- My Namdar session hotfix: CI, preview, production deployment and canonical assets verified.
- Inbox spam migrations: applied successfully to `namdar-production`.
- Supabase security advisor: no new error; RLS-with-no-policy is informational and intentional for the server-only blocklist.
- Supabase performance advisor: new blocklist foreign-key warning was fixed by the second migration.
- Local syntax checks passed for the new `admin.js` loader, `admin-inbox-safety.js`, `api/support-inbox.js`, and `api/resend-inbound.js`.
- Feature branch application CI/preview/production deployment still pending; do not claim the new inbox UI or inbound filtering is live yet.

## Outstanding work

1. Finish CI/preview/merge/production verification for `feature/inbox-spam-controls-20260911`.
2. After deployment, use the administrator’s visible junk conversation to verify Mark spam and/or Block sender, then confirm it leaves Open and appears under Spam without affecting customer Support tickets.
3. Complete a controlled authenticated customer-support ticket test.
4. Continue production schema/migration source reconciliation.
5. Confirm launch readiness for Stripe, Turnstile, OAuth, SMS, Resend and legal configuration.
6. Confirm intended database/application double-booking protections.

## Handoff maintenance rule

Any substantial change must update this file and `docs/AI_HANDOFF.md` in the same commit. Never include credentials or customer data.
