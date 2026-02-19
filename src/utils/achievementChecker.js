export const checkAchievements = async (userId, supabase) => {
  const earnedBadges = [];
  const { data: games } = await supabase.from('games').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  if (!games || games.length === 0) return earnedBadges;

  // Perfect score: 100% on any game (any question count)
  if (games.some(g => g.total_questions > 0 && g.score === g.total_questions)) earnedBadges.push('perfect_score');

  // Games played milestones
  if (games.length >= 5) earnedBadges.push('five_games');
  if (games.length >= 10) earnedBadges.push('ten_games');

  // Category master: 3 perfect scores in the same category (any question count)
  const categoryPerfects = {};
  games.forEach(g => {
    if (g.total_questions > 0 && g.score === g.total_questions) {
      categoryPerfects[g.category] = (categoryPerfects[g.category] || 0) + 1;
    }
  });
  if (Object.values(categoryPerfects).some(count => count >= 3)) earnedBadges.push('category_master');

  // Speed demon: 5 games in one day
  const gamesByDate = {};
  games.forEach(g => { const date = new Date(g.created_at).toDateString(); gamesByDate[date] = (gamesByDate[date] || 0) + 1; });
  if (Object.values(gamesByDate).some(count => count >= 5)) earnedBadges.push('speed_demon');

  // Hat trick: 3 perfect scores total (any question count)
  const perfectCount = games.filter(g => g.total_questions > 0 && g.score === g.total_questions).length;
  if (perfectCount >= 3) earnedBadges.push('triple_perfect');

  return earnedBadges;
};
