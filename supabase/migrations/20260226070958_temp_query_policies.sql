-- Temporary function to query RLS policies
CREATE OR REPLACE FUNCTION public.temp_get_policies()
RETURNS TABLE(tablename text, policyname text, cmd text, qual text, with_check text) AS $$
  SELECT tablename::text, policyname::text, cmd::text, qual::text, with_check::text
  FROM pg_policies
  WHERE tablename IN ('communities', 'community_members', 'community_questions')
  ORDER BY tablename, cmd;
$$ LANGUAGE sql SECURITY DEFINER;
