-- =============================================================
-- Granular Permissions System — Migration (handles partial state)
-- Created: 2026-03-02
-- =============================================================

-- ─── Tables ──────────────────────────────────────────────────

-- community_roles: create if not exists, then add any missing columns
CREATE TABLE IF NOT EXISTS community_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id bigint NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  name text NOT NULL,
  permissions jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add columns that may be missing from a previous partial creation
ALTER TABLE community_roles ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE community_roles ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE community_roles ADD COLUMN IF NOT EXISTS hierarchy_level integer NOT NULL DEFAULT 0;
ALTER TABLE community_roles ADD COLUMN IF NOT EXISTS is_system boolean NOT NULL DEFAULT false;
ALTER TABLE community_roles ADD COLUMN IF NOT EXISTS color text;
ALTER TABLE community_roles ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Add unique constraint on (community_id, slug) if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'community_roles_community_id_slug_key'
  ) THEN
    ALTER TABLE community_roles ADD CONSTRAINT community_roles_community_id_slug_key UNIQUE (community_id, slug);
  END IF;
END $$;

-- Per-user permission overrides
CREATE TABLE IF NOT EXISTS permission_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id bigint NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  permission_key text NOT NULL,
  granted boolean NOT NULL,
  granted_by uuid REFERENCES profiles(id),
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(community_id, user_id, permission_key)
);

-- Audit log
CREATE TABLE IF NOT EXISTS permission_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id bigint NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL REFERENCES profiles(id),
  action text NOT NULL,
  target_user_id uuid REFERENCES profiles(id),
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE permission_audit_log ADD COLUMN IF NOT EXISTS target_role_id uuid REFERENCES community_roles(id) ON DELETE SET NULL;

-- Add role_id FK to community_members
ALTER TABLE community_members ADD COLUMN IF NOT EXISTS role_id uuid REFERENCES community_roles(id);

-- ─── Indexes ─────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_community_roles_community ON community_roles(community_id);
CREATE INDEX IF NOT EXISTS idx_permission_overrides_community_user ON permission_overrides(community_id, user_id);
CREATE INDEX IF NOT EXISTS idx_permission_audit_community ON permission_audit_log(community_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_members_role_id ON community_members(role_id);

-- ─── Backfill existing community_roles rows that lack slug ───
-- Update existing rows to set slug = lower(name) where slug is null
UPDATE community_roles SET slug = lower(name) WHERE slug IS NULL;

-- ─── Seed system roles for all existing communities ──────────
-- Update existing system roles to ensure correct permissions and metadata
UPDATE community_roles SET
  description = 'Full control over the community',
  hierarchy_level = 100,
  is_system = true,
  permissions = '{"manage_questions":true,"manage_tags":true,"manage_templates":true,"manage_media":true,"request_ai_generation":true,"manage_announcements":true,"manage_events":true,"manage_content":true,"moderate_chat":true,"view_members":true,"manage_members":true,"assign_roles":true,"invite_members":true,"manage_settings":true,"manage_embed":true,"manage_subscribers":true,"manage_forms":true,"manage_tiers":true,"regenerate_invite":true,"view_analytics":true,"view_site_analytics":true,"manage_webhooks":true,"manage_roles":true,"transfer_ownership":true,"delete_community":true,"manage_pages":true,"manage_danger_zone":true}'::jsonb,
  color = '#041E42'
WHERE slug = 'owner';

UPDATE community_roles SET
  description = 'Manages community operations',
  hierarchy_level = 75,
  is_system = true,
  permissions = '{"manage_questions":true,"manage_tags":true,"manage_templates":true,"manage_media":true,"request_ai_generation":true,"manage_announcements":true,"manage_events":true,"manage_content":true,"moderate_chat":true,"view_members":true,"manage_members":true,"assign_roles":true,"invite_members":true,"manage_settings":true,"manage_embed":true,"manage_subscribers":true,"manage_forms":true,"regenerate_invite":true,"view_analytics":true,"view_site_analytics":true,"manage_webhooks":true,"manage_pages":true}'::jsonb,
  color = '#2E86AB'
WHERE slug = 'commissioner';

UPDATE community_roles SET
  description = 'Manages content and questions',
  hierarchy_level = 50,
  is_system = true,
  permissions = '{"manage_questions":true,"manage_tags":true,"manage_templates":true,"manage_media":true,"request_ai_generation":true,"moderate_chat":true,"view_members":true,"view_analytics":true}'::jsonb,
  color = '#A23B72'
WHERE slug = 'moderator';

UPDATE community_roles SET
  description = 'Community member',
  hierarchy_level = 0,
  is_system = true,
  permissions = '{}'::jsonb,
  color = '#54585A'
WHERE slug = 'member';

-- Insert system roles for any communities that are missing them
INSERT INTO community_roles (community_id, name, slug, description, hierarchy_level, is_system, permissions, color)
SELECT c.id, 'Owner', 'owner', 'Full control over the community', 100, true,
  '{"manage_questions":true,"manage_tags":true,"manage_templates":true,"manage_media":true,"request_ai_generation":true,"manage_announcements":true,"manage_events":true,"manage_content":true,"moderate_chat":true,"view_members":true,"manage_members":true,"assign_roles":true,"invite_members":true,"manage_settings":true,"manage_embed":true,"manage_subscribers":true,"manage_forms":true,"manage_tiers":true,"regenerate_invite":true,"view_analytics":true,"view_site_analytics":true,"manage_webhooks":true,"manage_roles":true,"transfer_ownership":true,"delete_community":true,"manage_pages":true,"manage_danger_zone":true}'::jsonb,
  '#041E42'
FROM communities c
WHERE NOT EXISTS (SELECT 1 FROM community_roles cr WHERE cr.community_id = c.id AND cr.slug = 'owner')
ON CONFLICT (community_id, slug) DO NOTHING;

INSERT INTO community_roles (community_id, name, slug, description, hierarchy_level, is_system, permissions, color)
SELECT c.id, 'Commissioner', 'commissioner', 'Manages community operations', 75, true,
  '{"manage_questions":true,"manage_tags":true,"manage_templates":true,"manage_media":true,"request_ai_generation":true,"manage_announcements":true,"manage_events":true,"manage_content":true,"moderate_chat":true,"view_members":true,"manage_members":true,"assign_roles":true,"invite_members":true,"manage_settings":true,"manage_embed":true,"manage_subscribers":true,"manage_forms":true,"regenerate_invite":true,"view_analytics":true,"view_site_analytics":true,"manage_webhooks":true,"manage_pages":true}'::jsonb,
  '#2E86AB'
FROM communities c
WHERE NOT EXISTS (SELECT 1 FROM community_roles cr WHERE cr.community_id = c.id AND cr.slug = 'commissioner')
ON CONFLICT (community_id, slug) DO NOTHING;

INSERT INTO community_roles (community_id, name, slug, description, hierarchy_level, is_system, permissions, color)
SELECT c.id, 'Moderator', 'moderator', 'Manages content and questions', 50, true,
  '{"manage_questions":true,"manage_tags":true,"manage_templates":true,"manage_media":true,"request_ai_generation":true,"moderate_chat":true,"view_members":true,"view_analytics":true}'::jsonb,
  '#A23B72'
FROM communities c
WHERE NOT EXISTS (SELECT 1 FROM community_roles cr WHERE cr.community_id = c.id AND cr.slug = 'moderator')
ON CONFLICT (community_id, slug) DO NOTHING;

INSERT INTO community_roles (community_id, name, slug, description, hierarchy_level, is_system, permissions, color)
SELECT c.id, 'Member', 'member', 'Community member', 0, true, '{}'::jsonb, '#54585A'
FROM communities c
WHERE NOT EXISTS (SELECT 1 FROM community_roles cr WHERE cr.community_id = c.id AND cr.slug = 'member')
ON CONFLICT (community_id, slug) DO NOTHING;

-- Backfill role_id on existing community_members by matching role text to slug
UPDATE community_members cm
SET role_id = cr.id
FROM community_roles cr
WHERE cr.community_id = cm.community_id
  AND cr.slug = COALESCE(cm.role, 'member')
  AND cr.is_system = true
  AND cm.role_id IS NULL;

-- ─── Functions ───────────────────────────────────────────────

-- Check if user has specific permission in a community
CREATE OR REPLACE FUNCTION check_community_permission(
  p_user_id uuid, p_community_id bigint, p_permission text
) RETURNS boolean AS $$
DECLARE
  v_override boolean;
  v_role_permissions jsonb;
  v_is_super_admin boolean;
BEGIN
  -- Super admin bypass
  SELECT (platform_role = 'super_admin' OR (super_admin = true)) INTO v_is_super_admin
  FROM profiles WHERE id = p_user_id;
  IF v_is_super_admin THEN RETURN true; END IF;

  -- Check user-specific override
  SELECT granted INTO v_override
  FROM permission_overrides
  WHERE community_id = p_community_id AND user_id = p_user_id AND permission_key = p_permission;
  IF v_override IS NOT NULL THEN RETURN v_override; END IF;

  -- Check role permissions
  SELECT cr.permissions INTO v_role_permissions
  FROM community_members cm
  JOIN community_roles cr ON cr.id = cm.role_id
  WHERE cm.community_id = p_community_id AND cm.user_id = p_user_id;

  RETURN COALESCE((v_role_permissions ->> p_permission)::boolean, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Get all permissions for a user in a community (merged: role + overrides)
CREATE OR REPLACE FUNCTION get_user_permissions(
  p_user_id uuid, p_community_id bigint
) RETURNS jsonb AS $$
DECLARE
  v_role_permissions jsonb;
  v_result jsonb;
  v_override RECORD;
BEGIN
  -- Get role permissions
  SELECT COALESCE(cr.permissions, '{}') INTO v_role_permissions
  FROM community_members cm
  JOIN community_roles cr ON cr.id = cm.role_id
  WHERE cm.community_id = p_community_id AND cm.user_id = p_user_id;

  v_result := COALESCE(v_role_permissions, '{}');

  -- Apply overrides
  FOR v_override IN
    SELECT permission_key, granted FROM permission_overrides
    WHERE community_id = p_community_id AND user_id = p_user_id
  LOOP
    v_result := jsonb_set(v_result, ARRAY[v_override.permission_key], to_jsonb(v_override.granted));
  END LOOP;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ─── Trigger: Auto-create system roles on new community ──────

CREATE OR REPLACE FUNCTION create_default_community_roles()
RETURNS trigger AS $$
BEGIN
  INSERT INTO community_roles (community_id, name, slug, description, hierarchy_level, is_system, permissions, color) VALUES
  (NEW.id, 'Owner', 'owner', 'Full control over the community', 100, true,
   '{"manage_questions":true,"manage_tags":true,"manage_templates":true,"manage_media":true,"request_ai_generation":true,"manage_announcements":true,"manage_events":true,"manage_content":true,"moderate_chat":true,"view_members":true,"manage_members":true,"assign_roles":true,"invite_members":true,"manage_settings":true,"manage_embed":true,"manage_subscribers":true,"manage_forms":true,"manage_tiers":true,"regenerate_invite":true,"view_analytics":true,"view_site_analytics":true,"manage_webhooks":true,"manage_roles":true,"transfer_ownership":true,"delete_community":true,"manage_pages":true,"manage_danger_zone":true}',
   '#041E42'),
  (NEW.id, 'Commissioner', 'commissioner', 'Manages community operations', 75, true,
   '{"manage_questions":true,"manage_tags":true,"manage_templates":true,"manage_media":true,"request_ai_generation":true,"manage_announcements":true,"manage_events":true,"manage_content":true,"moderate_chat":true,"view_members":true,"manage_members":true,"assign_roles":true,"invite_members":true,"manage_settings":true,"manage_embed":true,"manage_subscribers":true,"manage_forms":true,"regenerate_invite":true,"view_analytics":true,"view_site_analytics":true,"manage_webhooks":true,"manage_pages":true}',
   '#2E86AB'),
  (NEW.id, 'Moderator', 'moderator', 'Manages content and questions', 50, true,
   '{"manage_questions":true,"manage_tags":true,"manage_templates":true,"manage_media":true,"request_ai_generation":true,"moderate_chat":true,"view_members":true,"view_analytics":true}',
   '#A23B72'),
  (NEW.id, 'Member', 'member', 'Community member', 0, true, '{}', '#54585A');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_community_created_roles ON communities;
CREATE TRIGGER on_community_created_roles
  AFTER INSERT ON communities
  FOR EACH ROW EXECUTE FUNCTION create_default_community_roles();

-- ─── Trigger: Default role_id on member join ─────────────────

CREATE OR REPLACE FUNCTION set_default_member_role()
RETURNS trigger AS $$
BEGIN
  IF NEW.role_id IS NULL THEN
    SELECT id INTO NEW.role_id
    FROM community_roles
    WHERE community_id = NEW.community_id AND slug = COALESCE(NEW.role, 'member') AND is_system = true
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_member_join_set_role ON community_members;
CREATE TRIGGER on_member_join_set_role
  BEFORE INSERT ON community_members
  FOR EACH ROW EXECUTE FUNCTION set_default_member_role();

-- ─── RLS Policies ────────────────────────────────────────────

ALTER TABLE community_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permission_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE permission_audit_log ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS "community_roles_select" ON community_roles;
DROP POLICY IF EXISTS "community_roles_insert" ON community_roles;
DROP POLICY IF EXISTS "community_roles_update" ON community_roles;
DROP POLICY IF EXISTS "community_roles_delete" ON community_roles;
DROP POLICY IF EXISTS "overrides_select" ON permission_overrides;
DROP POLICY IF EXISTS "overrides_insert" ON permission_overrides;
DROP POLICY IF EXISTS "overrides_update" ON permission_overrides;
DROP POLICY IF EXISTS "overrides_delete" ON permission_overrides;
DROP POLICY IF EXISTS "audit_select" ON permission_audit_log;
DROP POLICY IF EXISTS "audit_insert" ON permission_audit_log;

-- community_roles: readable by community members, writable by owners
CREATE POLICY "community_roles_select" ON community_roles FOR SELECT USING (
  EXISTS (SELECT 1 FROM community_members WHERE community_id = community_roles.community_id AND user_id = auth.uid())
);
CREATE POLICY "community_roles_insert" ON community_roles FOR INSERT WITH CHECK (
  check_community_permission(auth.uid(), community_id, 'manage_roles')
);
CREATE POLICY "community_roles_update" ON community_roles FOR UPDATE USING (
  check_community_permission(auth.uid(), community_id, 'manage_roles')
);
CREATE POLICY "community_roles_delete" ON community_roles FOR DELETE USING (
  check_community_permission(auth.uid(), community_id, 'manage_roles') AND is_system = false
);

-- permission_overrides: readable/writable by commissioner+
CREATE POLICY "overrides_select" ON permission_overrides FOR SELECT USING (
  check_community_permission(auth.uid(), community_id, 'assign_roles')
);
CREATE POLICY "overrides_insert" ON permission_overrides FOR INSERT WITH CHECK (
  check_community_permission(auth.uid(), community_id, 'assign_roles')
);
CREATE POLICY "overrides_update" ON permission_overrides FOR UPDATE USING (
  check_community_permission(auth.uid(), community_id, 'assign_roles')
);
CREATE POLICY "overrides_delete" ON permission_overrides FOR DELETE USING (
  check_community_permission(auth.uid(), community_id, 'assign_roles')
);

-- audit_log: readable by commissioner+, system insert only
CREATE POLICY "audit_select" ON permission_audit_log FOR SELECT USING (
  check_community_permission(auth.uid(), community_id, 'view_analytics')
);
CREATE POLICY "audit_insert" ON permission_audit_log FOR INSERT WITH CHECK (
  auth.uid() = actor_id
);
