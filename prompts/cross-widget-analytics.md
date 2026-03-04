# Cross-Widget Analytics — Claude Code Prompt

Copy everything below and paste into Claude Code:

---

cd ~/trivia-app && cat << 'PROMPT'

## Task: Add Cross-Widget Engagement Analytics to AnalyticsTab

Build a unified engagement analytics section inside `apps/quiz-embed/src/admin/tabs/AnalyticsTab.js` that ties together data from ALL widget types. This is gated to **business+ tier** communities.

### Context
- Current AnalyticsTab renders `CommunityAnalytics` (quiz stats) + `SiteTrafficAnalytics` (page_views)
- DashboardTab already fetches cross-widget summary stats (subscribers, forms, events, page_views) but only shows simple stat cards + a combined timeline
- We need a DEDICATED analytics view that goes deeper with per-widget breakdowns, conversion funnels, and export

### Data Sources (all tables exist, all have community_id FK as bigint)
1. `games` — quiz completions (score, total_questions, user_id, source, host_origin, created_at)
2. `subscribers` — email signups (email, source_url, status, subscribed_at)
3. `form_submissions` — contact forms (form_name, data, status, created_at)
4. `community_events` — events (title, starts_at)
5. `page_views` — analytics beacon (url, referrer, device_type, session_hash, created_at)
6. `community_announcements` — banner views (track via page_views referrer or separate)

### What to Build

Create a new component `CrossWidgetAnalytics.js` in `apps/quiz-embed/src/admin/components/` that renders:

#### 1. Unified Date Range Picker
- Shared across all sections: 7d, 30d, 90d, All time
- All queries filter by this range

#### 2. Engagement Overview Cards (single row)
- Page Views (from page_views)
- Quiz Completions (from games where community_id matches)
- Email Signups (from subscribers)
- Form Submissions (from form_submissions)
- Each card shows: count, % change vs previous period (week-over-week for 7d, month-over-month for 30d)

#### 3. Stacked Engagement Timeline
- X axis: dates in selected range
- Y axis: stacked bars with different colors per widget type:
  - Navy #041E42 = quiz completions
  - Blue #4A90D9 = page views (scaled down, show /10 if much larger)
  - Green #059669 = email signups
  - Purple #7C3AED = form submissions
- Use the shared `VerticalBarChart` from `@trivia-monorepo/shared` or build a simple stacked version inline
- Legend below chart

#### 4. Conversion Funnel
- Simple horizontal funnel visualization:
  Page Views → Quiz Starts → Quiz Completions → Subscribes
- Show count at each stage and drop-off % between stages
- Quiz starts = games count, Quiz completions = games where score > 0, Subscribes = subscribers in period
- Style: horizontal bars getting narrower, with percentages between

#### 5. Widget Performance Table
- Table with columns: Widget Type | Impressions/Uses | Conversions | Conversion Rate
- Rows: Quiz Embed, Email Collector, Contact Form, Analytics Beacon, Banner, Events
- For quiz: uses = games count, conversion = avg score > 70%
- For email: uses = page views with subscribe widget, conversions = actual subscribers
- For contact: uses = page views with contact widget, conversions = form submissions
- For beacon: just show total page views
- For banner: show announcement view count (count announcements × page views, approximate)
- For events: show upcoming event count

#### 6. Top Performing Pages
- Combined view: for each tracked URL, show page views + any quiz completions + any form submissions from that page
- Table: Page URL | Views | Quizzes | Signups | Forms
- Data from: page_views.url, games.host_origin, subscribers.source_url

#### 7. Export Button
- "Export All Data (CSV)" button
- Generates CSV with columns: date, page_views, quiz_completions, email_signups, form_submissions
- One row per day in the selected date range

### Integration
1. In `AnalyticsTab.js`, add CrossWidgetAnalytics BETWEEN the CommunityAnalytics and SiteTrafficAnalytics sections
2. Only render if community tier is business+:
   ```js
   const TIER_LEVELS = { lite: 0, pro: 1, business: 2, platform: 3 };
   const isBusiness = (TIER_LEVELS[community?.community_tier] || 0) >= 2;
   ```
3. Pass `community` prop

### Styling
- Use Georgetown palette: navy #041E42, gray #54585A, blue #4A90D9, green #059669, purple #7C3AED
- Match existing admin panel card styles (white bg, 1px #E5E7EB border, 8px radius)
- Responsive grid layouts
- Import shared chart components from `@trivia-monorepo/shared` where available
- Use inline styles (consistent with rest of admin panel)

### Technical Notes
- communities.id is bigint, NOT uuid — all .eq('community_id', community.id) queries are correct
- Import supabase from `../../supabaseClient`
- Use Promise.all for parallel data fetching
- Handle loading and empty states gracefully
- Limit queries to 10000 rows with .limit(10000)
- Use useMemo for computed values, useCallback for fetch functions

### Files to Create/Modify
- CREATE: `apps/quiz-embed/src/admin/components/CrossWidgetAnalytics.js`
- MODIFY: `apps/quiz-embed/src/admin/tabs/AnalyticsTab.js` (add import + render)

### Success Criteria
- All 7 sections render with real data from Supabase
- Date range picker syncs across all sections
- Period-over-period comparison shows correct % change
- Funnel shows realistic conversion flow
- Export generates valid CSV
- Empty states look clean (no broken layouts when data is sparse)
- Business+ tier gating works correctly

PROMPT
