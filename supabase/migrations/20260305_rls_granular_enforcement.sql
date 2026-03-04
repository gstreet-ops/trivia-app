-- =============================================================
-- RLS Granular Enforcement — Replace legacy role text checks
-- with check_community_permission() on all community tables
-- Created: 2026-03-05
-- =============================================================
-- Strategy:
-- 1. DROP all existing policies on each table (IF EXISTS for idempotency)
-- 2. Recreate with granular permission checks via check_community_permission()
-- 3. Keep read policies permissive where widgets/members need access
-- 4. Preserve community_members UPDATE hardening (no self-role-update, owner-only owner assignment)
--
-- Tables updated in this migration:
--   community_questions, community_announcements, community_messages,
--   community_members, communities, question_templates, media_library,
--   generation_requests, season_archives, community_sites
--
-- Tables NOT in this project (exist in quiz-embed, need separate migration):
--   embed_profiles, subscribers, form_submissions, community_events,
--   content_blocks, page_views
--
-- Tables already using check_community_permission (no changes needed):
--   community_roles, permission_overrides, permission_audit_log,
--   scheduled_quizzes, scheduled_quiz_attempts, scheduled_quiz_answers,
--   email_campaigns, email_templates, email_integrations, email_sync_logs,
--   question_difficulty_votes
--
-- Tables that are user-scoped or platform-scoped (no changes needed):
--   profiles, games, game_answers, custom_questions, notifications,
--   multiplayer_rooms, multiplayer_participants, multiplayer_questions,
--   multiplayer_answers, community_leaderboards (view)
-- =============================================================

-- ─── Diagnostic: list current policies on all target tables ────
DO $$
DECLARE
  r RECORD;
BEGIN
  RAISE NOTICE '=== Current RLS policies on target tables ===';
  FOR r IN
    SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'community_questions', 'community_announcements', 'community_messages',
        'community_members', 'communities', 'question_templates', 'media_library',
        'generation_requests', 'season_archives', 'community_sites'
      )
    ORDER BY tablename, policyname
  LOOP
    RAISE NOTICE '  [%] % (%) cmd=% roles=%',
      r.tablename, r.policyname, r.permissive, r.cmd, r.roles;
  END LOOP;
  RAISE NOTICE '=== End policy listing ===';
END $$;


-- =============================================================
-- 1. community_questions
-- =============================================================
-- SELECT: all community members can read (needed to play quizzes)
-- INSERT/UPDATE/DELETE: manage_questions permission
-- =============================================================

ALTER TABLE community_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner commissioner moderator can manage questions" ON community_questions;
DROP POLICY IF EXISTS "community_questions_select" ON community_questions;
DROP POLICY IF EXISTS "community_questions_insert" ON community_questions;
DROP POLICY IF EXISTS "community_questions_update" ON community_questions;
DROP POLICY IF EXISTS "community_questions_delete" ON community_questions;
DROP POLICY IF EXISTS "Members can view community questions" ON community_questions;
DROP POLICY IF EXISTS "Commissioners can manage questions" ON community_questions;

CREATE POLICY "community_questions_select" ON community_questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM community_members
      WHERE community_members.community_id = community_questions.community_id
        AND community_members.user_id = auth.uid()
    )
  );

CREATE POLICY "community_questions_insert" ON community_questions
  FOR INSERT WITH CHECK (
    check_community_permission(auth.uid(), community_id, 'manage_questions')
  );

CREATE POLICY "community_questions_update" ON community_questions
  FOR UPDATE USING (
    check_community_permission(auth.uid(), community_id, 'manage_questions')
  );

CREATE POLICY "community_questions_delete" ON community_questions
  FOR DELETE USING (
    check_community_permission(auth.uid(), community_id, 'manage_questions')
  );


-- =============================================================
-- 2. community_announcements
-- =============================================================
-- SELECT: all community members can read
-- INSERT/UPDATE/DELETE: manage_announcements permission
-- =============================================================

ALTER TABLE community_announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "community_announcements_select" ON community_announcements;
DROP POLICY IF EXISTS "community_announcements_insert" ON community_announcements;
DROP POLICY IF EXISTS "community_announcements_update" ON community_announcements;
DROP POLICY IF EXISTS "community_announcements_delete" ON community_announcements;
DROP POLICY IF EXISTS "Members can view announcements" ON community_announcements;
DROP POLICY IF EXISTS "Commissioner can manage announcements" ON community_announcements;
DROP POLICY IF EXISTS "Commissioners can manage announcements" ON community_announcements;

CREATE POLICY "community_announcements_select" ON community_announcements
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM community_members
      WHERE community_members.community_id = community_announcements.community_id
        AND community_members.user_id = auth.uid()
    )
  );

CREATE POLICY "community_announcements_insert" ON community_announcements
  FOR INSERT WITH CHECK (
    check_community_permission(auth.uid(), community_id, 'manage_announcements')
  );

CREATE POLICY "community_announcements_update" ON community_announcements
  FOR UPDATE USING (
    check_community_permission(auth.uid(), community_id, 'manage_announcements')
  );

CREATE POLICY "community_announcements_delete" ON community_announcements
  FOR DELETE USING (
    check_community_permission(auth.uid(), community_id, 'manage_announcements')
  );


-- =============================================================
-- 3. community_messages
-- =============================================================
-- SELECT: community members can read
-- INSERT: community members can post their own messages
-- UPDATE (soft-delete): moderate_chat permission
-- DELETE: no hard delete policy
-- =============================================================

ALTER TABLE community_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view community messages" ON community_messages;
DROP POLICY IF EXISTS "Members can send messages" ON community_messages;
DROP POLICY IF EXISTS "Commissioner can delete messages" ON community_messages;
DROP POLICY IF EXISTS "community_messages_select" ON community_messages;
DROP POLICY IF EXISTS "community_messages_insert" ON community_messages;
DROP POLICY IF EXISTS "community_messages_update" ON community_messages;
DROP POLICY IF EXISTS "community_messages_delete" ON community_messages;

CREATE POLICY "community_messages_select" ON community_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM community_members
      WHERE community_members.community_id = community_messages.community_id
        AND community_members.user_id = auth.uid()
    )
  );

CREATE POLICY "community_messages_insert" ON community_messages
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM community_members
      WHERE community_members.community_id = community_messages.community_id
        AND community_members.user_id = auth.uid()
    )
  );

CREATE POLICY "community_messages_update" ON community_messages
  FOR UPDATE USING (
    check_community_permission(auth.uid(), community_id, 'moderate_chat')
  );

-- No DELETE policy — soft-delete via UPDATE only


-- =============================================================
-- 4. community_members
-- =============================================================
-- SELECT: community members can see co-members
-- INSERT: authenticated users can insert themselves (join via invite code)
-- UPDATE: manage_members permission, with hardening:
--   - Cannot update own role
--   - Only users with transfer_ownership can assign 'owner' role
--   - Role must be a valid value
-- DELETE: manage_members permission OR user can remove themselves (leave)
-- =============================================================

-- Do NOT disable/re-enable RLS — already enabled

DROP POLICY IF EXISTS "Members can view same-community members" ON community_members;
DROP POLICY IF EXISTS "Owner and commissioner can update member roles" ON community_members;
DROP POLICY IF EXISTS "Owner and commissioner can remove members" ON community_members;
DROP POLICY IF EXISTS "community_members_select" ON community_members;
DROP POLICY IF EXISTS "community_members_insert" ON community_members;
DROP POLICY IF EXISTS "community_members_update" ON community_members;
DROP POLICY IF EXISTS "community_members_delete" ON community_members;
DROP POLICY IF EXISTS "Anyone can join communities" ON community_members;
DROP POLICY IF EXISTS "Users can join communities" ON community_members;

ALTER TABLE community_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "community_members_select" ON community_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM community_members cm
      WHERE cm.community_id = community_members.community_id
        AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "community_members_insert" ON community_members
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
  );

CREATE POLICY "community_members_update" ON community_members
  FOR UPDATE
  USING (
    check_community_permission(auth.uid(), community_id, 'manage_members')
  )
  WITH CHECK (
    -- Cannot update your own role
    user_id != auth.uid()
    -- Only users with transfer_ownership permission can assign 'owner' role
    AND (
      role != 'owner'
      OR check_community_permission(auth.uid(), community_id, 'transfer_ownership')
    )
    -- Role must be a valid value
    AND role = ANY (ARRAY['owner', 'commissioner', 'moderator', 'member'])
  );

CREATE POLICY "community_members_delete" ON community_members
  FOR DELETE USING (
    check_community_permission(auth.uid(), community_id, 'manage_members')
    OR user_id = auth.uid()  -- members can leave
  );


-- =============================================================
-- 5. communities
-- =============================================================
-- SELECT: all authenticated users (needed for marketplace, join flow)
-- INSERT: any authenticated user can create a community
-- UPDATE: manage_settings permission (community_id = id for this table)
-- DELETE: delete_community permission
-- =============================================================

ALTER TABLE communities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "communities_select" ON communities;
DROP POLICY IF EXISTS "communities_insert" ON communities;
DROP POLICY IF EXISTS "communities_update" ON communities;
DROP POLICY IF EXISTS "communities_delete" ON communities;
DROP POLICY IF EXISTS "Anyone can view communities" ON communities;
DROP POLICY IF EXISTS "Authenticated users can view communities" ON communities;
DROP POLICY IF EXISTS "Commissioner can update community" ON communities;
DROP POLICY IF EXISTS "Commissioner can manage community" ON communities;
DROP POLICY IF EXISTS "Owner can delete community" ON communities;

CREATE POLICY "communities_select" ON communities
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "communities_insert" ON communities
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "communities_update" ON communities
  FOR UPDATE USING (
    check_community_permission(auth.uid(), id, 'manage_settings')
  );

CREATE POLICY "communities_delete" ON communities
  FOR DELETE USING (
    check_community_permission(auth.uid(), id, 'delete_community')
  );


-- =============================================================
-- 6. question_templates
-- =============================================================
-- SELECT: community members can read
-- INSERT/UPDATE/DELETE: manage_templates permission
-- =============================================================

ALTER TABLE question_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "question_templates_select" ON question_templates;
DROP POLICY IF EXISTS "question_templates_insert" ON question_templates;
DROP POLICY IF EXISTS "question_templates_update" ON question_templates;
DROP POLICY IF EXISTS "question_templates_delete" ON question_templates;
DROP POLICY IF EXISTS "Commissioner can manage templates" ON question_templates;
DROP POLICY IF EXISTS "Members can view templates" ON question_templates;

CREATE POLICY "question_templates_select" ON question_templates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM community_members
      WHERE community_members.community_id = question_templates.community_id
        AND community_members.user_id = auth.uid()
    )
  );

CREATE POLICY "question_templates_insert" ON question_templates
  FOR INSERT WITH CHECK (
    check_community_permission(auth.uid(), community_id, 'manage_templates')
  );

CREATE POLICY "question_templates_update" ON question_templates
  FOR UPDATE USING (
    check_community_permission(auth.uid(), community_id, 'manage_templates')
  );

CREATE POLICY "question_templates_delete" ON question_templates
  FOR DELETE USING (
    check_community_permission(auth.uid(), community_id, 'manage_templates')
  );


-- =============================================================
-- 7. media_library
-- =============================================================
-- SELECT: community members can read
-- INSERT/DELETE: manage_media permission
-- =============================================================

-- RLS already enabled from docs/MIGRATION_MEDIA_LIBRARY.sql

DROP POLICY IF EXISTS "media_library_select" ON media_library;
DROP POLICY IF EXISTS "media_library_insert" ON media_library;
DROP POLICY IF EXISTS "media_library_update" ON media_library;
DROP POLICY IF EXISTS "media_library_delete" ON media_library;

ALTER TABLE media_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "media_library_select" ON media_library
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM community_members
      WHERE community_members.community_id = media_library.community_id
        AND community_members.user_id = auth.uid()
    )
  );

CREATE POLICY "media_library_insert" ON media_library
  FOR INSERT WITH CHECK (
    check_community_permission(auth.uid(), community_id, 'manage_media')
  );

CREATE POLICY "media_library_delete" ON media_library
  FOR DELETE USING (
    check_community_permission(auth.uid(), community_id, 'manage_media')
  );


-- =============================================================
-- 8. generation_requests
-- =============================================================
-- SELECT: own requests via request_ai_generation, all via view_analytics,
--         platform admins can see all (super_admin bypass in function)
-- INSERT: request_ai_generation permission
-- UPDATE: platform admin only (approve/reject flow)
-- =============================================================

ALTER TABLE generation_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "generation_requests_select" ON generation_requests;
DROP POLICY IF EXISTS "generation_requests_insert" ON generation_requests;
DROP POLICY IF EXISTS "generation_requests_update" ON generation_requests;
DROP POLICY IF EXISTS "generation_requests_delete" ON generation_requests;
DROP POLICY IF EXISTS "Commissioner can view generation requests" ON generation_requests;
DROP POLICY IF EXISTS "Commissioner can create generation requests" ON generation_requests;
DROP POLICY IF EXISTS "Admin can update generation requests" ON generation_requests;
DROP POLICY IF EXISTS "Commissioners can manage generation requests" ON generation_requests;

CREATE POLICY "generation_requests_select" ON generation_requests
  FOR SELECT USING (
    -- Own requests
    requested_by = auth.uid()
    -- Or has view_analytics in the community
    OR check_community_permission(auth.uid(), community_id, 'view_analytics')
    -- Or platform admin (handled by super_admin bypass in check_community_permission,
    -- but also check profile role for requests with no community context)
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND (profiles.role = 'admin' OR profiles.super_admin = true)
    )
  );

CREATE POLICY "generation_requests_insert" ON generation_requests
  FOR INSERT WITH CHECK (
    check_community_permission(auth.uid(), community_id, 'request_ai_generation')
  );

CREATE POLICY "generation_requests_update" ON generation_requests
  FOR UPDATE USING (
    -- Platform admins only (approve/reject)
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND (profiles.role = 'admin' OR profiles.super_admin = true)
    )
  );


-- =============================================================
-- 9. season_archives
-- =============================================================
-- SELECT: community members can read
-- INSERT: manage_settings permission (season reset is a settings action)
-- =============================================================

-- RLS already enabled from migration 20260224180000

DROP POLICY IF EXISTS "Members can view archives" ON season_archives;
DROP POLICY IF EXISTS "Commissioner can insert archives" ON season_archives;
DROP POLICY IF EXISTS "season_archives_select" ON season_archives;
DROP POLICY IF EXISTS "season_archives_insert" ON season_archives;

CREATE POLICY "season_archives_select" ON season_archives
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM community_members
      WHERE community_members.community_id = season_archives.community_id
        AND community_members.user_id = auth.uid()
    )
  );

CREATE POLICY "season_archives_insert" ON season_archives
  FOR INSERT WITH CHECK (
    check_community_permission(auth.uid(), community_id, 'manage_settings')
  );


-- =============================================================
-- 10. community_sites
-- =============================================================
-- SELECT: published sites are public, drafts require manage_pages
-- INSERT/UPDATE/DELETE: manage_pages permission
-- =============================================================

-- RLS already enabled from migration 20260302180000

DROP POLICY IF EXISTS "community_sites_read" ON community_sites;
DROP POLICY IF EXISTS "community_sites_write" ON community_sites;
DROP POLICY IF EXISTS "community_sites_select" ON community_sites;
DROP POLICY IF EXISTS "community_sites_insert" ON community_sites;
DROP POLICY IF EXISTS "community_sites_update" ON community_sites;
DROP POLICY IF EXISTS "community_sites_delete" ON community_sites;

CREATE POLICY "community_sites_select" ON community_sites
  FOR SELECT USING (
    status = 'published'
    OR check_community_permission(auth.uid(), community_id, 'manage_pages')
  );

CREATE POLICY "community_sites_insert" ON community_sites
  FOR INSERT WITH CHECK (
    check_community_permission(auth.uid(), community_id, 'manage_pages')
  );

CREATE POLICY "community_sites_update" ON community_sites
  FOR UPDATE USING (
    check_community_permission(auth.uid(), community_id, 'manage_pages')
  );

CREATE POLICY "community_sites_delete" ON community_sites
  FOR DELETE USING (
    check_community_permission(auth.uid(), community_id, 'manage_pages')
  );


-- =============================================================
-- Post-migration diagnostic
-- =============================================================
DO $$
DECLARE
  r RECORD;
  policy_count int;
BEGIN
  SELECT count(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN (
      'community_questions', 'community_announcements', 'community_messages',
      'community_members', 'communities', 'question_templates', 'media_library',
      'generation_requests', 'season_archives', 'community_sites'
    );
  RAISE NOTICE '=== Post-migration: % policies on target tables ===', policy_count;

  FOR r IN
    SELECT tablename, policyname, cmd
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'community_questions', 'community_announcements', 'community_messages',
        'community_members', 'communities', 'question_templates', 'media_library',
        'generation_requests', 'season_archives', 'community_sites'
      )
    ORDER BY tablename, policyname
  LOOP
    RAISE NOTICE '  [%] % (%)', r.tablename, r.policyname, r.cmd;
  END LOOP;
  RAISE NOTICE '=== Migration complete ===';
END $$;
