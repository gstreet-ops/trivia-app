# Trivia Platform — Project Context

> This file is maintained by Claude across sessions to carry forward project context.

## Current State

- **Active branch**: main
- **Last deployment**: Both apps deployed to GitHub Pages (March 4, 2026)
- **trivia-app**: https://gstreet-ops.github.io/trivia-app/
- **quiz-embed**: https://gstreet-ops.github.io/gstreet-ops-quiz-embed/
- **Backend**: Supabase (us-east-1 region)

## Phase Status

- **Phase 1 (Site Tools)**: ✅ Complete — 6 site tool widgets + 3 standalone community widgets
- **Phase 2 (Connections)**: ✅ Mostly complete — only Stripe payments remaining
- **Phase 3 (Depth)**: ✅ Mostly complete — campaign email, site builder, contact merge shipped; visual workflow builder + discussion forums deferred
- **CRM/Contacts layer**: Designed (5 tables specced in `docs/CRM_CONTACTS_SPEC.md`) but NOT migrated

## Architecture Notes

- Georgetown color palette: navy `#041E42`, gray `#54585A`
- Granular RBAC: fully implemented — `community_roles` table, `permission_overrides`, `permission_audit_log`, `check_community_permission()` RPC, PermissionContext React context, RolesTab UI
- `communities.id` is `bigint`, NOT `uuid`
- 15 admin tabs in embed panel, 9 embeddable widgets
- Campaign email: `email_templates` + `email_campaigns` tables, CampaignComposer wizard
- Site Builder: `community_sites` table, 5 templates, hosted at `#/site/SLUG`
- Question difficulty voting: `question_difficulty_votes` table + trigger, auto-computed difficulty

## Recent Changes (March 2–5, 2026)

- Campaign email builder with segmentation (March 2)
- Site Builder wizard with templates (March 2)
- Granular RBAC system — community_roles, permission_overrides, PermissionContext (March 2)
- Admin undo approve/reject — "Revert to Pending" (March 3)
- Mobile touch targets audit — 44px minimum (March 3)
- Contact merge feature — find_duplicate_contacts + merge_contacts RPCs (March 3)
- Question difficulty voting — post-answer feedback + commissioner mismatch analytics (March 4)
- Comprehensive docs refresh — ROADMAP, DATABASE_SCHEMA, EMBED_ARCHITECTURE, README (March 4)
- Server-side RLS granular enforcement — all 10 community tables now use check_community_permission() instead of legacy role text checks (March 5)

## New Direction

- **Reading FC proof-of-concept**: Drop-in trivia widget for sports teams/brands
- Separate project repo planned
- Validates embed architecture as B2B offering

## Known Issues & Blockers

- Auth.users orphaned on user delete — manual cleanup needed
- Sentry confirmation still pending
- GitHub Pages CSS caching — use inline styles for critical layout
- Project file copies (Claude Project) drift from repo — canonical source is always `docs/`

## Project Assets
- **Project Timeline (Gantt Chart):** https://gistpreview.github.io/?1a9d3dc2b33e7081b9412f7fbefbdb0e
  - Source: GitHub Gist `gstreet-ops/1a9d3dc2b33e7081b9412f7fbefbdb0e`
  - Update via: `gh gist edit 1a9d3dc2b33e7081b9412f7fbefbdb0e --filename gantt.html gantt.html`
  - Local file: `gantt.html` (repo root + `public/`)
- **Live Platform:** https://gstreet-ops.github.io/trivia-app
- **Hallaron Site:** https://gstreet-ops.github.io/ellie-hallaron-website/index.html
