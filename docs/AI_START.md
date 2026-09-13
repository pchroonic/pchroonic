# Namdar AI fast resume

Last verified: 2026-09-13 UTC

Read this first. Use `docs/AI_HANDOFF.md` for implementation detail and `docs/PROJECT_STATUS.md` for roadmap/status.

## Production baseline
- Repo `pchroonic/pchroonic`, default `main`.
- Current live product release remains PR #64 System Health; merge `c9028003b68095b7ef4c9d601980afe359017448`.
- Production deployment `dpl_BsZbTcWLNHYgP9hrCxLUgPsXHLas` READY on `https://namdar.co.uk`; `/api/health` HTTP 200 after release.
- Production Admin loader before this branch: `6.4.27-system-health-1`.
- PR #65/#66 are docs-only System Health continuity; first real hourly health run was healthy with no false incident/alert.
- Supabase production `qjigldxjcpnrlyxgmlqq`.
- Window Cleaning only live; future services planned; address work parked.
- Privileged Staff/Admin requires AAL2/MFA.
- Stripe commercial customer payment policy OFF; no live Stripe credentials.

## Finance / receipts
- Stripe sandbox payment/refund flow verified; sandbox rows excluded from finance.
- Sole trader first, limited company later from real incorporation date.
- Smart receipts live, first authenticated receipt test deferred by user.

## Newsletter Centre — IN PROGRESS
User asked to improve newsletter. Branch: `feat/newsletter-centre-20260913`.
Target Admin loader: `6.4.28-newsletter-centre-1`.

Existing consent boundary is preserved: customer accounts/emails are not marketing subscribers unless the person explicitly opts in. Current production data before this work: 3 active subscribers, 0 campaigns, 0 delivery rows. Do not expose subscriber PII in docs/chat.

Applied forward-only migrations:
- `20260913162500 newsletter_campaign_delivery_queue`;
- `20260913162600 newsletter_delivery_processing_claims`.

New private `newsletter_campaign_deliveries` queue:
- one unique row per campaign/subscriber;
- statuses queued/processing/sent/failed/skipped;
- atomic queued -> processing claim before send prevents concurrent duplicate sends;
- stale processing claims can be safely returned to queue;
- RLS enabled, no direct browser policies.

Branch implementation:
- `lib/newsletter.js`: topic/preferences logic, HTTPS CTA validation, branded HTML/plain-text email renderer and delivery counts;
- `api/admin-newsletter.js`: AAL2 newsletter-permission dashboard, save draft, test send, queue audience, resumable 10-recipient batches, retry failed, delete draft;
- `api/admin-newsletter-send.js`: old unsafe bulk sender retired with 409 refresh instruction;
- `admin-newsletter-center.js`: draft composer, preheader, CTA, audience topic, live preview, test email, exact recipient confirmation, resumable send progress, campaign history and subscriber filters;
- `api/newsletter-unsubscribe.js` + `unsubscribe.html/js`: topic preference centre for offers/tips/news plus unsubscribe-all;
- `scripts/newsletter-center.test.mjs` + CI checks.

Important sending safety:
- no real marketing message is sent during development/verification;
- queue creation does not send by itself;
- a browser can close mid-send; reopening/resuming processes only unsent rows;
- already-sent delivery rows are never reset by normal resume/retry;
- current subscriber status/preferences are rechecked immediately before each send;
- preference/unsubscribe links are unique to the subscriber but tokens are never returned in the Admin dashboard.

## Next action
1. Finish continuity docs and database advisor checks.
2. Open Newsletter Centre PR.
3. Require green GitHub CI and READY exact-head Vercel preview with clean build.
4. Do not send a real newsletter for deployment testing.
5. Merge only if clean; verify production loader/API health and unchanged subscriber/campaign counts.
6. User can later create a controlled draft/test email from Admin.

## Do not break
- Explicit marketing consent only; never auto-subscribe customers.
- Unsubscribe remains easy and essential service emails stay separate.
- No subscriber tokens/PII in logs/docs/health output.
- No duplicate sends from concurrent/resumed batches.
- Stripe commercial policy remains OFF.
- Smart receipts remain review-first; sandbox Stripe never enters finance.
