# Namdar AI fast resume

Last verified: 2026-09-14 UTC

Read this first. Use `docs/AI_HANDOFF.md` for implementation detail and `docs/PROJECT_STATUS.md` for roadmap/status.

## Production baseline
- Repo `pchroonic/pchroonic`, default `main`.
- Current live product release: PR #69 `Upgrade Ask Namdar chat experience`.
- Exact tested PR head: `2b0d044a4e8e2e5276be2bdfa86a3e95d93f84f4`.
- GitHub CI run `34861747184`: SUCCESS.
- Exact-head preview `dpl_7LTPd5ZdodWWvM8GaJTkzfHryfdY`: READY; errors-only build clean.
- PR #69 merge/main: `935600a1bf8c7892bc6bc4fc0dafa118901b21e2`.
- Production deployment `dpl_8cUiMKDnNc3ko4hw7xtwQSFRFV9K`: READY on `https://namdar.co.uk`; production build clean.
- Production `/api/health`: HTTP 200 after deploy.
- Live public chat assets: `6.4.29-chat-1`; `conversion.js`, `chat-experience.js` and `chat-experience.css` verified HTTP 200 in production.
- Supabase production: `qjigldxjcpnrlyxgmlqq`.
- Window Cleaning only live; later services planned; address work parked.
- Privileged Staff/Admin requires AAL2/MFA.
- Stripe commercial customer payment policy OFF; no live Stripe credentials.

## Ask Namdar chat — LIVE
The public chat is now grounded in Namdar's live service catalogue and has a modern mobile/desktop experience.

Live behavior:
- Window Cleaning is the only service described as live/quotable/bookable.
- Gutters, jet washing, roof cleaning, handyman and 3D tours remain planned.
- Chat does not invent prices; pricing routes to the guide-estimate journey.
- Recent conversation history is available to the optional AI path for follow-up questions.
- AI provider calls, when configured, have a 7-second timeout, `store:false`, bounded history and strict public-business instructions.
- Provider failure falls back to deterministic guided help without exposing provider errors.
- Existing-customer support routes to private My Namdar support; guests are not promised public support tickets.
- Human staff takeover suppresses AI/assistant replies in that conversation.
- Invalid polling no longer creates empty sessions.
- UI includes suggested questions, typing state, contextual actions, conversation resume/new chat, retry state, privacy reminder, visibility-aware polling, keyboard controls, dark mode and mobile bottom-sheet layout.
- First guest message still requires Turnstile.

## Important AI-mode fact
Production `/api/config` was rechecked after deploy and still reports `aiEnabled:false`. Therefore the live box correctly operates as **Guided assistant**, not an active OpenAI model. Do not describe production as model-powered until provider credentials are deliberately configured and reverified.

No DB migration or environment-variable change was part of PR #69. No production chat message was sent as a deployment test.

## Other stable systems
- Newsletter Centre live with consent-aware drafts, preview/test, segmented audiences, resumable delivery, campaign history and subscriber preferences.
- System Health live with persistent scheduled-run history.
- Business Finance excludes sandbox Stripe.
- Smart receipts live; first authenticated receipt test deferred by user.

## Next action
1. User can inspect `Ask Namdar` on the live homepage and test the guided experience deliberately.
2. If the owner wants true model-powered chat, configure the OpenAI provider in Vercel separately, then verify `aiEnabled:true` and run a controlled chat test before calling it live AI.
3. Newsletter analytics remains a later task after the chat review.

## Do not break
- Window Cleaning remains the only live/quotable/bookable service.
- No guessed chat prices or fabricated availability.
- Customer support tickets remain private/customer-only.
- No passwords, card data, access tokens, prompts, provider keys or private customer data in assistant output/logs/docs.
- Human takeover must prevent assistant interjection.
- Newsletter consent/data and Stripe commercial safety state remain unchanged.
