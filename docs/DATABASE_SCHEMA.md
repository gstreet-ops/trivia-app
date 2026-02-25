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
| `community_questions` | Community-owned question bank |
| `community_leaderboards` | Computed rankings per community |
| `community_announcements` | Commissioner announcements per community |
| `community_messages` | Real-time chat messages per community |
| `custom_questions` | User-submitted questions awaiting admin review |
| `question_templates` | Reusable question templates per community |
| `multiplayer_rooms` | Multiplayer game rooms (lobby) |
| `multiplayer_participants` | Players in a multiplayer room |
| `multiplayer_questions` | Questions assigned to a multiplayer game |
| `multiplayer_answers` | Per-player answers in a multiplayer game (Phase 2) |

---

## Table Definitions

### `profiles`

Extends Supabase Auth `auth.users`. Automatically created via trigger on signup.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | Primary key; matches `auth.users.id` |
| `username` | `text` | Display name chosen at signup |
| `role` | `text` | `'user'` (default) or `'admin'` |
| `super_admin` | `boolean` | Platform super-admin flag |
| `profile_visibility` | `boolean` | If false, profile hidden from other users |
| `leaderboard_visibility` | `boolean` | If false, excluded from leaderboards |
| `created_at` | `timestamptz` | Row creation timestamp |

**Notes:**
- `role = 'admin'` or `super_admin = true` grants access to the Admin Dashboard
- `super_admin` users additionally see the "Mixed (All Sources)" quiz option

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

**Relationships:**
- `game_id` → `games.id`
- `user_id` → `profiles.id`

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
| `settings` | `jsonb` | Flexible settings; e.g. `{ max_members, timer_enabled, timer_seconds }` |
| `created_at` | `timestamptz` | Creation timestamp |

**Relationships:**
- `commissioner_id` → `profiles.id`

**Notes:**
- `invite_code` is generated via `generate_invite_code` RPC or `Math.random().toString(36).substring(2, 10).toUpperCase()`
- `slug` is generated as `name.toLowerCase().replace(/[^a-z0-9]+/g, '-')`
- Default season length at creation: 30 days
- `visibility = 'public'` makes the community appear in the Community Marketplace

---

### `community_members`

Join table connecting users to communities.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | Primary key |
| `community_id` | `uuid` | FK → `communities.id` |
| `user_id` | `uuid` | FK → `profiles.id` |
| `joined_at` | `timestamptz` | Join timestamp |

**Constraints:**
- Unique on `(community_id, user_id)` — prevents duplicate membership (error code `23505`)

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
| `version_number` | `integer` | Current version number |
| `version_history` | `jsonb[]` | Array of up to 10 version snapshots |
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

---

### `community_leaderboards`

Rankings per community. Likely a view or materialized view computed from `games` filtered by `community_id`.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | Primary key |
| `community_id` | `uuid` | FK → `communities.id` |
| `user_id` | `uuid` | FK → `profiles.id` |
| `username` | `text` | Denormalized username |
| `rank` | `integer` | Rank position (1 = best) |
| `avg_score` | `numeric` | Average score percentage |
| `total_games` | `integer` | Games played in this community |

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

---

### `community_announcements`

Commissioner-posted announcements visible to all community members.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | Primary key |
| `community_id` | `uuid` | FK → `communities.id` |
| `author_id` | `uuid` | FK → `profiles.id` (commissioner) |
| `title` | `text` | Announcement title |
| `content` | `text` | Announcement body |
| `pinned` | `boolean` | Whether pinned to top (default false) |
| `created_at` | `timestamptz` | Creation timestamp |
| `updated_at` | `timestamptz` | Last edit timestamp |

**Relationships:**
- `community_id` → `communities.id`
- `author_id` → `profiles.id`

**Notes:**
- Pinned announcements sort above unpinned; within each group, newest first
- "New" badge shown to members for announcements less than 48 hours old

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

---

### `multiplayer_questions`

Questions assigned to a multiplayer game. Populated when the host starts the game.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | Primary key |
| `room_id` | `uuid` | FK → `multiplayer_rooms.id` (CASCADE delete) |
| `question_index` | `integer` | 0-based order within the game |
| `question_text` | `text` | The question |
| `correct_answer` | `text` | Correct answer |
| `incorrect_answers` | `jsonb` | Array of incorrect answers |
| `category` | `text` | Category label |
| `difficulty` | `text` | Difficulty level |

**Constraints:**
- Unique on `(room_id, question_index)`

**RLS:** Authenticated read all; insert by host only

---

### `multiplayer_answers`

Per-player answers for each question in a multiplayer game. *(Phase 2 — not yet implemented)*

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
            ├── communities (commissioner_id)
            │       ├── community_members (community_id)
            │       ├── community_questions (community_id)
            │       ├── community_leaderboards (community_id)
            │       ├── community_announcements (community_id)
            │       ├── community_messages (community_id)
            │       └── question_templates (community_id)
            │
            ├── custom_questions (creator_id)
            │
            └── multiplayer_rooms (host_id)
                    ├── multiplayer_participants (room_id, user_id)
                    ├── multiplayer_questions (room_id)
                    └── multiplayer_answers (room_id, user_id)
```

---

## RLS Policies

RLS (Row Level Security) is enabled on all tables. Policies are managed in Supabase. Based on app behavior:

| Table | Read | Write |
|-------|------|-------|
| `profiles` | Own row always; others if `profile_visibility = true` | Own row only |
| `games` | Own rows always; public rows if `visibility = 'public'` | Own rows only |
| `game_answers` | Own rows; game owner | Own rows |
| `communities` | All authenticated users | Commissioner only |
| `community_members` | Members of same community | Own membership; commissioner for deletes |
| `community_questions` | Members of community | Commissioner only |
| `community_leaderboards` | Members of community | System/view |
| `custom_questions` | Own rows; admins see all | Creator (insert); admin (update status) |
| `question_templates` | Commissioner of community | Commissioner |
| `community_announcements` | Members of community | Commissioner only |
| `community_messages` | Members of community | Members (insert); commissioner (soft-delete) |
| `multiplayer_rooms` | All authenticated users | Host (insert/update) |
| `multiplayer_participants` | All authenticated users | Own rows (insert/update/delete) |
| `multiplayer_questions` | All authenticated users | Host only (insert) |
| `multiplayer_answers` | All authenticated users | Own rows (insert) |

---

## Triggers & Functions

### Profile creation trigger

When a new user signs up via `supabase.auth.signUp()`, a trigger should auto-create a row in `profiles` with the username passed in `options.data.username`.

**Expected trigger (create in Supabase SQL editor):**
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, role, super_admin, profile_visibility, leaderboard_visibility)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'username',
    'user',
    false,
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

**Sample CSV:**
```csv
question_text,correct_answer,incorrect_answer_1,incorrect_answer_2,incorrect_answer_3,category,difficulty
"What is the capital of France?","Paris","London","Berlin","Madrid","Geography","easy"
"Who painted the Mona Lisa?","Leonardo da Vinci","Michelangelo","Raphael","Donatello","Art","medium"
"What is the chemical symbol for gold?","Au","Ag","Fe","Cu","Science","easy"
```
