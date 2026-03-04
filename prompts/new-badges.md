# New Badges — Claude Code Prompt

Copy everything below and paste into Claude Code:

---

cd ~/trivia-app && cat << 'PROMPT'

## Task: Add Grand Master + Community Engagement Badges

Add two new achievement badges to the trivia platform.

### Badge 1: Grand Master
- **ID:** `grand_master`
- **Name:** Grand Master
- **Description:** Earn all 6 original badges
- **Color:** `#041E42` (navy — Georgetown primary)
- **Icon:** Use a crown/shield icon — add a `CrownIcon` to `src/components/Icons.js` (SVG, stroke-based, `currentColor`, matching existing icon style)
- **Logic:** Player has earned all 6 existing badges: `perfect_score`, `five_games`, `ten_games`, `category_master`, `speed_demon`, `triple_perfect`

### Badge 2: Community Champion
- **ID:** `community_champion`
- **Name:** Community Champion
- **Description:** Play 25 community games
- **Color:** `#059669` (green)
- **Icon:** Use a people/community icon — add a `UsersGroupIcon` to `src/components/Icons.js`
- **Logic:** Player has 25+ games where `community_id IS NOT NULL`

### Files to Modify

#### 1. `src/components/Icons.js`
Add two new SVG icon components:
- `CrownIcon` — simple crown shape, stroke-based
- `UsersGroupIcon` — three-person group icon, stroke-based

Both should follow the existing pattern: `({ size = 20, className = '' })` with `currentColor` fill/stroke.

#### 2. `src/utils/achievementChecker.js`
Add two new checks at the end (before `return earnedBadges`):

```js
// Community Champion: 25+ community games
const communityGames = games.filter(g => g.community_id != null).length;
if (communityGames >= 25) earnedBadges.push('community_champion');

// Grand Master: earned all 6 original badges
const originalBadges = ['perfect_score', 'five_games', 'ten_games', 'category_master', 'speed_demon', 'triple_perfect'];
if (originalBadges.every(b => earnedBadges.includes(b))) earnedBadges.push('grand_master');
```

Note: Grand Master check must come AFTER all other badge checks since it depends on them.

#### 3. `src/components/Achievements.js`
Add the two new badges to the `BADGES` object:

```js
community_champion: { id: 'community_champion', name: 'Community Champion', icon: <UsersGroupIcon size={24} />, description: 'Play 25 community games', color: '#059669' },
grand_master: { id: 'grand_master', name: 'Grand Master', icon: <CrownIcon size={24} />, description: 'Earn all 6 original badges', color: '#041E42' },
```

Add the imports for the new icons at the top.

#### 4. `src/components/Achievements.css`
No changes needed — the existing grid layout handles additional cards automatically.

### Verification
After implementing:
1. Build should compile with zero errors
2. Achievements grid should show 8 badges (6 original + 2 new)
3. Grand Master should appear locked until all 6 originals are earned
4. Community Champion should appear locked until 25 community games are played
5. Both new badges should display in UserProfile.js and Dashboard.js (they already use the Achievements component with earnedBadges prop)

### Update docs
In `docs/ROADMAP.md`, mark these as complete:
- [x] Grand Master badge — earn all 6 badges
- [x] Community engagement badge — play 25 community games

PROMPT
