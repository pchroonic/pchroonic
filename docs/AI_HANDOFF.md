# Namdar AI handoff

Last verified: 2026-09-13 UTC

Read `docs/AI_START.md` first.

## Production source of truth
- Repo `pchroonic/pchroonic`, default `main`.
- Current live product release remains PR #64 `Add Admin System Health and reliability history`, merge `c9028003b68095b7ef4c9d601980afe359017448`.
- Production deployment `dpl_BsZbTcWLNHYgP9hrCxLUgPsXHLas` READY on `https://namdar.co.uk`; production `/api/health` HTTP 200 after release.
- Production Admin loader before Newsletter Centre work: `6.4.27-system-health-1`.
- Supabase production `qjigldxjcpnrlyxgmlqq`.
- Window only live; address work parked; privileged Staff/Admin requires AAL2/MFA.
- Stripe commercial payment policy OFF; no live Stripe credentials.

## Stable existing systems
- System Health is live and first real hourly cron persistence path is verified healthy/no false alert.
- Business Finance is sole-trader-first with sandbox Stripe excluded.
- Smart receipt OCR/review workflow is live; user deferred its first authenticated receipt test.

## Newsletter state before this work
Current production newsletter foundation already had:
- public explicit-consent homepage form;
- account registration/profile marketing opt-in;
- subscriber `status`, consent timestamps, unique unsubscribe token and topic preferences `{offers,tips,news}`;
- campaign fields for preheader, plain text, CTA, audience topic, recipient/sent/failed counts;
- unsubscribe page/API.

But Admin only exposed Subject + Message + one bulk-send button. The old send API iterated the entire active list in one request and could not safely resume after interruption. It also did not expose topic segmentation, drafts, preview/test, history or failed-delivery detail.

Verified data before migration:
- active subscribers: 3;
- total subscribers: 3;
- campaigns: 0;
- delivery rows: 0.
Never include subscriber emails/names/tokens in handoff docs or chat unless specifically necessary.

## Newsletter Centre branch
Branch: `feat/newsletter-centre-20260913`.
Target Admin loader: `6.4.28-newsletter-centre-1`.

### Applied migrations
- `20260913162500 newsletter_campaign_delivery_queue`
- `20260913162600 newsletter_delivery_processing_claims`

Matching SQL files are committed under `supabase/migrations/`.

### `newsletter_campaign_deliveries`
Private server-mediated queue with:
- `campaign_id` FK -> campaigns, cascade on campaign deletion;
- `subscriber_id` FK -> subscribers, set null on deletion;
- status `queued | processing | sent | failed | skipped`;
- provider id and generic failure code only;
- attempted/sent/create/update timestamps;
- unique `(campaign_id, subscriber_id)` to prevent one campaign creating duplicate recipient deliveries;
- campaign/status + subscriber indexes;
- RLS enabled and no direct browser policy.

Sending concurrency design:
1. a recipient is inserted once as `queued`;
2. worker atomically PATCHes `queued -> processing` using `id` + current-status predicate;
3. only the request that successfully receives the claimed row sends the email;
4. terminal row becomes sent/failed/skipped;
5. processing rows older than 10 minutes are reclaimed to queued so interrupted sends can resume;
6. ordinary retry only changes failed rows back to queued; sent rows are untouched.

### `lib/newsletter.js`
- valid topics `all/offers/tips/news`;
- subscriber topic preference checks;
- email/HTTPS CTA validation;
- campaign input normalization;
- branded HTML + plain-text rendering;
- personalized first-name greeting where available;
- Manage preferences + Unsubscribe links for real subscriber emails;
- test emails clearly prefixed `[TEST]` and contain no subscriber token;
- delivery status counting.

### `api/admin-newsletter.js`
Protected with `requireStaff(req,'newsletter')`.
GET returns safe subscriber/campaign dashboard data and aggregate audience counts; unsubscribe/confirm tokens are excluded.
POST actions:
- `save_draft`: create/update draft only;
- `test`: send a clearly marked test without changing campaign delivery counts;
- `start_send`: resolve current consenting audience, create unique queued deliveries and mark campaign sending;
- `process_send`: reclaim stale claims, claim max 10 queued deliveries, recheck current subscriber status/preferences, send and update progress;
- `retry_failed`: queue only failed rows;
- `delete_draft`: draft-only deletion.

Campaign finishes `sent` after no queued/processing rows remain if at least one row sent/skipped; if all attempted deliveries fail it becomes `failed`. Partial failures are preserved in `failed_count` and may later be retried without resending successful recipients.

### Legacy sender
`api/admin-newsletter-send.js` no longer performs bulk sends. It requires newsletter permission and returns 409 instructing stale Admin clients to refresh into Newsletter Centre. This closes the bypass around resumable delivery and preference-aware logic.

### Admin UI
`admin-newsletter-center.js` dynamically upgrades the existing Newsletter tab after legacy Admin initialization and preserves hidden compatibility nodes for old `newsletterTools`.
Features:
- active/all + per-topic audience KPIs;
- subject, preheader, body, audience, CTA label/HTTPS URL;
- live branded preview;
- test-email field;
- save draft;
- send confirmation showing exact subject/audience count;
- safe batched progress and resume after interruption;
- campaign history with Edit/Resume/Retry failed;
- subscriber search, status filter and topic filter;
- no tokens shown.

### Subscriber preference centre
`api/newsletter-unsubscribe.js` now supports:
- GET current status/preferences by private token;
- POST `preferences` to update offers/tips/news;
- POST `unsubscribe` to leave all marketing;
- legacy bodyless POST remains full unsubscribe for compatibility.

`unsubscribe.html/js` now gives three topic checkboxes and an explicit Unsubscribe all action. Email links can use `?action=unsubscribe` for direct unsubscribe. Essential quote/booking/payment/account emails remain unaffected.

### Tests/CI
`scripts/newsletter-center.test.mjs` covers preference filtering, CTA validation, email controls, processing state, permission wiring, legacy sender retirement, preference API and loader version. Workflow syntax/test list now includes all new newsletter JS/API/helper files and `unsubscribe.js`.

## Safety decisions
- Do not send a real campaign as a deployment test.
- Existing three subscriber records remain untouched.
- Customer accounts are never auto-enrolled in marketing.
- A send is always explicit: save draft -> explicit audience confirmation -> queue -> process.
- Before each actual delivery Namdar rechecks subscriber status/preferences.
- Subscriber tokens are only fetched server-side at delivery time and are not returned to Admin UI.

## Next verification
1. Run Supabase security/performance advisors and confirm no new newsletter FK issue.
2. Open PR and require green CI.
3. Require exact-head Vercel preview READY + clean errors-only build; preview APIs may lack production service-role env as already known.
4. Merge only if clean.
5. Verify production `/api/health`, Admin loader `6.4.28-newsletter-centre-1`, new module fetch and unchanged 3 active subscribers / 0 campaigns / 0 deliveries.
6. User can later test a draft and a test-email deliberately. Do not send to the subscriber list without explicit user action from Admin.

## Non-negotiables
- Explicit consent only; no auto-subscribe.
- Easy unsubscribe/preference changes.
- No secrets/subscriber tokens/private list data in logs/docs/health UI.
- No duplicate recipient sends across resume/retry/concurrency paths.
- Existing System Health, finance, receipts and Stripe safety must remain intact.
