-- Harden community_members UPDATE policy:
-- 1. Prevent commissioners from setting role to 'owner' (only owners can do that)
-- 2. Prevent users from updating their own role (self-escalation)

-- Drop the existing policy and recreate with WITH CHECK
DROP POLICY IF EXISTS "Owner and commissioner can update member roles" ON community_members;

CREATE POLICY "Owner and commissioner can update member roles" ON community_members
  FOR UPDATE
  USING (
    community_id IN (
      SELECT cm.community_id FROM community_members cm
      WHERE cm.user_id = auth.uid()
        AND cm.role = ANY (ARRAY['owner', 'commissioner'])
    )
  )
  WITH CHECK (
    -- Cannot update your own role
    user_id != auth.uid()
    -- Only owners can assign the 'owner' role
    AND (
      role != 'owner'
      OR community_id IN (
        SELECT cm.community_id FROM community_members cm
        WHERE cm.user_id = auth.uid() AND cm.role = 'owner'
      )
    )
    -- Role must be a valid value
    AND role = ANY (ARRAY['owner', 'commissioner', 'moderator', 'member'])
  );

-- Clean up temp function from previous migration
DROP FUNCTION IF EXISTS public.temp_get_policies();
