-- Temporary function to query multiplayer RLS policies
CREATE OR REPLACE FUNCTION public.temp_get_mp_policies()
RETURNS TABLE(tablename text, policyname text, cmd text, qual text, with_check text) AS $$
  SELECT tablename::text, policyname::text, cmd::text, qual::text, with_check::text
  FROM pg_policies
  WHERE tablename IN ('multiplayer_rooms', 'multiplayer_participants', 'multiplayer_answers', 'multiplayer_questions')
  ORDER BY tablename, cmd;
$$ LANGUAGE sql SECURITY DEFINER;
