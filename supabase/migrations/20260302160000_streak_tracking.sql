-- Add streak columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS current_streak integer NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS best_streak integer NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_played_date date;

-- Index for quick streak display
CREATE INDEX IF NOT EXISTS idx_profiles_streak ON profiles(current_streak DESC) WHERE current_streak > 0;
