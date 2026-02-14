export const checkAchievements = async (userId, supabase) => {
  const earnedBadges = [];
  const { data: games } = await supabase.from('games').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  if (!games || games.length === 0) return earnedBadges;
  if (games.some(g => g.score === g.total_questions && g.total_questions === 10)) earnedBadges.push('perfect_score');
  if (games.length >= 5) earnedBadges.push('five_games');
  if (games.length >= 10) earnedBadges.push('ten_games');
  const categoryPerfects = {};
  games.forEach(g => { if (g.score === g.total_questions && g.total_questions === 10) categoryPerfects[g.category] = (categoryPerfects[g.category] || 0) + 1; });
  if (Object.values(categoryPerfects).some(count => count >= 3)) earnedBadges.push('category_master');
  const gamesByDate = {};
  games.forEach(g => { const date = new Date(g.created_at).toDateString(); gamesByDate[date] = (gamesByDate[date] || 0) + 1; });
  if (Object.values(gamesByDate).some(count => count >= 5)) earnedBadges.push('speed_demon');
  const perfectCount = games.filter(g => g.score === g.total_questions && g.total_questions === 10).length;
  if (perfectCount >= 3) earnedBadges.push('triple_perfect');
  return earnedBadges;
};
