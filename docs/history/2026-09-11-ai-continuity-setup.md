# AI continuity setup — 2026-09-11

## Purpose

Make the Namdar project understandable across ChatGPT/Codex, Claude, GitHub Copilot and future development sessions without relying on chat history or user reminders.

## Added

- Root `AGENTS.md` startup and completion rules.
- Root `CLAUDE.md` with automatic handoff imports for Claude-compatible environments.
- GitHub Copilot repository instructions.
- Current `docs/AI_HANDOFF.md` and `docs/PROJECT_STATUS.md` records.
- A repository check that detects product-source changes without corresponding handoff updates.

## Database, environment and deployment impact

- Supabase: no schema or data change.
- Environment variables: none added or changed.
- Migration: none required.
- Product behaviour: unchanged.
- Deployment: no product behaviour was changed. Vercel automatically created a `READY` production deployment from the GitHub `main` continuity commit.
