# Scheduled Quizzes — Claude Code Prompt

Copy everything below and paste into Claude Code:

---

cd ~/trivia-app && cat << 'PROMPT'

## Task: Scheduled Quizzes

Add a "Quiz Night" feature where commissioners schedule quizzes in advance. At the scheduled time, all community members can join and play the same questions simultaneously. This builds on the existing multiplayer infrastructure.

### Concept

- Commissioner creates a scheduled quiz: picks date/time, category, difficulty, question count, and optionally hand-picks questions from the community bank
- Before start time: quiz shows as "Upcoming" in the community detail page with a countdown
- At start time: quiz becomes "Live" — members can join and play
- After the window closes (configurable, default 24 hours): quiz becomes "Completed" with a leaderboard
- Members get a notification when a quiz is scheduled and when it goes live

### Step 1: Database Migration

Create `supabase/migrations/scheduled_quizzes.sql`:

```sql
-- Scheduled quizzes per community
CREATE TABLE IF NOT EXISTS scheduled_quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id bigint NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES profiles(id),
  title text NOT NULL,
  description text,
  -- Quiz config
  category text DEFAULT 'Random/Mixed',
  difficulty text DEFAULT 'mixed' CHECK (difficulty IN ('easy', 'medium', 'hard', 'mixed')),
  question_count integer NOT NULL DEFAULT 10 CHECK (question_count BETWEEN 3 AND 25),
  timer_seconds integer DEFAULT 30 CHECK (timer_seconds BETWEEN 10 AND 120),
  question_source text NOT NULL DEFAULT 'community' CHECK (question_source IN ('community', 'api', 'curated')),
  -- If curated, these are the hand-picked question IDs
  curated_question_ids uuid[] DEFAULT '{}',
  -- Scheduling
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'completed', 'cancelled')),
  -- Results
  participant_count integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Individual quiz attempts for scheduled quizzes
CREATE TABLE IF NOT EXISTS scheduled_quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES scheduled_quizzes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id),
  score integer NOT NULL DEFAULT 0,
  total_questions integer NOT NULL,
  time_taken_ms integer, -- total time to complete
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE(quiz_id, user_id) -- one attempt per user per scheduled quiz
);

-- Individual answers for scheduled quiz attempts
CREATE TABLE IF NOT EXISTS scheduled_quiz_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES scheduled_quiz_attempts(id) ON DELETE CASCADE,
  question_index integer NOT NULL,
  question_text text NOT NULL,
  correct_answer text NOT NULL,
  user_answer text,
  is_correct boolean DEFAULT false,
  time_taken_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE scheduled_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_quiz_answers ENABLE ROW LEVEL SECURITY;

-- Community members can view scheduled quizzes
CREATE POLICY "Members can view scheduled quizzes" ON scheduled_quizzes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM community_members cm
      WHERE cm.community_id = scheduled_quizzes.community_id
      AND cm.user_id = auth.uid()
    )
  );

-- Commissioners+ can create/update/delete scheduled quizzes
CREATE POLICY "Commissioners can manage scheduled quizzes" ON scheduled_quizzes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM community_members cm
      WHERE cm.community_id = scheduled_quizzes.community_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('owner', 'commissioner')
    )
  );

-- Members can view their own attempts
CREATE POLICY "Members can view attempts" ON scheduled_quiz_attempts
  FOR SELECT USING (user_id = auth.uid());

-- Members can insert their own attempt
CREATE POLICY "Members can create attempts" ON scheduled_quiz_attempts
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Members can update their own attempt (to set completed_at, score)
CREATE POLICY "Members can update own attempts" ON scheduled_quiz_attempts
  FOR UPDATE USING (user_id = auth.uid());

-- Commissioners can view all attempts (for leaderboard)
CREATE POLICY "Commissioners can view all attempts" ON scheduled_quiz_attempts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM scheduled_quizzes sq
      JOIN community_members cm ON cm.community_id = sq.community_id
      WHERE sq.id = scheduled_quiz_attempts.quiz_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('owner', 'commissioner')
    )
  );

-- Answers follow attempt access
CREATE POLICY "Users can manage own answers" ON scheduled_quiz_answers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM scheduled_quiz_attempts sa
      WHERE sa.id = scheduled_quiz_answers.attempt_id
      AND sa.user_id = auth.uid()
    )
  );

-- Commissioners can view all answers
CREATE POLICY "Commissioners can view all answers" ON scheduled_quiz_answers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM scheduled_quiz_attempts sa
      JOIN scheduled_quizzes sq ON sq.id = sa.quiz_id
      JOIN community_members cm ON cm.community_id = sq.community_id
      WHERE sa.id = scheduled_quiz_answers.attempt_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('owner', 'commissioner')
    )
  );

-- Indexes
CREATE INDEX idx_scheduled_quizzes_community ON scheduled_quizzes(community_id, starts_at DESC);
CREATE INDEX idx_scheduled_quizzes_status ON scheduled_quizzes(status, starts_at);
CREATE INDEX idx_scheduled_quiz_attempts_quiz ON scheduled_quiz_attempts(quiz_id, score DESC);
CREATE INDEX idx_scheduled_quiz_answers_attempt ON scheduled_quiz_answers(attempt_id, question_index);
```

Run this migration in Supabase SQL Editor.

### Step 2: Commissioner Dashboard — New "Scheduled" Tab

Add a new tab to the CommissionerDashboard.js nav array (in the tab definitions around line ~1970):

```javascript
canManageSettings(memberWithRole) && { id: 'scheduled', label: 'Scheduled Quizzes', icon: <CalendarIcon size={16} /> },
```

Add a CalendarIcon to Icons.js if one doesn't exist (simple calendar SVG).

**The Scheduled tab should have:**

#### A) Create Scheduled Quiz form:
- **Title** — text input (required)
- **Description** — textarea (optional, shown to members)
- **Date & Time** — datetime-local input for `starts_at` (must be in the future)
- **Duration** — select: 1 hour, 4 hours, 12 hours, 24 hours (default), 48 hours, 1 week → sets `ends_at`
- **Category** — same category selector as existing quiz (8 categories + Random/Mixed)
- **Difficulty** — easy/medium/hard/mixed
- **Question Count** — 5, 10, 15, 20 (default 10)
- **Timer per Question** — 15, 20, 30, 45, 60 seconds (default 30)
- **Question Source** — radio: "Random from community bank" | "Random from Trivia API" | "Hand-pick questions"
  - If "Hand-pick": show a searchable list of community questions with checkboxes. Selected questions get stored in `curated_question_ids`. Question count auto-adjusts to match selected count.
- **Create Quiz** button → inserts into `scheduled_quizzes` + creates notifications for all community members
- **Notify Members** checkbox (default checked) — if checked, insert into `notifications` for each community member:
  ```
  type: 'scheduled_quiz'
  title: 'Quiz Night Scheduled!'
  message: '{title} starts {starts_at formatted}. Don't miss it!'
  link_screen: 'community-{communityId}'
  ```

#### B) Upcoming/Active/Past quizzes list:
- Three sections: **Live Now** (status=live, highlighted), **Upcoming** (status=scheduled, sorted by starts_at), **Past** (status=completed, last 10)
- Each card shows: title, date/time, category, difficulty, question count, participant count
- Live cards show a pulsing green dot and "Join Now" button
- Upcoming cards show countdown timer (auto-updates every second)
- Past cards show "View Results" → expands inline to show leaderboard (top 10 from scheduled_quiz_attempts)
- Commissioner can cancel upcoming quizzes (sets status to 'cancelled')
- Commissioner can manually set a quiz to 'live' early

### Step 3: Community Detail Page — Scheduled Quiz Section

In `CommunityDetail.js`, add a new section (above the leaderboard section) that shows upcoming and live scheduled quizzes for this community.

**What members see:**
- **Live Quiz banner** — if any quiz has status='live' and current time is between starts_at and ends_at:
  - Pulsing green indicator + quiz title + "Play Now" button
  - If user already has an attempt: show "Completed ✓" with their score instead
- **Next Upcoming Quiz** — if a quiz is scheduled in the future:
  - Title, countdown to start, category/difficulty info
  - "Remind Me" → just visual confirmation (notification already sent on creation)

**Fetch on mount:**
```javascript
const { data: scheduledQuizzes } = await supabase
  .from('scheduled_quizzes')
  .select('*, scheduled_quiz_attempts!left(id, user_id, score, total_questions)')
  .eq('community_id', communityId)
  .in('status', ['scheduled', 'live'])
  .order('starts_at', { ascending: true });
```

### Step 4: Scheduled Quiz Play Screen

Create a new component `ScheduledQuizPlay.js` (or reuse/adapt QuizScreen.js logic):

When a member clicks "Play Now" on a live scheduled quiz:

1. **Check eligibility:**
   - Quiz status must be 'live'
   - Current time must be between starts_at and ends_at
   - User must not already have a completed attempt (check scheduled_quiz_attempts)

2. **Load questions:**
   - If `question_source === 'curated'`: fetch community_questions by IDs in `curated_question_ids`, shuffle order
   - If `question_source === 'community'`: fetch random questions from community_questions matching category/difficulty
   - If `question_source === 'api'`: fetch from Trivia API (same logic as existing QuizScreen)

3. **Create attempt:** Insert into `scheduled_quiz_attempts` with user_id, quiz_id, total_questions

4. **Play the quiz:** Reuse existing QuizScreen UI and logic:
   - Show question with shuffled answers
   - Timer countdown per question (from quiz's timer_seconds)
   - Immediate feedback (correct/wrong highlighting)
   - Track time_taken_ms per answer

5. **Save answers:** For each answer, insert into `scheduled_quiz_answers`

6. **Complete:** Update the attempt with score, completed_at, total time_taken_ms

7. **Show results:** Score summary + "View Community Results" button → shows leaderboard of all attempts for this quiz, ranked by score (ties broken by time_taken_ms)

8. **Update participant_count:** After completion, update `scheduled_quizzes.participant_count` (can use a simple count query)

### Step 5: Auto-status updates

The simplest approach: check status on every relevant page load rather than a cron job.

In `CommunityDetail.js` and `CommissionerDashboard.js`, when fetching scheduled quizzes, also run status updates:

```javascript
// Auto-transition scheduled → live when starts_at has passed
const now = new Date().toISOString();
const { data: toActivate } = await supabase
  .from('scheduled_quizzes')
  .select('id')
  .eq('community_id', communityId)
  .eq('status', 'scheduled')
  .lte('starts_at', now);

if (toActivate?.length) {
  await supabase
    .from('scheduled_quizzes')
    .update({ status: 'live', updated_at: now })
    .in('id', toActivate.map(q => q.id));
}

// Auto-transition live → completed when ends_at has passed
const { data: toComplete } = await supabase
  .from('scheduled_quizzes')
  .select('id')
  .eq('community_id', communityId)
  .eq('status', 'live')
  .lte('ends_at', now);

if (toComplete?.length) {
  await supabase
    .from('scheduled_quizzes')
    .update({ status: 'completed', updated_at: now })
    .in('id', toComplete.map(q => q.id));
}
```

### Step 6: Navigation integration

In `App.js`, add routing for scheduled quiz play. When a user clicks "Play Now" on a live scheduled quiz:
- Set app state to show ScheduledQuizPlay component
- Pass quiz ID, community ID, user info
- On completion, navigate back to community detail

The simplest approach: add a new screen state in App.js like the existing quiz/multiplayer flows:
```javascript
// In App.js state
const [scheduledQuizId, setScheduledQuizId] = useState(null);

// In render
{scheduledQuizId && (
  <ScheduledQuizPlay
    quizId={scheduledQuizId}
    user={user}
    username={username}
    onBack={() => setScheduledQuizId(null)}
  />
)}
```

### Files to create

- `src/components/ScheduledQuizPlay.js` — the quiz play screen for scheduled quizzes
- `src/components/ScheduledQuizPlay.css` — styling (Georgetown palette)

### Files to modify

- `src/components/Icons.js` — add CalendarIcon if missing
- `src/components/CommissionerDashboard.js` — add 'scheduled' tab with creation form + quiz list
- `src/components/CommunityDetail.js` — add live/upcoming quiz section
- `src/components/App.js` — add scheduledQuizId state + ScheduledQuizPlay routing

### UI Style

- Georgetown palette: navy #041E42, gray #54585A, light accents
- Live quiz: pulsing green dot (#059669), green border highlight
- Upcoming: blue calendar icon, countdown in monospace font
- Completed: gray with trophy icon for results
- Use existing CSS class patterns from CommissionerDashboard.css and CommunityDetail.css
- Mobile responsive (follow existing media query patterns)

### Testing

1. Run SQL migration in Supabase
2. As commissioner: create a scheduled quiz set to start 1 minute from now, duration 1 hour
3. Wait for it to go live (or manually set status to 'live' in the dashboard)
4. As a member: see it appear on community detail page, click Play Now
5. Complete the quiz, verify score saves
6. Check leaderboard shows the attempt
7. Verify duplicate attempt is blocked
8. Let the quiz end, verify status transitions to 'completed'

PROMPT