# GStreet Platform Roadmap

**Last Updated:** March 2, 2026
**Repo:** trivia-monorepo (apps/trivia-app, apps/quiz-embed, packages/shared)

---

## Vision

GStreet started as a trivia quiz platform and is evolving into a site engagement platform. The trivia quiz remains the core product, but the embed admin panel is expanding to offer site owners a suite of embeddable engagement tools — widgets, analytics, email collection, content blocks — all managed from a single admin interface.

**Near-term identity:** "GStreet Trivia" for platform users, embed admin quietly becomes the hub for site engagement tools.
**Future identity:** "GStreet Engage" as the umbrella brand when non-trivia widgets prove traction.

---

## Architecture Overview

```
trivia-monorepo/
├── apps/trivia-app/       Full platform (communities, multiplayer, social)
├── apps/quiz-embed/       Embed widget + admin panel + site tools
│   ├── src/admin/tabs/    15 tabs: Dashboard, Questions, Theme, Analytics,
│   │                      Members, Announcements, Multiplayer, Chat,
│   │                      Subscribers, Forms, Events, Content, Pages,
│   │                      Integrations, Settings
│   ├── src/web-component/ 9 embeddable widgets: quiz-embed, gstreet-banner,
│   │                      gstreet-subscribe, gstreet-contact, gstreet-events,
│   │                      gstreet-content, gstreet-analytics, gstreet-leaderboard,
│   │                      gstreet-achievements, gstreet-feed
└── packages/shared/       Shared components (QuestionManager, CommunityAnalytics,
                           multiplayer/*, permissions, charts)
```

**Deployment:**
- trivia-app → `gstreet-ops.github.io/trivia-app`
- quiz-embed → `gstreet-ops.github.io/gstreet-ops-quiz-embed`
- Both share one Supabase project (same DB, auth, RLS)

---

## What's Shipped

### Embed Admin Panel (quiz-embed) — ✅ Live

- 15-tab admin panel (Dashboard, Questions, Theme, Analytics, Members, Announcements, Multiplayer, Chat, Subscribers, Forms, Events, Content, Pages, Integrations, Settings)
- 4-step setup wizard (create → questions → theme → launch)
- Hash-based routing with community picker
- Mobile responsive sidebar with hamburger nav
- Question management (add, edit, delete, CSV import/export, search, filters, bulk ops)
- Theme configuration with live preview (5 colors, font selector), multi-profile support (create, rename, duplicate, delete), auto-migration from community.settings on first ThemeTab load
- Behavior settings (count, difficulty, timer, leaderboard, category) per profile
- Embed analytics (games played, avg score, unique players, trend chart, score distribution)
- Cross-widget engagement analytics (business+ tier): unified date range picker, engagement overview cards with period-over-period % change, stacked engagement timeline, conversion funnel, widget performance table, top performing pages, CSV export
- Embed code generation (iframe + web component snippets for all 9 widgets)
- Member management with role badges, role assignment, invite by email
- Community announcements (create, edit, pin/unpin, delete)
- Webhook URL configuration
- Multiplayer room management (create via shared RoomCreator, active/recent room lists, cancel, auto-refresh)
- Community chat moderation (shared CommunityChat, stats, configurable settings)
- Community tier selector (lite/pro/business/platform) — four-tier hierarchy with admin tab gating + widget-side enforcement
- Community settings (name, description, invite code, slug, danger zone)
- Integrations tab: GA4 setup wizard, platform-specific widget install guides, email platform CSV import (Mailchimp/ConvertKit/Beehiiv), Zapier webhook templates, SEO 10-item health check, meta tag generator (OG/Twitter/canonical)
- Pages tab: page builder with templates, CRUD, slug management
- Granular RBAC: PermissionContext, RolesTab, community role hierarchy (owner/commissioner/moderator/member)

### Embeddable Widgets — ✅ Live (9 total)

| Widget | Tag | Vite Config | Admin Tab |
|--------|-----|-------------|-----------|
| Quiz Embed | `<quiz-embed>` | vite.config.wc.js | Theme & Behavior |
| Announcement Banner | `<gstreet-banner>` | vite.config.banner.js | Announcements |
| Email Collector | `<gstreet-subscribe>` | vite.config.subscribe.js | Subscribers |
| Contact Form | `<gstreet-contact>` | vite.config.contact.js | Forms |
| Events List | `<gstreet-events>` | vite.config.events.js | Events |
| Content Blocks | `<gstreet-content>` | vite.config.content.js | Content |
| Analytics Beacon | `<gstreet-analytics>` | vite.config.analytics.js | Analytics (Site Traffic) |
| Leaderboard | `<gstreet-leaderboard>` | vite.config.leaderboard.js | — |
| Achievements | `<gstreet-achievements>` | vite.config.achievements.js | — |
| Activity Feed | `<gstreet-feed>` | vite.config.feed.js | — |

All widgets use Shadow DOM, accept theming attributes (bg, surface, primary, accent, text, font), and have standalone JS builds.

### Site Tools Widgets — ✅ Live

- `<gstreet-banner>` — announcement banner from community_announcements
- `<gstreet-subscribe>` — email signup form → subscribers table
- `<gstreet-contact>` — contact/feedback form → form_submissions table
- `<gstreet-events>` — upcoming events list → community_events table
- `<gstreet-content>` — named content blocks by slug → content_blocks table
- `<gstreet-analytics>` — invisible page view beacon → page_views table

### Standalone Community Widgets — ✅ Live

- `<gstreet-leaderboard>` — community leaderboard (top players, avg score, games played, season support)
- `<gstreet-achievements>` — achievement badge showcase (grid or inline layout, session-aware)
- `<gstreet-feed>` — recent community activity feed (game results)

### Trivia Platform (trivia-app) — ✅ Live

- Complete quiz engine (API + community + custom + mixed sources)
- 8 categories, 3 difficulties, configurable count (3–20), per-question timer
- 50/50 hints, media questions (images + YouTube), explanations
- Community system (create, join, marketplace, chat, announcements, seasons)
- Commissioner dashboard (8 tabs, CSV import/export, AI question generation, media library)
- Multiplayer quiz (create/join rooms, live game, real-time scoring)
- Role system (platform: user/admin/super_admin, community: owner/commissioner/moderator/member)
- Granular RBAC with PermissionContext and permissions.js utility
- Achievement badges (11 badges: 6 original + Grand Master + Community Champion + 3 streak badges)
- Daily play streak tracking with Dashboard visualization (30-day dot calendar)
- In-app notifications, email notifications (Resend), dark mode
- Admin dashboard (user management, question review, community requests, AI requests, flagged users)
- Community marketplace (browse, search, filter, request new communities)
- Legal framework (ToS, Privacy Policy, signup consent)
- Bot prevention (rate limiting, timing analysis, auto-flagging)

### Shared Infrastructure — ✅ Live

- Turborepo monorepo with CRACO config for CRA workspace builds
- Shared QuestionManager, CommunityAnalytics, chart primitives (packages/shared)
- Shared multiplayer components (RoomCreator, RoomJoin, OpenRoomsBrowser, RoomLobby, LiveGame, GameResults)
- Shared CommunityChat component with Realtime
- Shared permissions module
- Supabase Edge Functions (send-email, generate-questions)
- GitHub Pages deployment for both apps
- Sentry error monitoring

---

## Phase 1 — Site Tools Foundation ✅ SHIPPED

All 6 site tool widgets + 3 standalone community widgets shipped. Each has admin tab + web component + Supabase table + Vite build config.

| Feature | Lite | Pro | Business | Platform |
|---------|------|-----|----------|----------|
| Quiz embed | ✓ | ✓ | ✓ | ✓ |
| Questions, Theme, Analytics | ✓ | ✓ | ✓ | ✓ |
| Members, Announcements | — | ✓ | ✓ | ✓ |
| Site tools (all widgets) | — | — | ✓ | ✓ |
| Cross-widget analytics | — | — | ✓ | ✓ |
| Integrations, Pages | — | — | ✓ | ✓ |
| Marketplace, Multiplayer | — | — | — | ✓ |

### Phase 1 Completed Items
- [x] Platform detection + setup guides (Squarespace, WordPress, Wix, Shopify, Webflow, Custom)
- [x] Broadcast email (compose + send to all subscribers from admin)
- [x] Granular RBAC (PermissionContext, RolesTab, Members integration)
- [x] All 9 widget embed code generators in Settings tab

---

## Phase 2 — Connections ✅ MOSTLY SHIPPED

| Item | Status |
|------|--------|
| GA4 setup wizard | ✅ Shipped — IntegrationsTab with per-platform instructions |
| Email platform connection (CSV import) | ✅ Shipped — Mailchimp, ConvertKit, Beehiiv import guides |
| Email platform auto-sync (API) | ✅ Shipped — Edge Function + admin UI (Mailchimp, ConvertKit, Beehiiv, webhook) |
| Zapier webhook templates | ✅ Shipped — 4 Zap templates + webhook payload example |
| SEO health check | ✅ Shipped — 10-item interactive checklist with per-platform fixes |
| Meta tag generator | ✅ Shipped — OG, Twitter Card, canonical URL generator |
| Cross-widget analytics | ✅ Shipped — 7-section unified analytics (business+ tier) |
| Standalone widgets | ✅ Shipped — leaderboard, achievements, feed (web components + Vite configs) |
| Player retention metrics | ✅ Shipped — returning/new players, retention rate, avg games/player in DashboardTab |
| Stripe membership payments | 🟡 Placeholder UI — needs Stripe Connect integration |

### Remaining Phase 2
- [x] Email platform auto-sync — Edge Function + admin config UI + widget-side fire-and-forget sync
- [x] Player retention metrics — returning vs new players, retention rate, return frequency in embed DashboardTab
- [ ] Stripe membership payments + revenue dashboard — Stripe Connect, Edge Function webhooks

---

## Phase 3 — Depth (Demand-driven)

- [x] Campaign email builder with segmentation
- [x] Site Builder wizard with templates, live preview, and hosted publishing
- [ ] Visual workflow builder
- [ ] Full engagement analytics (cohorts, funnels, heatmaps)
- [ ] Widget studio with conditional display
- [ ] Discussion forums
- [ ] Content block editor (Notion-style)

---

## Trivia Platform Backlog

### Near-term
- [x] Grand Master badge — earn all 6 original badges
- [x] Community Champion badge — play 25 community games
- [x] Streak tracking with badges — Duolingo-style daily play streaks, 3 streak badges (On Fire, Week Warrior, Unstoppable), Dashboard streak card + 30-day dot calendar, UserProfile streak display

### Medium-term
- [ ] Member question submissions with approval flow
- [ ] Server-side RLS role enforcement (Phase 2)
- [ ] Question difficulty auto-rating
- [x] Admin undo approve/reject — "Revert to Pending" with confirmation + notification

### Longer-term
- [x] Scheduled quizzes — Quiz Night feature with commissioner scheduling, countdown, live play, leaderboard
- [ ] Question difficulty voting
- [ ] Mobile app (React Native)

---

## Known Issues

| Issue | Status |
|-------|--------|
| Community leaderboard staleness | Mitigated — live computation with season_start fallback |
| GitHub Pages CSS caching | Workaround — inline styles for critical layout |
| No email confirmation on signup | By design — frictionless onboarding |
| Admin can't undo approve/reject | Fixed — "Revert to Pending" in Recently Reviewed section |
| Auth.users orphaned on user delete | Open — manual cleanup needed |
| Sentry confirmation pending | Open |

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-02-27 | Three-tier embed architecture | Reduce friction for embed-first users |
| 2026-02-28 | Monorepo with Turborepo | Simplest, works with GitHub Pages |
| 2026-02-28 | Site tools inside quiz-embed | Admin shell, backend, tier system already exist |
| 2026-02-28 | Four-tier hierarchy (lite/pro/business/platform) | Clean separation: community features (pro) vs site tools (business) |
| 2026-02-28 | Free distribution, no pricing near-term | Focus on adoption |
| 2026-02-28 | Extract shared components to packages/shared | Eliminates duplication across apps |
| 2026-02-28 | Multi-profile with dirty-state tracking | A/B testing, per-page theming, data loss prevention |
| 2026-03-02 | Cross-widget analytics in AnalyticsTab | Unified view vs separate tab — keeps navigation clean |
| 2026-03-02 | Widget Library in SettingsTab | All 9 widget snippets centralized with copy buttons |
