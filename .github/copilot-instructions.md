# Namdar repository instructions

Before suggesting or making changes, read `docs/AI_HANDOFF.md`, `docs/PROJECT_STATUS.md` and `AGENTS.md`.

Continue the existing Namdar system incrementally. Preserve working behaviour, branding, routes, customer data and deployment compatibility. Never commit secrets. Treat production database changes as high risk and never rerun a migration merely because the SQL or release notes exist.

For every substantial code, API, database, environment, configuration or security change, update both handoff files in the same commit. Include verification and deployment status; do not describe unverified work as live or production-ready.

