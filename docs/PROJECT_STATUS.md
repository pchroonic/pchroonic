# Namdar project status

Last updated: 2026-09-14 UTC

## Production baseline
- Repo `pchroonic/pchroonic`, default `main`.
- Current live product release: PR #69 `Upgrade Ask Namdar chat experience`.
- Exact tested head `2b0d044a4e8e2e5276be2bdfa86a3e95d93f84f4`; CI run `34861747184` SUCCESS.
- Exact preview `dpl_7LTPd5ZdodWWvM8GaJTkzfHryfdY` READY with clean build.
- Merge/main `935600a1bf8c7892bc6bc4fc0dafa118901b21e2`.
- Production deployment `dpl_8cUiMKDnNc3ko4hw7xtwQSFRFV9K` READY on `https://namdar.co.uk`; build clean and `/api/health` HTTP 200.
- Live public chat assets `6.4.29-chat-1` verified 200.
- Supabase production `qjigldxjcpnrlyxgmlqq`.
- Window Cleaning only live; future services planned; address work parked.

## Existing business systems
- Newsletter Centre live with consent-aware drafts, preview/test, segmented audiences, resumable per-recipient delivery, campaign history and subscriber preferences.
- Stripe sandbox checkout/refund verified; commercial customer payment policy OFF.
- Business Finance excludes sandbox money and remains sole-trader-first.
- Smart receipt workflow live; authenticated receipt test deferred by user.
- System Health live with persistent scheduled-run history.

## Ask Namdar chat — LIVE
PR #69 upgrades both the public assistant logic and customer-facing chat interface.

Assistant/business safety:
- service catalogue is authoritative;
- Window Cleaning only is live;
- future services are never presented as currently bookable;
- no invented prices;
- existing-customer support routes to private My Namdar;
- guests are not promised public support tickets;
- human takeover suppresses assistant/AI replies;
- first guest message remains Turnstile-protected;
- invalid stored-session polling no longer creates empty sessions.

Optional AI path:
- recent conversation history supports follow-up context;
- history/FAQ context are bounded;
- provider call uses a 7-second timeout and `store:false`;
- strict instructions protect private/internal information and service truth;
- provider failures fall back to guided answers without exposing provider errors.

Customer UI:
- `Ask Namdar` launcher;
- accurate Guided / AI / Team mode status;
- quick questions;
- typing indicator;
- contextual quote/postcode/support actions;
- resume + new conversation;
- retry/error state;
- optional contact details;
- privacy reminder;
- keyboard accessibility;
- visibility-aware polling;
- dark mode/reduced motion;
- mobile full-height bottom-sheet treatment.

Production `/api/config` after deploy still reports `aiEnabled:false`. Therefore the live assistant is intentionally in **Guided assistant** mode. No OpenAI credentials or model setting were added in this release. No DB migration was required, and no real chat message was sent as a deployment smoke test.

## Immediate next work
1. User can review/test Ask Namdar on the live homepage.
2. If true AI is wanted, configure OpenAI provider credentials in Vercel separately and securely, verify `aiEnabled:true`, then run a controlled functional test before calling model-powered chat live.
3. Newsletter analytics remains the next deferred product improvement after chat review.
4. Existing security hardening backlog remains separate.

## Handoff rule
Every substantial product/provider/data change updates `docs/AI_START.md`, `docs/AI_HANDOFF.md`, and this file. Never store credentials, provider keys, access tokens, guest tokens, raw system prompts, customer secrets, TOTP codes, one-time Auth links or unnecessary private financial/chat data in source/docs.
