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
  time_taken_ms integer,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE(quiz_id, user_id)
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
