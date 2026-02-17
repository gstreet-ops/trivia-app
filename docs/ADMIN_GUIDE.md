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

## What Admins Cannot Currently Do

The following actions are not yet available in the Admin Dashboard UI and must be done directly in Supabase:

- Delete a user account
- Ban or suspend a user
- Edit or delete another user's games
- Edit approved/rejected custom questions
- View or manage specific communities
- Change another user's role (must be done in SQL)
- View all pending questions from a specific user
