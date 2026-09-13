# Namdar AI fast resume

Last verified: 2026-09-13 UTC

Read this first. Use `docs/AI_HANDOFF.md` for implementation detail and `docs/PROJECT_STATUS.md` for roadmap/status.

## Production baseline
- Repo `pchroonic/pchroonic`, default `main`.
- Current product release: PR #67 `Upgrade Namdar Newsletter Centre`.
- Exact tested head `de8c9a39454aff6e98433a8970a4d488a19c1999`; GitHub CI `34770274454` SUCCESS.
- Exact-head Vercel preview `dpl_9kELZB4G5EMLLe9XTGdoJWFnQmLz` READY; errors-only build clean.
- Merge/main HEAD `6476ad690e851280be849c51e981d3effaab0c14`.
- Production deployment `dpl_9Y2zrovXnugQ6PiVuWAV42xBVSnn` READY on `https://namdar.co.uk`.
- Production `/api/health` HTTP 200 after deploy.
- Production Admin loader `6.4.28-newsletter-centre-1`, including `admin-newsletter-center.js`.
- Supabase production `qjigldxjcpnrlyxgmlqq`.
- Window Cleaning only live; future services planned; address work parked.
- Privileged Staff/Admin requires AAL2/MFA.
- Stripe commercial customer payment policy OFF; no live Stripe credentials.

## Finance / receipts / health
- Stripe sandbox payment/refund flow verified; sandbox rows excluded from finance.
- Sole trader first, limited company later from real incorporation date.
- Smart receipts live; first authenticated receipt test deferred by user.
- System Health live; first real hourly run verified healthy with persistent history and no false incident/alert.

## Newsletter Centre — LIVE
Applied migrations:
- `20260913162500 newsletter_campaign_delivery_queue`;
- `20260913162600 newsletter_delivery_processing_claims`.

Live capabilities:
- draft campaigns with subject, preheader, body, audience topic and optional HTTPS CTA;
- branded live preview;
- test email without altering subscriber campaign counts;
- exact-recipient confirmation before send;
- audience segmentation for Offers / Property-care tips / Namdar news;
- private per-recipient resumable delivery queue with unique campaign/subscriber dedupe;
- atomic `queued -> processing` claim before provider send;
- stale-claim recovery after interruption;
- retry failed without resending successful recipients;
- current subscriber status/preferences rechecked before every delivery;
- campaign history/progress plus subscriber search/filtering;
- Email Preferences page for topic choices and full unsubscribe;
- old unsafe single-request bulk sender retired.

Consent/safety:
- customer accounts are never automatically marketing subscribers;
- essential quote/booking/payment/account emails remain separate from marketing preferences;
- subscriber tokens are server-side only and never returned by the Admin dashboard;
- no real marketing email was sent during development or deployment verification.

Verified immediately after production deployment:
- active subscribers: 3;
- campaigns: 0;
- new delivery rows: 0.

There is a pre-existing unused legacy table `newsletter_deliveries`; it is not used by Newsletter Centre and was left untouched rather than destructively removed in this release.

## Next action
1. User can hard-refresh Admin -> Newsletter and inspect Newsletter Centre.
2. When ready, create a controlled draft and use `Send test` to a deliberate test address before any real campaign.
3. Do not send to the subscriber list without explicit user action in Admin.
4. Keep Stripe commercial policy OFF until separately decided.

## Do not break
- Explicit marketing consent only; never auto-subscribe customers.
- Unsubscribe/preference controls remain easy and service emails remain separate.
- No subscriber tokens/PII in logs/docs/health output.
- No duplicate sends from concurrent/resumed batches.
- Smart receipts remain review-first; sandbox Stripe never enters finance.
