-- Migration: Create media_library table + community-media storage bucket
-- Run this in the Supabase SQL Editor
-- Date: 2026-02-25

-- Media library: tracks all uploaded images and saved video URLs per community
CREATE TABLE IF NOT EXISTS public.media_library (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL REFERENCES public.profiles(id),
  file_url text NOT NULL,
  file_type text NOT NULL CHECK (file_type IN ('image', 'video')),
  filename text NOT NULL,
  file_size integer,                -- bytes, null for video URLs
  storage_path text,                -- Supabase Storage path, null for video URLs
  tags text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_media_library_community
  ON public.media_library (community_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_media_library_type
  ON public.media_library (community_id, file_type);

-- RLS
ALTER TABLE public.media_library ENABLE ROW LEVEL SECURITY;

-- Read: community members can view
CREATE POLICY "media_library_select" ON public.media_library
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.community_members
      WHERE community_members.community_id = media_library.community_id
        AND community_members.user_id = auth.uid()
    )
  );

-- Insert: commissioners, moderators, owners can upload
CREATE POLICY "media_library_insert" ON public.media_library
  FOR INSERT WITH CHECK (
    uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.community_members
      WHERE community_members.community_id = media_library.community_id
        AND community_members.user_id = auth.uid()
        AND community_members.role IN ('owner', 'commissioner', 'moderator')
    )
  );

-- Delete: commissioners + owners can delete
CREATE POLICY "media_library_delete" ON public.media_library
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.community_members
      WHERE community_members.community_id = media_library.community_id
        AND community_members.user_id = auth.uid()
        AND community_members.role IN ('owner', 'commissioner')
    )
  );

-- NOTE: Create a 'community-media' storage bucket in the Supabase dashboard
-- with public access enabled (for serving media URLs).
-- Bucket name: community-media
-- Public: Yes
-- File size limit: 2MB
-- Allowed MIME types: image/png, image/jpeg, image/webp, image/gif
