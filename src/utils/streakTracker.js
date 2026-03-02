/**
 * Streak Tracker
 *
 * Computes the current and best streak from game history,
 * then updates the profiles table.
 *
 * A "streak day" = at least 1 game played on that calendar date (user's local time).
 * Streak breaks if a calendar day is missed.
 */

export async function updateStreak(userId, supabase) {
  const { data: games, error } = await supabase
    .from('games')
    .select('created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1000);

  if (error || !games || games.length === 0) {
    await supabase.from('profiles').update({
      current_streak: 0,
      best_streak: 0,
      last_played_date: null,
    }).eq('id', userId);
    return { currentStreak: 0, bestStreak: 0 };
  }

  // Convert to unique calendar dates (local time), sorted descending
  const dateSet = new Set();
  games.forEach(g => {
    const d = new Date(g.created_at);
    dateSet.add(d.toLocaleDateString('en-CA')); // YYYY-MM-DD format
  });
  const sortedDates = [...dateSet].sort().reverse(); // newest first

  // Calculate current streak (must include today or yesterday to be active)
  const today = new Date().toLocaleDateString('en-CA');
  const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('en-CA');

  let currentStreak = 0;
  if (sortedDates[0] === today || sortedDates[0] === yesterday) {
    let checkDate = new Date(sortedDates[0]);
    for (const dateStr of sortedDates) {
      const expected = checkDate.toLocaleDateString('en-CA');
      if (dateStr === expected) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (dateStr < expected) {
        break;
      }
    }
  }

  // Calculate best streak ever (scan all dates chronologically)
  const chronological = [...dateSet].sort();
  let bestStreak = 0;
  let runningStreak = 1;
  for (let i = 1; i < chronological.length; i++) {
    const prev = new Date(chronological[i - 1]);
    const curr = new Date(chronological[i]);
    const diffDays = Math.round((curr - prev) / 86400000);
    if (diffDays === 1) {
      runningStreak++;
    } else {
      bestStreak = Math.max(bestStreak, runningStreak);
      runningStreak = 1;
    }
  }
  bestStreak = Math.max(bestStreak, runningStreak, currentStreak);

  await supabase.from('profiles').update({
    current_streak: currentStreak,
    best_streak: bestStreak,
    last_played_date: sortedDates[0],
  }).eq('id', userId);

  return { currentStreak, bestStreak, lastPlayedDate: sortedDates[0] };
}

export function isStreakActive(lastPlayedDate) {
  if (!lastPlayedDate) return false;
  const today = new Date().toLocaleDateString('en-CA');
  const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('en-CA');
  return lastPlayedDate === today || lastPlayedDate === yesterday;
}

export function isStreakAtRisk(lastPlayedDate) {
  if (!lastPlayedDate) return false;
  const today = new Date().toLocaleDateString('en-CA');
  const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('en-CA');
  return lastPlayedDate === yesterday && lastPlayedDate !== today;
}
