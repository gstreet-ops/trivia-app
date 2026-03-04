-- ============================================================
-- Question Difficulty Voting System
-- Players rate difficulty after answering community questions.
-- Over time, computed_difficulty auto-adjusts based on consensus.
-- ============================================================

-- Table: one vote per user per question
CREATE TABLE IF NOT EXISTS question_difficulty_votes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id uuid NOT NULL REFERENCES community_questions(id) ON DELETE CASCADE,
  community_id uuid NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  voted_difficulty text NOT NULL CHECK (voted_difficulty IN ('easy', 'medium', 'hard')),
  created_at timestamptz DEFAULT now(),
  UNIQUE (question_id, user_id)
);

-- Add computed columns to community_questions
ALTER TABLE community_questions
  ADD COLUMN IF NOT EXISTS difficulty_vote_counts jsonb DEFAULT '{"easy":0,"medium":0,"hard":0}',
  ADD COLUMN IF NOT EXISTS computed_difficulty text;

-- Trigger function: recalculate after insert/update on votes
-- Requires 5-vote minimum + >60% consensus to set computed_difficulty
CREATE OR REPLACE FUNCTION recalc_difficulty_votes() RETURNS trigger AS $$
DECLARE
  counts jsonb;
  total int;
  max_count int;
  max_difficulty text;
BEGIN
  -- Count votes per difficulty for this question
  SELECT jsonb_build_object(
    'easy',   COALESCE(SUM(CASE WHEN voted_difficulty = 'easy'   THEN 1 ELSE 0 END), 0),
    'medium', COALESCE(SUM(CASE WHEN voted_difficulty = 'medium' THEN 1 ELSE 0 END), 0),
    'hard',   COALESCE(SUM(CASE WHEN voted_difficulty = 'hard'   THEN 1 ELSE 0 END), 0)
  )
  INTO counts
  FROM question_difficulty_votes
  WHERE question_id = NEW.question_id;

  total := (counts->>'easy')::int + (counts->>'medium')::int + (counts->>'hard')::int;

  -- Find the max vote category
  max_count := GREATEST((counts->>'easy')::int, (counts->>'medium')::int, (counts->>'hard')::int);
  IF (counts->>'easy')::int = max_count THEN
    max_difficulty := 'easy';
  ELSIF (counts->>'medium')::int = max_count THEN
    max_difficulty := 'medium';
  ELSE
    max_difficulty := 'hard';
  END IF;

  -- Update the question with vote counts and computed difficulty
  -- Computed difficulty only set with 5+ votes and >60% consensus
  UPDATE community_questions
  SET difficulty_vote_counts = counts,
      computed_difficulty = CASE
        WHEN total >= 5 AND max_count::float / total > 0.6 THEN max_difficulty
        ELSE NULL
      END
  WHERE id = NEW.question_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_recalc_difficulty_votes
  AFTER INSERT OR UPDATE ON question_difficulty_votes
  FOR EACH ROW EXECUTE FUNCTION recalc_difficulty_votes();

-- RLS policies
ALTER TABLE question_difficulty_votes ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read votes
CREATE POLICY "Users can read difficulty votes"
  ON question_difficulty_votes FOR SELECT
  TO authenticated
  USING (true);

-- Users can insert their own votes
CREATE POLICY "Users can insert own difficulty votes"
  ON question_difficulty_votes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own votes
CREATE POLICY "Users can update own difficulty votes"
  ON question_difficulty_votes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_difficulty_votes_question ON question_difficulty_votes (question_id);
CREATE INDEX IF NOT EXISTS idx_difficulty_votes_user_question ON question_difficulty_votes (user_id, question_id);
