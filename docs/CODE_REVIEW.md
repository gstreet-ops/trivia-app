# Comprehensive Code Review

**Date:** 2026-02-24
**Reviewed by:** 6 specialized agents (AUTH, COMMUNITY, CONTENT, UI, GAMIFICATION, CRUD)
**Codebase:** trivia-app (React 18 + Supabase)

---

## Table of Contents

1. [Combined Top 20 Priority List](#combined-top-20-priority-list)
2. [AUTH Agent Findings](#auth-agent-findings)
3. [COMMUNITY Agent Findings](#community-agent-findings)
4. [CONTENT Agent Findings](#content-agent-findings)
5. [UI Agent Findings](#ui-agent-findings)
6. [GAMIFICATION Agent Findings](#gamification-agent-findings)
7. [CRUD Agent Findings](#crud-agent-findings)

---

## Combined Top 20 Priority List

Ranked by severity across all 6 agents:

| # | Severity | Agent | File | Issue |
|---|----------|-------|------|-------|
| 1 | CRITICAL | CONTENT | QuizScreen.js:6,112-146 | **Community/custom/mixed question sources are completely non-functional** -- `config.source` is ignored; quiz always fetches from external API. The community question bank is never used in single-player quizzes. |
| 2 | CRITICAL | CONTENT | QuizScreen.js:101-114 | **Category selection is broken** -- `categoryMap` uses numeric keys but receives human-readable strings; all quizzes default to `general_knowledge`. |
| 3 | CRITICAL | AUTH | App.js:125-135 | **Password reset flow is completely broken** -- `onAuthStateChange` ignores the `PASSWORD_RECOVERY` event; users clicking the reset link are treated as normal sign-ins with no "set new password" UI. |
| 4 | CRITICAL | GAMIFICATION | ResultsScreen.js:40-44,53 | **Hardcoded 10-question assumption** -- displays `score/10` and performance thresholds are absolute, not percentage-based. Scoring is wrong for any non-10-question quiz. |
| 5 | CRITICAL | GAMIFICATION | App.js:175-186 | **Games with 0 questions can be saved to the database** -- error path calls `onEnd(0, 0, [], 0)`, creating division-by-zero risks across stats, charts, and leaderboards. |
| 6 | CRITICAL | CRUD | AdminDashboard.js:41 | **Unbounded `select('*')` on all games for admin stats** -- full-table scan will crash as data grows. |
| 7 | CRITICAL | CRUD | CommunityMarketplace.js:58-65 | **Fetches ALL `community_members` and `community_questions` rows platform-wide** -- no filters, just to build count maps. |
| 8 | CRITICAL | COMMUNITY | CommissionerDashboard.js:361-377 | **Question deletion lacks `community_id` scoping** -- deletes by `id` only; a commissioner knowing another community's question UUID could delete it (subject to RLS). |
| 9 | CRITICAL | CONTENT | CommissionerDashboard.js:514-521 | **CSV export vulnerable to formula injection** -- user-generated question text starting with `=`, `+`, `-`, `@` is not sanitized, enabling phishing via Excel/Sheets. |
| 10 | CRITICAL | COMMUNITY | CommissionerDashboard.js:96-99 | **Commissioner authorization is client-side only** -- no server-side enforcement beyond RLS. If RLS policies are misconfigured, any user can modify any community. |
| 11 | HIGH | AUTH | App.js:111-138 | **Race condition between `getSession()` and `onAuthStateChange`** -- both fire for initial session, causing double `fetchUserRole`, double navigation. |
| 12 | HIGH | CONTENT | QuizScreen.js:126-130 | **Quiz refuses to start if API returns fewer questions than requested** -- should use available questions instead of failing entirely. |
| 13 | HIGH | GAMIFICATION | Dashboard.js:46 | **Leaderboard limited to 100 most-recent games platform-wide** -- rankings are inaccurate and unstable as users' games get pushed out. |
| 14 | HIGH | GAMIFICATION | UserProfile.js:20-31 | **Stats based on only 10 most recent public games** -- "Games Played" shows max 10; averages are misleading. |
| 15 | HIGH | AUTH | StartScreen.js:26-35 | **No post-signup confirmation flow** -- no "check your email" message; user is left staring at the form. |
| 16 | HIGH | CRUD | CommissionerDashboard.js:711-724 | **N+1 query pattern in bulk tag operations** -- 2 sequential DB calls per question; 100 selected = 200 sequential requests with no error aggregation. |
| 17 | HIGH | COMMUNITY | CommissionerDashboard.js:245-320 | **Season reset is not atomic** -- 3 separate DB operations; partial failure leaves inconsistent state. |
| 18 | HIGH | UI | Multiple files | **Extensive use of `#667eea` purple instead of Georgetown palette** -- 54 occurrences across 15 files; brand inconsistency on login, quiz, profile, feed screens. |
| 19 | HIGH | UI | QuizScreen.css, GameReview.css | **Hardcoded light-mode colors break dark mode** -- answer buttons (correct/wrong), explanation panels, notification elements all use hardcoded backgrounds. |
| 20 | HIGH | UI | CommissionerDashboard.js | **40+ calls to `alert()` for user feedback** -- blocks UI, not styled, poor UX. AdminDashboard already has a proper toast system. |

---

## AUTH Agent Findings

**CRITICAL (must fix):**

1. **[src/supabaseClient.js:3-4] Supabase URL and anon key are hardcoded directly in source code.** The anon key is designed to be public (used with RLS), so this is not a leaked secret per se. However, hardcoding means: (a) key rotation requires a code change and deploy, (b) different environments cannot use different projects, (c) it normalizes a pattern that could mask real credential leaks. -- Move both values to `.env` as `REACT_APP_SUPABASE_URL` and `REACT_APP_SUPABASE_ANON_KEY`, reference via `process.env`.

2. **[src/App.js:125-135] `onAuthStateChange` ignores the event type entirely.** The `_event` parameter is never checked. `PASSWORD_RECOVERY` events are treated identically to `SIGNED_IN`, redirecting to dashboard instead of a "set new password" form. The password reset flow is completely broken after clicking the email link. -- Check `_event === 'PASSWORD_RECOVERY'` and navigate to a dedicated "Update Password" screen calling `supabase.auth.updateUser({ password })`.

3. **[src/components/Settings.js:42-45] No password change functionality exists anywhere in the app.** Combined with the broken reset flow, users have no working mechanism to change their password. -- Add a "Change Password" section to Settings.

**HIGH (should fix):**

1. **[src/App.js:111-138] Race condition between `getSession()` and `onAuthStateChange`.** Both fire for the initial session, causing `setSession` twice, `fetchUserRole` twice, and double navigation. -- Remove the `getSession().then()` block and rely solely on `onAuthStateChange` which fires `INITIAL_SESSION`.

2. **[src/components/StartScreen.js:26-35] Signup does not handle "email already registered" gracefully.** Supabase returns a fake user with empty `identities` array for duplicate emails (when confirmations are enabled). -- Check `data.user.identities` length; show appropriate message if empty.

3. **[src/components/StartScreen.js:26-35] No post-signup confirmation flow.** No success message or "check your email" prompt after signup. User sees no feedback. -- Display "Account created! Check your email to verify."

4. **[src/components/StartScreen.js:16-41] No client-side password strength or username validation.** Passwords sent directly to Supabase with no minimum requirements beyond Supabase's server-side 6-char minimum. Username has no length limits or character restrictions. -- Add client-side validation: min 8 chars password, 3-30 char username, alphanumeric check.

5. **[src/App.js:147-168] `fetchUserRole` has no error handling.** If the `profiles` query fails, `appUsername` is empty, which hides the nav bar entirely. User sees a blank screen. -- Add error handling with retry or error message.

**MEDIUM (nice to fix):**

1. **[src/App.js:125] Auth state change does not clear stale state on sign-out.** `userRole`, `appIsAdmin`, `appUsername`, `viewCommunityId` remain from previous session. Could cause brief flashes of wrong data on re-login. -- Reset all user state when session is null.

2. **[src/components/StartScreen.js:50-51] Password reset `redirectTo` uses `window.location.origin` which omits the GitHub Pages path prefix.** Would redirect to `https://gstreet-ops.github.io` instead of `https://gstreet-ops.github.io/trivia-app`, causing a 404. -- Use `window.location.origin + window.location.pathname`.

3. **[src/components/Settings.js:42-44] Logout does not await `signOut()` before reloading.** The async call may not complete before `window.location.reload()`. -- Await `signOut()`, or remove the reload and let `onAuthStateChange` handle it.

4. **[src/App.js:69] Theme update silently discards errors.** `.then(() => {})` swallows Supabase errors; theme preference lost on next login with no indication. -- Add error handling.

5. **[src/components/StartScreen.js:37-40] Raw Supabase error messages shown to users.** Messages like "Invalid login credentials" or "Email rate limit exceeded" could be confusing. -- Map known errors to user-friendly messages.

6. **[src/components/StartScreen.js:5] `onStart` and `onBack` props accepted but never used.** Dead parameters in function signature. -- Remove them.

**LOW (cleanup):**

1. [StartScreen.js:6-14] Form state not reset when switching between login/signup tabs.
2. [App.js:212] `<StartScreen />` rendered with no props despite component accepting them.
3. [supabaseClient.js:1-6] No custom auth options set explicitly (defaults are fine but implicit).
4. [StartScreen.js:40] `setLoading(false)` outside try/catch -- use `finally` block.
5. [App.js:125-135] `onAuthStateChange` does not distinguish `SIGNED_IN` from `TOKEN_REFRESHED` -- could re-navigate on token refresh.

---

## COMMUNITY Agent Findings

**CRITICAL (must fix):**

1. **[CommunitiesList.js:42] Weak invite code generation uses `Math.random()`.** Not cryptographically secure, limited character set, 8-char length allows brute-force. -- Use `crypto.getRandomValues()` or the existing `generate_invite_code` RPC from CommissionerDashboard line 326.

2. **[CommunitiesList.js:41] Slug collision risk leads to community creation failure.** No uniqueness check on generated slug. Duplicate names produce duplicate slugs, causing constraint errors. -- Append random suffix or check uniqueness before insert.

3. **[CommissionerDashboard.js:96-99] Commissioner authorization is client-side only.** Browser-side check can be bypassed. Relies entirely on RLS policies. -- Verify RLS policies enforce `commissioner_id = auth.uid()` on all write operations.

4. **[CommissionerDashboard.js:361-377] Question deletion lacks `community_id` scoping.** Deletes by `id` only. Same issue affects tag operations (591, 600, 621), version restore (633), media operations (1031, 1042, 1048). -- Add `.eq('community_id', communityId)` to all mutation queries.

5. **[CommunityMarketplace.js:58-65] Fetches ALL `community_members` and `community_questions` rows platform-wide.** No community filter, just to count members per community. Severe performance and data exposure issue at scale. -- Use RPC or view for counts, or filter by public community IDs.

**HIGH (should fix):**

1. **[CommunitiesList.js:66] Invite codes displayed to all community members.** Any member can share the code freely, removing commissioner control. -- Only show to commissioner or hide behind a confirmation button.

2. **[CommunityDetail.js:99-108] Recent activity fetches ALL public games for member IDs, not scoped to community.** Shows games from any community. -- Add `.eq('community_id', communityId)`.

3. **[CommunitiesList.js:38-49] No community name validation.** No min/max length, empty strings allowed. -- Validate: 3-50 chars, not purely whitespace.

4. **[CommissionerDashboard.js:706-741] Bulk tag operations are sequential with no error aggregation.** Individual DB calls per question; partial failures leave inconsistent state. -- Use `Promise.all()` or batch updates.

5. **[MultiplayerLobby.js:500] Biased shuffle for question selection.** `sort(() => Math.random() - 0.5)` is biased. The file already has a proper `shuffleArray` on line 85. -- Use `shuffleArray` instead.

6. **[CommissionerDashboard.js:245-320] Season reset is not atomic.** Three separate DB operations; partial failure leaves inconsistent state. -- Wrap in a Supabase RPC function with a transaction.

7. **[MultiplayerLobby.js:252-263] Room code generation can fail silently after 5 attempts.** Proceeds with a potentially duplicate code. -- Throw an error or increase attempts.

8. **[CommissionerDashboard.js:895-902] `genAccepted` count uses stale state.** `questions_accepted` written to DB is always off-by-one. -- Calculate count from local variable before `setGenAccepted`.

9. **[CommunityDetail.js:134] No membership verification.** Any authenticated user can view full community detail (members, leaderboard, announcements). -- Verify membership or rely on RLS.

**MEDIUM (nice to fix):**

1. [CommissionerDashboard.js:155-185] Settings update does not validate season dates (end > start).
2. [CommissionerDashboard.js:1915] `parseInt` on empty input returns `NaN`.
3. [MultiplayerLobby.js:690-695] Broadcast sent on a new channel instance instead of existing ref.
4. [CommissionerDashboard.js:79-86] Six parallel fetches on mount with no coordination; only one controls loading state.
5. [CommunityDetail.js:22-113] Errors caught and logged to console but never displayed to user.
6. [CommissionerDashboard.js:549-563] Bulk delete `.in('id', ...)` may hit URL length limits for large selections.
7. [MultiplayerLobby.js:454-465] Leaving room does not check for errors.
8. [CommunityMarketplace.js:128-142] Sorting mutates the filtered array in place.
9. [MultiplayerLobby.js:467-477] Host cancellation does not verify host identity in query.
10. [CommissionerDashboard.js:245-295] Season reset does not warn if zero games have been played.

**LOW (cleanup):**

1. [CommunitiesList.js:14] ESLint exhaustive-deps suppressed.
2. [CommissionerDashboard.js:1-77] ~50 `useState` hooks in a single component; consider `useReducer` or splitting.
3. [MultiplayerLobby.js:20-25] Ambiguous character exclusion in room codes not documented.
4. [MultiplayerLobby.js:1411] Deprecated `onKeyPress` event handler (also CommissionerDashboard 1655, 1735, 1926, 1958).

---

## CONTENT Agent Findings

**CRITICAL (must fix):**

1. **[QuizScreen.js:6,112-146] QuizScreen ignores `config.source` -- community, custom, and mixed sources are non-functional.** QuizSourceSelector passes `source: 'community'`, `'custom_approved'`, or `'mixed'`, but QuizScreen always fetches from the external Trivia API. The community question bank is never used in single-player quizzes. MultiplayerLobby (lines 487-536) has working community question fetching that can be referenced. -- Add source-switching logic in `fetchQuestions`.

2. **[QuizScreen.js:101-114] Category selection is broken.** `categoryMap` uses numeric string keys (`'9'`, `'17'`) from the old Open Trivia DB API, but QuizSourceSelector passes human-readable strings (`'General Knowledge'`, `'Film'`). All quizzes default to `general_knowledge`. -- Rewrite `categoryMap` to map the selector's strings to API v2 slugs.

3. **[CommissionerDashboard.js:514-521] CSV export vulnerable to formula injection.** Fields starting with `=`, `+`, `-`, `@` are not sanitized. Malicious questions could execute as formulas in Excel/Sheets. -- Prepend a single quote to cell values starting with dangerous characters.

4. **[CommissionerDashboard.js:519-520] CSV export does not escape double-quotes in `category` and `difficulty` fields.** Other fields are escaped but these two are not. Malformed CSV output if values contain quotes. -- Apply `.replace(/"/g, '""')` to both fields.

**HIGH (should fix):**

1. **[QuizScreen.js:126-130] Quiz refuses to start if API returns fewer questions than requested.** Should use available questions instead of failing. -- Only error on zero questions returned.

2. **[QuizScreen.js:166] Score uses stale closure value.** `setScore(score + 1)` instead of `setScore(prev => prev + 1)`. -- Use functional updater.

3. **[CommissionerDashboard.js:901, 946] AI generation accepted count is always off-by-one.** State read immediately after `setGenAccepted()` before React commits the update. -- Calculate count from local variable.

4. **[QuizScreen.js:132-139] API questions lack `image_url`, `video_url`, `explanation` fields.** Rendering code for these fields is dead code for API questions. Community questions will need these mapped. -- Include these fields when formatting community questions.

5. **[CommissionerDashboard.js:711-717] Bulk tag operations use N+1 sequential DB calls.** 2 requests per question with no error tracking. -- Use `Promise.all()` or batch operations.

6. **[CommissionerDashboard.js:423] CSV validation accepts whitespace-only incorrect answers.** Validation checks truthiness but `.trim()` is called later. `"  "` passes validation but stores empty answers. -- Use `.trim()` in the validation check.

7. **[QuizScreen.js:199] 50/50 hint uses biased `sort(() => 0.5 - Math.random())`.** -- Use the existing Fisher-Yates `shuffleArray`.

**MEDIUM (nice to fix):**

1. [QuizScreen.js:185-186] `answersLog` in `handleNext` reads from closure, could theoretically be stale.
2. [CommissionerDashboard.js:615] Version history creates recursive nested snapshots (exponential JSON growth).
3. [QuizScreen.js:66-75] Timer `setInterval(100ms)` causes ~10 re-renders/second.
4. [QuizScreen.js:258-267] YouTube URL regex duplicated between QuizScreen and CommissionerDashboard.
5. [CommissionerDashboard.js:438-439] CSV import accepts arbitrary URLs without validation.
6. [QuizSourceSelector.js:12] "Mixed" mode restricted to super_admin unnecessarily.
7. [QuizScreen.js:27-30] `fetchQuestions` in `useEffect` without cleanup/AbortController.
8. [CommissionerDashboard.js:96-100] Commissioner auth check is client-side only.
9. [QuestionCreator.js:20] Custom questions inserted without explicit `status: 'pending'`.
10. [CommissionerDashboard.js:530] CSV export filename uses unsanitized community name.

**LOW (cleanup):**

1. [QuizScreen.js:148-155] `shuffleArray` defined inside component, recreated every render.
2. [CommissionerDashboard.js:1-78] 50+ state variables in a 2576-line component.
3. [QuizScreen.js:268] Question text rendered as plain text; intentional formatting not supported.
4. [CommissionerDashboard.js:1655] Deprecated `onKeyPress` used in multiple places.
5. [QuizScreen.js:300] Answer buttons use array index as `key`.

---

## UI Agent Findings

**CRITICAL (must fix):**

1. **[QuizSourceSelector.js:5] No back button on Quiz Config screen.** `onBack` prop is received from App.js but never destructured or used. Users are trapped on this screen with no way to return to dashboard. -- Destructure `onBack` and render a back button.

2. **[CommunitiesList.js:62] Clickable div without keyboard accessibility.** `.community-card` has `onClick` but no `role="button"`, `tabIndex`, or `onKeyDown`. Keyboard-only users cannot navigate communities. -- Add `role="button"`, `tabIndex={0}`, and keyboard handler.

3. **[CommunityFeed.js:45-49] Clickable game cards not keyboard accessible.** `.username` span has `onClick` but is not a button element. No keyboard support. -- Add proper interactive attributes.

4. **[QuizScreen.css, ResultsScreen.css] No mobile responsive breakpoints.** Zero `@media` queries. 40px padding and grid layouts overflow on narrow screens. ResultsScreen leaderboard grid needs 330px minimum width. -- Add responsive breakpoints for <768px and <480px.

5. **[CommunitiesList.js:72-76] Modal inputs missing label elements.** Inputs have `placeholder` but no `<label>` or `aria-label`. Screen readers cannot identify fields. -- Add `aria-label` attributes.

**HIGH (should fix):**

1. **[QuizScreen.css:152,158] Hardcoded answer button colors break dark mode.** `.answer-btn.correct` and `.wrong` use hardcoded light backgrounds. -- Use `var(--correct-bg)` and `var(--incorrect-bg)`.

2. **[QuizScreen.css:244, GameReview.css:131] Explanation panel background hardcoded for light mode.** `background: #F0F4FF` creates a bright box in dark mode. -- Use `var(--info-bg)`.

3. **[NotificationBell.css:79,88,144,154,161] Multiple hardcoded colors break dark mode.** Links, hover backgrounds, message text, timestamps all use fixed colors. -- Replace with CSS variables.

4. **[Multiple files] Extensive use of `#667eea` purple instead of Georgetown palette.** 54 occurrences across 15 files. Login screen, quiz, profile, feed, communities all use purple instead of navy. -- Switch to `var(--navy)` or navy-based gradients.

5. **[UserProfile.css:30] Profile stat cards use hardcoded purple gradient.** `#9b59b6`/`#8e44ad` -- neither Georgetown palette nor the `#667eea` used elsewhere. -- Use navy.

6. **[MultiplayerLobby.css:441] Ready card background hardcoded.** `#f0faf4` appears bright in dark mode. -- Use `var(--correct-bg)`.

7. **[CommunityDetail.css:173] Current user leaderboard row hardcoded for light mode.** `#fffbea` cream flashes in dark mode. -- Use CSS variable or semi-transparent approach.

8. **[CommunityDetail.css:156] Leaderboard table header uses `#667eea`.** Dashboard correctly uses `var(--navy)`. -- Match Dashboard pattern.

9. **[CommissionerDashboard.js] 40+ calls to `alert()`.** Blocks UI, unstyled, poor UX. AdminDashboard has a proper toast system. -- Adopt the same toast pattern.

10. **[App.js:341] `alert()` for question submission success.** -- Use toast or inline message.

11. **[QuizSourceSelector.css:27-33] Select inputs missing dark mode styles.** No `background` or `color` set; browser defaults render white in dark mode. -- Add themed properties.

12. **[MultiplayerLobby.css:1018,1028] Medal row backgrounds hardcoded.** Light backgrounds break in dark mode. -- Use CSS variables.

**MEDIUM (nice to fix):**

1. [Dashboard.css:251 and multiple files] `.diff-medium` uses hardcoded `#856404` with no dark mode variant.
2. [PerformanceCharts.css:5] Chart heading accent color hardcoded `#667eea`.
3. [PerformanceCharts.js:25,38] Recharts colors hardcoded, don't adapt to theme.
4. [StartScreen.css:7] Login screen background is purple gradient, not Georgetown themed.
5. [QuizScreen.js:255] Image alt text is generic "Question".
6. [App.js:209] Loading state shows only "Loading..." text, no spinner or branding.
7. [CommunityFeed.js:42] Loading state is unstyled `<p>Loading...</p>`.
8. [CommunitiesList.js:52] Loading state is minimal text.
9. [GameReview.js:28] Loading state is minimal text.
10. [Dashboard.js:97] Empty leaderboard renders headers with no "No data" message.
11. [CommunityMarketplace.css:130] Chip hover color hardcoded.
12. [CommunityFeed.css:111-113] Difficulty badge backgrounds hardcoded, don't match themed vars.
13. [CommissionerDashboard.css:6-24] Duplicate `:root` CSS variable declaration.
14. [QuizScreen.js:263] `frameBorder="0"` is deprecated HTML5 attribute.

**LOW (cleanup):**

1. [QuizScreen.css:41] `.score` uses `#667eea` instead of `var(--navy)`.
2. [CommunityFeed.css:74,94,98,132,141] Multiple elements use raw `#667eea`.
3. [QuizScreen.css:140,191-192] Answer hover and next button use purple gradient.
4. [ResultsScreen.css:135,136] Leaderboard row gradients hardcoded.
5. [Dashboard.css:282] `.game-date` uses hardcoded `#8B9DC3`.
6. [Achievements.css:74] Badge checkmark uses hardcoded green.
7. [index.css:1-13] Duplicate body styles between `index.css` and `App.css`.
8. [CommunitiesList.css:65-67] Card hover uses raw `#667eea` shadow/border.
9. [Multiple files] Page headings (`h1`) use `#667eea` instead of `var(--navy)` in 5+ files.
10. [ResultsScreen.js:67] Deprecated `onKeyPress`.

---

## GAMIFICATION Agent Findings

**CRITICAL (must fix):**

1. **[ResultsScreen.js:40-44,53] Hardcoded 10-question assumption.** `getPerformanceMessage()` checks `score === 10` for perfect score; display shows `{score}/10`. With configurable question count (default 3), a 3/3 score displays as "3/10" with the wrong message. -- Accept `totalQuestions` as a prop, use percentage-based thresholds.

2. **[ResultsScreen.js:20-36] ResultsScreen uses localStorage leaderboard disconnected from Supabase.** Scores saved here never appear in the real leaderboard. -- Remove this component or migrate to Supabase data.

3. **[Dashboard.js:58] Leaderboard `avgPercentage` is a string from `.toFixed(1)`.** Sort comparator relies on implicit coercion. Fragile and breaks on edge cases. Also, sort is limited to 100 games. -- Store as `Number`, remove `.limit(100)` or aggregate server-side.

4. **[Dashboard.js:46] Leaderboard limited to 100 most-recent games platform-wide.** Users' historical games excluded from averages. Rankings are inaccurate and unstable. -- Use database view/RPC for aggregation.

5. **[UserProfile.js:20-31] Stats based on only 10 most recent public games.** "Games Played" shows max 10; averages only reflect recent games. -- Fetch all games for stats or label clearly.

6. **[UserProfile.js:29] Division by zero in `bestGame` calculation.** `total_questions === 0` causes `Infinity`. Error path in QuizScreen inserts 0-question games. -- Guard against `total_questions === 0`.

7. **[App.js:175-186] Games with 0 questions saved to database.** Error "Back to Dashboard" calls `onEnd(0, 0, [], 0)`. Pollutes stats everywhere. -- Guard: `if (totalQuestions === 0) return` before insert.

**HIGH (should fix):**

1. **[Achievements.js:5] Badge description says "Get 10/10" but game length is variable.** Checker logic correctly uses `score === total_questions`, but description is misleading. -- Change to "Get a perfect score on any quiz".

2. **[achievementChecker.js:3] No error handling on the games query.** Failure silently returns empty achievements with no indication. -- Check for error from Supabase response.

3. **[achievementChecker.js:1-32] Fetches ALL user games every time Dashboard mounts.** Inefficient for prolific users. -- Cache earned achievements in a table or add limit.

4. **[Dashboard.js:32] Dashboard fetches ALL games with `select('*')`.** Transfers unnecessary data. -- Select only needed columns.

5. **[GameReview.js:18] No authorization check on game review.** Any user can view any game by ID if RLS is not enforced. -- Confirm RLS or add `.eq('user_id', user.id)`.

6. **[GameReview.js:20] No error checking on `game_answers` query.** Failed query silently shows empty review. -- Add error handling and user-facing message.

7. **[NotificationBell.js:12-18] No error handling on notification queries.** Failed queries silently show 0 notifications. -- Add error handling.

8. **[NotificationBell.js:34-37] Polling every 30 seconds creates continuous Supabase requests.** Unnecessary load at scale. -- Use Supabase realtime subscriptions.

9. **[Dashboard.js:46,50] Leaderboard visibility filter is client-side.** Private users' data still transmitted over network. -- Add server-side filter.

**MEDIUM (nice to fix):**

1. [achievementChecker.js:16-17] Category master counts null/undefined categories.
2. [Dashboard.js:43] `Math.min` applied to a string from `.toFixed(1)`.
3. [PerformanceCharts.js:9] Division by zero in score chart data for 0-question games.
4. [PerformanceCharts.js:12] Division by zero in category chart data.
5. [Dashboard.js:98-112] Leaderboard does not handle ties (sequential ranks for same score).
6. [UserProfile.js:26] Division by zero in `avgScore` calculation.
7. [UserProfile.js:32] `checkAchievements` called for any viewed user, exposing private game data.
8. [ResultsScreen.js:67] Deprecated `onKeyPress`.
9. [NotificationBell.js:28] Notifications limited to 20 with no pagination.

**LOW (cleanup):**

1. [Dashboard.js:14-19] Missing dependency in useEffect (lint suppressed).
2. [GameReview.js:11-14] Missing dependency in useEffect (lint suppressed).
3. [Dashboard.js:100] List key uses array index instead of `userId`.
4. [GameReview.js:49] List key uses array index instead of `answer.id`.
5. [achievementChecker.js] No JSDoc or type annotations.
6. [Achievements.js:1-36] BADGES constant not shared with achievementChecker (decoupled IDs).

---

## CRUD Agent Findings

**CRITICAL (must fix):**

1. **[AdminDashboard.js:41] Unbounded `select('*')` on all games.** Two full-table scans in `fetchAdminData`. Will timeout/crash as data grows. -- Use aggregate RPCs server-side; at minimum select only needed columns and add pagination.

2. **[CommunityMarketplace.js:58-65] Unbounded fetch of ALL `community_members` and `community_questions` rows.** Fetches every row platform-wide just to build count maps. -- Use RPC/view for counts or filter by community IDs.

3. **[CommissionerDashboard.js:711-724] N+1 query in `handleBulkAddTag`.** Two individual DB calls per selected question. 50 questions = 100+ sequential calls. -- Batch updates.

4. **[CommissionerDashboard.js:727-741] N+1 query in `handleBulkRemoveTag`.** Same issue. -- Batch updates.

5. **[App.js:69] Silent fire-and-forget theme update.** `.then(() => {})` swallows errors. Theme preference lost silently. -- Add error handling.

6. **[Settings.js:39] Silent fire-and-forget theme update.** Same pattern without error check. -- Capture and display error.

**HIGH (should fix):**

1. **[AdminDashboard.js:41-67] Multiple separate full-table scans sequentially.** 6 queries that should be parallelized and reduced in scope. -- Use `Promise.all()` and select only needed columns.

2. **[achievementChecker.js:3] Fetches all games with `select('*')`.** Only needs `score`, `total_questions`, `category`, `created_at`. -- Specify needed columns.

3. **[Dashboard.js:32] Fetches all games with `select('*')`.** -- Select only needed columns.

4. **[Dashboard.js:14-19] Dashboard makes 3 sequential DB calls on mount, not parallelized.** `checkAdminStatus` re-fetches profile data already available from App.js. -- Pass username as prop; use `Promise.all()`.

5. **[Dashboard.js:21-24] Duplicate profile fetch.** Already fetched in `App.js:fetchUserRole`. -- Remove and pass via props.

6. **[UserProfile.js:20-32] Stats computed from only 10 games due to `.limit(10)`.** Stats are misleading. -- Separate stats query from display query.

7. **[NotificationBell.js:13-18] No error handling on notification count fetch.** Polls every 30s; persistent error silently fails repeatedly. -- Add error destructuring.

8. **[NotificationBell.js:21-31] No error handling on notification list fetch.** -- Add error handling.

9. **[NotificationBell.js:60-77] No error handling on mark-as-read.** Optimistically updates UI; DB failure leaves inconsistent state. -- Check error and revert on failure.

10. **[GameReview.js:17-26] Missing error handling on individual queries.** Errors logged to console only. -- Show user-facing error messages.

11. **[CommissionerDashboard.js:96-100] Commissioner authorization is client-side only.** -- Ensure RLS policies exist on all commissioner-only tables.

12. **[CommunityDetail.js:83-86] Unbounded fetch of community_questions for count.** Transfers all rows just for `.length`. -- Use `select('id', { count: 'exact', head: true })`.

13. **[CommissionerDashboard.js:88-153] `fetchCommissionerData` makes 5 sequential calls.** -- Use `Promise.all()` for independent queries.

14. **[MultiplayerLobby.js:444-451] No error handling on ready toggle.** -- Check error and revert state on failure.

15. **[MultiplayerLobby.js:454-465] No error handling on leave room.** -- Check error return.

16. **[MultiplayerLobby.js:467-477] No error handling on cancel room.** -- Check error return.

**MEDIUM (nice to fix):**

1. [CommissionerDashboard.js:79-86] Six parallel fetches without coordination; duplicate data fetching.
2. [CommissionerDashboard.js:187-243] `fetchSeasonData` re-fetches data already loaded by `fetchCommissionerData`.
3. [Settings.js:17-19] No error handling in `fetchProfile`.
4. [CommunitiesList.js:42-43] Invite code uses `Math.random()` instead of `generate_invite_code` RPC.
5. [CommunitiesList.js:43-44] Hard-coded 30-day season with no user configuration.
6. [CommunitiesList.js:45] No error handling on member insert after community creation.
7. [CommunityFeed.js:17-29] Re-fetches on every filter change without debounce.
8. [CommunityDetail.js:99-108] Large `IN` clause for member activity could exceed query limits.
9. [CommissionerDashboard.js:607-622] Version history read-modify-write vulnerable to concurrent modification.
10. [CommissionerDashboard.js:900-902] Race condition in accepted count tracking (stale state).
11. [AdminDashboard.js:92-128] Double `fetchAiRequests()` call after approval.
12. [Dashboard.js:46] Leaderboard limited to 100 games.
13. [MultiplayerLobby.js:253-264] Room code collision check uses sequential queries.
14. [CommissionerDashboard.js:743-820] Large `IN` clause in `fetchAnalytics`.

**LOW (cleanup):**

1. [Settings.js:18] `select('*')` on profiles -- only needs a few fields.
2. [GameReview.js:18,20] `select('*')` on games and game_answers.
3. [MyStats.js:13] `select('*')` on games.
4. [NotificationBell.js:23] `select('*')` on notifications.
5. [CommunityDetail.js:24-28,83-86] `select('*')` on communities and community_questions.
6. [CommissionerDashboard.js:90-94,129-133] `select('*')` on communities and community_questions.
7. [UserProfile.js:20] `select('*')` on games.
8. [MultiplayerLobby.js:220-224] `select('*')` on multiplayer_participants.
9. [CommissionerDashboard.js:456-475] `created_at` manually set on bulk import (should use DB default).
10. [AdminDashboard.js:162] Update returns `data` but it is unused.

---

## Summary Statistics

| Agent | Critical | High | Medium | Low | Total |
|-------|----------|------|--------|-----|-------|
| AUTH | 3 | 5 | 6 | 5 | 19 |
| COMMUNITY | 5 | 9 | 13 | 4 | 31 |
| CONTENT | 4 | 7 | 10 | 5 | 26 |
| UI | 5 | 12 | 14 | 10 | 41 |
| GAMIFICATION | 7 | 9 | 9 | 6 | 31 |
| CRUD | 6 | 16 | 14 | 10 | 46 |
| **TOTAL** | **30** | **58** | **66** | **40** | **194** |

> **Note:** Many findings overlap across agents (e.g., N+1 queries flagged by both COMMUNITY and CRUD, 0-question games flagged by both GAMIFICATION and CRUD). The deduplicated unique issue count is approximately **120-130**.
