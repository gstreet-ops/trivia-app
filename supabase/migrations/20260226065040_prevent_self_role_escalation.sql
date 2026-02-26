-- Prevent users from escalating their own platform_role or super_admin status
CREATE OR REPLACE FUNCTION prevent_self_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.platform_role IS DISTINCT FROM OLD.platform_role
      OR NEW.super_admin IS DISTINCT FROM OLD.super_admin)
     AND NEW.id = auth.uid()
  THEN
    RAISE EXCEPTION 'Cannot modify your own role or admin status';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER prevent_self_role_escalation_trigger
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_self_role_escalation();
