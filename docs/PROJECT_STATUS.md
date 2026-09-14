# Namdar project status

Last updated: 2026-09-14 UTC

## Production baseline
- Repo `pchroonic/pchroonic`, default `main`.
- Main before current chat branch: `79b7e22fe5296ae60157375a725aa5a0d9142d7f`.
- Current live product release: PR #67 Newsletter Centre, merge `6476ad690e851280be849c51e981d3effaab0c14`.
- Production deployment `dpl_9Y2zrovXnugQ6PiVuWAV42xBVSnn` READY on `https://namdar.co.uk`; health was HTTP 200 after release.
- Live Admin loader `6.4.28-newsletter-centre-1`.
- Supabase production `qjigldxjcpnrlyxgmlqq`.
- Window Cleaning only live; future services planned; address work parked.

## Existing business systems
- Newsletter Centre live with consent-aware drafts, preview/test, segmented audiences, resumable per-recipient delivery, campaign history and subscriber preference management.
- Stripe sandbox checkout/refund verified; commercial customer payment policy OFF.
- Business Finance excludes sandbox money and uses sole-trader-first structure.
- Smart receipt workflow live; authenticated receipt test deferred by user.
- System Health live with persistent scheduled-run history.

## Customer chat — UPGRADE IN PROGRESS
Branch `feat/ai-chat-experience-20260914`, target public chat asset `6.4.29-chat-1`.

Production `/api/config` on 2026-09-14 reported `aiEnabled:false`, so the existing public chat is currently FAQ/guided fallback rather than an active OpenAI model. This branch improves both guided mode now and the AI path for later deliberate provider activation.

Upgrade scope:
- ground chat in live service catalogue so only Window Cleaning is presented as live;
- preserve recent conversation history for AI follow-ups when configured;
- provider request bounded by timeout and graceful fallback;
- no model storage request (`store:false`);
- no guessed prices;
- planned services never presented as currently bookable;
- customer-only private support routing; no public ticket-creation promise;
- human staff takeover suppresses assistant replies;
- invalid poll no longer creates empty chat sessions;
- modern Ask Namdar interface with quick questions, typing indicator, contextual action buttons, new/resumed conversation controls, retry state and privacy reminder;
- improved accessibility, visibility-aware polling, dark mode and mobile bottom-sheet layout;
- Turnstile remains required for the first guest message.

No database migration and no environment change are required for the chat feature itself. Existing production AI credentials are not being invented or changed. No customer chat data is modified during development.

## Immediate next work
1. Open the customer-chat PR.
2. Require green GitHub CI and exact-head Vercel preview READY/clean build.
3. Verify preview chat assets and backend behavior without exposing private chat data.
4. Merge only if clean, then verify production health and the `6.4.29-chat-1` loader.
5. Keep the UI accurately labelled `Guided assistant` while production `aiEnabled:false`.
6. If/when the owner later configures an OpenAI API key/model in Vercel, verify the model-powered path separately before calling it live AI.
7. Newsletter analytics remains a later task after chat is complete.

## Handoff rule
Every substantial product/provider/data change updates `docs/AI_START.md`, `docs/AI_HANDOFF.md`, and this file. Never store credentials, API keys, guest tokens, customer secrets, raw prompts, TOTP codes, one-time Auth links or unnecessary private financial/chat data in source/docs.
