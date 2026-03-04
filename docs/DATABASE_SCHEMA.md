# Database Schema

This document describes all Supabase tables used by the Trivia Quiz App, inferred from the application source code.

---

## Tables Overview

| Table | Description |
|-------|-------------|
| `profiles` | Extended user profile linked to Supabase Auth |
| `games` | Individual quiz game records |
| `game_answers` | Per-answer log for each game |
| `communities` | League / community definitions |
| `community_members` | Membership join table |
| `community_roles` | Granular permission roles per community (system + custom) |
| `permission_overrides` | Per-user permission overrides within a community |
| `permission_audit_log` | Audit trail for permission-related actions |
| `community_questions` | Community-owned question bank |
| `question_difficulty_votes` | Player votes on question difficulty (one per user per question) |
| `community_leaderboards` | Computed rankings per community |
| `community_announcements` | Commissioner announcements per community |
| `community_messages` | Real-time chat messages per community |
| `custom_questions` | User-submitted questions awaiting admin review |
| `question_templates` | Reusable question templates per community |
| `generation_requests` | AI question generation requests (commissioner → admin approval) |
| `notifications` | In-app notifications for users |
| `season_archives` | Archived season leaderboards per community |
| `multiplayer_rooms` | Multiplayer game rooms (lobby) |
| `multiplayer_participants` | Players in a multiplayer room |
| `multiplayer_questions` | Questions assigned to a multiplayer game |
| `multiplayer_answers` | Per-player answers in a multiplayer game |
| `media_library` | Centralized media assets per community |
| `community_requests` | User requests for new community creation (admin approval) |
| `email_integrations` | Email platform sync configs per community (Mailchimp, ConvertKit, Beehiiv, webhook) |
| `email_sync_logs` | Sync attempt log for debugging email platform delivery |
| `email_templates` | Reusable email templates per community |
| `email_campaigns` | Persistent campaign history with segmentation and send tracking |
| `community_sites` | Generated single-page sites per community (Site Builder) |
| `scheduled_quizzes` | Scheduled quiz events per community (Quiz Night) |
| `scheduled_quiz_attempts` | Individual player attempts on scheduled quizzes |
| `scheduled_quiz_answers` | Per-answer records for scheduled quiz attempts |

---

## Table Definitions

### `profiles`

Extends Supabase Auth `auth.users`. Automatically created via trigger on signup.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | Primary key; matches `auth.users.id` |
| `username` | `text` | Display name chosen at signup |
| `platform_role` | `text` | `'user'` (default), `'admin'`, or `'super_admin'` — new unified role column |
| `role` | `text` | **Deprecated** — `'user'` or `'admin'`. Kept for backward compatibility; use `platform_role` instead |
| `super_admin` | `boolean` | **Deprecated** — Kept for backward compatibility; use `platform_role` instead |
| `profile_visibility` | `boolean` | If false, profile hidden from other users |
| `leaderboard_visibility` | `boolean` | If false, excluded from leaderboards |
| `theme` | `text` | `'light'` or `'dark'` — user's preferred color theme |
| `tos_accepted_at` | `timestamptz` | When user accepted Terms of Service (nullable) |
| `privacy_accepted_at` | `timestamptz` | When user accepted Privacy Policy (nullable) |
| `tos_version` | `text` | Version of ToS accepted (e.g., `'1.0'`) (nullable) |
| `current_streak` | `integer` | Current consecutive daily play streak (default 0) |
| `best_streak` | `integer` | Best-ever consecutive daily play streak (default 0) |
| `last_played_date` | `date` | Calendar date of last game played (nullable) |
| `bot_flags` | `jsonb` | Bot detection flags: `{flagged, reasons[], flagged_at}` (default unflagged) |
| `created_at` | `timestamptz` | Row creation timestamp |

**Notes:**
- `platform_role = 'admin'` or `'super_admin'` grants access to the Admin Dashboard
- `super_admin` platform role users additionally see the "Mixed (All Sources)" quiz option
- Legacy columns `role` and `super_admin` are kept in sync by the app for backward compatibility but `platform_role` is the canonical source of truth

**Indexes:**
- `idx_profiles_streak` — partial index on `current_streak DESC` where `current_streak > 0`

**Queried by:** `App.js`, `Dashboard.js`, `Settings.js`, `StartScreen.js`, `CommunitiesList.js`, `CommunityChat.js`, `CommissionerDashboard.js`, `AdminDashboard.js`, `UserProfile.js`, `achievementChecker.js`

---

### `games`

One row per completed quiz session.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | Primary key |
| `user_id` | `uuid` | FK → `profiles.id` |
| `category` | `text` | Quiz category selected |
| `difficulty` | `text` | `'easy'`, `'medium'`, or `'hard'` |
| `score` | `integer` | Number of correct answers |
| `total_questions` | `integer` | Total questions in game |
| `community_id` | `uuid` | FK → `communities.id` (nullable) |
| `visibility` | `text` | `'public'` or `'private'` |
| `source` | `text` | `'app'` (default) or `'embed'` — where game was played |
| `host_origin` | `text` | For embed games: parent site hostname (e.g. `elliehallaron.com`) |
| `created_at` | `timestamptz` | Game completion timestamp |

**Relationships:**
- `user_id` → `profiles.id`
- `community_id` → `communities.id` (nullable; set when playing community questions)

**Sample queries:**
```sql
-- User stats
SELECT
  count(*) as total_games,
  round(sum(score)::numeric / sum(total_questions) * 100, 1) as avg_pct,
  max(round(score::numeric / total_questions * 100, 1)) as best_pct
FROM games
WHERE user_id = $1;

-- Platform leaderboard (top 10 by avg %)
SELECT
  user_id,
  profiles.username,
  round(sum(score)::numeric / sum(total_questions) * 100, 1) as avg_pct,
  count(*) as games_played
FROM games
JOIN profiles ON profiles.id = games.user_id
WHERE visibility = 'public'
  AND profiles.leaderboard_visibility = true
GROUP BY user_id, profiles.username
ORDER BY avg_pct DESC
LIMIT 10;
```

**Queried by:** `App.js`, `Dashboard.js`, `GameReview.js`, `MyStats.js`, `UserProfile.js`, `CommunityDetail.js`, `CommunityFeed.js`, `CommissionerDashboard.js`, `EmbedConfigurator.js`, `AdminDashboard.js`, `achievementChecker.js`

---

### `game_answers`

Stores each individual answer from a game. Enables the per-game review screen.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | Primary key |
| `game_id` | `uuid` | FK → `games.id` |
| `user_id` | `uuid` | FK → `profiles.id` |
| `question_text` | `text` | The question as presented |
| `correct_answer` | `text` | The correct answer |
| `user_answer` | `text` | What the user selected |
| `is_correct` | `boolean` | Whether the answer was correct |
| `explanation` | `text` | Explanation of the correct answer (nullable) |
| `image_url` | `text` | URL to question image (nullable) |
| `video_url` | `text` | YouTube URL for video questions (nullable) |
| `answered_at` | `timestamptz` | When the answer was submitted (nullable) |
| `time_taken_ms` | `integer` | Milliseconds from question display to answer (nullable) |

**Relationships:**
- `game_id` → `games.id`
- `user_id` → `profiles.id`

**Queried by:** `App.js`, `Dashboard.js`, `GameReview.js`, `CommissionerDashboard.js`, `AdminDashboard.js`

---

### `communities`

A community (league) groups members and maintains a shared question bank.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | Primary key |
| `name` | `text` | Display name |
| `slug` | `text` | URL-safe identifier (auto-generated from name) |
| `commissioner_id` | `uuid` | FK → `profiles.id` (owner/manager) |
| `invite_code` | `text` | 8-character uppercase join code |
| `season_start` | `timestamptz` | Season start date |
| `season_end` | `timestamptz` | Season end date |
| `visibility` | `text` | `'public'` or `'private'` — controls marketplace listing |
| `description` | `text` | Community description shown in marketplace (nullable) |
| `current_season` | `integer` | Current season number (increments on season reset) |
| `settings` | `jsonb` | Flexible settings (see below) |
| `created_at` | `timestamptz` | Creation timestamp |

**`settings` JSONB shape:**
```json
{
  "max_members": 50,
  "timer_enabled": true,
  "timer_seconds": 30,
  "theme_color": "#041E42",
  "logo_url": "https://...",
  "banner_url": "https://...",
  "welcome_message": "Welcome to our community!",
  "categories": ["General Knowledge", "History", "Science"],
  "webhook_url": "https://example.com/webhook"
}
```

**Relationships:**
- `commissioner_id` → `profiles.id`

**Notes:**
- `invite_code` is generated via `generate_invite_code` RPC or `crypto.getRandomValues()` with an unambiguous character set
- `slug` is generated as `name.toLowerCase().replace(/[^a-z0-9]+/g, '-')`
- Default season length at creation: 30 days
- `visibility = 'public'` makes the community appear in the Community Marketplace
- `settings.categories` stores the dynamic list of community-specific categories (managed by commissioner)
- `settings.webhook_url` stores an optional webhook URL for embed game completion notifications

**Queried by:** `CommunitiesList.js`, `CommunityDetail.js`, `CommunityMarketplace.js`, `QuizSourceSelector.js`, `CommissionerDashboard.js`, `EmbedConfigurator.js`, `AdminDashboard.js`

---

### `community_members`

Join table connecting users to communities.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | Primary key |
| `community_id` | `uuid` | FK → `communities.id` |
| `user_id` | `uuid` | FK → `profiles.id` |
| `role` | `text` | `'owner'`, `'commissioner'`, `'moderator'`, or `'member'` (default) |
| `role_id` | `uuid` | FK → `community_roles.id` (nullable; backfilled from `role` text) |
| `joined_at` | `timestamptz` | Join timestamp |

**Constraints:**
- Unique on `(community_id, user_id)` — prevents duplicate membership (error code `23505`)
- CHECK on `role` — must be one of: `owner`, `commissioner`, `moderator`, `member`

**Community Role Permissions:**

| Permission | Owner | Commissioner | Moderator | Member |
|------------|-------|--------------|-----------|--------|
| View community | Yes | Yes | Yes | Yes |
| Manage questions (add/edit/delete/import) | Yes | Yes | Yes | No |
| View analytics | Yes | Yes | Yes | No |
| Manage members (remove, change roles) | Yes | Yes | No | No |
| Manage settings | Yes | Yes | No | No |
| Post announcements | Yes | Yes | No | No |
| Transfer ownership | Yes | No | No | No |
| Delete community | Yes | No | No | No |

**RLS Policies (UPDATE):**
- USING: user must be `owner` or `commissioner` in the community
- WITH CHECK: cannot update own role; only `owner` can assign `'owner'` role; role must be a valid value (`owner`, `commissioner`, `moderator`, `member`)

**Queried by:** `App.js`, `CommunitiesList.js`, `CommunityDetail.js`, `CommunityMarketplace.js`, `MultiplayerLobby.js`, `CommissionerDashboard.js`, `AdminDashboard.js`

---

### `community_roles`

Granular permission roles per community. System roles (owner, commissioner, moderator, member) are auto-created via trigger on community insert. Custom roles can be added by users with `manage_roles` permission.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | Primary key |
| `community_id` | `bigint` | FK → `communities.id` (CASCADE) |
| `name` | `text` | Display name (e.g., "Owner", "Commissioner") |
| `slug` | `text` | Lowercase identifier (e.g., "owner", "commissioner") |
| `description` | `text` | Role description |
| `permissions` | `jsonb` | Permission key→boolean map (e.g., `{"manage_questions":true}`) |
| `hierarchy_level` | `integer` | Rank for role ordering (owner=100, commissioner=75, moderator=50, member=0) |
| `is_system` | `boolean` | `true` for built-in roles (cannot be deleted) |
| `color` | `text` | Role badge color hex |
| `created_at` | `timestamptz` | Creation timestamp |
| `updated_at` | `timestamptz` | Last update timestamp |

**Constraints:** `UNIQUE (community_id, slug)`

**Triggers:**
- `on_community_created_roles` — AFTER INSERT on `communities`, creates 4 system roles (owner, commissioner, moderator, member)

**RLS:** Members can read roles for their community. `manage_roles` permission required for insert/update/delete (system roles cannot be deleted).

**Queried by:** `CommissionerDashboard.js`, `permissions.js`, `PermissionContext`

---

### `permission_overrides`

Per-user permission overrides within a community. Allows granting or revoking specific permissions independent of role.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | Primary key |
| `community_id` | `bigint` | FK → `communities.id` (CASCADE) |
| `user_id` | `uuid` | FK → `profiles.id` (CASCADE) |
| `permission_key` | `text` | Permission being overridden (e.g., `manage_questions`) |
| `granted` | `boolean` | `true` to grant, `false` to revoke |
| `granted_by` | `uuid` | FK → `profiles.id` (nullable) |
| `reason` | `text` | Optional reason for the override |
| `created_at` | `timestamptz` | Creation timestamp |

**Constraints:** `UNIQUE (community_id, user_id, permission_key)`

**RLS:** Requires `assign_roles` permission for all operations.

**Queried by:** `check_community_permission()` RPC, `get_user_permissions()` RPC, `CommissionerDashboard.js`

---

### `permission_audit_log`

Audit trail for permission-related actions in communities.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | Primary key |
| `community_id` | `bigint` | FK → `communities.id` (CASCADE) |
| `actor_id` | `uuid` | FK → `profiles.id` — who performed the action |
| `action` | `text` | Action type (e.g., `role_assigned`, `override_granted`) |
| `target_user_id` | `uuid` | FK → `profiles.id` (nullable) — affected user |
| `target_role_id` | `uuid` | FK → `community_roles.id` (SET NULL on delete, nullable) |
| `details` | `jsonb` | Additional context for the action |
| `created_at` | `timestamptz` | Action timestamp |

**RLS:** Readable by users with `view_analytics` permission. Insert requires `actor_id = auth.uid()`.

**Queried by:** `CommissionerDashboard.js` (Analytics tab)

---

### `community_questions`

Question bank owned by a specific community. Used when quiz source is "Community Questions Only".

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | Primary key |
| `community_id` | `uuid` | FK → `communities.id` |
| `question_text` | `text` | The question |
| `correct_answer` | `text` | Correct answer |
| `incorrect_answers` | `text[]` | Array of 3 incorrect answers |
| `category` | `text` | Category label |
| `difficulty` | `text` | `'easy'`, `'medium'`, or `'hard'` |
| `tags` | `text[]` | Custom tags (nullable) |
| `explanation` | `text` | Optional explanation of the correct answer |
| `status` | `text` | `'active'` (default), `'archived'`, `'draft'`, or `'retired'` — controls whether question is served to players |
| `image_url` | `text` | URL to question image in Supabase Storage (nullable) |
| `video_url` | `text` | YouTube URL for video questions (nullable) |
| `source` | `text` | `'manual'`, `'ai_generated'`, or `'imported'` |
| `ai_request_id` | `uuid` | FK → `generation_requests.id` (nullable; set for AI-generated questions) |
| `ai_model` | `text` | AI model name if generated (nullable) |
| `ai_theme` | `text` | Theme used for AI generation (nullable) |
| `version_number` | `integer` | Current version number |
| `version_history` | `jsonb[]` | Array of up to 10 version snapshots |
| `difficulty_vote_counts` | `jsonb` | Vote tallies `{"easy":0,"medium":0,"hard":0}` — updated by trigger |
| `computed_difficulty` | `text` | Auto-computed difficulty from player votes (5+ votes, >60% consensus) |
| `imported_by` | `uuid` | FK → `profiles.id` (nullable; set on CSV import) |
| `imported_at` | `timestamptz` | Import timestamp (nullable) |
| `created_at` | `timestamptz` | Creation timestamp |

**Version history entry shape (stored in `version_history`):**
```json
{
  "question_id": "uuid",
  "version_number": 3,
  "change_type": "tag_added | tag_removed | version_restored",
  "changes": { "tag": "science" },
  "question_snapshot": { ...full question row... },
  "changed_by": "uuid",
  "changed_at": "2025-01-01T00:00:00Z"
}
```

**Queried by:** `QuizScreen.js`, `QuizSourceSelector.js`, `CommunityDetail.js`, `CommunityMarketplace.js`, `MultiplayerLobby.js`, `CommissionerDashboard.js`, `EmbedConfigurator.js`, `AdminDashboard.js`

---

### `question_difficulty_votes`

Player votes on whether a question's difficulty felt accurate. One vote per user per question. A trigger recalculates `community_questions.difficulty_vote_counts` and `computed_difficulty` on each insert/update.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | Primary key |
| `question_id` | `uuid` | FK → `community_questions.id` (CASCADE) |
| `community_id` | `uuid` | FK → `communities.id` (CASCADE) |
| `user_id` | `uuid` | FK → `auth.users.id` (CASCADE) |
| `voted_difficulty` | `text` | `'easy'`, `'medium'`, or `'hard'` |
| `created_at` | `timestamptz` | Vote timestamp |

**Constraints:** `UNIQUE (question_id, user_id)` — one vote per user per question.

**Trigger:** `trg_recalc_difficulty_votes` fires after insert/update, aggregates votes into `community_questions.difficulty_vote_counts` and sets `computed_difficulty` when 5+ votes with >60% consensus.

**RLS:** Authenticated users can read all votes, insert/update only their own.

**Queried by:** `QuizScreen.js` (upsert on vote), `CommissionerDashboard.js` (reads via `community_questions` columns)

---

### `community_leaderboards`

Rankings per community. A view or materialized view computed from `games` filtered by `community_id`.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | Primary key |
| `community_id` | `uuid` | FK → `communities.id` |
| `user_id` | `uuid` | FK → `profiles.id` |
| `username` | `text` | Denormalized username |
| `rank` | `integer` | Rank position (1 = best) |
| `avg_score` | `numeric` | Average score percentage |
| `total_games` | `integer` | Games played in this community |

**Queried by:** `CommunityDetail.js` (fallback when no `season_start` exists)

---

### `custom_questions`

User-submitted questions that require admin approval before becoming available platform-wide.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | Primary key |
| `creator_id` | `uuid` | FK → `profiles.id` (submitter) |
| `category` | `text` | Category |
| `difficulty` | `text` | `'easy'`, `'medium'`, or `'hard'` |
| `question_text` | `text` | The question |
| `correct_answer` | `text` | Correct answer |
| `incorrect_answers` | `text[]` | Array of 3 incorrect answers |
| `status` | `text` | `'pending'`, `'approved'`, or `'rejected'` |
| `reviewed_at` | `timestamptz` | Timestamp of admin review (nullable) |
| `created_at` | `timestamptz` | Submission timestamp |

**Relationships:**
- `creator_id` → `profiles.id` (foreign key named `custom_questions_creator_id_fkey`)

**Queried by:** `QuestionCreator.js`, `QuizScreen.js`, `AdminDashboard.js`

---

### `question_templates`

Saved question templates within a community. Commissioners can create questions from templates.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | Primary key |
| `community_id` | `uuid` | FK → `communities.id` |
| `name` | `text` | Template name (commissioner-defined) |
| `question_text` | `text` | Template question text |
| `correct_answer` | `text` | Correct answer |
| `incorrect_answers` | `text[]` | Array of 3 incorrect answers |
| `category` | `text` | Category |
| `difficulty` | `text` | `'easy'`, `'medium'`, or `'hard'` |
| `tags` | `text[]` | Tags to apply when creating from template |
| `created_by` | `uuid` | FK → `profiles.id` |
| `created_at` | `timestamptz` | Creation timestamp |

**Queried by:** `CommissionerDashboard.js`, `AdminDashboard.js`

---

### `generation_requests`

AI question generation requests. Commissioners submit requests; admins approve or reject; approved requests trigger AI generation.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | Primary key |
| `community_id` | `uuid` | FK → `communities.id` |
| `requested_by` | `uuid` | FK → `profiles.id` (commissioner who submitted) |
| `theme` | `text` | Topic/theme for question generation |
| `difficulty` | `text` | `'easy'`, `'medium'`, or `'hard'` |
| `question_count` | `integer` | Number of questions requested (5–25) |
| `special_instructions` | `text` | Optional additional instructions (nullable) |
| `status` | `text` | `'pending'`, `'approved'`, `'generating'`, `'completed'`, `'failed'`, or `'rejected'` |
| `reviewed_by` | `uuid` | FK → `profiles.id` (admin who reviewed, nullable) |
| `reviewed_at` | `timestamptz` | Timestamp of admin review (nullable) |
| `admin_notes` | `text` | Optional notes from admin on rejection (nullable) |
| `generated_questions` | `jsonb` | Array of generated question objects (nullable; populated by Edge Function) |
| `questions_accepted` | `integer` | Count of questions accepted into the community bank (nullable) |
| `created_at` | `timestamptz` | Submission timestamp |

**Relationships:**
- `community_id` → `communities.id`
- `requested_by` → `profiles.id`
- `reviewed_by` → `profiles.id`

**Queried by:** `CommissionerDashboard.js`, `AdminDashboard.js`

---

### `notifications`

In-app notifications for users. Triggered by admin actions (question/AI request/community request approve/reject).

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | Primary key |
| `user_id` | `uuid` | FK → `profiles.id` (recipient) |
| `type` | `text` | Notification type (see below) |
| `title` | `text` | Notification title |
| `message` | `text` | Notification body text |
| `link_screen` | `text` | Screen name to navigate to when clicked (nullable) |
| `read` | `boolean` | Whether notification has been read (default false) |
| `created_at` | `timestamptz` | Creation timestamp |

**Notification types:**
- `question_approved` — custom question was approved by admin
- `question_rejected` — custom question was rejected by admin
- `ai_request_approved` — AI generation request was approved
- `ai_request_rejected` — AI generation request was rejected
- `community_request_approved` — community creation request was approved
- `community_request_rejected` — community creation request was rejected

**RLS Policies:**
- SELECT: own rows only (`user_id = auth.uid()`)
- UPDATE: own rows only (for marking as read)

**Queried by:** `NotificationBell.js`, `AdminDashboard.js`

---

### `season_archives`

Archived season leaderboards. Created when a commissioner resets a season via the `reset_season` RPC.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | Primary key |
| `community_id` | `uuid` | FK → `communities.id` |
| `season_number` | `integer` | The archived season number |
| `season_start` | `timestamptz` | Start date of the archived season |
| `season_end` | `timestamptz` | End date of the archived season |
| `total_games` | `integer` | Total games played during the season |
| `total_questions_played` | `integer` | Total questions answered during the season |
| `top_player_id` | `uuid` | FK → `profiles.id` (season MVP, nullable) |
| `top_player_username` | `text` | Denormalized MVP username (nullable) |
| `top_player_avg` | `numeric` | MVP's average score percentage (nullable) |
| `leaderboard_snapshot` | `jsonb` | Frozen leaderboard — array of `{rank, user_id, username, avg_score, total_games}` |
| `archived_by` | `uuid` | FK → `profiles.id` (commissioner who triggered reset) |
| `created_at` | `timestamptz` | Archive timestamp |

**Relationships:**
- `community_id` → `communities.id`
- `top_player_id` → `profiles.id`
- `archived_by` → `profiles.id`

**Notes:**
- Created atomically by the `reset_season` RPC function
- Viewable by all community members on the community detail page
- Expandable accordion cards show season dates, total games, MVP, and full leaderboard snapshot

**Queried by:** `CommunityDetail.js`, `CommissionerDashboard.js`, `AdminDashboard.js`

---

### `community_announcements`

Commissioner-posted announcements visible to all community members.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | Primary key |
| `community_id` | `uuid` | FK → `communities.id` |
| `author_id` | `uuid` | FK → `profiles.id` (commissioner) |
| `title` | `text` | Announcement title |
| `body` | `text` | Announcement body |
| `pinned` | `boolean` | Whether pinned to top (default false) |
| `created_at` | `timestamptz` | Creation timestamp |
| `updated_at` | `timestamptz` | Last edit timestamp |

**Relationships:**
- `community_id` → `communities.id`
- `author_id` → `profiles.id`

**Notes:**
- Pinned announcements sort above unpinned; within each group, newest first
- "New" badge shown to members for announcements less than 48 hours old

**Queried by:** `CommunityDetail.js`, `CommissionerDashboard.js`, `AdminDashboard.js`

---

### `community_messages`

Real-time chat messages within a community. Soft-deletable by commissioner.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `bigint` | Primary key (auto-increment) |
| `community_id` | `bigint` | FK → `communities.id` |
| `user_id` | `uuid` | FK → `profiles.id` (message author) |
| `username` | `text` | Denormalized username for display |
| `message` | `text` | Message content (max 500 chars enforced client-side) |
| `is_deleted` | `boolean` | Soft delete flag (default false) |
| `deleted_by` | `uuid` | FK → `profiles.id` (commissioner who deleted) |
| `created_at` | `timestamptz` | Creation timestamp |

**Relationships:**
- `community_id` → `communities.id`
- `user_id` → `profiles.id`
- `deleted_by` → `profiles.id`

**RLS Policies:**
- SELECT: community members only
- INSERT: community members, must match `auth.uid()`
- UPDATE: commissioner of the community (for soft-delete)

**Notes:**
- Realtime enabled via `supabase_realtime` publication
- Indexed on `(community_id, created_at DESC)` for fast page loads
- Deleted messages render as "[Message removed by commissioner]"

**Queried by:** `CommunityChat.js`, `CommissionerDashboard.js`, `AdminDashboard.js`

---

### `multiplayer_rooms`

A multiplayer game room. Created by a host; players join via room code or open rooms browser.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | Primary key |
| `room_code` | `text` | 6-character uppercase alphanumeric code |
| `room_name` | `text` | Display name chosen by host |
| `host_id` | `uuid` | FK → `auth.users.id` (room creator) |
| `status` | `text` | `'waiting'`, `'in_progress'`, `'completed'`, or `'cancelled'` |
| `max_players` | `integer` | Maximum participants (default 12) |
| `question_source` | `text` | `'api'` or `'community'` |
| `community_id` | `uuid` | FK → `communities.id` (nullable; set when source is community) |
| `category` | `text` | Quiz category (default 'General Knowledge') |
| `difficulty` | `text` | `'easy'`, `'medium'`, `'hard'`, or `'mixed'` |
| `question_count` | `integer` | Number of questions (default 10) |
| `timer_seconds` | `integer` | Seconds per question (default 20) |
| `speed_bonus` | `boolean` | Whether faster answers earn more points (default false) |
| `started_at` | `timestamptz` | When game started (nullable) |
| `created_at` | `timestamptz` | Creation timestamp |

**Indexes:**
- `(room_code, status)` — for room lookup by code
- `(host_id)` — for host queries

**RLS:** Authenticated read all; insert own; update own (host only)

**Realtime:** Enabled — lobby subscribes to UPDATE events for status changes

**Queried by:** `MultiplayerLobby.js`, `AdminDashboard.js`

---

### `multiplayer_participants`

Players currently in a multiplayer room.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | Primary key |
| `room_id` | `uuid` | FK → `multiplayer_rooms.id` (CASCADE delete) |
| `user_id` | `uuid` | FK → `auth.users.id` |
| `username` | `text` | Denormalized display name |
| `is_host` | `boolean` | Whether this participant is the room host |
| `is_ready` | `boolean` | Ready status in lobby |
| `created_at` | `timestamptz` | Join timestamp |

**Constraints:**
- Unique on `(room_id, user_id)` — one entry per player per room

**RLS:** Authenticated read all; insert/update/delete own rows

**Realtime:** Enabled — lobby subscribes to INSERT, UPDATE, DELETE events

**Queried by:** `MultiplayerLobby.js`, `AdminDashboard.js`

---

### `multiplayer_questions`

Questions assigned to a multiplayer game. Populated when the host starts the game.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | Primary key |
| `room_id` | `uuid` | FK → `multiplayer_rooms.id` (CASCADE delete) |
| `question_order` | `integer` | 0-based order within the game |
| `question_text` | `text` | The question |
| `correct_answer` | `text` | Correct answer |
| `incorrect_answers` | `jsonb` | Array of incorrect answers |
| `category` | `text` | Category label |
| `difficulty` | `text` | Difficulty level |
| `image_url` | `text` | URL to question image (nullable) |
| `video_url` | `text` | YouTube URL for video questions (nullable) |
| `explanation` | `text` | Explanation of correct answer (nullable) |

**Constraints:**
- Unique on `(room_id, question_order)`

**RLS:** Authenticated read all; insert by host only

**Queried by:** `MultiplayerLobby.js`

---

### `multiplayer_answers`

Per-player answers for each question in a multiplayer game.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | Primary key |
| `room_id` | `uuid` | FK → `multiplayer_rooms.id` (CASCADE delete) |
| `user_id` | `uuid` | FK → `auth.users.id` |
| `question_index` | `integer` | Which question was answered |
| `user_answer` | `text` | The answer selected |
| `is_correct` | `boolean` | Whether the answer was correct |
| `answer_time_ms` | `integer` | Time taken to answer in milliseconds |
| `points` | `integer` | Points earned (with speed bonus if enabled) |
| `created_at` | `timestamptz` | Answer timestamp |

**Constraints:**
- Unique on `(room_id, user_id, question_index)`

**Queried by:** `MultiplayerLobby.js`, `AdminDashboard.js`

---

### `media_library`

Centralized media asset library per community. Commissioners upload images and save YouTube video URLs here, then attach them to questions.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | Primary key |
| `community_id` | `bigint` | FK → `communities.id` (CASCADE delete) |
| `uploaded_by` | `uuid` | FK → `profiles.id` |
| `file_url` | `text` | Public URL (Storage URL for images, YouTube URL for videos) |
| `file_type` | `text` | `'image'` or `'video'` |
| `filename` | `text` | Original filename or YouTube video ID label |
| `file_size` | `integer` | File size in bytes (nullable; null for videos) |
| `storage_path` | `text` | Supabase Storage path (nullable; null for videos) |
| `tags` | `text[]` | Custom tags for organization |
| `created_at` | `timestamptz` | Upload timestamp |

**Relationships:**
- `community_id` → `communities.id`
- `uploaded_by` → `profiles.id`

**RLS Policies:**
- SELECT: community members
- INSERT: owner, commissioner, moderator roles
- DELETE: owner, commissioner roles

**Queried by:** `CommissionerDashboard.js`

---

### `community_requests`

User-submitted requests to create a new community. Super admins approve or reject.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | Primary key |
| `requester_id` | `uuid` | FK → `profiles.id` (CASCADE delete) |
| `name` | `text` | Requested community name |
| `description` | `text` | Community description (nullable) |
| `reason` | `text` | Reason for the request (nullable) |
| `status` | `text` | `'pending'`, `'approved'`, or `'rejected'` (default `'pending'`) |
| `reviewed_by` | `uuid` | FK → `profiles.id` (admin who reviewed) (nullable) |
| `reviewed_at` | `timestamptz` | When request was reviewed (nullable) |
| `rejection_reason` | `text` | Reason for rejection (nullable) |
| `created_at` | `timestamptz` | Creation timestamp |

**Relationships:**
- `requester_id` → `profiles.id`
- `reviewed_by` → `profiles.id`

**RLS Policies:**
- SELECT: own rows (`requester_id = auth.uid()`); super admins see all
- INSERT: own rows only (`requester_id = auth.uid()`)
- UPDATE: super admins only (for approve/reject)

**Queried by:** `CommunitiesList.js`, `AdminDashboard.js`

---

### `email_integrations`

Email platform sync configuration per community. One row per community+platform pair.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | PK (gen_random_uuid) |
| `community_id` | `bigint` | FK → `communities.id` (NOT NULL, CASCADE) |
| `platform` | `text` | `'mailchimp'`, `'convertkit'`, `'beehiiv'`, or `'webhook'` |
| `enabled` | `boolean` | Whether auto-sync is active (default `false`) |
| `config` | `jsonb` | Platform-specific config (API keys, list IDs, etc.) |
| `last_sync_at` | `timestamptz` | Timestamp of last sync attempt |
| `last_sync_status` | `text` | `'success'` or `'error'` |
| `last_sync_error` | `text` | Error message from last sync (nullable) |
| `created_at` | `timestamptz` | Creation timestamp |
| `updated_at` | `timestamptz` | Last update timestamp |

**Constraints:** UNIQUE(community_id, platform)

**Config shapes:**
- mailchimp: `{ "api_key": "xxx-us21", "server": "us21", "list_id": "abc123" }`
- convertkit: `{ "api_key": "xxx", "form_id": "12345" }`
- beehiiv: `{ "api_key": "xxx", "publication_id": "pub_xxx" }`
- webhook: `{ "url": "https://...", "secret": "optional-hmac-secret" }`

**RLS Policies:**
- ALL: commissioners+ of the community

**Queried by:** `IntegrationsTab.js`, `sync-subscriber` Edge Function

---

### `email_sync_logs`

Log of each email platform sync attempt for debugging.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | PK (gen_random_uuid) |
| `community_id` | `bigint` | FK → `communities.id` (CASCADE) |
| `integration_id` | `uuid` | FK → `email_integrations.id` (CASCADE) |
| `subscriber_email` | `text` | The email that was synced |
| `platform` | `text` | Which platform was targeted |
| `status` | `text` | `'success'`, `'error'`, or `'skipped'` |
| `response_code` | `integer` | HTTP response code from the platform |
| `error_message` | `text` | Error details (nullable) |
| `created_at` | `timestamptz` | When the sync was attempted |

**RLS Policies:**
- SELECT: commissioners+ of the community
- INSERT: open (service role inserts via Edge Function)

**Queried by:** `IntegrationsTab.js`

---

### `email_templates`

Reusable email templates per community for the campaign composer.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | PK (gen_random_uuid) |
| `community_id` | `bigint` | FK → `communities.id` (CASCADE) |
| `name` | `text` | Template display name |
| `subject` | `text` | Email subject line |
| `body` | `text` | Email body (plain text) |
| `created_by` | `uuid` | FK → `auth.users.id` (SET NULL on delete) |
| `created_at` | `timestamptz` | Creation timestamp |
| `updated_at` | `timestamptz` | Last update timestamp |

**Indexes:** `idx_email_templates_community` on `community_id`

**RLS Policies:**
- ALL: commissioners+ of the community

**Queried by:** `CampaignComposer.js`

---

### `email_campaigns`

Persistent campaign history with segmentation criteria and send tracking.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | PK (gen_random_uuid) |
| `community_id` | `bigint` | FK → `communities.id` (CASCADE) |
| `subject` | `text` | Campaign email subject |
| `body` | `text` | Campaign email body |
| `status` | `text` | `'draft'`, `'scheduled'`, `'sending'`, `'sent'`, or `'cancelled'` |
| `segment_criteria` | `jsonb` | Filter criteria used to select recipients |
| `recipient_count` | `integer` | Total targeted recipients |
| `success_count` | `integer` | Successfully sent count |
| `fail_count` | `integer` | Failed send count |
| `scheduled_for` | `timestamptz` | Scheduled delivery time (nullable) |
| `sent_at` | `timestamptz` | When send completed (nullable) |
| `sent_by` | `uuid` | FK → `auth.users.id` (SET NULL on delete) |
| `created_at` | `timestamptz` | Creation timestamp |

**Indexes:** `idx_email_campaigns_community` on `(community_id, created_at DESC)`, `idx_email_campaigns_status` on `status` where `IN ('scheduled', 'sending')`

**RLS Policies:**
- ALL: commissioners+ of the community

**Queried by:** `SubscribersTab.js`, `CampaignComposer.js`

---

### `community_sites`

Generated single-page sites per community, built via the Site Builder wizard.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | PK (gen_random_uuid) |
| `community_id` | `bigint` | FK → `communities.id` (CASCADE) |
| `template_id` | `text` | Which template was used (e.g. `trivia-league`, `classroom`) |
| `config` | `jsonb` | Full site config: name, tagline, widgets, colors, sections |
| `rendered_html` | `text` | Pre-rendered standalone HTML document |
| `slug` | `text` | Globally unique slug for public URL |
| `status` | `text` | `'draft'` or `'published'` |
| `custom_domain` | `text` | Reserved for future custom domain support (nullable) |
| `published_at` | `timestamptz` | When site was last published (nullable) |
| `created_by` | `uuid` | FK → `profiles.id` |
| `created_at` | `timestamptz` | Creation timestamp |
| `updated_at` | `timestamptz` | Last update timestamp |

**Constraints:** UNIQUE on `community_id` (one site per community), UNIQUE on `slug`

**RLS Policies:**
- SELECT: anyone for published sites; commissioners+ for drafts
- ALL: commissioners+ of the community

**Queried by:** `PagesTab.js`, `SiteBuilderWizard.js`, `SiteRenderer.js`

---

### `scheduled_quizzes`

Scheduled quiz events (Quiz Night) per community.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | PK (gen_random_uuid) |
| `community_id` | `bigint` | FK → `communities.id` (CASCADE) |
| `created_by` | `uuid` | FK → `profiles.id` (commissioner who created) |
| `title` | `text` | Quiz title (NOT NULL) |
| `description` | `text` | Optional description shown to members |
| `category` | `text` | Quiz category (default `'Random/Mixed'`) |
| `difficulty` | `text` | `'easy'`, `'medium'`, `'hard'`, or `'mixed'` |
| `question_count` | `integer` | Number of questions (3–25, default 10) |
| `timer_seconds` | `integer` | Seconds per question (10–120, default 30) |
| `question_source` | `text` | `'community'`, `'api'`, or `'curated'` |
| `curated_question_ids` | `uuid[]` | Hand-picked question IDs (if source is curated) |
| `starts_at` | `timestamptz` | When quiz goes live |
| `ends_at` | `timestamptz` | When quiz closes |
| `status` | `text` | `'scheduled'`, `'live'`, `'completed'`, or `'cancelled'` |
| `participant_count` | `integer` | Number of completed attempts |
| `created_at` | `timestamptz` | Creation timestamp |
| `updated_at` | `timestamptz` | Last update timestamp |

**RLS Policies:**
- SELECT: community members
- ALL: commissioners+ of the community

**Queried by:** `CommissionerDashboard.js`, `CommunityDetail.js`, `ScheduledQuizPlay.js`

---

### `scheduled_quiz_attempts`

Individual player attempts on scheduled quizzes. One attempt per user per quiz.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | PK (gen_random_uuid) |
| `quiz_id` | `uuid` | FK → `scheduled_quizzes.id` (CASCADE) |
| `user_id` | `uuid` | FK → `profiles.id` |
| `score` | `integer` | Number of correct answers (default 0) |
| `total_questions` | `integer` | Total questions in this attempt |
| `time_taken_ms` | `integer` | Total time to complete (nullable) |
| `started_at` | `timestamptz` | When attempt began |
| `completed_at` | `timestamptz` | When attempt finished (nullable) |

**Constraints:** UNIQUE(quiz_id, user_id)

**RLS Policies:**
- SELECT: own attempts + commissioners can view all
- INSERT/UPDATE: own attempts only

**Queried by:** `ScheduledQuizPlay.js`, `CommissionerDashboard.js`

---

### `scheduled_quiz_answers`

Per-answer records for scheduled quiz attempts.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | PK (gen_random_uuid) |
| `attempt_id` | `uuid` | FK → `scheduled_quiz_attempts.id` (CASCADE) |
| `question_index` | `integer` | Question position (0-based) |
| `question_text` | `text` | The question text |
| `correct_answer` | `text` | The correct answer |
| `user_answer` | `text` | What the user selected (nullable if timed out) |
| `is_correct` | `boolean` | Whether the answer was correct |
| `time_taken_ms` | `integer` | Time taken for this question |
| `created_at` | `timestamptz` | Timestamp |

**RLS Policies:**
- ALL: own answers (via attempt ownership) + commissioners can view all

**Queried by:** `ScheduledQuizPlay.js`

---

## Relationships Diagram

```
auth.users
    │
    └── profiles (id = auth.users.id)
            │
            ├── games (user_id)
            │       └── game_answers (game_id)
            │
            ├── community_members (user_id)
            │
            ├── notifications (user_id)
            │
            ├── communities (commissioner_id)
            │       ├── community_members (community_id)
            │       ├── community_questions (community_id)
            │       ├── community_leaderboards (community_id)
            │       ├── community_announcements (community_id)
            │       ├── community_messages (community_id)
            │       ├── question_templates (community_id)
            │       ├── generation_requests (community_id, requested_by)
            │       ├── season_archives (community_id)
            │       ├── email_templates (community_id)
            │       ├── email_campaigns (community_id)
            │       ├── community_sites (community_id)
            │       └── media_library (community_id, uploaded_by)
            │
            ├── custom_questions (creator_id)
            │
            ├── community_requests (requester_id, reviewed_by)
            │
            └── multiplayer_rooms (host_id)
                    ├── multiplayer_participants (room_id, user_id)
                    ├── multiplayer_questions (room_id)
                    └── multiplayer_answers (room_id, user_id)
```

---

## Storage Buckets

| Bucket | Purpose |
|--------|---------|
| `question-images` | Images uploaded for community questions (commissioner media editor) |
| `community-images` | Community logos and banner images (commissioner theming) |
| `community-media` | Media library uploads (images for the centralized media library) |

All buckets use RLS policies scoped to authenticated users. Public URLs are generated via `supabase.storage.from(bucket).getPublicUrl(path)`.

---

## RLS Policies

RLS (Row Level Security) is enabled on all tables. As of March 5, 2026, all community-scoped tables use `check_community_permission()` for write operations instead of legacy role text checks (`role IN ('owner', 'commissioner')`).

### Granular Permission Enforcement (via `check_community_permission`)

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| `community_questions` | Community members | `manage_questions` | `manage_questions` | `manage_questions` |
| `community_announcements` | Community members | `manage_announcements` | `manage_announcements` | `manage_announcements` |
| `community_messages` | Community members | Members (own messages) | `moderate_chat` | — (soft-delete only) |
| `community_members` | Community members | Self only (`user_id = auth.uid()`) | `manage_members` + hardening* | `manage_members` OR self-leave |
| `communities` | All authenticated | All authenticated | `manage_settings` | `delete_community` |
| `question_templates` | Community members | `manage_templates` | `manage_templates` | `manage_templates` |
| `media_library` | Community members | `manage_media` | — | `manage_media` |
| `generation_requests` | Own + `view_analytics` + admins | `request_ai_generation` | Platform admins only | — |
| `season_archives` | Community members | `manage_settings` | — | — |
| `community_sites` | Published = public; drafts = `manage_pages` | `manage_pages` | `manage_pages` | `manage_pages` |
| `community_roles` | Community members | `manage_roles` | `manage_roles` | `manage_roles` (system roles protected) |
| `permission_overrides` | `assign_roles` | `assign_roles` | `assign_roles` | `assign_roles` |
| `permission_audit_log` | `view_analytics` | Own actor_id | — | — |

*`community_members` UPDATE hardening: cannot update own role; only `transfer_ownership` holders can assign `'owner'` role; role must be a valid value.

### User/Platform-Scoped Tables (unchanged)

| Table | Read | Write |
|-------|------|-------|
| `profiles` | Own row always; others if `profile_visibility = true` | Own row only |
| `games` | Own rows always; public rows if `visibility = 'public'` | Own rows only |
| `game_answers` | Own rows; game owner | Own rows |
| `community_leaderboards` | Members of community | System/view |
| `custom_questions` | Own rows; admins see all | Creator (insert); admin (update status) |
| `multiplayer_rooms` | All authenticated users | Host (insert/update) |
| `multiplayer_participants` | All authenticated users | Own rows (insert/update/delete) |
| `multiplayer_questions` | All authenticated users | Host only (insert) |
| `multiplayer_answers` | All authenticated users | Own rows (insert) |
| `notifications` | Own rows only | System (insert); own rows (update read status) |
| `community_requests` | Own rows; super admins see all | Own rows (insert); super admins (update status) |
| `question_difficulty_votes` | All authenticated | Own votes (insert/update) | Own votes | — |

---

## Triggers & Functions

### Profile creation trigger

When a new user signs up via `supabase.auth.signUp()`, a trigger should auto-create a row in `profiles` with the username passed in `options.data.username`.

**Expected trigger (create in Supabase SQL editor):**
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, role, super_admin, platform_role, profile_visibility, leaderboard_visibility)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'username',
    'user',
    false,
    'user',
    true,
    true
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

### Game rate limit trigger

Prevents bot-like game submission rates. Fires BEFORE INSERT on `games`.

- Max 20 games per user per hour
- Max 60 games per user per day
- Raises exception if exceeded

**Function:** `check_game_rate_limit()` (SECURITY DEFINER)
**Trigger:** `enforce_game_rate_limit` on `games` BEFORE INSERT

### Bot flag trigger

Automatically flags suspicious accounts after game completion. Fires AFTER INSERT on `games`.

Checks:
- Average `time_taken_ms` across all answers < 500ms → flag `"impossibly_fast_answers"`
- 10+ consecutive perfect scores on hard difficulty → flag `"suspicious_perfect_streak"`
- 15+ games in the last hour → flag `"excessive_play_rate"`

Updates `profiles.bot_flags` JSONB with flagged status, reasons array, and timestamp.

**Function:** `check_bot_flags()` (SECURITY DEFINER)
**Trigger:** `check_bot_after_game` on `games` AFTER INSERT

### Self-role-escalation prevention trigger

Prevents users from modifying their own `platform_role` or `super_admin` status via direct API calls. Fires BEFORE UPDATE on `profiles`.

Checks:
- If `platform_role` changed OR `super_admin` changed
- AND the row being updated belongs to `auth.uid()`
- → Raises exception: "Cannot modify your own role or admin status"

Admins can still change other users' roles through `AdminDashboard.js`. This trigger closes the gap where a client-side-only guard (`AdminDashboard.js:395`) could be bypassed via direct Supabase API calls.

**Function:** `prevent_self_role_escalation()` (SECURITY DEFINER)
**Trigger:** `prevent_self_role_escalation_trigger` on `profiles` BEFORE UPDATE

### Season reset RPC

Atomically archives a community's leaderboard and resets the season.

**Function:** `reset_season(p_community_id, p_archived_by, p_leaderboard_snapshot, p_total_games, p_total_questions_played, p_top_player_id, p_top_player_username, p_top_player_avg)` (RPC)
**Called by:** `CommissionerDashboard.js`

### Invite code generation RPC

Generates a unique invite code for a community.

**Function:** `generate_invite_code()` (RPC)
**Called by:** `CommissionerDashboard.js`

### Community ownership transfer RPC

Atomically transfers community ownership in a single transaction:
1. Verifies caller is the current owner
2. Verifies target is a community member
3. Promotes target to `owner`
4. Demotes current owner to `commissioner`
5. Updates `communities.commissioner_id`

**Function:** `transfer_community_ownership(p_community_id, p_new_owner_id, p_current_owner_id)` (RPC, SECURITY DEFINER)
**Called by:** `CommissionerDashboard.js`

---

## Edge Functions

| Function | Purpose | Called by |
|----------|---------|----------|
| `generate-questions` | AI question generation; receives `request_id`, generates questions, populates `generation_requests.generated_questions` | `AdminDashboard.js` (on approval), `CommissionerDashboard.js` (on retry) |
| `send-email` | Email delivery via Resend API; supports invitation, join confirmation, question notification, and generic templates | `emailService.js` |
| `sync-subscriber` | Syncs new subscribers to email platforms (Mailchimp, ConvertKit, Beehiiv, webhook); supports test mode for config validation | `gstreet-subscribe-element.js`, `IntegrationsTab.js` |

---

## Realtime Subscriptions

| Channel Pattern | Table | Events | Component |
|-----------------|-------|--------|-----------|
| `chat-{communityId}` | `community_messages` | INSERT, UPDATE | `CommunityChat.js` |
| `room-{roomId}` | `multiplayer_participants` | INSERT, UPDATE, DELETE | `MultiplayerLobby.js` |
| `room-{roomId}` | `multiplayer_rooms` | UPDATE | `MultiplayerLobby.js` |
| `answers-{roomId}` | `multiplayer_answers` | INSERT | `MultiplayerLobby.js` |
| `answers-{roomId}` | (broadcast) | `player_answer` | `MultiplayerLobby.js` |
| `advance-{roomId}` | (broadcast) | `next_question`, `finish_game` | `MultiplayerLobby.js` |

---

## CSV Bulk Upload Format

Used by the Commissioner Dashboard to import questions into `community_questions`.

**Required columns:**

| Column | Description | Example |
|--------|-------------|---------|
| `question_text` | The question | `What is the capital of France?` |
| `correct_answer` | Correct answer | `Paris` |
| `incorrect_answer_1` | Wrong answer 1 | `London` |
| `incorrect_answer_2` | Wrong answer 2 | `Berlin` |
| `incorrect_answer_3` | Wrong answer 3 | `Madrid` |
| `category` | Category label | `Geography` |
| `difficulty` | `easy`, `medium`, or `hard` | `easy` |

**Optional columns:**

| Column | Description | Example |
|--------|-------------|---------|
| `explanation` | Explanation of the correct answer | `Paris has been the capital since 987 AD` |
| `image_url` | URL to an image for the question | `https://example.com/image.jpg` |
| `video_url` | YouTube URL for a video question | `https://youtube.com/watch?v=...` |

**Sample CSV:**
```csv
question_text,correct_answer,incorrect_answer_1,incorrect_answer_2,incorrect_answer_3,category,difficulty,explanation
"What is the capital of France?","Paris","London","Berlin","Madrid","Geography","easy","Paris has been the capital since 987 AD"
"Who painted the Mona Lisa?","Leonardo da Vinci","Michelangelo","Raphael","Donatello","Art","medium",""
"What is the chemical symbol for gold?","Au","Ag","Fe","Cu","Science","easy","Au comes from the Latin word aurum"
```

---

## Planned Tables (Not Yet Migrated)

The following tables are specced in `docs/CRM_CONTACTS_SPEC.md` but have no migration files yet:

| Table | Description |
|-------|-------------|
| `organizations` | Ownership wrapper, future billing anchor |
| `organization_members` | Multi-user org access (owner/admin/viewer) |
| `contacts` | Unified contact identity per org (email + profile_id + tags + notes + status) |
| `contact_communities` | Contact ↔ community junction table |
| `contact_activity` | Event stream (every interaction, timestamped, typed) |

These will also add `organization_id` FK to `communities`.

---

## Migration ↔ Schema Cross-Reference

**Verified:** March 4, 2026

| Migration | Creates/Alters | Documented? |
|-----------|---------------|-------------|
| `20260224170000_create_notifications` | `notifications` table | Yes |
| `20260224180000_create_season_archives` | `season_archives` table, `communities.current_season` | Yes |
| `20260224190000_add_profile_theme` | `profiles.theme` column | Yes |
| `20260224212512_add_explanation_column` | `community_questions.explanation` column | Yes |
| `20260225025948_community_images_policies` | Storage bucket policies only | N/A |
| `20260226065040_prevent_self_role_escalation` | Trigger on `profiles` | N/A (trigger only) |
| `20260226070958_temp_query_policies` | Temp function (dropped) | N/A |
| `20260226071118_harden_commissioner_rls` | RLS policy on `community_members` | N/A (policy only) |
| `20260226071406_transfer_ownership_rpc` | `transfer_community_ownership()` RPC | N/A (function only) |
| `20260226072125_restrict_notification_insert` | RLS policy on `notifications` | N/A (policy only) |
| `20260226072200_temp_query_mp_policies` | Temp function (dropped) | N/A |
| `20260226072321_cleanup_temp_mp_policies` | Drops temp function | N/A |
| `20260302120000_granular_permissions` | `community_roles`, `permission_overrides`, `permission_audit_log` tables; `community_members.role_id` | Yes |
| `20260302140000_email_integrations` | `email_integrations`, `email_sync_logs` tables | Yes |
| `20260302150000_scheduled_quizzes` | `scheduled_quizzes`, `scheduled_quiz_attempts`, `scheduled_quiz_answers` tables | Yes |
| `20260302160000_streak_tracking` | `profiles.current_streak`, `.best_streak`, `.last_played_date` | Yes |
| `20260302170000_email_campaigns` | `email_templates`, `email_campaigns` tables | Yes |
| `20260302180000_community_sites` | `community_sites` table | Yes |
| `20260304_difficulty_votes` | `question_difficulty_votes` table; `community_questions.difficulty_vote_counts`, `.computed_difficulty` | Yes |
| `20260305_rls_granular_enforcement` | RLS policy replacement on 10 community tables — legacy `role IN (...)` → `check_community_permission()` | Yes |

**Result:** All migrated tables, columns, and policies are now documented. No gaps.
