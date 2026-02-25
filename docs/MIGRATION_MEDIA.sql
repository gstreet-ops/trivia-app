-- Migration: Add media columns to game_answers
-- Run this in the Supabase SQL Editor
-- Date: 2026-02-25

-- Add image_url and video_url to game_answers so media can be shown in game review
ALTER TABLE public.game_answers
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS video_url text;

-- Add index for quick lookup of answers with media
CREATE INDEX IF NOT EXISTS idx_game_answers_has_media
  ON public.game_answers (game_id)
  WHERE image_url IS NOT NULL OR video_url IS NOT NULL;
