---
name: trivia-docs-refresh
description: >
  Refreshes documentation for the GStreet trivia app to match the current state of the codebase.
  Use this skill whenever the user wants to update, sync, or regenerate project documentation —
  especially when they say things like "update the docs", "sync the schema", "the docs are out of date",
  "do a documentation refresh", "schema drift", or after a major feature push. This skill reads all
  source files and rewrites DATABASE_SCHEMA.md and ROADMAP.md to accurately reflect what's actually
  in the code, treating the source as the single source of truth. Always use this skill for any
  documentation update task on the trivia app.
---

# Trivia App — Documentation Refresh

Rebuilds DATABASE_SCHEMA.md and ROADMAP.md from the actual source code and Supabase queries,
eliminating drift between docs and the live codebase.

## When to Run This
- After any major feature push
- When schema errors reveal undocumented columns (e.g. "column already exists")
- Before starting a new development cycle
- Whenever docs and code feel out of sync

## Workflow

### Step 1 — Read current docs
cat docs/DATABASE_SCHEMA.md
cat docs/ROADMAP.md

### Step 2 — Audit source files
grep -rn "\.from(" src/ --include="*.js" | grep -v "node_modules" | sort

This surfaces every Supabase table reference across the codebase. Use it to:
- Identify tables not in DATABASE_SCHEMA.md
- Identify columns selected/inserted that aren't documented
- Identify new components not reflected in ROADMAP.md

Also read:
ls src/components/
ls src/utils/

Cross-reference against ROADMAP.md completed features — any component file that exists
but isn't in Completed should be moved there.

### Step 3 — Rewrite DATABASE_SCHEMA.md
Rewrite to document every table referenced in .from() queries. For each table include:
- All columns visible in select(), insert(), and update() calls
- Column type (infer from usage if not explicit)
- Whether nullable (infer from usage)
- Relationships (FK references visible in joins)

Preserve the existing format: Tables Overview, Table Definitions, Relationships Diagram,
RLS Policies, Triggers & Functions, CSV Bulk Upload Format.

### Step 4 — Rewrite ROADMAP.md
- Move any feature clearly implemented in source into Completed
- Preserve all existing Known Issues (don't delete unless explicitly fixed)
- Preserve Planned features
- Add any new known issues discovered during the audit

### Step 5 — Save and commit
git add docs/DATABASE_SCHEMA.md docs/ROADMAP.md
git commit -m "docs: refresh schema and roadmap from source audit"

## Important Notes
- Source is truth — if the code and docs disagree, the code wins
- Do not delete Known Issues unless the fix is confirmed in the codebase
- Storage buckets count as infrastructure — document them alongside tables
- After refresh, flag to user that project knowledge files in Claude.ai should also be updated
