# Roadmap

---

## Completed Features

### Authentication & Accounts
- [x] Email/password sign-up and login (Supabase Auth)
- [x] Password reset via email link
- [x] Auto-created `profiles` row on signup
- [x] Username selection at registration
- [x] Username validation (3-30 chars, alphanumeric + underscores)
- [x] Password validation (min 8 chars on signup, min 6 on change)
- [x] Privacy settings (profile visibility, leaderboard opt-out)
- [x] Logout
- [x] Duplicate email detection via Supabase identities check
- [x] Friendly error messages for common auth errors (invalid credentials, rate limits, duplicate accounts)

### Core Quiz
- [x] Configurable question source (Trivia API, community, approved custom, mixed)
- [x] Category selection (8 categories)
- [x] Difficulty selection (easy, medium, hard)
- [x] Configurable question count (3, 5, 10, 15, 20)
- [x] 50/50 hint system per question (removes 2 wrong answers, adds 3 bonus seconds)
- [x] Live question fetching from The Trivia API v2
- [x] Shuffled answer order
- [x] Immediate per-answer feedback (correct/wrong highlighting)
- [x] Score saved to Supabase on game completion
- [x] Per-answer log saved to `game_answers` for review (includes explanation, image_url, video_url, answered_at, time_taken_ms)
- [x] Per-question countdown timer — commissioner-configurable per community (15s–120s), visual bar with warning state, auto-submit on timeout, 50/50 hint adds 3 bonus seconds

### Dashboard
- [x] Total games, average score %, best score % stats (capped at 100%)
- [x] Start New Quiz button
- [x] Achievement badge display
- [x] Community leaderboard (top 10 public players, respects `leaderboard_visibility` and `bot_flags.flagged` filters)
- [x] Clickable leaderboard player names → user profile
- [x] Recent games list (last 5, click to review)
- [x] Expandable game rows with inline Q&A details
- [x] Persistent top bar (username, active community badge, nav menu)

### Game Review
- [x] Per-game answer review screen
- [x] Shows question, all choices, user's answer, correct answer
- [x] Score summary with percentage display
- [x] Game metadata (category, difficulty, date)
- [x] Media replay — images and embedded YouTube videos in review cards
- [x] Explanation display in review cards

### Achievements
- [x] Perfect Score badge (100% on any game, any question count)
- [x] 5 Games Played badge
- [x] 10 Games Played badge
- [x] Category Master badge (3+ perfect scores in same category)
- [x] Speed Demon badge (5 games in one day)
- [x] Triple Perfect badge (3+ perfect scores total)
- [x] Achievement badges trigger for any question count (not just 10-question games)

### Communities / Leagues
- [x] Create community with auto-generated invite code
- [x] Join community via invite code
- [x] Community detail page (info, leaderboard, members count, question count)
- [x] Community-specific leaderboard (season-scoped with fallback to `community_leaderboards` view)
- [x] Quiz from community questions
- [x] Active community shown in persistent top bar
- [x] Community name clickable in top bar → community detail
- [x] Multi-community switcher — dropdown in top bar, persisted to localStorage
- [x] Community Marketplace — browse public communities, join directly, commissioner visibility toggle and description
- [x] Marketplace search, category filter chips (Education, Workplace, Music, Sports, General), sort (Most Members, Most Questions, Newest, A-Z)
- [x] Community Request System — any user can request a new community (name, description, reason); super admins approve/reject from Admin Dashboard; approval auto-creates community with requester as commissioner/owner; notifications on approval/rejection; user can view their request history with status badges
- [x] Community announcements — commissioner posts visible to all members on community detail page, with pin/unpin, edit, delete, "New" badge for recent posts
- [x] Real-time community chat — Supabase Realtime powered chat on community detail page, message bubbles (own=navy, other=gray), commissioner message deletion, load older messages (50 per page), 500-char limit, auto-scroll
- [x] Past season archives — expandable accordion cards on community detail page showing season number, date range, total games, MVP, leaderboard snapshot
- [x] Recent member activity feed — last 10 community games by members on detail page
- [x] Community theming — custom banner, logo, theme color, and welcome message displayed on detail page and marketplace cards

### Dynamic Community Categories
- [x] Dynamic category dropdown — when playing "Community Only" or "Mixed" source, category dropdown shows actual community categories with question counts instead of hardcoded API categories
- [x] "All Categories" default option — pulls questions from all categories
- [x] Category filtering on community quiz — QuizScreen filters community questions by selected category
- [x] Commissioner category management — Settings tab section to view, add, rename, and delete categories with question counts
- [x] Categories stored in `communities.settings.categories` JSONB array
- [x] Add Question form uses defined categories dropdown with "Other (custom)" fallback
- [x] Question Generator integration — community categories shown in generator wizard category dropdown

### Commissioner Dashboard
- [x] Tabbed navigation (Overview, Announcements, Questions, Members, Settings, Analytics, Media Library)
- [x] Overview stats (total games, active members, question bank size, quick action buttons, recent import history)
- [x] CSV bulk question upload with row-level validation (max 500 rows)
- [x] CSV upload preview (first 5 rows before confirming)
- [x] CSV template download
- [x] CSV export of full question bank (with formula injection protection)
- [x] Question search (text, answers, category)
- [x] Filter by category, difficulty, source, and tags
- [x] Custom tags per question (add / remove)
- [x] Tag-based filter
- [x] Select / select-all for bulk operations (including select-all-pages)
- [x] Bulk delete selected questions
- [x] Bulk add/remove tags across selected questions (floating bulk actions bar)
- [x] Per-question version history (up to 10 entries)
- [x] Restore previous question version
- [x] Save question as template
- [x] Create question from template
- [x] Delete template
- [x] Remove community member
- [x] Edit community name, season dates, max members
- [x] Analytics tab (category/difficulty/tag distribution bar charts, most-used/hardest/easiest questions)
- [x] Invite code regeneration — commissioner can reset/change the invite code from the Settings tab
- [x] Pagination on question bank — Questions tab uses pagination (25/50/100 per page)
- [x] Season reset — archive current season leaderboard via `reset_season` RPC, start new season, season history with frozen leaderboards, season stats with top player
- [x] Season-filtered leaderboard — community leaderboard only counts games from current season
- [x] Community theming — commissioner can set theme color (picker + presets), upload logo and banner images, add welcome message; theme applied on community detail page, marketplace cards, and communities list
- [x] Questions tab action bar + modals — clean action bar with Add, Import CSV, Generate with AI, Export buttons; Add Question and CSV Import open as modals; Generate with AI opens the Question Generator wizard
- [x] Questions tab compact table redesign — compact ~50px table rows with truncated text, inline expand panel with full details, proper pagination (25/50/100 per page), floating bulk actions bar, select-all-pages support
- [x] Invite by email — send email invitations with invite code and optional personal message from Members tab
- [x] Member role management — role badges (color-coded pills), role dropdown for owners/commissioners (member/moderator/commissioner)
- [x] Owner-only danger zone — Transfer Ownership modal and Delete Community (with triple confirmation) in Settings tab
- [x] Community visibility/marketplace toggle and description editing

### Admin Dashboard
- [x] Platform-wide stats (users, games, public games, avg games/user, popular category)
- [x] Pending custom question review queue
- [x] Approve / reject custom questions (with in-app notification and email to submitter)
- [x] Recent users table (last 10)
- [x] Recent games table (last 10)
- [x] User management — promote/demote platform roles (user/admin/super_admin with legacy column sync), view user activity (total games, avg score, last game, communities), search/filter/sort, pagination (20 per page)
- [x] User deletion — cascade delete across all tables (game_answers, games, community_members, custom_questions, notifications, multiplayer_answers, multiplayer_participants, community_messages, multiplayer_rooms, generation_requests, plus owned communities) with confirmation modal
- [x] Community Requests tab — pending request queue with approve/reject, auto-creates community on approval (with owner membership), rejection with optional reason, request history table
- [x] AI Requests tab — pending AI generation request queue with community name, requester, theme; approve (triggers Edge Function + notification + email) or reject with optional notes (notification + email); request history table
- [x] Flagged Users tab — users flagged by bot detection (`bot_flags.flagged = true`); shows username, flag reasons, game count, flagged date; unflag action

### Custom Questions
- [x] Submit custom question form (any logged-in user)
- [x] Question enters pending review queue
- [x] Admin approve → status becomes `approved`, available in quiz
- [x] Admin reject → status becomes `rejected`

### Settings
- [x] Change username
- [x] Toggle profile visibility
- [x] Toggle leaderboard visibility
- [x] Change password (new password + confirm, min 6 chars)
- [x] Dark mode toggle (persisted to `profiles.theme` and localStorage)
- [x] Links to Terms of Service and Privacy Policy
- [x] Logout

### Community Feed
- [x] Public game activity feed with category/difficulty/sort filters
- [x] Clickable usernames → user profile
- [x] Privacy filtering (hides games from users with `profile_visibility = false`)

### My Stats
- [x] Dedicated My Stats page (accessible from nav menu)
- [x] Score trend line chart (Recharts)
- [x] Performance by category bar chart (Recharts)

### User Profiles
- [x] View another user's public profile and game history
- [x] Stats display (average score, total games, categories played, best game percentage)
- [x] Achievement badges display
- [x] Recent public games list (last 10)

### AI Question Generation (Request/Approval System)
- [x] Commissioner request form — theme, difficulty, question count (5–25), special instructions
- [x] Request submitted to generation_requests table with pending status
- [x] Admin AI Requests tab — pending queue with community name, requester, theme, approve/reject
- [x] Reject with optional admin notes
- [x] Request history for commissioners (status badges, date, admin notes on rejection)
- [x] Completed request review — commissioner can review generated questions, add to bank individually or bulk-accept selected, discard
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
- [x] Game review media — images and YouTube videos shown in per-game answer review cards
- [x] Question Generator prompt includes image_url and video_url CSV columns
- [x] Media Library tab — centralized media asset manager in Commissioner Dashboard with upload (PNG/JPEG/WebP/GIF, max 2MB), search by filename/tags, type filter (all/image/video), preview modal with usage info, copy URL, delete with storage cleanup
- [x] Browse Library picker — modal to select media from library when adding/editing question image or video

### Question Explanations
- [x] Explanation field on community questions — optional text explaining the correct answer
- [x] Commissioner Add Question form — explanation textarea
- [x] CSV import/export/template support for explanation column
- [x] AI-generated question passthrough — explanation preserved when adding to bank
- [x] Explanation preview on question cards in Commissioner Dashboard
- [x] QuizScreen — "Why?" panel with fade-in animation after answering (community questions)
- [x] MultiplayerLobby — explanation panel after answering
- [x] GameReview — always-visible explanation below correct answer
- [x] game_answers.explanation column — stores explanation snapshot per answered question for review

### Star Wars Community
- [x] Pre-built Star Wars Trivia community — 60 curated questions (20 easy, 20 medium, 20 hard) covering Characters, Planets, Ships, Battles, Quotes, and Lore categories with detailed explanations

### Multiplayer Quiz (Phase 1 — Lobby)
- [x] Create Room — room name, question source (API/community), community selector, category, difficulty, question count (5/10), timer per question (15/20/30s), speed bonus toggle, max players (2-12)
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
- [x] Real-time answer tracking — player dots show who has answered via Supabase Realtime (broadcast + postgres_changes)
- [x] Disconnect failsafe — force-advances to scoreboard if not all players answer within grace period (5s after timeout)
- [x] Round scoreboard — sorted leaderboard after each question showing round points and running total
- [x] Host-controlled pacing — host clicks "Next Question" to advance, broadcast syncs all players
- [x] Final results screen — game over leaderboard with medal emojis for top 3, highlighted self row
- [x] Mobile responsive — single-column answer layout on small screens

### In-App Notifications
- [x] Notifications table with RLS (users can only view/update own notifications)
- [x] NotificationBell in top bar with unread count badge
- [x] Dropdown panel with recent notifications (last 20), mark as read
- [x] Auto-notify on custom question approve/reject
- [x] Auto-notify on AI generation request approve/reject
- [x] Auto-notify on community request approve/reject
- [x] 30-second polling for new notifications
- [x] Click notification to navigate to relevant screen
- [x] Mark all as read button

### Question Generator Tool (Phase 1)
- [x] Commissioner prompt builder wizard — 4-step flow (Source → Details → Settings → Generate) with step indicator circles
- [x] 7 source types with mode badges — Web Search, Website URL, YouTube Video (AI-accessible); Document/Text, Spreadsheet/CSV, Study Notes, Social Media (Paste-assisted)
- [x] Category dropdown (8 presets + Custom), question count pills (10/20/30/60), difficulty split (Equal/Custom), include explanations toggle
- [x] AI-optimized prompt output with CSV format rules, quality requirements, source-specific instructions, and copy-to-clipboard (with fallback for older browsers)
- [x] Modular architecture — PromptBuilder utility, SourceSelector, SourceInput, QuestionSettings, PromptOutput, QuestionGeneratorCore shell, CommissionerGenerator wrapper
- [x] Upload CSV Now button — direct navigation to CSV import from prompt output

### Role System (Phase 1 — Foundation)
- [x] `platform_role` column on profiles — unified `user`/`admin`/`super_admin` role with migration from legacy `role`+`super_admin` columns
- [x] `role` column on community_members — `owner`/`commissioner`/`moderator`/`member` hierarchy
- [x] Central `permissions.js` utility — `hasPlatformRole`, `hasCommunityRole`, `canManageQuestions`, `canManageMembers`, `canManageSettings`, `canViewAnalytics`, `canPromoteToCommissioner`, `canDeleteCommunity`, `canTransferOwnership`, `isPlatformAdmin`, `isSuperAdmin`
- [x] Commissioner Dashboard role-gated tabs — Questions (moderator+), Members (commissioner+), Settings (commissioner+), Analytics (moderator+)
- [x] Members tab role badges (color-coded pills) and role dropdown for owners/commissioners
- [x] Owner-only danger zone — Transfer Ownership modal and Delete Community in Settings tab
- [x] Admin Dashboard platform role dropdown — super admins can change any user's platform role
- [x] Community Detail "Manage Community" / "Manage Questions" button based on community role
- [x] SQL migration script (`docs/MIGRATION_ROLES.sql`) with RLS policy updates
- [x] Backward-compatible — legacy `role`, `super_admin`, `commissioner_id` columns preserved and kept in sync

### Legal Framework
- [x] Terms of Service page — full legal text covering acceptance, accounts, user content, communities, IP, prohibited conduct, disclaimers, liability, 13+ age requirement
- [x] Privacy Policy page — covers data collection, usage, storage (Supabase/US), third parties (Supabase, Trivia API, GitHub Pages, YouTube, Sentry), sharing, user rights, children's privacy (COPPA), cookies/local storage, retention, security (HTTPS, bcrypt, RLS)
- [x] Signup consent flow — checkbox with linked ToS/Privacy pages, blocks signup until accepted, records consent timestamp and version to `profiles`
- [x] Footer links — Terms of Service and Privacy Policy links on all screens (except during active quiz)
- [x] Settings links — legal section with ToS and Privacy Policy buttons
- [x] Unauthenticated access — ToS and Privacy pages viewable from signup screen via hash routing

### Email Notifications
- [x] Supabase Edge Function (`send-email`) with Resend API integration
- [x] Georgetown-branded HTML email templates (invitation, join confirmation, question notification, generic)
- [x] Commissioner "Invite by Email" — send email invitations with invite code and optional personal message from Members tab
- [x] Join confirmation email — sent automatically when a user joins a community via invite code
- [x] Admin action emails — email notifications alongside in-app notifications for question approvals/rejections, AI request approvals/rejections, community request approvals/rejections
- [x] Fire-and-forget pattern — emails never block UI; errors logged to console

### Infrastructure
- [x] GitHub Pages deployment (`npm run deploy`)
- [x] SVG favicon
- [x] Supabase RLS
- [x] Georgetown-themed color palette (navy `#041E42`, gray, light blue)
- [x] In-app Help Center with User Guide, Commissioner Guide, Admin Guide, FAQ tabs and keyword search
- [x] Sentry error monitoring (ErrorBoundary in index.js, `REACT_APP_SENTRY_DSN` env var, 20% trace sample rate)
- [x] Hash-based routing — URL hash (`#dashboard`, `#review/{id}`, etc.) persists screen state across refresh and enables browser back/forward navigation
- [x] Dark mode — CSS custom properties, toggle in top bar and Settings, localStorage + Supabase profile persistence, smooth transitions
- [x] SVG icon system — replaced all emoji icons with inline SVG components (`Icons.js` with 30+ icons), consistent stroke-based design, `currentColor` for theme compatibility, applied across all screens
- [x] Bot prevention — game rate limiting (20/hr, 60/day via DB trigger), answer timing tracking (answered_at + time_taken_ms on game_answers), automatic bot flagging (impossibly fast answers, suspicious perfect streak on hard, excessive play rate) via profiles.bot_flags JSONB, flagged users excluded from leaderboards, admin Flagged Users tab with unflag button
- [x] PWA install banner — captures `beforeinstallprompt` event, shows install/dismiss banner
- [x] Service worker registration for PWA support

---

## Known Issues

| Issue | Notes |
|-------|-------|
| Community leaderboard uses a separate `community_leaderboards` table | If this view/table isn't auto-updated, the community leaderboard may be stale. SQL fix in `docs/SUPABASE_SCRIPTS.md` converts it to a live Postgres view. Code falls back to this table only when `season_start` is missing; otherwise it computes the leaderboard live from `games`. |
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
- [ ] **Server-side RLS role enforcement (Phase 2)** — extend RLS policies to enforce community roles at the database level for all tables
- [ ] **Question difficulty auto-rating** — compute difficulty from actual performance data

### Longer-term

- [ ] **Granular permissions (Phase 3)** — question-level edit/delete permissions, configurable per-community member capabilities, viewer/contributor tiers
- [ ] **Mobile app** — React Native port
- [ ] **Scheduled quizzes** — commissioner sets a quiz time; all members play the same questions simultaneously
- [ ] **Streak tracking** — daily play streak with streak badges
- [ ] **Question difficulty voting** — players can upvote/downvote difficulty rating after answering
