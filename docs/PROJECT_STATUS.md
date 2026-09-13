# Namdar project status

Last updated: 2026-09-13 UTC

## Production baseline
- Repo `pchroonic/pchroonic`, default `main`.
- Current product release: PR #67 `Upgrade Namdar Newsletter Centre`.
- Exact tested head `de8c9a39454aff6e98433a8970a4d488a19c1999`; CI `34770274454` SUCCESS.
- Exact preview `dpl_9kELZB4G5EMLLe9XTGdoJWFnQmLz` READY with clean build.
- Merge/main HEAD `6476ad690e851280be849c51e981d3effaab0c14`.
- Production deployment `dpl_9Y2zrovXnugQ6PiVuWAV42xBVSnn` READY on `https://namdar.co.uk`; `/api/health` HTTP 200.
- Production Admin loader `6.4.28-newsletter-centre-1`.
- Supabase production `qjigldxjcpnrlyxgmlqq`.
- Window Cleaning only live; future services planned; address work parked.

## Existing business systems
- Stripe sandbox checkout/refund verified; commercial customer payment policy OFF.
- Business Finance excludes sandbox money and uses sole-trader-first structure.
- Smart receipt workflow live; authenticated receipt test deferred by user.
- System Health live with genuine healthy cron history and no false incident/alert.

## Newsletter Centre — LIVE
Applied migrations:
- `20260913162500 newsletter_campaign_delivery_queue`
- `20260913162600 newsletter_delivery_processing_claims`

Capabilities now live:
- draft campaigns;
- subject, preheader, body and optional HTTPS CTA;
- topic audiences: All / Offers / Property-care tips / Namdar news;
- branded live preview;
- test email without changing campaign delivery counts;
- exact audience-count confirmation before send;
- private per-recipient resumable delivery queue;
- unique campaign/subscriber dedupe;
- atomic queued -> processing claim and stale-claim recovery;
- resumable 10-recipient batches;
- retry failed without resending successful recipients;
- subscriber status/preferences rechecked immediately before each delivery;
- campaign history/progress;
- subscriber search/status/topic filtering without private tokens;
- Email Preferences page for topic choices and full unsubscribe;
- essential quote/booking/payment/account emails remain separate;
- old unsafe bulk sender retired.

Consent/safety:
- no automatic marketing enrollment from customer accounts;
- no marketing message or test email was sent during the release;
- subscriber tokens stay server-side;
- production counts immediately after deployment remain 3 active subscribers, 0 campaigns, 0 new delivery rows.

A pre-existing unused `newsletter_deliveries` table remains untouched and is not used by current code. The new queue has the lifecycle/dedupe/indexing required by Newsletter Centre.

## Immediate next work
1. User can hard-refresh Admin -> Newsletter and inspect the new centre.
2. When ready, create a draft and use Send test to a deliberate address before any real campaign.
3. Do not send a live subscriber campaign without explicit user action.
4. Security hardening remains a separate priority; leaked-password protection is still a known Supabase warning.

## Handoff rule
Every substantial product/provider/data change updates `docs/AI_START.md`, `docs/AI_HANDOFF.md`, and this file. Never store credentials, raw API keys, subscriber tokens, customer secrets, TOTP codes, one-time Auth links or unnecessary private financial data in source/docs.
