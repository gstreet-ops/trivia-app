-- Archive table for historical season data
CREATE TABLE IF NOT EXISTS season_archives (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  community_id bigint REFERENCES communities(id) ON DELETE CASCADE NOT NULL,
  season_number integer NOT NULL,
  season_start timestamptz NOT NULL,
  season_end timestamptz NOT NULL,
  leaderboard_snapshot jsonb NOT NULL,
  total_games integer DEFAULT 0,
  total_questions_played integer DEFAULT 0,
  top_player_id uuid REFERENCES profiles(id),
  top_player_username text,
  top_player_avg numeric,
  archived_by uuid REFERENCES profiles(id) NOT NULL,
  archived_at timestamptz DEFAULT now()
);

ALTER TABLE season_archives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view archives"
  ON season_archives FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM community_members
      WHERE community_members.community_id = season_archives.community_id
      AND community_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Commissioner can insert archives"
  ON season_archives FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM communities
      WHERE communities.id = season_archives.community_id
      AND communities.commissioner_id = auth.uid()
    )
  );

-- Add season tracking to communities
ALTER TABLE communities ADD COLUMN IF NOT EXISTS current_season integer DEFAULT 1;
