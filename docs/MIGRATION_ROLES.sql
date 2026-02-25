-- ============================================================
-- MIGRATION: Role System Foundation (Phase 1)
-- Run this in the Supabase SQL Editor.
-- Safe to run multiple times (uses IF NOT EXISTS / idempotent).
-- ============================================================

-- -------------------------------------------------------
-- 1. Add platform_role to profiles
-- -------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'platform_role'
  ) THEN
    ALTER TABLE public.profiles
      ADD COLUMN platform_role text NOT NULL DEFAULT 'user';

    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_platform_role_check
      CHECK (platform_role IN ('user', 'admin', 'super_admin'));
  END IF;
END $$;

-- -------------------------------------------------------
-- 2. Migrate existing data into platform_role
-- -------------------------------------------------------
UPDATE public.profiles SET platform_role = 'super_admin' WHERE super_admin = true AND platform_role = 'user';
UPDATE public.profiles SET platform_role = 'admin'       WHERE role = 'admin' AND super_admin IS NOT TRUE AND platform_role = 'user';

-- -------------------------------------------------------
-- 3. Add role column to community_members
-- -------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'community_members' AND column_name = 'role'
  ) THEN
    ALTER TABLE public.community_members
      ADD COLUMN role text NOT NULL DEFAULT 'member';

    ALTER TABLE public.community_members
      ADD CONSTRAINT community_members_role_check
      CHECK (role IN ('owner', 'commissioner', 'moderator', 'member'));
  END IF;
END $$;

-- -------------------------------------------------------
-- 4. Set existing commissioners as owners
--    - If commissioner is already a member, update their role
--    - If commissioner is NOT a member, insert them
-- -------------------------------------------------------

-- Update existing memberships to owner
UPDATE public.community_members cm
SET role = 'owner'
FROM public.communities c
WHERE cm.community_id = c.id
  AND cm.user_id = c.commissioner_id
  AND cm.role = 'member';

-- Insert missing commissioner memberships as owner
INSERT INTO public.community_members (community_id, user_id, role)
SELECT c.id, c.commissioner_id, 'owner'
FROM public.communities c
WHERE NOT EXISTS (
  SELECT 1 FROM public.community_members cm
  WHERE cm.community_id = c.id AND cm.user_id = c.commissioner_id
)
ON CONFLICT (community_id, user_id) DO UPDATE SET role = 'owner';

-- -------------------------------------------------------
-- 5. Update handle_new_user() trigger to include platform_role
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, role, super_admin, platform_role, profile_visibility, leaderboard_visibility)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'username',
    'user',
    false,
    'user',
    true,
    true
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -------------------------------------------------------
-- 6. RLS policies for community_members
-- -------------------------------------------------------

-- Drop existing policies if they exist (safe re-run)
DROP POLICY IF EXISTS "Members can view same-community members" ON public.community_members;
DROP POLICY IF EXISTS "Owner and commissioner can update member roles" ON public.community_members;
DROP POLICY IF EXISTS "Owner and commissioner can remove members" ON public.community_members;

-- Members can view all members in their communities
CREATE POLICY "Members can view same-community members"
ON public.community_members FOR SELECT
USING (
  community_id IN (
    SELECT cm.community_id FROM public.community_members cm WHERE cm.user_id = auth.uid()
  )
);

-- Owner/commissioner can update roles (and other fields)
CREATE POLICY "Owner and commissioner can update member roles"
ON public.community_members FOR UPDATE
USING (
  community_id IN (
    SELECT cm.community_id FROM public.community_members cm
    WHERE cm.user_id = auth.uid() AND cm.role IN ('owner', 'commissioner')
  )
);

-- Owner/commissioner can remove members
CREATE POLICY "Owner and commissioner can remove members"
ON public.community_members FOR DELETE
USING (
  community_id IN (
    SELECT cm.community_id FROM public.community_members cm
    WHERE cm.user_id = auth.uid() AND cm.role IN ('owner', 'commissioner')
  )
  OR user_id = auth.uid()  -- members can leave
);

-- -------------------------------------------------------
-- 7. RLS policies for community_questions
-- -------------------------------------------------------

DROP POLICY IF EXISTS "Owner commissioner moderator can manage questions" ON public.community_questions;

CREATE POLICY "Owner commissioner moderator can manage questions"
ON public.community_questions FOR ALL
USING (
  community_id IN (
    SELECT cm.community_id FROM public.community_members cm
    WHERE cm.user_id = auth.uid() AND cm.role IN ('owner', 'commissioner', 'moderator')
  )
);

-- -------------------------------------------------------
-- Done! Old columns (role, super_admin, commissioner_id)
-- are intentionally kept for backward compatibility.
-- -------------------------------------------------------
