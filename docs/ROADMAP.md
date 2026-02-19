# Roadmap

---

## Completed Features

### Authentication & Accounts
- [x] Email/password sign-up and login (Supabase Auth)
- [x] Password reset via email link
- [x] Auto-created `profiles` row on signup
- [x] Username selection at registration
- [x] Privacy settings (profile visibility, leaderboard opt-out)
- [x] Logout

### Core Quiz
- [x] Configurable question source (Trivia API, community, approved custom, mixed)
- [x] Category selection (8 categories)
- [x] Difficulty selection (easy, medium, hard)
- [x] Configurable question count (3, 5, 10, 15, 20)
- [x] 50/50 hint system per question
- [x] Live question fetching from The Trivia API v2
- [x] Shuffled answer order
- [x] Immediate per-answer feedback (correct/wrong highlighting)
- [x] Score saved to Supabase on game completion
- [x] Per-answer log saved to `game_answers` for review

### Dashboard
- [x] Total games, average score %, best score % stats
- [x] Start New Quiz button
- [x] Achievement badge display
- [x] Score trend line chart (Recharts)
- [x] Performance by category bar chart (Recharts)
- [x] Community leaderboard (top 10 public players)
- [x] Clickable leaderboard player names → user profile
- [x] Recent games list (last 5, click to review)
- [x] Persistent top bar (username, active community badge, nav menu)

### Game Review
- [x] Per-game answer review screen
- [x] Shows question, all choices, user's answer, correct answer

### Achievements
- [x] Perfect Score badge (10/10 on any game)
- [x] 5 Games Played badge
- [x] 10 Games Played badge
- [x] Category Master badge (10/10 in same category 3+ times)
- [x] Speed Demon badge (5 games in one day)
- [x] Triple Perfect badge (10/10 three or more times total)
- [x] Achievement badges trigger for any question count (not just 10-question games)

### Communities / Leagues
- [x] Create community with auto-generated invite code
- [x] Join community via invite code
- [x] Community detail page (info, leaderboard, members count, question count)
- [x] Community-specific leaderboard
- [x] Quiz from community questions
- [x] Active community shown in persistent top bar
- [x] Community name clickable in top bar → community detail

### Commissioner Dashboard
- [x] Tabbed navigation (Overview, Questions, Members, Settings, Analytics)
- [x] Overview stats (total games, active members, question bank size)
- [x] Import history log
- [x] CSV bulk question upload with row-level validation
- [x] CSV upload preview (first 5 rows before confirming)
- [x] CSV template download
- [x] CSV export of full question bank
- [x] Question search (text, answers, category)
- [x] Filter by category and difficulty
- [x] Custom tags per question (add / remove)
- [x] Tag-based filter
- [x] Select / select-all for bulk operations
- [x] Bulk delete selected questions
- [x] Bulk add/remove tags across selected questions
- [x] Per-question version history (up to 10 entries)
- [x] Restore previous question version
- [x] Save question as template
- [x] Create question from template
- [x] Delete template
- [x] Remove community member
- [x] Edit community name, season dates, max members
- [x] Analytics tab (category/difficulty performance, hardest/easiest/most-used questions)
- [x] Invite code regeneration — commissioner can reset/change the invite code from the Settings tab
- [x] Pagination on question bank — Questions tab uses pagination for large question banks

### Admin Dashboard
- [x] Platform-wide stats (users, games, public games, avg games/user, popular category)
- [x] Pending custom question review queue
- [x] Approve / reject custom questions
- [x] Recent users table (last 10)
- [x] Recent games table (last 10)

### Custom Questions
- [x] Submit custom question form (any logged-in user)
- [x] Question enters pending review queue
- [x] Admin approve → status becomes `approved`, available in quiz
- [x] Admin reject → status becomes `rejected`

### Settings
- [x] Change username
- [x] Toggle profile visibility
- [x] Toggle leaderboard visibility

### Community Feed
- [x] Public game activity feed

### User Profiles
- [x] View another user's public profile and game history

### Infrastructure
- [x] GitHub Pages deployment (`npm run deploy`)
- [x] SVG favicon
- [x] Supabase RLS
- [x] Georgetown-themed color palette (navy `#041E42`, gray, light blue)
- [x] In-app Help Center with User Guide, Commissioner Guide, FAQ, About tabs and keyword search
- [x] Sentry error monitoring (ErrorBoundary in index.js, `REACT_APP_SENTRY_DSN` env var)

---

## Known Issues

| Issue | Notes |
|-------|-------|
| Community leaderboard uses a separate `community_leaderboards` table | If this view/table isn't auto-updated, the community leaderboard may be stale. SQL fix in `docs/SUPABASE_SCRIPTS.md` converts it to a live Postgres view. |
| CSS delivery via GitHub Pages CDN caching | CSS changes may not appear until users hard-refresh. Critical layout styles should use React inline styles. |
| No email confirmation on signup | Supabase email confirmation may be disabled in project settings; users log in immediately after signup. |
| Admin cannot undo approve/reject | No UI to move a question back to pending; requires direct database edit. |
| Sentry test event confirmation pending | Sentry SDK integrated and DSN configured; awaiting confirmation that production errors are captured and visible in the Sentry dashboard. |

---

## Planned Features

### Near-term

- [ ] **Timer per question** — countdown with auto-submit on expiry
- [ ] **Achievement for all badges** — earn all 6 badges to unlock a "Grand Master" badge
- [ ] **Achievement for community engagement** — play X community games
- [ ] **Email notifications** — notify submitter when their question is approved/rejected

### Medium-term

- [ ] **Admin user management UI** — promote/demote users to admin from the Admin Dashboard
- [ ] **Admin delete user** — remove a user account from the platform
- [ ] **Community announcements** — commissioner can post messages visible to all members
- [ ] **Question difficulty auto-rating** — compute difficulty from actual performance data
- [ ] **Season reset** — archive season data and start fresh rankings
- [ ] **Multiple communities per user** — currently the top bar only shows one community; support multi-league users

### Longer-term

- [ ] **Real-time multiplayer quiz** — synchronous head-to-head trivia via WebSockets or Supabase Realtime
- [ ] **Question explanations** — optionally add an explanation shown after each answer
- [ ] **Image questions** — support attaching an image to a question
- [ ] **Progressive Web App (PWA)** — offline support and home screen install
- [ ] **Dark mode**
- [ ] **Mobile app** — React Native port
- [ ] **Scheduled quizzes** — commissioner sets a quiz time; all members play the same questions simultaneously
- [ ] **Streak tracking** — daily play streak with streak badges
- [ ] **Question difficulty voting** — players can upvote/downvote difficulty rating after answering
