# Namdar AI development instructions

These instructions are mandatory for every AI or developer working in this repository.

## Before making changes

1. Read `docs/AI_HANDOFF.md` in full.
2. Read `docs/PROJECT_STATUS.md` in full.
3. Read the relevant sections of `README.md` and inspect the current code before proposing or making changes.
4. Treat the repository and verified deployed/database state as the source of truth. If documentation conflicts with code or live state, verify the facts and correct the documentation.

## While working

- Continue the existing Namdar project; do not rebuild it from scratch.
- Preserve working features, design, branding, URLs and data unless the requested change requires otherwise.
- Never hard-code or commit passwords, API keys, access tokens, private customer data or other secrets.
- Keep Supabase migrations non-destructive, idempotent where practical and safe for existing production data.
- Do not rerun migrations that `README.md` or the handoff says are already applied to production.
- Keep Vercel deployment compatibility, mobile responsiveness, accessibility, security and SEO intact.
- Use preview/testing checks before describing a change as production-ready.

## Before finishing substantial work

Update both of these files in the same commit as the code change:

- `docs/AI_HANDOFF.md`
- `docs/PROJECT_STATUS.md`

A substantial change includes any feature, bug fix, database or API change, environment-variable change, deployment/configuration change, security change, or decision that affects future development.

Record:

- what changed and why;
- important files changed;
- database/migration impact;
- environment-variable impact;
- checks performed and their result;
- whether the change is deployed and production-ready;
- known issues and the next recommended task.

Do not claim that a migration was applied, a deployment is live, or a feature was tested unless it was actually verified.

