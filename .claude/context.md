# Trivia Platform — Project Context

> This file is maintained by Claude across sessions to carry forward project context.
> It lives in the repo at `.claude/context.md` so both Cowork and Claude Code can read/update it.
> Commit updates alongside your code changes or as standalone commits after discussion-only sessions.

## Current State

- **Active branch**: main
- **Last deployment**: GitHub Pages (https://gstreet-ops.github.io/trivia-app/)
- **Frontend**: React (GitHub Pages)
- **Backend**: Supabase (us-east-1 region)
- **Default quiz length**: 3 questions (for testing)

## Architecture Notes

- Georgetown color palette: navy `#041E42`, gray `#54585A`
- Supabase handles auth, database, and edge functions
- URL config in Supabase must be set correctly for auth redirects (see `supabase-setup-guide.md`)
- Anthropic API key lives in Supabase Edge Function Secrets, never in repo
- Multiple Supabase projects in account (Trivia + Nemo) — always verify correct project in breadcrumb

## Active Work

_See ROADMAP.md for the full feature/bug backlog._

## Known Issues & Blockers

_None currently tracked. Add items here as they come up._

## Session Log

### 2026-02-27 — Initial context setup
- Created `.claude/context.md` to carry forward project context between sessions
- Created `trivia-project-context` skill for Cowork/Claude Code to auto-load this file
- No code changes to the trivia app itself this session
