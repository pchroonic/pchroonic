# Namdar AI fast resume

Last verified: 2026-09-14 UTC

Read this first. Use `docs/AI_HANDOFF.md` for implementation detail and `docs/PROJECT_STATUS.md` for roadmap/status.

## Production baseline
- Repo `pchroonic/pchroonic`, default `main`.
- Current main before this branch: `79b7e22fe5296ae60157375a725aa5a0d9142d7f`.
- Current live product release: PR #67 Newsletter Centre, merge `6476ad690e851280be849c51e981d3effaab0c14`.
- Production deployment `dpl_9Y2zrovXnugQ6PiVuWAV42xBVSnn` READY on `https://namdar.co.uk`.
- Production `/api/health` was HTTP 200 after that release.
- Live Admin loader: `6.4.28-newsletter-centre-1`.
- PR #68 is docs-only Newsletter Centre continuity, merge/main `79b7e22fe5296ae60157375a725aa5a0d9142d7f`.
- Supabase production: `qjigldxjcpnrlyxgmlqq`.
- Window Cleaning only live; later services planned; address work parked.
- Privileged Staff/Admin requires AAL2/MFA.
- Stripe commercial customer payment policy OFF; no live Stripe credentials.

## Stable systems
- Newsletter Centre live: drafts, preview, segmented consent audiences, test email, resumable delivery, campaign history and subscriber preferences. Deployment did not send email; post-release state was 3 active subscribers / 0 campaigns / 0 new delivery rows.
- System Health live with real scheduled-run history.
- Business Finance excludes sandbox Stripe.
- Smart receipts live; first authenticated receipt test deferred by user.

## Customer chat upgrade — IN PROGRESS
User asked to improve the website AI chat before further newsletter work.
Branch: `feat/ai-chat-experience-20260914`.
Target chat asset version: `6.4.29-chat-1`.

### Important production fact
`https://namdar.co.uk/api/config` reported `aiEnabled:false` on 2026-09-14. Production therefore currently uses the guided/FAQ fallback, not an OpenAI model. Do not describe production as model-powered until `OPENAI_API_KEY` + `OPENAI_MODEL` are actually configured and reverified. Never put provider secrets in source/docs/chat.

### Upgrade implemented on branch
- `lib/chat-assistant.js`: grounded intents, live-service context, customer-only support routing, bounded conversation history and AI instructions.
- `api/chat.js`: live service catalogue is authoritative; recent conversation context is supplied to AI when configured; 7-second provider timeout; `store:false`; graceful guided fallback; staff takeover suppresses AI; stale poll no longer creates empty chat sessions.
- Guided fallback accurately says Window Cleaning is the only live service and never invents prices.
- Guest support no longer promises public ticket creation. Existing customers are routed to private My Namdar support; pre-service enquiries can use the public support email.
- `chat-experience.js/css`: modern Ask Namdar UI, suggested questions, typing indicator, contextual actions, new/resumed conversations, better error/retry state, privacy reminder, keyboard Escape, visibility-aware polling and mobile bottom-sheet layout.
- `conversion.js` loads the upgraded chat assets.
- `scripts/chat-assistant.test.mjs` + CI syntax/test coverage added.

No database migration is required. No environment variable is changed by this branch. No customer chat/session data is modified during development.

## Next action
1. Finish branch continuity docs.
2. Open the chat PR.
3. Require green GitHub CI and exact-head Vercel preview READY with clean build.
4. Verify preview assets/API behavior without sending or exposing private chat/customer data.
5. Merge only if clean, then verify production health and live chat assets.
6. Keep the UI labelled `Guided assistant` while production `aiEnabled:false`; activate `AI assistant` only after provider configuration is deliberately added and verified.

## Do not break
- Window Cleaning remains the only live/quotable/bookable service.
- No guessed chat prices; final quote remains reviewed before booking.
- Customer support tickets remain private/customer-only.
- No passwords, card data, tokens, prompts, provider keys or private customer data in assistant output/logs/docs.
- Human takeover must prevent AI from interjecting in that conversation.
- Newsletter consent/data and Stripe commercial safety state remain unchanged.
