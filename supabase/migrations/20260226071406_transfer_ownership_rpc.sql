-- Atomic community ownership transfer
-- All three updates happen in a single transaction
CREATE OR REPLACE FUNCTION transfer_community_ownership(
  p_community_id uuid,
  p_new_owner_id uuid,
  p_current_owner_id uuid
)
RETURNS void AS $$
BEGIN
  -- Verify caller is the current owner
  IF NOT EXISTS (
    SELECT 1 FROM community_members
    WHERE community_id = p_community_id
      AND user_id = p_current_owner_id
      AND role = 'owner'
  ) THEN
    RAISE EXCEPTION 'Only the current owner can transfer ownership';
  END IF;

  -- Verify new owner is a member of the community
  IF NOT EXISTS (
    SELECT 1 FROM community_members
    WHERE community_id = p_community_id
      AND user_id = p_new_owner_id
  ) THEN
    RAISE EXCEPTION 'Target user is not a member of this community';
  END IF;

  -- Promote new owner
  UPDATE community_members
    SET role = 'owner'
    WHERE community_id = p_community_id AND user_id = p_new_owner_id;

  -- Demote current owner to commissioner
  UPDATE community_members
    SET role = 'commissioner'
    WHERE community_id = p_community_id AND user_id = p_current_owner_id;

  -- Update legacy commissioner_id on the community
  UPDATE communities
    SET commissioner_id = p_new_owner_id
    WHERE id = p_community_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
