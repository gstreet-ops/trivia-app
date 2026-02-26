-- Restrict notification INSERT to platform admins and super_admins only
-- Previously any authenticated user could insert notifications for any user
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;

CREATE POLICY "Admins can insert notifications" ON notifications
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND (profiles.platform_role IN ('admin', 'super_admin') OR profiles.super_admin = true)
    )
  );
