---
name: trivia-code-review
description: >
  Performs a comprehensive code and security review of the GStreet trivia app. Use this skill
  whenever the user wants to review, audit, or assess the app — especially phrases like "review
  the app", "security audit", "code quality check", "find bugs", "what should we fix", "health
  check", "performance review", or "what are the issues". Analyzes code quality, security,
  performance, UX, and missing edge cases, then produces a prioritized action plan using the
  red/yellow/green priority system. Always use this skill for any review or audit task on the trivia app.
---

# Trivia App — Comprehensive Code Review

Produces a prioritized action plan across 5 dimensions: code quality, security, performance,
UX, and missing edge cases.

## Workflow

### Step 1 — Read source files
Read all files in src/components/ and src/utils/, plus:
- docs/DATABASE_SCHEMA.md
- docs/ROADMAP.md
- docs/AGENTS.md
- docs/AGENT_FLAGS.md

Focus extra attention on:
- CommissionerDashboard.js (~85 queries — highest complexity)
- AdminDashboard.js (~42 queries)
- MultiplayerLobby.js (~30 queries)
- achievementChecker.js — badge logic
- App.js — auth guards and routing

### Step 2 — Work through the review checklist
Read references/review-checklist.md and check every item. For each issue found, note:
- Which file and line if applicable
- Severity: CRITICAL / IMPORTANT / LOWER PRIORITY
- Specific fix recommendation

### Step 3 — Produce action plan
Output a prioritized action plan grouped by severity. For each item include:
- Clear description of the issue
- Specific file(s) affected
- Recommended fix with code snippet if helpful
- Which agent owns the fix per AGENTS.md

### Step 4 — Suggest execution order
Recommend which items to tackle first and whether to use the agent architecture or handle directly.

## Output Format

# Trivia App — Code Review [date]

## CRITICAL — Fix Immediately
### 1. [Issue title]
File: src/components/X.js
Issue: ...
Fix: ...
Agent: UI / COMMUNITY / AUTH / etc.

## IMPORTANT — Fix Soon
...

## LOWER PRIORITY — Good to Have
...

## Recommended Execution Order
1. ...

## Reference Files
- references/review-checklist.md — full checklist of known issue categories to inspect
