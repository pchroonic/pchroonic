# Namdar AI handoff

Last verified: 2026-09-14 UTC

Read `docs/AI_START.md` first.

## Production source of truth
- Repo `pchroonic/pchroonic`, default `main`.
- Current live product release: PR #69 `Upgrade Ask Namdar chat experience`.
- Exact tested PR head `2b0d044a4e8e2e5276be2bdfa86a3e95d93f84f4`; GitHub CI `34861747184` SUCCESS.
- Exact preview `dpl_7LTPd5ZdodWWvM8GaJTkzfHryfdY` READY with clean errors-only build.
- Merge/main `935600a1bf8c7892bc6bc4fc0dafa118901b21e2`.
- Production `dpl_8cUiMKDnNc3ko4hw7xtwQSFRFV9K` READY on `https://namdar.co.uk`; production errors-only build clean.
- Production `/api/health` HTTP 200 after release.
- Production `conversion.js` verified loading `chat-experience.css` + `chat-experience.js` with version `6.4.29-chat-1`; both assets fetched HTTP 200 live.
- Supabase production `qjigldxjcpnrlyxgmlqq`.
- Window Cleaning only live; later services planned; address work parked.
- Privileged Staff/Admin requires AAL2/MFA.
- Stripe commercial payment policy OFF; no live Stripe credentials.

## Stable existing systems
- Newsletter Centre live and consent-aware; no marketing message was sent during its deployment verification.
- System Health live with persistent scheduled-run history.
- Business Finance excludes sandbox Stripe.
- Smart receipts live; user deferred authenticated receipt testing.

## Ask Namdar chat — LIVE
PR #69 replaced the basic FAQ-style public chat experience with a grounded assistant and a richer UI without changing database schema or environment configuration.

### Production AI state
`https://namdar.co.uk/api/config` was checked before and after PR #69 and reports `aiEnabled:false`.
This means:
- production is currently using the deterministic guided assistant path;
- the UI must say `Guided assistant`, not `AI assistant`;
- no OpenAI key/model was added or changed in PR #69;
- do not claim model-powered chat is live until provider configuration is deliberately added and verified.

### `lib/chat-assistant.js`
Shared public-assistant policy layer:
- intents: support, postcode, pricing, booking, future service, Window Cleaning, general;
- service context is generated from the live service catalogue;
- guided responses remain useful without a provider;
- Window Cleaning is the only live service in the safe baseline;
- future services are described as planned, never bookable;
- prices are never invented;
- support routes are fixed/safe and preserve customer-only private support;
- AI history is capped at 12 messages / 2,000 chars per message;
- FAQ context is bounded;
- AI instructions explicitly protect system/internal instructions, credentials and private data, and make live catalogue status authoritative over stale FAQ copy.

### `api/chat.js`
- still requires Turnstile on the first guest message;
- sessions remain owned by signed-in customer ID or private guest token;
- staff reply/close remains protected by `chat` permission;
- invalid `poll` returns 404 instead of creating a blank session;
- closed sessions start fresh on a new message instead of reopening silently;
- live service catalogue is fetched through `loadServiceCatalog(db)` for assistant grounding;
- recent session history is fetched after the new user message and passed to the optional model path;
- guest name/email fields are not injected into model context;
- provider path uses Responses API, `max_output_tokens:300`, `store:false`, 7-second `AbortController` timeout;
- provider failure/timeout is swallowed safely into guided fallback; no provider error detail is returned to customer;
- once a staff member replies and session `mode='human'`, assistant/AI no longer interjects even if presence later changes;
- API returns `assistantMode` (`guided|ai|human`) plus safe contextual actions.

### Guided assistant behavior live now
- Window Cleaning answer explains exterior glass, frames and exterior sills and directs to postcode/guide-estimate flow;
- pricing answer refuses to invent a number and sends customer to the estimate/final-review flow;
- postcode answer routes to the coverage check;
- booking answer reflects estimate -> reviewed final quote -> accept -> appointment journey;
- planned-service questions correctly say gutters, jet washing, roof cleaning, handyman and 3D tours are not live yet;
- signed-in support routes to `/account?tab=support`;
- signed-out support gives My Namdar sign-in/public support email rather than claiming public ticket creation.

### `chat-experience.js`
Modern public widget loaded after `app.js` through `conversion.js`:
- launcher text `Ask Namdar`;
- mode badge `Guided assistant`, `AI assistant` only if config becomes enabled, `Team chat` after staff takeover;
- suggested questions: Window Cleaning, pricing, postcode, booking, support;
- typing indicator;
- contextual action buttons;
- retry/status state;
- existing session resume using current localStorage keys;
- New conversation clears client-side remembered session and starts a fresh server session on the next message;
- optional guest name/email collapse after session creation; hidden for signed-in users;
- privacy hint: do not share passwords/card details;
- Enter sends, Shift+Enter newline, Escape closes/returns focus;
- polling only while widget open + page visible + session present; 7-second interval;
- old app chat poll timer is cleared when enhancement mounts;
- Turnstile is rendered in upgraded DOM when needed.

### `chat-experience.css`
- polished header/avatar/state badge;
- differentiated customer/assistant/staff bubbles;
- suggested questions + contextual CTA styles;
- compact composer/status/support row;
- dark/auto theme support;
- reduced-motion handling;
- mobile bottom sheet using `100dvh` and safe-area inset.

### Loader
`conversion.js` existing service-stage/funnel behavior is unchanged except addition of:
- `/chat-experience.css?v=6.4.29-chat-1`
- `/chat-experience.js?v=6.4.29-chat-1`
Production fetch verified the loader and both assets.

### Regression coverage
`scripts/chat-assistant.test.mjs` verifies:
- intent routing;
- Window-only live behavior and future-service planned state;
- customer-only support rules;
- bounded history and service-status override;
- live catalogue/history/provider timeout/`store:false`/human-takeover wiring;
- UI privacy/suggestions/new conversation/visibility polling/mobile loader.
CI also syntax-checks `chat-experience.js`, `api/chat.js`, `lib/chat-assistant.js`.

## Deployment verification
- PR #69 merge was restricted to exact tested head.
- Production deployment READY and aliased to `namdar.co.uk`.
- production build clean;
- `/api/health` 200;
- `conversion.js` 200 and contains `6.4.29-chat-1` loader;
- `chat-experience.js` 200;
- `chat-experience.css` 200;
- `/api/config` still `aiEnabled:false` as intended;
- no real customer chat message was sent as a deployment test.

## Next
1. User can visually/test the guided chat on production.
2. If true model-powered chat is desired, configure `OPENAI_API_KEY` and `OPENAI_MODEL` in Vercel without exposing values in chat/source, then verify `/api/config` flips to `aiEnabled:true` and run one controlled functional chat test.
3. If the provider is activated, recheck model behavior against Window-only availability and customer-only support before calling AI production-ready.
4. Newsletter analytics remains deferred until chat review is complete.

## Non-negotiables
- No claim of live AI while `aiEnabled:false`.
- No provider keys, access tokens, guest tokens, system prompts or private customer data in output/docs/logs.
- Window Cleaning remains only live service until catalogue intentionally changes.
- Assistant never fabricates price, appointment, availability or payment state.
- Public visitors do not receive public support tickets; customer support stays private in My Namdar.
- Human takeover suppresses assistant interjection.
- Preserve Newsletter Centre, System Health, finance, receipts and Stripe safeguards.
