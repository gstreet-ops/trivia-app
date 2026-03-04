# Streak Tracking + Badges — Claude Code Prompt

Copy everything below and paste into Claude Code:

---

cd ~/trivia-app && cat << 'PROMPT'

## Task: Daily Streak Tracking with Visual Indicators and New Badges

Add Duolingo/Wordle-style daily play streaks. Players who play at least one game per day build a streak. Streaks are displayed on the Dashboard, user profiles, and unlock new badges.

### Architecture

**No new tables needed.** Streaks are computed from the existing `games` table (`created_at` grouped by date) and cached in two new columns on `profiles`. This avoids an extra table and keeps it simple.

### Step 1: Database Migration

Run in Supabase SQL Editor:

```sql
-- Add streak columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS current_streak integer NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS best_streak integer NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_played_date date;

-- Index for quick streak display
CREATE INDEX IF NOT EXISTS idx_profiles_streak ON profiles(current_streak DESC) WHERE current_streak > 0;
```

### Step 2: Streak Calculation Utility

Create `src/utils/streakTracker.js`:

```javascript
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
  // Fetch all game dates for this user (just created_at, lightweight)
  const { data: games, error } = await supabase
    .from('games')
    .select('created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1000);

  if (error || !games || games.length === 0) {
    // No games = no streak
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
    // Streak is active — count consecutive days backward
    let checkDate = new Date(sortedDates[0]);
    for (const dateStr of sortedDates) {
      const expected = checkDate.toLocaleDateString('en-CA');
      if (dateStr === expected) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (dateStr < expected) {
        break; // gap found
      }
    }
  }

  // Calculate best streak ever (scan all dates chronologically)
  const chronological = [...dateSet].sort(); // oldest first
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

  // Update profiles
  await supabase.from('profiles').update({
    current_streak: currentStreak,
    best_streak: bestStreak,
    last_played_date: sortedDates[0],
  }).eq('id', userId);

  return { currentStreak, bestStreak, lastPlayedDate: sortedDates[0] };
}

/**
 * Quick check: is streak still active? (played today or yesterday)
 */
export function isStreakActive(lastPlayedDate) {
  if (!lastPlayedDate) return false;
  const today = new Date().toLocaleDateString('en-CA');
  const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('en-CA');
  return lastPlayedDate === today || lastPlayedDate === yesterday;
}

/**
 * Is streak at risk? (last played yesterday, not yet today)
 */
export function isStreakAtRisk(lastPlayedDate) {
  if (!lastPlayedDate) return false;
  const today = new Date().toLocaleDateString('en-CA');
  const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('en-CA');
  return lastPlayedDate === yesterday && lastPlayedDate !== today;
}
```

### Step 3: Call updateStreak after every game

In `src/components/ResultsScreen.js` (or wherever the game completion happens and the game is inserted into the DB), add a call to updateStreak after the game is saved:

```javascript
import { updateStreak } from '../utils/streakTracker';

// After game insert succeeds:
updateStreak(user.id, supabase).catch(() => {}); // fire-and-forget
```

Also call it in `ScheduledQuizPlay.js` after a scheduled quiz attempt completes.

Also call it in `MultiplayerLobby.js` after a multiplayer game completes (if individual games are saved).

### Step 4: Dashboard — Streak Display Widget

In `Dashboard.js`, add a streak card to the stats grid. Fetch streak data from the profile:

Add to the profile fetch (around line 31 where username is fetched):
```javascript
const { data } = await supabase
  .from('profiles')
  .select('username, role, super_admin, current_streak, best_streak, last_played_date')
  .eq('id', user.id)
  .single();
```

Add a new stat card after the existing 3 (Games, Avg Score, Best):

```jsx
<div className={`stat-card streak-card ${streakActive ? 'streak-active' : streakAtRisk ? 'streak-risk' : ''}`}>
  <div className="stat-icon"><FlameIcon size={22} /></div>
  <div className="stat-number">{currentStreak}</div>
  <div className="stat-label">
    {streakActive ? 'Day Streak 🔥' : 'Day Streak'}
  </div>
  {streakAtRisk && (
    <div className="streak-warning">Play today to keep it!</div>
  )}
</div>
```

**Streak card states:**
- **Active (played today):** Orange/flame border, fire emoji, solid number
- **At risk (played yesterday but not today):** Amber pulsing border, "Play today to keep it!" warning
- **Broken (last played 2+ days ago):** Gray, streak shows 0
- **Best streak** shown as small text below: "Best: {bestStreak} days"

### Step 5: Streak Visual — Dot Calendar (last 30 days)

Add a small visual below the streak card showing the last 30 days as dots:

```jsx
<div className="streak-calendar">
  {last30Days.map(date => (
    <div
      key={date}
      className={`streak-dot ${playedDates.has(date) ? 'played' : ''} ${date === today ? 'today' : ''}`}
      title={date}
    />
  ))}
</div>
```

**CSS:**
- 30 small circles in a row (wrapping if needed)
- Played days: filled with flame orange (#F97316)
- Unplayed days: light gray border
- Today: slightly larger with a ring
- This gives a GitHub-contribution-graph feel but simpler

To populate `playedDates`, fetch unique dates from games:
```javascript
const { data: recentGames } = await supabase
  .from('games')
  .select('created_at')
  .eq('user_id', user.id)
  .gte('created_at', thirtyDaysAgo.toISOString())
  .order('created_at', { ascending: false });
const playedDates = new Set(recentGames?.map(g => new Date(g.created_at).toLocaleDateString('en-CA')) || []);
```

### Step 6: New Streak Badges

Add 3 new streak-based badges to the achievement system.

**In `src/components/Icons.js`** — add FlameIcon if missing:
```javascript
export const FlameIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z"/>
  </svg>
);
```

**In `src/components/Achievements.js`** — add to BADGES:
```javascript
streak_3: { id: 'streak_3', name: 'On Fire', icon: <FlameIcon size={24} />, description: 'Play 3 days in a row', color: '#F97316' },
streak_7: { id: 'streak_7', name: 'Week Warrior', icon: <FlameIcon size={24} />, description: 'Play 7 days in a row', color: '#EF4444' },
streak_30: { id: 'streak_30', name: 'Unstoppable', icon: <FlameIcon size={24} />, description: 'Play 30 days in a row', color: '#DC2626' },
```

**In `src/utils/achievementChecker.js`** — add streak checks.

The achievementChecker currently only queries `games`. It needs to also read the streak from `profiles`:

```javascript
// Add near the top of checkAchievements, after fetching games:
const { data: profile } = await supabase
  .from('profiles')
  .select('best_streak')
  .eq('id', userId)
  .single();

// Add streak badge checks (before the Grand Master check):
if (profile?.best_streak >= 3) earnedBadges.push('streak_3');
if (profile?.best_streak >= 7) earnedBadges.push('streak_7');
if (profile?.best_streak >= 30) earnedBadges.push('streak_30');
```

**IMPORTANT:** Update the Grand Master check to still only require the original 6 badges (don't add streak badges to the Grand Master requirement — that would be too hard).

### Step 7: User Profile — Show Streak

In `UserProfile.js` (when viewing another player's profile), show their current streak and best streak if they have `profile_visibility = true`:

Add to the profile data fetch:
```javascript
.select('username, profile_visibility, current_streak, best_streak')
```

Display near their stats:
```jsx
{profile.current_streak > 0 && (
  <div className="profile-streak">
    🔥 {profile.current_streak} day streak (Best: {profile.best_streak})
  </div>
)}
```

### Step 8: Leaderboard — Optional Streak Column

In the Dashboard leaderboard, optionally show streak as an extra column:
```jsx
<th>Streak</th>
// ...
<td>{player.current_streak > 0 ? `🔥 ${player.current_streak}` : '—'}</td>
```

This requires adding `current_streak` to the leaderboard query. Only add this if the leaderboard query joins profiles — check the existing query first. If it doesn't join profiles, skip this step to keep it simple.

### Step 9: Sync achievementChecker between trivia-app and trivia-monorepo

**CRITICAL:** The `trivia-app` repo has Grand Master + Community Champion badges but the `trivia-monorepo` copy does NOT. When updating achievementChecker.js:

1. First update `trivia-app/src/utils/achievementChecker.js` (this is the live deployed one)
2. Then copy the updated file to `trivia-monorepo/apps/trivia-app/src/utils/achievementChecker.js`
3. Same for Achievements.js and Icons.js — update in trivia-app first, then sync to monorepo

### Files to create
- `src/utils/streakTracker.js` — streak calculation + update logic

### Files to modify
- `src/components/Icons.js` — add FlameIcon
- `src/components/Achievements.js` — add 3 streak badges
- `src/utils/achievementChecker.js` — add streak checks + profile query
- `src/components/Dashboard.js` — streak stat card + 30-day dot calendar
- `src/components/Dashboard.css` — streak card styling (flame theme)
- `src/components/ResultsScreen.js` — call updateStreak after game save
- `src/components/ScheduledQuizPlay.js` — call updateStreak after completion
- `src/components/UserProfile.js` — show streak on profile
- Optionally: `src/components/MultiplayerLobby.js` — call updateStreak

### CSS Guidelines
- Streak active: border-color #F97316 (orange), subtle glow
- Streak at risk: pulsing amber border animation
- Streak dots: 10px circles, 2px gap, orange fill for played days
- Fire emoji or FlameIcon for visual identity
- Follow existing Dashboard.css patterns for stat cards

PROMPT