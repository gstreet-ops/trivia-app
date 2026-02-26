# Code Review Checklist

## Security
- [ ] Service role key exposure — confirm supabaseClient.js uses anon key only
- [ ] .env in git — confirm .env is in .gitignore and not committed
- [ ] RLS on all tables — every table has RLS enabled with appropriate policies
- [ ] Community leaderboard RLS — policy checks community_id IN (SELECT community_id FROM community_members WHERE user_id = auth.uid())
- [ ] Admin route guards — protected routes check user.role / super_admin before rendering
- [ ] Rate limiting on submissions — custom_questions and user-writable tables protected against spam
- [ ] Commissioner ownership checks — commissioner actions verify commissioner_id = auth.uid() server-side
- [ ] Multiplayer room access — players can only read/write their own room data

## Data Integrity
- [ ] Division by zero — all score/total_questions calculations guard against total_questions = 0
- [ ] Achievement deduplication — badge records have unique constraint on (user_id, badge_type)
- [ ] Duplicate community membership — error code 23505 handled gracefully
- [ ] CSV upload limits — client-side max file size 1MB and max row count 500 enforced
- [ ] Version history cap — version_history array capped at 10 entries

## React / Code Quality
- [ ] Achievement badge logic — checks score === total_questions not total_questions === 10
- [ ] Missing error boundaries — global error boundary wraps app
- [ ] Loading states — all async Supabase calls have loading indicators
- [ ] Unused state/effects — no stale useEffect dependencies or memory leaks
- [ ] Key props in lists — all .map() renders use stable unique key props
- [ ] Console errors — no unhandled promise rejections or React warnings

## Performance
- [ ] N+1 queries — no components fetching inside loops
- [ ] CommissionerDashboard — check for redundant fetches on tab switches
- [ ] Leaderboard staleness — community_leaderboards refresh strategy documented
- [ ] Large question banks — Questions tab handles 500+ rows without freezing
- [ ] Recharts re-renders — chart components memoized appropriately

## UX / Accessibility
- [ ] Confirmation on destructive actions — bulk delete and member removal show confirmation modal
- [ ] Color-independent feedback — correct/wrong uses symbols in addition to color
- [ ] ARIA labels — quiz buttons, hint button, modals, nav items have descriptive aria-labels
- [ ] Keyboard navigation — all interactive elements reachable via keyboard
- [ ] Form labels — all inputs have explicit label or aria-label
- [ ] Offline/error state — connectivity failure shows banner not silent blank components
- [ ] Mobile responsiveness — key flows usable on small screens

## Infrastructure
- [ ] GitHub Pages CDN caching — critical layout styles use React inline styles
- [ ] Supabase URL config — Site URL and Redirect URLs set correctly
- [ ] Sentry integration — error monitoring active in production
- [ ] Orphaned auth rows — user deletion cleans up both auth.users and profiles rows

## Agent Ownership Reference
| Area | Agent |
|------|-------|
| UI components, CSS, accessibility | UI |
| Communities, members, commissioner tools | COMMUNITY |
| Questions, CSV, templates, generation | CONTENT |
| Auth, profiles, RLS, security | AUTH |
| Games, scores, leaderboards, achievements | GAMIFICATION |
| Supabase queries, data integrity, schema | CRUD |
