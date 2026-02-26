-- Embed Analytics: Add source tracking to games table
-- Run in Supabase SQL Editor

-- Add source column to track where games were played
ALTER TABLE games ADD COLUMN IF NOT EXISTS source text DEFAULT 'app';

-- Add host_origin to track which client site the embed was loaded on
ALTER TABLE games ADD COLUMN IF NOT EXISTS host_origin text;

-- Backfill: mark existing games with session_id but no user as likely embed games
-- (optional, can skip if you want clean data from this point forward)
-- UPDATE games SET source = 'embed' WHERE session_id IS NOT NULL AND user_id IS NULL;

-- Index for efficient embed analytics queries
CREATE INDEX IF NOT EXISTS idx_games_source ON games(source);
CREATE INDEX IF NOT EXISTS idx_games_community_source ON games(community_id, source);

COMMENT ON COLUMN games.source IS 'Where the game was played: app (trivia-app) or embed (quiz-embed iframe)';
COMMENT ON COLUMN games.host_origin IS 'For embed games: the parent site origin (e.g. elliehallaron.com)';
