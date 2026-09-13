# Namdar AI handoff

Last verified: 2026-09-13 UTC

Read `docs/AI_START.md` first.

## Production source of truth
- Repo `pchroonic/pchroonic`, default `main`.
- Current product release: PR #67 `Upgrade Namdar Newsletter Centre`.
- Exact tested head `de8c9a39454aff6e98433a8970a4d488a19c1999`; CI run `34770274454` SUCCESS.
- Exact-head Vercel preview `dpl_9kELZB4G5EMLLe9XTGdoJWFnQmLz` READY with clean errors-only build.
- Merge/main HEAD `6476ad690e851280be849c51e981d3effaab0c14`.
- Production deployment `dpl_9Y2zrovXnugQ6PiVuWAV42xBVSnn` READY on `https://namdar.co.uk`.
- Production `/api/health` HTTP 200 after deploy.
- Production Admin loader `6.4.28-newsletter-centre-1`, including `admin-newsletter-center.js`.
- Supabase production `qjigldxjcpnrlyxgmlqq`.
- Window only live; address work parked; privileged Staff/Admin requires AAL2/MFA.
- Stripe commercial payment policy OFF; no live Stripe credentials.

## Stable existing systems
- System Health live; first genuine hourly run verified healthy/no false alert.
- Business Finance sole-trader-first with sandbox Stripe excluded.
- Smart receipt OCR/review workflow live; user deferred its first authenticated receipt test.

## Newsletter Centre — LIVE
Applied migrations:
- `20260913162500 newsletter_campaign_delivery_queue`
- `20260913162600 newsletter_delivery_processing_claims`

`newsletter_campaign_deliveries` is a private server-mediated per-recipient queue with unique `(campaign_id, subscriber_id)` dedupe, statuses `queued | processing | sent | failed | skipped`, provider id/generic failure code, timing fields, RLS enabled and no browser policy. A queued row must be atomically claimed as processing before sending; stale processing claims older than 10 minutes can be returned to queued, and retry only requeues failed rows. Sent rows are never reset by resume/retry.

`lib/newsletter.js` handles topic preferences, HTTPS CTA validation, safe campaign normalization, branded HTML/plain-text rendering, first-name greeting, Manage preferences / Unsubscribe links for real subscriber mail, clearly marked `[TEST]` emails without subscriber tokens, and delivery counts.

`api/admin-newsletter.js` requires `requireStaff(req,'newsletter')`. GET returns safe dashboard/subscriber/campaign data without private tokens. POST supports `save_draft`, `test`, `start_send`, `process_send`, `retry_failed`, and `delete_draft`. Sending occurs in resumable batches of up to 10 and current subscriber status/preferences are rechecked immediately before every provider send.

`api/admin-newsletter-send.js` no longer performs the old unsafe one-request bulk loop; cached clients receive 409 and must refresh into Newsletter Centre.

`admin-newsletter-center.js` adds audience KPIs, draft composer, preheader, CTA, topic audience, live branded preview, test email, exact-recipient confirmation, progress/resume, campaign history and subscriber search/status/topic filters. It never exposes subscriber tokens.

`api/newsletter-unsubscribe.js` + `unsubscribe.html/js` now provide a preference centre for Offers / Property-care tips / Namdar news and full unsubscribe. Essential quote/booking/payment/account messages are separate and unaffected.

Consent boundary remains explicit: customer accounts are never automatically enrolled in marketing. No real campaign/test email was sent during development or deployment verification.

### Production verification
Immediately after PR #67 deployment:
- active subscribers: 3;
- campaigns: 0;
- `newsletter_campaign_deliveries`: 0.

The pre-existing unused `newsletter_deliveries` table remains untouched; no current code references it. Its old missing-index advisor item is separate from the new queue, which has the required FK indexes.

## Next verification/use
1. User hard-refreshes Admin -> Newsletter and inspects Newsletter Centre.
2. When desired, create a controlled draft and use `Send test` to a deliberate address before any live campaign.
3. Do not send to the subscriber list unless the user explicitly confirms it from Admin.
4. Preserve explicit consent, easy preference management and resumable no-duplicate delivery behavior.

## Non-negotiables
- No auto-subscribe.
- No subscriber tokens/private list data in logs/docs/health UI.
- No duplicate recipient sends across resume/retry/concurrency paths.
- Service emails remain separate from marketing opt-out.
- Existing System Health, finance, receipts and Stripe safety remain intact.
