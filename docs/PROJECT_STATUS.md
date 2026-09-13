# Namdar project status

Last updated: 2026-09-13 UTC

## Production baseline
- Repo `pchroonic/pchroonic`, default `main`.
- Current live product release remains PR #64 System Health, merge `c9028003b68095b7ef4c9d601980afe359017448`.
- Production deployment `dpl_BsZbTcWLNHYgP9hrCxLUgPsXHLas` READY on `https://namdar.co.uk`; `/api/health` HTTP 200 after release.
- Live Admin loader before Newsletter Centre work: `6.4.27-system-health-1`.
- Supabase production `qjigldxjcpnrlyxgmlqq`.
- Window Cleaning only live; future services planned; address work parked.

## Existing business systems
- Stripe sandbox checkout/refund verified; commercial customer payment policy OFF.
- Business Finance excludes sandbox money and uses sole-trader-first structure.
- Smart receipt workflow live; authenticated receipt test deferred by user.
- System Health live and first genuine hourly run verified healthy with persistent history and no false incident/alert.

## Newsletter Centre — IN PROGRESS
Branch `feat/newsletter-centre-20260913`, target loader `6.4.28-newsletter-centre-1`.

Pre-work state:
- 3 active explicit-consent subscribers;
- 0 campaigns;
- existing subscriber preferences for offers/tips/news;
- existing campaign schema already supported preheader, CTA, audience topic and delivery counts;
- Admin exposed only Subject + Message + unsafe single-request bulk send.

Applied migrations:
- `20260913162500 newsletter_campaign_delivery_queue`
- `20260913162600 newsletter_delivery_processing_claims`

Release adds:
- private per-recipient delivery queue;
- unique campaign/subscriber dedupe;
- atomic `queued -> processing` claims and stale-claim recovery;
- topic-aware audience segmentation;
- drafts and branded live preview;
- optional preheader and CTA;
- test-email action that does not alter subscriber campaign counts;
- exact-recipient send confirmation;
- resumable 10-recipient batches;
- retry failed without resending successful recipients;
- campaign history/progress;
- searchable/filterable subscriber list without private tokens;
- preference centre for Offers / Property-care tips / Namdar news;
- full unsubscribe remains available and essential service emails remain separate;
- old bulk sender retired so cached Admin clients cannot bypass the safe workflow.

Consent/safety:
- customer accounts are never automatically marketing subscribers;
- current status/preferences are checked again immediately before every delivery;
- no campaign will be sent as part of deployment verification;
- existing 3 subscriber records are not modified by development work;
- subscriber tokens are server-side only and excluded from Admin responses.

## Immediate next work
1. Run database advisors and regression checks.
2. Open Newsletter Centre PR.
3. Require green GitHub CI + READY exact-head Vercel preview with clean build.
4. Merge only if clean and verify production loader/API health.
5. Verify subscriber count remains 3 active, campaigns 0, deliveries 0 after deployment.
6. User can later create a draft and deliberately send a test email before any real campaign.
7. Security hardening remains a separate priority; leaked-password protection is still a known Supabase warning.

## Handoff rule
Every substantial product/provider/data change updates `docs/AI_START.md`, `docs/AI_HANDOFF.md`, and this file. Never store credentials, raw API keys, subscriber tokens, customer secrets, TOTP codes, one-time Auth links or unnecessary private financial data in source/docs.
