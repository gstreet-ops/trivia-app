# CLAUDE.md — Trivia Quiz App

This file is read automatically by Claude Code at the start of every session.
Follow these rules for all work in this project.

---

## Project Overview

Full-stack trivia quiz platform with community leagues, custom questions, achievements, and analytics.

- **Frontend:** React 18
- **Backend / DB:** Supabase (PostgreSQL + Auth + RLS)
- **Hosting:** GitHub Pages
- **Live URL:** https://gstreet-ops.github.io/trivia-app
- **Repo:** https://github.com/gstreet-ops/trivia-app

---

## Deployment

```bash
npm run build && npm run deploy
```

- Builds the React app and pushes to the `gh-pages` branch
- GitHub Pages serves from that branch automatically
- After deploying, hard-refresh (Ctrl+Shift+R) — CDN caches JS/CSS bundles

---

## CSS Caching Workaround

GitHub Pages CDNs aggressively cache CSS. For layout-critical styles (especially
sizing, display, grid/flex), use **React inline styles in JSX** rather than CSS
classes. Inline styles are embedded in the JS bundle which is always cache-busted
on each deploy. CSS class values may appear stale until users hard-refresh.

---

## Documentation Maintenance

The `docs/` folder and `README.md` must stay in sync with the code.
After completing any task, update the relevant docs **in the same session**:

| When you... | Update... |
|-------------|-----------|
| Add or change any UI screen or user-facing behavior | `docs/USER_GUIDE.md`, `docs/COMMISSIONER_GUIDE.md`, or `docs/ADMIN_GUIDE.md` as appropriate |
| Add, rename, or modify a Supabase table, column, or query | `docs/DATABASE_SCHEMA.md` |
| Complete a planned feature | Move it to **Completed** in `docs/ROADMAP.md` |
| Discover or fix a bug | Add to / remove from **Known Issues** in `docs/ROADMAP.md` |
| Add a dependency or change the deploy process | Update `README.md` tech stack and/or setup sections |

Do not batch doc updates for later — update them before ending the session.

---

## User Preferences

- **Avoid manual copy-paste tasks.** Whenever a value is needed (DSN, API key, config value, etc.), retrieve it programmatically, prompt for it interactively, or provide a direct command that inserts it automatically. Do not ask the user to copy a value from one place and paste it into a file manually. The user prefers to stay in Claude Code rather than switching to manual file editing.

---

## Project Conventions

- Georgetown color palette: navy `#041E42`, gray `#54585A`, light blue `#8B9DC3`, pale `#E8ECF0`
- All screens route through `src/App.js` using a `screen` state string (no React Router)
- Supabase client is initialized once in `src/supabaseClient.js`
- Admin access: `profiles.role = 'admin'` OR `profiles.super_admin = true`
- Commissioner access: `communities.commissioner_id = currentUserId`
- Default quiz question count is 3 (changed from 10 for testing)

---

## Key Files

| File | Purpose |
|------|---------|
| `src/App.js` | Root router, global top nav bar, session management |
| `src/supabaseClient.js` | Supabase connection (URL + anon key) |
| `src/utils/achievementChecker.js` | Badge unlock logic |
| `src/components/CommissionerDashboard.js` | Largest component (~1,700 lines); tabbed layout |
| `docs/DATABASE_SCHEMA.md` | All table schemas and relationships |
| `docs/ROADMAP.md` | Feature backlog and known issues |
