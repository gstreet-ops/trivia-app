# Agent Flags

Flags are cross-domain issues discovered during agent sessions.
Each flag records the discovering agent, the target agent, status, and resolution notes.

Status values: `PENDING` | `RESOLVED`

---

## Flag Log

| # | Status | Discovered By | Target Agent | Issue | Resolution |
|---|--------|--------------|--------------|-------|------------|
| 1 | RESOLVED | UI | GAMIFICATION | Achievement badges required exactly 10 questions (`total_questions === 10` hardcode). Games with 3, 5, 15, or 20 questions never triggered any badge. | Removed hardcode in `achievementChecker.js`; now guards with `total_questions > 0`. |
| 2 | RESOLVED | UI | UI | Division by zero in score percentage calculations when `total_questions === 0`. Affected `Dashboard.js` avgScore, bestScore, and leaderboard avgPercentage. | Added conditional guards: `totalQuestions > 0 ? ... : '0.0'` on all three calculations. |
| 3 | RESOLVED | UI | COMMUNITY | Member removal in CommissionerDashboard had no confirmation dialog — destructive action with no undo. | Verified `window.confirm()` already present at CommissionerDashboard.js line 136. No change required. |
| 4 | RESOLVED | UI | CONTENT | Trivia API fetch had no `response.ok` check, no handling for fewer-than-requested questions returned, and no back/retry option on error. Quiz broke silently on API failures. | Added `response.ok` check, insufficient-count error message, and Retry + Back to Dashboard buttons in error state. |
| 5 | RESOLVED | UI | CONTENT | CommissionerDashboard CSV upload had no row count limit — large files could cause timeouts or DB insert failures. | Added 500-row cap in `validateAndPreviewCSV()` with a clear error message. |
| 6 | RESOLVED | UI | DATA | Invite codes generated client-side with `Math.random()` (not cryptographically secure, collision-prone). Community leaderboard uses a static table that may go stale. No per-user limit on pending question submissions. | SQL scripts provided in `docs/SUPABASE_SCRIPTS.md`. Must be applied manually in Supabase SQL Editor. |
| 7 | RESOLVED | CONTENT | CONTENT | HTML entities from the Trivia API (e.g. `&amp;` `&#039;` `&quot;`) were not decoded before display. The local `decodeHTML` function in `QuizScreen.js` existed but was never called. | Created `src/utils/decodeHtml.js`; applied at ingestion in `fetchQuestions` for question text, correct answer, and all incorrect answers. |
| 8 | RESOLVED | CONTENT | CONTENT | Default question count was 3 (a testing value, not the intended user-facing default). | Changed `useState(3)` → `useState(10)` in `QuizSourceSelector.js`. |
| 9 | RESOLVED | COMMUNITY | DATA | The `generate_invite_code` Postgres function in `docs/SUPABASE_SCRIPTS.md` did not include a `GRANT EXECUTE` statement. Without it, the `authenticated` role could not call the function via `supabase.rpc('generate_invite_code')`. | Added `GRANT EXECUTE ON FUNCTION generate_invite_code() TO authenticated;` to `docs/SUPABASE_SCRIPTS.md`. |
| 10 | RESOLVED | CRUD | UI | `GameReview.js` line 29: `const percentage = ((game.score / game.total_questions) * 100).toFixed(1)` had no division-by-zero guard. If `game.total_questions === 0` this produced `NaN%`. | Guarded with `game.total_questions > 0 ? Math.round(game.score / game.total_questions * 100) : 0`. |
| 11 | PENDING | UI | CONTENT | `QuizScreen.js` answer option buttons have no `aria-label` — screen readers announce only the answer text with no context (e.g. "option 2 of 4"). Color is the sole indicator of correct/incorrect feedback (green/red) with no text announcement. The 50/50 hint button has no `aria-label` describing its effect. All three items are in `QuizScreen.js` (CONTENT-owned). | — |

---

## Open Flags

| # | Target Agent | Summary |
|---|-------------|---------|
| 11 | CONTENT | `QuizScreen.js`: answer button aria-labels, color-only feedback, 50/50 hint aria-label |

---

## How to Add a Flag

Append a row to the Flag Log table above. Use the next sequential `#`. Set status to `PENDING`.

```
| 9 | PENDING | <agent> | <target> | <description> | — |
```
