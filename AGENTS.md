# Namdar AI development instructions

These instructions are mandatory for every AI or developer working in this repository.

## Fast resume

1. Read `docs/AI_START.md` first. It is the compact current-state/next-action file.
2. Verify the current `main` HEAD and any live provider state relevant to the task before relying on recorded deployment details.
3. For a simple status/continuation task, read only the relevant sections of `docs/AI_HANDOFF.md`, `docs/PROJECT_STATUS.md`, README and code.
4. Before any substantial production, code, database, API, security or configuration change, read `docs/AI_HANDOFF.md` and `docs/PROJECT_STATUS.md` completely, then inspect the relevant README/code.
5. Treat the repository and verified deployed/database state as the source of truth. If documentation conflicts with code or live state, verify the facts and correct the documentation.

## While working

- Continue the existing Namdar project; do not rebuild it from scratch.
- Preserve working features, design, branding, URLs and data unless the requested change requires otherwise.
- Never hard-code or commit passwords, API keys, access tokens, private customer data or other secrets.
- Keep Supabase migrations non-destructive, forward-only and safe for existing production data.
- Do not rerun migrations that the handoff says are already applied to production.
- Keep Vercel deployment compatibility, mobile responsiveness, accessibility, security and SEO intact.
- Use preview/testing checks before describing a change as production-ready.
- Prefer one clear next action over duplicating the same roadmap across many files.

## Before finishing substantial work

Update all three continuity files in the same change as the substantial product change:

- `docs/AI_START.md` — compact live state, immediate next action, blockers and do-not-repeat notes.
- `docs/AI_HANDOFF.md` — detailed technical continuity and verified provider/deployment state.
- `docs/PROJECT_STATUS.md` — broader project/roadmap status.

A substantial change includes any feature, bug fix, database or API change, environment-variable change, deployment/configuration change, security change, or decision that affects future development.

Record:

- what changed and why;
- important files changed;
- database/migration impact;
- environment-variable impact;
- checks performed and their result;
- whether the change is deployed and production-ready;
- known issues and the next recommended task.

Keep `docs/AI_START.md` concise. It should answer, in seconds: **where are we, what is live, what must not be repeated, and what is the very next action?**

Do not claim that a migration was applied, a deployment is live, or a feature was tested unless it was actually verified.
