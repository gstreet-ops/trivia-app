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
- [x] Per-question countdown timer — commissioner-configurable per community (15s–120s), visual bar with warning state, auto-submit on timeout, 50/50 hint adds 3 bonus seconds

### Dashboard
- [x] Total games, average score %, best score % stats (capped at 100%)
- [x] Start New Quiz button
- [x] Achievement badge display
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
- [x] Community Marketplace — browse public communities, join directly, commissioner visibility toggle and description
- [x] Community announcements — commissioner posts visible to all members on community detail page, with pin/unpin, edit, delete, "New" badge for recent posts
- [x] Real-time community chat — Supabase Realtime powered chat on community detail page, message bubbles (own=navy, other=gray), commissioner message deletion, load older messages, 500-char limit, auto-scroll

### Commissioner Dashboard
- [x] Tabbed navigation (Overview, Announcements, Questions, Members, Settings, Analytics)
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
- [x] Season reset — archive current season leaderboard, start new season, season history with frozen leaderboards
- [x] Season-filtered leaderboard — community leaderboard only counts games from current season
- [x] Community theming — commissioner can set theme color (picker + presets), upload logo and banner images, add welcome message; theme applied on community detail page, marketplace cards, and communities list
- [x] Questions tab action bar + modals — clean action bar with Add, Import CSV, AI Generate, Export buttons; Add Question, CSV Import, and AI Generate open as modals instead of inline sections; AI Generate tab removed as standalone tab
- [x] Questions tab compact table redesign — compact ~50px table rows with truncated text, inline expand panel with full details, proper pagination (25/50/100 per page), floating bulk actions bar, select-all-pages support

### Admin Dashboard
- [x] Platform-wide stats (users, games, public games, avg games/user, popular category)
- [x] Pending custom question review queue
- [x] Approve / reject custom questions
- [x] Recent users table (last 10)
- [x] Recent games table (last 10)
- [x] User management — promote/demote roles, toggle super admin, view user activity, search/filter/sort, pagination

### Custom Questions
- [x] Submit custom question form (any logged-in user)
- [x] Question enters pending review queue
- [x] Admin approve → status becomes `approved`, available in quiz
- [x] Admin reject → status becomes `rejected`

### Settings
- [x] Change username
- [x] Toggle profile visibility
- [x] Toggle leaderboard visibility
- [x] Change password (new password + confirm)

### Community Feed
- [x] Public game activity feed

### My Stats
- [x] Dedicated My Stats page (accessible from nav menu)
- [x] Score trend line chart (Recharts)
- [x] Performance by category bar chart (Recharts)

### User Profiles
- [x] View another user's public profile and game history

### AI Question Generation (Request/Approval System)
- [x] Commissioner request form — theme, difficulty, question count (5–25), special instructions
- [x] Request submitted to generation_requests table with pending status
- [x] Admin AI Requests tab — pending queue with community name, requester, theme, approve/reject
- [x] Reject with optional admin notes
- [x] Request history for commissioners (status badges, date, admin notes on rejection)
- [x] Completed request review — commissioner can review generated questions, add to bank or discard
- [x] Simulate Generation button (super admin) for testing the review flow
- [x] Admin approval triggers Edge Function (fire-and-forget) to generate questions
- [x] Commissioner sees descriptive status labels (Pending, Generating, Completed, Failed, Rejected) with retry on failure
- [x] Auto-poll every 5s when requests are generating; toast on completion or failure

### Media Questions
- [x] Image questions — upload image to Supabase Storage, display above question text in quiz and multiplayer
- [x] Video questions (YouTube embed) — paste YouTube URL, embed iframe above question text
- [x] Commissioner media editor — upload/remove image and video per question card
- [x] CSV import support for image_url and video_url columns
- [x] Media indicators on question cards (image and video icons)

### Question Explanations
- [x] Explanation field on community questions — optional text explaining the correct answer
- [x] Commissioner Add Question form — explanation textarea
- [x] CSV import/export/template support for explanation column
- [x] AI-generated question passthrough — explanation preserved when adding to bank
- [x] Explanation preview on question cards in Commissioner Dashboard
- [x] QuizScreen — "💡 Why?" panel with fade-in animation after answering (community questions)
- [x] MultiplayerLobby — explanation panel after answering
- [x] GameReview — always-visible explanation below correct answer

### Multiplayer Quiz (Phase 1 — Lobby)
- [x] Create Room — room name, question source (API/community), category, difficulty, question count, timer, speed bonus, max players
- [x] Join Room — 6-character room code entry with validation
- [x] Real-time lobby — player list updates via Supabase Realtime (postgres_changes)
- [x] Host controls — Start Game (min 2 players), Cancel Room
- [x] Player controls — Ready/Unready toggle, Leave Room
- [x] Room code display with Copy button
- [x] Settings summary tags in lobby (Qs, difficulty, timer, speed bonus, source)
- [x] Open Rooms browser — lists all waiting rooms with host username, player count, settings; auto-refreshes every 10 seconds; direct Join button
- [x] Game start logic — fetches questions from API or community bank, inserts into multiplayer_questions, updates room status

### Multiplayer Quiz (Phase 2 — Live Game)
- [x] Live game screen — all players answer the same questions simultaneously
- [x] Per-question countdown timer with visual bar, warning pulse at ≤5s, auto-submit on timeout
- [x] 2×2 answer grid with correct/wrong/selected highlighting
- [x] Points-based scoring — 100 base per correct answer, up to +100 speed bonus when enabled
- [x] Real-time answer tracking — player dots show who has answered via Supabase Realtime
- [x] Disconnect failsafe — force-advances to scoreboard if not all players answer within grace period
- [x] Round scoreboard — sorted leaderboard after each question showing round points and running total
- [x] Host-controlled pacing — host clicks "Next Question" to advance, broadcast syncs all players
- [x] Final results screen — game over leaderboard with medal emojis for top 3, highlighted self row
- [x] Mobile responsive — single-column answer layout on small screens

### In-App Notifications
- [x] Notifications table with RLS (users can only view/update own notifications)
- [x] NotificationBell in top bar with unread count badge
- [x] Dropdown panel with recent notifications, mark as read
- [x] Auto-notify on custom question approve/reject
- [x] Auto-notify on AI generation request approve/reject
- [x] 30-second polling for new notifications
- [x] Click notification to navigate to relevant screen

### Infrastructure
- [x] GitHub Pages deployment (`npm run deploy`)
- [x] SVG favicon
- [x] Supabase RLS
- [x] Georgetown-themed color palette (navy `#041E42`, gray, light blue)
- [x] In-app Help Center with User Guide, Commissioner Guide, FAQ, About tabs and keyword search
- [x] Sentry error monitoring (ErrorBoundary in index.js, `REACT_APP_SENTRY_DSN` env var)
- [x] Hash-based routing — URL hash (`#dashboard`, `#review/{id}`, etc.) persists screen state across refresh and enables browser back/forward navigation
- [x] Dark mode — CSS custom properties across all 23 CSS files, toggle in top bar and Settings, localStorage + Supabase profile persistence, smooth transitions
- [x] SVG icon system — replaced all emoji icons with inline SVG components (`Icons.js` with 30+ icons), consistent stroke-based design, `currentColor` for theme compatibility, applied across nav bar, dashboards, stat cards, notification bell, community detail, achievements, multiplayer, help center, and quiz screens

---

## Known Issues

| Issue | Notes |
|-------|-------|
| Community leaderboard uses a separate `community_leaderboards` table | If this view/table isn't auto-updated, the community leaderboard may be stale. SQL fix in `docs/SUPABASE_SCRIPTS.md` converts it to a live Postgres view. |
| CSS delivery via GitHub Pages CDN caching | CSS changes may not appear until users hard-refresh. Critical layout styles should use React inline styles. |
| No email confirmation on signup | Supabase email confirmation may be disabled in project settings; users log in immediately after signup. |
| Admin cannot undo approve/reject | No UI to move a custom question back to pending; requires direct database edit. |
| Sentry test event confirmation pending | Sentry SDK integrated and DSN configured; awaiting confirmation that production errors are captured and visible in the Sentry dashboard. |
| Auth.users row orphaned on user deletion | Super admin delete-user cascade removes all app data but cannot call `supabase.auth.admin.deleteUser()` with the anon key. Orphaned auth row can be cleaned up manually in Supabase dashboard. |

---

## Planned Features

### Near-term

- [ ] **AI Question Generation (Claude API integration)** — wire approved requests to a Supabase Edge Function that calls the Claude API to generate trivia questions and populates the generated_questions JSONB
- [ ] **Achievement for all badges** — earn all 6 badges to unlock a "Grand Master" badge
- [ ] **Achievement for community engagement** — play X community games

### Medium-term

- [ ] **Member question submissions** — commissioners can optionally allow members to submit questions to their community bank, with commissioner approval
- [ ] **Server-side RLS role enforcement (Phase 2)** — enforce roles at Supabase RLS level: commissioners restricted to own community data, super admin full access, users own data only
- [ ] **Question difficulty auto-rating** — compute difficulty from actual performance data

### Longer-term

- [ ] **Granular permissions (Phase 3)** — question-level edit/delete permissions, community permission tiers (viewer, contributor, moderator, commissioner), configurable per-community member capabilities
- [ ] **Mobile app** — React Native port
- [ ] **Scheduled quizzes** — commissioner sets a quiz time; all members play the same questions simultaneously
- [ ] **Streak tracking** — daily play streak with streak badges
- [ ] **Question difficulty voting** — players can upvote/downvote difficulty rating after answering
