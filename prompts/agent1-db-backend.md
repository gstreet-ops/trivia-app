# Agent 1: Database & Backend for Granular Permissions

**IMPORTANT: These files DO NOT exist yet. The .claude/context.md previously had incorrect info claiming they were built — that was wrong. You MUST create all files listed below from scratch. Verify with `ls src/contexts/PermissionContext.js` — it will not exist.**

**After creating the migration SQL file, execute it against the remote Supabase DB using:**
```
npx supabase db execute --file supabase/migrations/20260302_granular_permissions.sql
```
The project is already linked (project ref: qxozqgpuzthemsfotmvo).

You are working on the GStreet trivia platform at `~/trivia-app`. React + Supabase. Georgetown colors: navy #041E42, gray #54585A.

## Current State
- `community_members.role` text column: owner/commissioner/moderator/member
- `src/utils/permissions.js` has hardcoded role checks (118 lines) with exports: getPlatformRole, hasPlatformRole, hasCommunityRole, isPlatformAdmin, isSuperAdmin, canManageQuestions, canManageMembers, canManageSettings, canViewAnalytics, canPromoteToCommissioner, canDeleteCommunity, canTransferOwnership
- CommissionerDashboard.js (4,049 lines) uses `userCommunityRole` state + those helpers

## Goal
Create the database schema and backend utilities for a database-driven granular permission system.

**CRITICAL: communities.id is bigint, NOT uuid. All FKs referencing communities must use bigint.**

## Task 1: Create Migration SQL

Create file `supabase/migrations/20260302_granular_permissions.sql` with:

### Tables

```sql
-- Roles per community
CREATE TABLE IF NOT EXISTS community_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id bigint NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  hierarchy_level integer NOT NULL DEFAULT 0,
  is_system boolean NOT NULL DEFAULT false,
  permissions jsonb NOT NULL DEFAULT '{}',
  color text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(community_id, slug)
);

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
  target_role_id uuid REFERENCES community_roles(id) ON DELETE SET NULL,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add role_id FK to community_members
ALTER TABLE community_members ADD COLUMN IF NOT EXISTS role_id uuid REFERENCES community_roles(id);
```

### Indexes
```sql
CREATE INDEX IF NOT EXISTS idx_community_roles_community ON community_roles(community_id);
CREATE INDEX IF NOT EXISTS idx_permission_overrides_community_user ON permission_overrides(community_id, user_id);
CREATE INDEX IF NOT EXISTS idx_permission_audit_community ON permission_audit_log(community_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_members_role_id ON community_members(role_id);
```

### Seed system roles for all existing communities

The 27 permission keys:
- Content: manage_questions, manage_tags, manage_templates, manage_media, request_ai_generation
- Community: manage_announcements, manage_events, manage_content, moderate_chat
- Members: view_members, manage_members, assign_roles, invite_members
- Admin: manage_settings, manage_embed, manage_subscribers, manage_forms, manage_tiers, regenerate_invite, view_analytics, view_site_analytics, manage_webhooks
- Owner-only: manage_roles, transfer_ownership, delete_community, manage_pages, manage_danger_zone

Default permissions:
- **owner** (level 100): ALL 27 = true
- **commissioner** (level 75): All EXCEPT manage_tiers, manage_roles, transfer_ownership, delete_community, manage_danger_zone (22 true)
- **moderator** (level 50): manage_questions, manage_tags, manage_templates, manage_media, request_ai_generation, moderate_chat, view_members, view_analytics (8 true)
- **member** (level 0): empty {}

Use INSERT...SELECT from communities to create 4 system roles per community. Then UPDATE community_members SET role_id by JOINing on community_id and matching role text to slug.

### Functions

```sql
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
```

### Trigger: Auto-create system roles on new community

```sql
CREATE OR REPLACE FUNCTION create_default_community_roles()
RETURNS trigger AS $$
BEGIN
  -- Insert 4 system roles for the new community
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

CREATE TRIGGER on_community_created_roles
  AFTER INSERT ON communities
  FOR EACH ROW EXECUTE FUNCTION create_default_community_roles();
```

### Trigger: Default role_id on member join

```sql
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

CREATE TRIGGER on_member_join_set_role
  BEFORE INSERT ON community_members
  FOR EACH ROW EXECUTE FUNCTION set_default_member_role();
```

### RLS Policies

```sql
ALTER TABLE community_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permission_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE permission_audit_log ENABLE ROW LEVEL SECURITY;

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
```

## Task 2: Rewrite `src/utils/permissions.js`

Keep ALL existing exports unchanged. Add these new exports:

```js
export const PERMISSIONS = {
  manage_questions: 'Add, edit, delete, import questions',
  manage_tags: 'Add and remove question tags',
  manage_templates: 'Create and delete question templates',
  manage_media: 'Upload and delete media library items',
  request_ai_generation: 'Submit AI question generation requests',
  manage_announcements: 'Create, edit, pin, delete announcements',
  manage_events: 'Create, edit, delete community events',
  manage_content: 'Manage content blocks',
  moderate_chat: 'Delete chat messages',
  view_members: 'See member list',
  manage_members: 'Remove members from community',
  assign_roles: 'Change member roles',
  invite_members: 'Send email invitations',
  manage_settings: 'Edit community settings',
  manage_embed: 'Configure embed widget and themes',
  manage_subscribers: 'View and manage email subscribers',
  manage_forms: 'View and manage form submissions',
  manage_tiers: 'Change community tier',
  regenerate_invite: 'Reset invite code',
  view_analytics: 'View community analytics',
  view_site_analytics: 'View page view analytics',
  manage_webhooks: 'Configure webhook URLs',
  manage_roles: 'Create, edit, delete custom roles',
  transfer_ownership: 'Transfer community ownership',
  delete_community: 'Delete the community',
  manage_pages: 'Create and edit community pages',
  manage_danger_zone: 'Access danger zone settings',
};

export const PERMISSION_CATEGORIES = {
  'Content': ['manage_questions', 'manage_tags', 'manage_templates', 'manage_media', 'request_ai_generation'],
  'Community': ['manage_announcements', 'manage_events', 'manage_content', 'moderate_chat'],
  'Members': ['view_members', 'manage_members', 'assign_roles', 'invite_members'],
  'Administration': ['manage_settings', 'manage_embed', 'manage_subscribers', 'manage_forms', 'manage_tiers', 'regenerate_invite', 'view_analytics', 'view_site_analytics', 'manage_webhooks'],
  'Owner': ['manage_roles', 'transfer_ownership', 'delete_community', 'manage_pages', 'manage_danger_zone'],
};

export function hasPermissionFromData(rolePermissions, userOverrides, key) {
  const override = userOverrides?.find(o => o.permission_key === key);
  if (override) return override.granted;
  return rolePermissions?.[key] === true;
}

export function canManageRoles(role) { return hasCommunityRole(role, 'owner'); }
export function canViewRoles(role) { return hasCommunityRole(role, 'commissioner'); }
```

## Task 3: Create `src/contexts/PermissionContext.js`

A React context that fetches the current user's role, permissions, and overrides for the active community.

```js
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { hasPermissionFromData, isSuperAdmin } from '../utils/permissions';

const PermissionContext = createContext(null);

export function PermissionProvider({ userId, communityId, children }) {
  const [role, setRole] = useState(null);        // community_roles row
  const [rolePermissions, setRolePermissions] = useState({});
  const [overrides, setOverrides] = useState([]);  // permission_overrides rows
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  const fetchPermissions = useCallback(async () => {
    if (!userId || !communityId) { setLoading(false); return; }
    try {
      const [{ data: profileData }, { data: memberData }, { data: overrideData }] = await Promise.all([
        supabase.from('profiles').select('platform_role, super_admin, role').eq('id', userId).single(),
        supabase.from('community_members').select('role, role_id, community_roles(*)').eq('community_id', communityId).eq('user_id', userId).single(),
        supabase.from('permission_overrides').select('*').eq('community_id', communityId).eq('user_id', userId),
      ]);
      setProfile(profileData);
      setRole(memberData?.community_roles || null);
      setRolePermissions(memberData?.community_roles?.permissions || {});
      setOverrides(overrideData || []);
    } catch (err) {
      console.error('Permission fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [userId, communityId]);

  useEffect(() => { fetchPermissions(); }, [fetchPermissions]);

  const hasPermission = useCallback((key) => {
    if (isSuperAdmin(profile)) return true;
    return hasPermissionFromData(rolePermissions, overrides, key);
  }, [profile, rolePermissions, overrides]);

  const refresh = useCallback(() => { setLoading(true); fetchPermissions(); }, [fetchPermissions]);

  return (
    <PermissionContext.Provider value={{ role, rolePermissions, overrides, hasPermission, loading, refresh, profile }}>
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermissions() {
  const ctx = useContext(PermissionContext);
  if (!ctx) throw new Error('usePermissions must be used within PermissionProvider');
  return ctx;
}
```

## After all tasks

1. Print the path to the migration SQL file
2. Remind: "Run this SQL in Supabase SQL Editor before testing the frontend"
3. Commit: `git add -A && git commit -m "feat: granular permissions — schema, permissions.js, PermissionContext (Phase 1)"`
