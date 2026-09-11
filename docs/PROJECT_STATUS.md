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
| Admin workspace | `admin.html`, `admin.js`, `admin-original.js`, `admin-inbox-safety.js`, admin APIs | Email inbox spam protection live |
| Staff PWA | `staff.html`, `staff.js`, manifest and service worker | Present |
| Server functions | `api/` | Spam enforcement live; inbound security hardening in branch |
| Shared server utilities | `lib/server.js` | Present |
| Production database | Supabase | Healthy; inbox spam migrations applied |

## Recently documented capabilities

- v6.4.16: public enquiries separated from relationship-gated customer support tickets.
- v6.4.16 homepage/support-routing fixes.
- v6.4.16 My Namdar session restore hotfix.
- Post-release Email inbox safety: Spam/quarantine folder, manual spam restore, exact-sender/domain blocklist, admin unblock manager, conservative automatic marketing/bot quarantine, and staff-notification suppression for quarantined inbound mail.
- Follow-up inbound security hardening in progress: webhook-size cap, stricter inbound ID handling, mail-loop/auto-reply quarantine, authentication-failure quarantine, risky attachment-type quarantine, global flood protection and duplicate-race handling.
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

## Inbound email security hardening design

Branch: `security/inbound-email-hardening-20260911`.

The current production webhook already verifies Resend/Svix signatures with `RESEND_WEBHOOK_SECRET` and a five-minute timestamp window. Production runtime logs on 2026-09-11 show recent inbound webhook POSTs returning HTTP 200. Production Supabase also has a unique partial index on `support_inbox_messages.resend_email_id`.

The hardening branch adds:
- 1 MiB webhook payload limit before parsing;
- strict length/character validation for `email_id` before calling Resend’s receiving API;
- explicit 503 if the Resend API key is absent;
- quarantine for `Auto-Submitted`, auto-responder headers and potential Namdar self-mail loops;
- quarantine when non-reply Authentication-Results reports DMARC failure together with SPF or DKIM failure;
- quarantine for executable/script/macro-enabled attachment filenames (metadata only; Namdar does not execute/download them in this flow);
- sender-frequency protection and a 150 inbound-message/hour global guard for unknown non-reply senders;
- duplicate-insert race handling returning success for replayed events instead of allowing retry storms;
- storage of limited security headers for audit context.

All of these protections quarantine suspicious mail; they do not silently delete it.

## Database and configuration status

Applied production migrations:
- `20260911213820 inbox_spam_controls`
- `20260911213842 inbox_spam_blocklist_fk_index`

Repository migration source is preserved under `supabase/migrations/`.

The first migration extends inbox thread status/metadata and creates `support_inbox_blocklist`; the second adds the covering index for `created_by` after the performance advisor flagged it.

`support_inbox_blocklist` is RLS-enabled, has no browser policies, and `anon`/`authenticated` privileges are revoked; it is server/service-role managed like other private operational tables.

The inbound security hardening requires **no new Supabase migration and no new environment variable**. It relies on the already-required `RESEND_WEBHOOK_SECRET` and `RESEND_API_KEY`.

## Verification status

- Repository ↔ Vercel production linkage: verified.
- My Namdar session hotfix: CI, preview, production deployment and canonical assets verified.
- Inbox spam migrations: applied successfully to `namdar-production`.
- Supabase security advisor: no new error; RLS-with-no-policy is informational and intentional for the server-only blocklist.
- Supabase performance advisor: new blocklist foreign-key warning was fixed by the second migration.
- Email inbox spam-protection PR #4: GitHub CI passed, exact Vercel preview READY, PR merged and canonical assets verified live.
- Production code commit for inbox safety: `97014ad2c7dbd0cceb7ca8b97f193a3b5ce8e8bc`.
- Later handoff sync commit `57a7fa854853d68d46ac94f73371f4382f7503d5` passed CI and deployed READY.
- Inbound hardening code has been prepared on its branch, but branch CI/preview/production verification is still pending and must not be described as live yet.

## Outstanding work

1. Run CI and exact Vercel preview for `security/inbound-email-hardening-20260911`; merge only if green, then verify matching production deployment and canonical endpoint behavior.
2. After deployment, send one controlled ordinary inbound email and confirm it still reaches Admin → Email inbox without quarantine.
3. Refresh Admin → Email inbox and use the visible junk conversation to verify Mark spam and/or Block sender; confirm it moves to Spam and no longer counts as Open/unread.
4. Confirm customer Support tickets remain unchanged.
5. Complete a controlled authenticated customer-support ticket test.
6. Continue production schema/migration source reconciliation and remaining launch checks (Stripe, Turnstile, OAuth, SMS, Resend, legal and double-booking protections).

## Handoff maintenance rule

Any substantial change must update this file and `docs/AI_HANDOFF.md` in the same commit. Never include credentials or customer data.
