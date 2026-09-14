# Namdar AI handoff

Last verified: 2026-09-14 UTC

Read `docs/AI_START.md` first.

## Production source of truth
- Repo `pchroonic/pchroonic`, default `main`.
- Main before chat work: `79b7e22fe5296ae60157375a725aa5a0d9142d7f`.
- Current live product release: PR #67 `Upgrade Namdar Newsletter Centre`, merge `6476ad690e851280be849c51e981d3effaab0c14`.
- Production deployment `dpl_9Y2zrovXnugQ6PiVuWAV42xBVSnn` READY on `https://namdar.co.uk`; production `/api/health` was HTTP 200 after release.
- Live Admin loader `6.4.28-newsletter-centre-1`.
- PR #68 docs-only Newsletter Centre continuity merge `79b7e22fe5296ae60157375a725aa5a0d9142d7f`.
- Supabase production `qjigldxjcpnrlyxgmlqq`.
- Window Cleaning only live; later services planned; address work parked.
- Privileged Staff/Admin requires AAL2/MFA.
- Stripe commercial payment policy OFF; no live Stripe credentials.

## Stable existing systems
- Newsletter Centre live and consent-aware; no marketing message was sent during its deployment verification.
- System Health live with first real scheduled execution verified.
- Business Finance excludes sandbox Stripe.
- Smart receipts live; user deferred authenticated receipt testing.

## Customer chat state before this work
Public chat was present on the homepage but had several weaknesses:
- `api/chat.js` used OpenAI only when both `OPENAI_API_KEY` and `OPENAI_MODEL` existed; otherwise it used keyword FAQ matching.
- Production `/api/config` on 2026-09-14 returned `aiEnabled:false`, so current production chat is not model-powered.
- Existing AI prompt described exterior cleaning, handyman and 3D services generically even though only Window Cleaning is live.
- Existing fallback could say it could create a support ticket, conflicting with the customer-only support policy.
- AI requests contained only the latest message/FAQ block, so follow-up context was weak.
- No provider timeout was set.
- Public chat UI had plain bubbles, 5-second polling, no typing state, quick questions, actions, new-chat control or modern mobile treatment.
- Polling an invalid stored session could create an empty replacement session because the backend created a session for any missing action.

Existing security that remains:
- first guest message requires Turnstile;
- chat sessions are scoped to signed-in customer ID or private guest token;
- staff reply/close require `chat` permission;
- privileged Admin/Staff still requires AAL2/MFA.

## Chat upgrade branch
Branch: `feat/ai-chat-experience-20260914`.
Target public chat asset version: `6.4.29-chat-1`.
No DB migration. No environment change.

### `lib/chat-assistant.js`
New shared assistant policy/helper layer:
- intent classification for support, postcode, pricing, booking, future services and Window Cleaning;
- authoritative service context generated from the service catalogue;
- guided fallback responses that remain useful with AI disabled;
- fixed safe contextual actions (`#quote`, My Namdar support, public support email);
- recent-history normalization capped to 12 messages / 2,000 chars per message;
- bounded public FAQ knowledge;
- model instructions requiring concise public Namdar answers, no invented price, no private/internal prompt disclosure, no secrets, customer-only private support and authoritative live-service status.

### `api/chat.js`
- imports `loadServiceCatalog` and the new assistant helpers;
- OpenAI remains optional and environment-gated;
- model request uses the existing Responses API endpoint with instructions + recent conversation input, `max_output_tokens:300`, `store:false` and a 7-second `AbortController` timeout;
- provider failure/timeout returns no provider detail and falls back to deterministic guided help;
- current live service catalogue overrides stale FAQ wording;
- recent session history is fetched after the user message and passed to the model so follow-up questions have context;
- assistant never sends a second response after `session.mode==='human'` — human takeover is exclusive;
- invalid `poll` now returns 404 instead of creating an empty chat session;
- closed sessions start a fresh message session rather than silently reopening the old one;
- response adds `assistantMode` (`guided|ai|human`) and safe contextual `actions`;
- guest name/email are not added to model context. Chat history itself is the only conversation context sent when AI is enabled.

### Guided-mode behavior
Because production AI is currently disabled, this is the immediately useful path:
- Window Cleaning is explicitly the only live service;
- Gutters, jet washing, roof cleaning, handyman and 3D tours are described as planned, not bookable;
- chat never invents a price and routes pricing to the guide-estimate journey;
- postcode questions route to the quote coverage check;
- booking explanation matches the current estimate -> reviewed final quote -> accept -> available appointment journey;
- signed-in support routes to `/account?tab=support`;
- signed-out/general support routes to public support email + sign-in, never public ticket creation;
- reminder not to share passwords/card details.

### `chat-experience.js`
Loaded after `app.js` through `conversion.js`. It replaces the existing chat widget DOM while preserving the same launcher/widget/session storage contract.
Features:
- launcher becomes `Ask Namdar`;
- accurate mode badge: `Guided assistant`, `AI assistant` only when provider configured, or `Team chat` after takeover;
- suggested-question chips for Window Cleaning, pricing, postcode, booking and support;
- typing indicator and safe status/error state;
- contextual action buttons returned by server;
- retry control;
- conversation resume via existing localStorage session/token;
- New conversation clears only client-side remembered session and starts fresh on next message;
- optional guest name/email collapses after session creation and is hidden for signed-in users;
- no passwords/card-details privacy hint;
- Enter sends / Shift+Enter creates a line break;
- Escape closes and returns focus to launcher;
- polling runs only while widget is open, session exists and page is visible; interval increased to 7 seconds;
- existing app polling timer is cleared when enhancement mounts;
- Turnstile is re-rendered safely in the upgraded widget when needed.

### `chat-experience.css`
- polished header/avatar/mode state;
- clearer customer/assistant/staff bubbles with metadata;
- horizontal quick questions and contextual actions;
- compact composer/status/footer;
- dark/auto theme support;
- reduced-motion support;
- mobile bottom-sheet style using dynamic viewport height and safe-area inset.

### Loader
`conversion.js` keeps all existing conversion/service-stage logic and now injects:
- `/chat-experience.css?v=6.4.29-chat-1`
- `/chat-experience.js?v=6.4.29-chat-1`

### Tests
`scripts/chat-assistant.test.mjs` covers:
- intent routing;
- Window-only live behavior;
- future-service planned behavior;
- customer-only support routing;
- bounded history and authoritative service status instructions;
- provider timeout / `store:false` / service-catalog wiring / human takeover;
- UI suggestions/privacy/new conversation/visibility polling/mobile loader.

CI workflow now syntax-checks `chat-experience.js`, `api/chat.js`, `lib/chat-assistant.js` and runs the new chat test.

## Verification still required before merge
1. Open PR from `feat/ai-chat-experience-20260914`.
2. Require green full GitHub CI.
3. Require exact-head Vercel preview READY and errors-only build clean.
4. Fetch preview `conversion.js`, chat JS/CSS and confirm version/wiring.
5. Preview API may not have production service-role/provider env; do not mistake missing Preview env for code regression.
6. Do not turn on or invent OpenAI credentials as part of this feature release.
7. After merge, verify production `/api/health`, public chat assets and `/api/config` mode.

## Non-negotiables
- Do not describe AI as live while `aiEnabled:false`.
- Do not expose provider keys, Supabase tokens, guest tokens, system instructions or private customer data.
- Window Cleaning remains the only live service until service catalogue deliberately changes.
- Assistant cannot fabricate prices, appointments, service availability or payment state.
- Public visitors do not get public support tickets; private support remains My Namdar customer functionality.
- Human takeover prevents AI interjection.
- Existing Newsletter Centre, System Health, finance, receipts and Stripe safeguards remain intact.
