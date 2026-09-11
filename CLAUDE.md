# Namdar project instructions for Claude

Start with the compact resume file:

@docs/AI_START.md

For any substantial production/code/database/security/configuration change, also read these completely before editing or running project commands:

@docs/AI_HANDOFF.md
@docs/PROJECT_STATUS.md

Then follow `AGENTS.md` and inspect the relevant README/code. Continue the existing Namdar project incrementally and preserve working features and data.

After every substantial change, update **all three** continuity files in the same change:
- `docs/AI_START.md`
- `docs/AI_HANDOFF.md`
- `docs/PROJECT_STATUS.md`

The owner should not need to remind you. Keep `AI_START.md` short and make its immediate next action explicit. Never place secrets or customer data in documentation, commits or chat output.

At the end of substantial work, clearly state what changed, files affected, Supabase impact, environment-variable impact, migration requirements, tests performed, deployment status, production readiness and the next action.
