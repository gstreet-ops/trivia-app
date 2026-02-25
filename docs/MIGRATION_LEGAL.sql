-- Migration: Add consent tracking columns to profiles
-- Run this in the Supabase SQL Editor
-- Date: 2026-02-25

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tos_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS privacy_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS tos_version text;
