# Agent Architecture

This document defines the multi-agent system used to maintain and extend the trivia app.
Each agent has a fixed scope — a set of files it owns and rules that govern its output.
Agents must not modify files outside their ownership list.
Cross-domain issues are recorded in `docs/AGENT_FLAGS.md`.

---

## Agents

### CONTENT
Owns the quiz flow, question display, question ingestion, and quiz configuration.

| File | Notes |
|------|-------|
| `src/components/QuizScreen.js` | Full ownership |
| `src/components/QuizSourceSelector.js` | Full ownership |
| `src/components/QuestionCreator.js` | Full ownership |
| `src/components/CommissionerDashboard.js` | **Questions tab and Analytics tab only** |
| `src/utils/decodeHtml.js` | Full ownership |

**Business rules:**
- HTML entities from external APIs must be decoded before display using `decodeHtml()`. Never use `dangerouslySetInnerHTML`.
- API error states must provide a Retry option and a Back to Dashboard option.
- CSV bulk uploads are capped at 500 rows. Validate before insert.
- The default question count is 10.

---

### UI
Owns the shell, navigation, non-quiz display screens, and all CSS.

| File | Notes |
|------|-------|
| `src/App.js` | Full ownership |
| `src/components/StartScreen.js` | Full ownership |
| `src/components/Dashboard.js` | Full ownership |
| `src/components/ResultsScreen.js` | Full ownership |
| `src/components/GameReview.js` | Full ownership |
| `src/components/HelpCenter.js` | Full ownership |
| `src/components/HelpCenter.css` | Full ownership |
| `src/components/Dashboard.css` | Full ownership |
| All other `*.css` files | Full ownership |

**Business rules:**
- Georgetown color palette: navy `#041E42`, gray `#54585A`, light blue `#8B9DC3`, pale `#E8ECF0`.
- Layout-critical styles must use React inline styles, not CSS classes, to survive GitHub Pages CDN caching.
- Screen routing uses string state in App.js — no React Router.
- Score percentages must guard against division by zero.

---

### COMMUNITY
Owns community creation, joining, leaderboards, feed, and the commissioner management tabs.

| File | Notes |
|------|-------|
| `src/components/CommunityDetail.js` | Full ownership |
| `src/components/CommunitiesList.js` | Full ownership |
| `src/components/CommunityFeed.js` | Full ownership |
| `src/components/CommissionerDashboard.js` | **Overview, Members, and Settings tabs only** |

**Business rules:**
- Invite codes must be unique. Prefer server-side generation (see `docs/SUPABASE_SCRIPTS.md`).
- Community leaderboards reflect live game data. The `community_leaderboards` Postgres view (in SUPABASE_SCRIPTS.md) must be used — not a static table.

---

### GAMIFICATION
Owns achievements and performance analytics displayed to the end user.

| File | Notes |
|------|-------|
| `src/components/Achievements.js` | Full ownership |
| `src/components/PerformanceCharts.js` | Full ownership |
| `src/utils/achievementChecker.js` | Full ownership |

**Business rules:**
- Achievement checks must work for any question count (`total_questions > 0`), never hardcode `=== 10`.
- Badges are computed from raw game data on each load — there is no persistent badge table.

---

### AUTH
Owns authentication screens, user profile, and account settings.

| File | Notes |
|------|-------|
| `src/components/Settings.js` | Full ownership |
| `src/components/UserProfile.js` | Full ownership |
| `src/supabaseClient.js` | Full ownership |

**Business rules:**
- Profile visibility and leaderboard opt-out are stored in the `profiles` table (`leaderboard_visibility` column).
- Password reset uses Supabase Auth email links — no custom flow.

---

### ADMIN
Owns the admin dashboard and platform moderation tools.

| File | Notes |
|------|-------|
| `src/components/AdminDashboard.js` | Full ownership |

**Business rules:**
- Admin access is gated by `profiles.role === 'admin'` or `profiles.super_admin === true`.
- Admin actions (approve/reject questions) are irreversible from the UI. Document this clearly.
- Admin dashboard reads are subject to Supabase RLS — see `docs/ADMIN_GUIDE.md` for required policies.

---

## Cross-Domain Flag Protocol

When an agent discovers an issue outside its file ownership:
1. Do **not** modify the out-of-scope file.
2. Append a flag entry to `docs/AGENT_FLAGS.md` with status `PENDING`, the target agent, and a description.
3. Continue with in-scope work.

---

## Output Format

Each agent session must end with:
- All changed files committed (specific files, never `git add -A`)
- A conventional commit message: `type(scope): description`
  - Types: `feat`, `fix`, `docs`, `chore`, `refactor`
  - Scope: agent name in lowercase (e.g. `fix(content): ...`, `feat(community): ...`)
- A push to `main`
