# Player Retention Metrics — Claude Code Prompt

Copy everything below and paste into Claude Code:

---

cd ~/trivia-app && cat << 'PROMPT'

## Task: Player Retention Metrics Card

Add a "Player Retention" card to the DashboardTab in the embed admin panel (`apps/quiz-embed/src/admin/tabs/DashboardTab.js`). This is a quick addition — business tier only, inserted alongside the existing engagement analytics.

### What to add

A new card in the business-tier engagement section (around line 242, between the EngagementTimeline and QuickInsights components) showing:

**Player Retention Card — "Player Retention"**
- **Returning Players** — count of unique user_ids who played 2+ games in the last 30 days
- **New Players** — count of unique user_ids whose first game (MIN created_at) is within the last 7 days
- **Retention Rate** — returning players / total unique players last 30 days × 100, shown as a percentage
- **Return Frequency** — average games per returning player (total games last 30 days / returning players count)

### Data Fetching

Add to the existing `fetchDashboardData` function inside the `if (tierIsBusiness)` block. Use the games data that's already being fetched:

```javascript
// Player retention — compute from allGames (already fetched)
const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();

// Get all games from last 30 days for this community
const { data: recentPlayerGames } = await supabase
  .from('games')
  .select('user_id, created_at')
  .eq('community_id', community.id)
  .gte('created_at', thirtyDaysAgo);

const playerGames30d = recentPlayerGames || [];

// Count games per player
const playerCounts = {};
const playerFirstGame = {};
playerGames30d.forEach(g => {
  playerCounts[g.user_id] = (playerCounts[g.user_id] || 0) + 1;
  if (!playerFirstGame[g.user_id] || g.created_at < playerFirstGame[g.user_id]) {
    playerFirstGame[g.user_id] = g.created_at;
  }
});

const totalPlayers30d = Object.keys(playerCounts).length;
const returningPlayers = Object.values(playerCounts).filter(c => c >= 2).length;
const newPlayers = Object.entries(playerFirstGame).filter(([_, first]) => first >= sevenDaysAgo).length;
const retentionRate = totalPlayers30d > 0 ? Math.round(returningPlayers / totalPlayers30d * 100) : 0;
const returnFrequency = returningPlayers > 0
  ? (playerGames30d.filter(g => playerCounts[g.user_id] >= 2).length / returningPlayers).toFixed(1)
  : 0;
```

Add these to the engagement state:
```javascript
setEngagement(prev => ({
  ...prev,
  returningPlayers,
  newPlayers,
  totalPlayers30d,
  retentionRate,
  returnFrequency,
}));
```

### Rendering

Insert a `<PlayerRetention engagement={engagement} />` component between `<EngagementTimeline>` and `<QuickInsights>` (around line 245).

Create the component inline in the same file (follow the pattern of EngagementTimeline and QuickInsights sub-components):

```jsx
function PlayerRetention({ engagement }) {
  if (!engagement) return null;

  const metrics = [
    {
      label: 'Returning Players',
      value: engagement.returningPlayers || 0,
      subtitle: '2+ games in 30d',
      color: '#059669',
      icon: '🔄',
    },
    {
      label: 'New Players',
      value: engagement.newPlayers || 0,
      subtitle: 'First game in 7d',
      color: '#3B82F6',
      icon: '✨',
    },
    {
      label: 'Retention Rate',
      value: `${engagement.retentionRate || 0}%`,
      subtitle: 'Returning / Total',
      color: engagement.retentionRate >= 50 ? '#059669' : engagement.retentionRate >= 25 ? '#F59E0B' : '#EF4444',
      icon: '📊',
    },
    {
      label: 'Avg Games/Player',
      value: engagement.returnFrequency || '0',
      subtitle: 'Returning players',
      color: '#8B5CF6',
      icon: '🎯',
    },
  ];

  return (
    <div style={{ background: '#FFFFFF', borderRadius: '8px', border: '1px solid #E5E7EB', padding: '20px', marginBottom: '1.5rem' }}>
      <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#111827', margin: '0 0 16px 0' }}>
        🔁 Player Retention
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
        {metrics.map(m => (
          <div key={m.label} style={{
            padding: '14px',
            borderRadius: '8px',
            border: '1px solid #E5E7EB',
            background: m.color + '08',
          }}>
            <div style={{ fontSize: '0.75rem', color: '#6B7280', marginBottom: '4px' }}>{m.icon} {m.label}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: m.color }}>{m.value}</div>
            <div style={{ fontSize: '0.7rem', color: '#9CA3AF' }}>{m.subtitle}</div>
          </div>
        ))}
      </div>
      {engagement.totalPlayers30d === 0 && (
        <div style={{ textAlign: 'center', padding: '8px 0 0', fontSize: '0.8rem', color: '#9CA3AF' }}>
          No player data in the last 30 days
        </div>
      )}
    </div>
  );
}
```

### Also add to QuickInsights

Add a retention insight to the existing QuickInsights component (around line 445):

```javascript
if (engagement.retentionRate >= 50) {
  insights.push({ icon: '🔁', text: `Strong retention: ${engagement.retentionRate}% of players return for more` });
} else if (engagement.retentionRate > 0 && engagement.retentionRate < 25) {
  insights.push({ icon: '⚠️', text: `Low retention (${engagement.retentionRate}%) — consider scheduled quizzes or announcements to bring players back` });
}
if (engagement.newPlayers > 0) {
  insights.push({ icon: '✨', text: `${engagement.newPlayers} new player${engagement.newPlayers !== 1 ? 's' : ''} this week` });
}
```

### Files to modify

- `apps/quiz-embed/src/admin/tabs/DashboardTab.js` — add retention query, PlayerRetention component, QuickInsights additions

### That's it — single file change, ~80 lines of new code.

PROMPT