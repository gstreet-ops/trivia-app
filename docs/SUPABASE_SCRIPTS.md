# Supabase SQL Scripts

Run these in the **Supabase SQL Editor** (Dashboard → SQL Editor → New Query).
Each script is idempotent — safe to run more than once.

---

## 1. Secure Invite Code Generation

**Problem:** Invite codes are currently generated with `Math.random()` in JavaScript, which is not cryptographically secure and could produce collisions.

**Fix:** Use a Postgres function backed by `gen_random_bytes` (pgcrypto) so codes are generated server-side and are guaranteed unique.

```sql
-- Enable pgcrypto if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Function: generate a unique 8-character alphanumeric invite code
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  code text;
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- no 0/O/1/I to avoid confusion
  i int;
BEGIN
  LOOP
    code := '';
    FOR i IN 1..8 LOOP
      code := code || substr(chars, (get_byte(gen_random_bytes(1), 0) % length(chars)) + 1, 1);
    END LOOP;
    -- Ensure uniqueness
    EXIT WHEN NOT EXISTS (SELECT 1 FROM communities WHERE invite_code = code);
  END LOOP;
  RETURN code;
END;
$$;

-- Allow authenticated users to call this function via supabase.rpc()
GRANT EXECUTE ON FUNCTION generate_invite_code() TO authenticated;
```

**Usage in app code** (call the function instead of `Math.random()`):
```js
// Replace the client-side invite code generation with:
const { data } = await supabase.rpc('generate_invite_code');
const inviteCode = data;
```

---

## 2. Community Leaderboard as a Postgres View

**Problem:** The `community_leaderboards` table is a static table that may become stale if not manually refreshed. Rankings should always reflect live game data.

**Fix:** Replace the static table with a Postgres view that computes rankings on the fly.

```sql
-- Drop the static table if it exists (back it up first if needed)
-- DROP TABLE IF EXISTS community_leaderboards;

-- Create the live view
CREATE OR REPLACE VIEW community_leaderboards AS
SELECT
  cm.community_id,
  cm.user_id,
  p.username,
  COUNT(g.id)                                          AS games_played,
  COALESCE(SUM(g.score), 0)                            AS total_score,
  COALESCE(SUM(g.total_questions), 0)                  AS total_questions,
  CASE
    WHEN COALESCE(SUM(g.total_questions), 0) > 0
    THEN ROUND((SUM(g.score)::numeric / SUM(g.total_questions)) * 100, 1)
    ELSE 0
  END                                                   AS avg_percentage,
  RANK() OVER (
    PARTITION BY cm.community_id
    ORDER BY
      CASE
        WHEN COALESCE(SUM(g.total_questions), 0) > 0
        THEN (SUM(g.score)::numeric / SUM(g.total_questions))
        ELSE 0
      END DESC
  )                                                     AS rank
FROM community_members cm
JOIN profiles p ON p.id = cm.user_id
LEFT JOIN games g
  ON g.user_id = cm.user_id
  AND g.community_id = cm.community_id
GROUP BY cm.community_id, cm.user_id, p.username;
```

> **Note:** Views are read-only. If the app currently does `INSERT INTO community_leaderboards`, remove those inserts — the view is always up to date automatically.

**RLS on the view** (if needed):
```sql
-- Grant read access to authenticated users
GRANT SELECT ON community_leaderboards TO authenticated;
```

---

## 3. Rate-Limit Pending Question Submissions

**Problem:** A user could spam the custom questions queue with hundreds of pending submissions, since there is no per-user limit enforced at the database level.

**Fix:** Add a Postgres policy (or check constraint via trigger) that blocks a user from having more than 10 pending submissions at once.

```sql
-- Trigger function: enforce max 10 pending questions per user
CREATE OR REPLACE FUNCTION check_pending_question_limit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF (
    SELECT COUNT(*) FROM custom_questions
    WHERE submitted_by = NEW.submitted_by
      AND status = 'pending'
  ) >= 10 THEN
    RAISE EXCEPTION 'You already have 10 pending questions. Wait for them to be reviewed before submitting more.';
  END IF;
  RETURN NEW;
END;
$$;

-- Attach trigger to custom_questions table
DROP TRIGGER IF EXISTS enforce_pending_limit ON custom_questions;
CREATE TRIGGER enforce_pending_limit
  BEFORE INSERT ON custom_questions
  FOR EACH ROW
  EXECUTE FUNCTION check_pending_question_limit();
```

> The error message from `RAISE EXCEPTION` will bubble up to the Supabase client as an error object. Make sure the submission form displays `error.message` to the user.

---

## Verification

After running each script:

| Script | How to verify |
|--------|--------------|
| Invite code function | `SELECT generate_invite_code();` — should return an 8-char string |
| Leaderboard view | `SELECT * FROM community_leaderboards LIMIT 5;` — should return live data |
| Pending limit trigger | Insert 10 pending questions for a test user, then attempt an 11th — should fail with the exception message |
