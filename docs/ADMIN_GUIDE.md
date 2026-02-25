# Admin Guide

Platform administrators have access to the **Admin Dashboard**, which provides platform-wide visibility and moderation tools.

---

## Admin Roles

There are two levels of admin access, both stored in the `profiles` table:

| Field | Value | Access Level |
|-------|-------|-------------|
| `role` | `'admin'` | Standard admin — Admin Dashboard access |
| `super_admin` | `true` | Super admin — Admin Dashboard + "Mixed (All Sources)" quiz option |

Both levels see **Admin Panel** in the navigation menu. Super admins additionally see the **Mixed** quiz source option when starting a quiz.

---

## Granting Admin Access

Admin roles are set directly in the Supabase database. There is no UI for this — it must be done by a developer or database owner.

**In Supabase SQL Editor:**

```sql
-- Grant standard admin role
UPDATE profiles SET role = 'admin' WHERE username = 'their_username';

-- Grant super admin
UPDATE profiles SET super_admin = true WHERE username = 'their_username';

-- Revoke admin
UPDATE profiles SET role = 'user', super_admin = false WHERE username = 'their_username';
```

---

## Accessing the Admin Dashboard

1. Log in with an admin account
2. Click **Menu → Admin Panel**

The Admin Dashboard loads platform-wide data on every visit.

---

## Platform Statistics

The top of the Admin Dashboard shows four stat cards:

| Stat | Description |
|------|-------------|
| **Total Users** | Count of all rows in the `profiles` table |
| **Total Games** | Count of all rows in the `games` table |
| **Public Games** | Count of games with `visibility = 'public'` |
| **Avg Games/User** | `total_games / total_users` (rounded to 1 decimal) |

Below the stat cards, the **Most Popular Category** section shows which category has the most games played and the count.

---

## Pending Questions

The **Pending Questions** section shows all custom questions with `status = 'pending'`, ordered newest first. Each card displays:

- Category badge
- Difficulty badge
- Question text
- Correct answer (marked with ✓)
- All three incorrect answers
- Submitter's username
- **Approve** and **Reject** buttons

### Approving a Question

Click **Approve** on a pending question card. This:
1. Updates the question's `status` to `'approved'` in `custom_questions`
2. Sets `reviewed_at` to the current timestamp
3. Removes the card from the pending queue immediately

Approved questions become available as a quiz source via **Approved Custom Questions** in the Quiz Source Selector.

### Rejecting a Question

Click **Reject** on a pending question card. This:
1. Updates the question's `status` to `'rejected'`
2. Sets `reviewed_at` to the current timestamp
3. Removes the card from the pending queue immediately

Rejected questions remain in the database with `status = 'rejected'` but are not served in any quiz.

> There is currently no UI to undo an approval or rejection. Changes must be reverted directly in the database if needed:
> ```sql
> UPDATE custom_questions SET status = 'pending', reviewed_at = NULL WHERE id = '...';
> ```

---

## AI Generation Requests

The **AI Requests** tab shows all AI question generation requests submitted by commissioners.

### Pending Requests

Each pending request card shows:
- Community name
- Requester username
- Theme, difficulty, and question count
- Special instructions (if any)
- **Approve** and **Reject** buttons

### Approving a Request

Click **Approve** on a pending request. This:
1. Updates the request status to `'approved'`
2. Records the reviewing admin and timestamp
3. Triggers an Edge Function (fire-and-forget) to generate questions via AI
4. Sends a notification to the requesting commissioner

The request transitions to "Generating" status. Once the Edge Function completes, it moves to "Completed" (with generated questions) or "Failed."

### Rejecting a Request

Click **Reject** on a pending request. This:
1. Opens a dialog where you can optionally add admin notes explaining the rejection
2. Updates the request status to `'rejected'`
3. Records the reviewing admin, timestamp, and notes
4. Sends a notification to the requesting commissioner

### Simulate Generation (Super Admin)

Super admins see a **Simulate** button on approved requests for testing the review flow without invoking the Edge Function.

---

## Community Requests

The **Communities** tab shows community creation requests submitted by users.

### Pending Requests

Each pending request card shows:
- Requested community name
- Requester username
- Description and reason
- Submission date
- **Approve** and **Reject** buttons

### Approving a Request

Click **Approve** on a pending request. This:
1. Creates the community with the requester as commissioner
2. Adds the requester as an owner member
3. Generates an invite code and sets a 90-day default season
4. Updates the request status to `'approved'`
5. Sends a notification to the requester

### Rejecting a Request

Click **Reject** on a pending request. This:
1. Opens a dialog where you can optionally add a rejection reason
2. Updates the request status to `'rejected'`
3. Records the reviewing admin and timestamp
4. Sends a notification to the requester (includes rejection reason if provided)

### Request History

Below the pending queue, a history table shows all previously approved and rejected requests with the reviewer name and date.

---

## Flagged Users

The **Flagged** tab shows users automatically flagged for suspicious bot-like activity.

### How Flagging Works

Users are automatically flagged by database triggers after game completion if:
- **Impossibly fast answers** — average answer time under 500ms
- **Suspicious perfect streak** — 10+ consecutive perfect scores on hard difficulty
- **Excessive play rate** — 15+ games submitted in the last hour

Flagged users can still play normally but are **excluded from all public leaderboards** (Dashboard and community leaderboards).

### Flagged Users Table

Each row shows:
- Username
- Flag reasons (color-coded badges)
- Total games played
- Date flagged

### Unflagging

Click **Unflag** to reset a user's bot flags (e.g., for false positives). This restores them to leaderboards immediately. If the same suspicious behavior continues, the trigger will re-flag them automatically.

---

## User Management

The **Users** tab provides comprehensive user management:

- **Search** — filter users by username
- **Sort** — by username, role, join date, or game count
- **Pagination** — navigate through all users
- **Role Management** — promote/demote users between `user` and `admin` roles
- **Super Admin Toggle** — grant or revoke super admin access
- **View Activity** — see a user's recent games and community memberships
- **Delete User** — permanently remove a user account (see below)

---

## Recent Users

The **Recent Users** table shows the 10 most recently created user accounts:

| Column | Description |
|--------|-------------|
| Username | The user's display name |
| Role | `user` or `admin` (styled badge) |
| Joined | Account creation date |

---

## Recent Games

The **Recent Games** table shows the 10 most recently completed games across all users:

| Column | Description |
|--------|-------------|
| User | Username of the player |
| Category | Quiz category |
| Score | `correct / total` (e.g., `8/10`) |
| Difficulty | Easy / Medium / Hard (styled badge) |
| Visibility | Public / Private (styled badge) |
| Date | Game completion date |

---

## Data Access Notes

The Admin Dashboard fetches data using the Supabase anon key, so all reads are subject to RLS policies. For admin users to see all rows in `profiles` and `games`, the following RLS policies must exist:

```sql
-- Allow admins to read all profiles
CREATE POLICY "admins_read_all_profiles"
ON profiles FOR SELECT
USING (
  auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'admin' OR super_admin = true
  )
);

-- Allow admins to read all games
CREATE POLICY "admins_read_all_games"
ON games FOR SELECT
USING (
  auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'admin' OR super_admin = true
  )
);
```

If the Admin Dashboard shows 0 users or 0 games, check that these policies are in place in Supabase under **Authentication → Policies**.

---

## Delete User Account

Super admins can permanently delete a user account from the **Users** tab. This is a destructive, irreversible action.

### How to Delete a User

1. Go to the **Users** tab in the Admin Dashboard
2. Find the user and click the **Delete** button (red outline) in the Actions column
   - The Delete button is hidden for yourself and other super admins
3. A confirmation modal opens showing:
   - User stats (username, games played, communities, join date)
   - A warning if the user is commissioner of any communities (those communities and all their data will also be deleted)
4. Type the user's exact username to confirm
5. Click **Delete Permanently**

### What Gets Deleted

The cascade deletes all user data in this order:
1. Game answers, games, community memberships
2. Custom questions, notifications
3. Multiplayer answers, participants, messages
4. Multiplayer rooms (hosted), AI generation requests
5. If the user is a commissioner: all data for their communities (members, games, questions, announcements, archives, chat, multiplayer rooms), then the communities themselves
6. The user's profile row

> **Note:** The `auth.users` row in Supabase Auth is orphaned because the anon key cannot call `supabase.auth.admin.deleteUser()`. The orphaned auth row does not affect platform functionality but can be cleaned up manually in the Supabase dashboard if desired.

---

## Notifications

Admin actions that affect users automatically send both **in-app notifications** and **email notifications**:

| Action | Notification Sent To | Email Type |
|--------|---------------------|------------|
| Approve custom question | Question submitter | Question notification |
| Reject custom question | Question submitter | Question notification |
| Approve AI generation request | Requesting commissioner | Generic |
| Reject AI generation request | Requesting commissioner | Generic |
| Approve community request | Requesting user | Generic |
| Reject community request | Requesting user | Generic |

Email notifications are fire-and-forget — they never block the admin UI. If email delivery fails (e.g., Resend API key not configured), the in-app notification is still sent. Emails use Georgetown-branded HTML templates delivered via the `send-email` Supabase Edge Function and Resend API.

---

## What Admins Cannot Currently Do

The following actions are not yet available in the Admin Dashboard UI and must be done directly in Supabase:

- Ban or suspend a user
- Edit or delete another user's games
- Edit approved/rejected custom questions
- Undo a custom question approval or rejection
- View or manage specific communities
