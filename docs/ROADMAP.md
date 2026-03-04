# GStreet Platform Roadmap

**Last Updated:** March 4, 2026
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
- Campaign email builder: CampaignComposer wizard, template management, recipient segmentation (all/engaged/new/custom), send tracking (March 2)
- Site Builder wizard: 5 templates (Trivia League, Classroom, Brand Engagement, Event, Community Hub), 3 layouts (hero/sidebar/minimal), 5 color presets, live preview, publish to `#/site/SLUG` (March 2)
- Contact merge: find_duplicate_contacts + merge_contacts RPCs, admin UI (March 3)

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
- Admin undo approve/reject — "Revert to Pending" in Recently Reviewed with confirmation + notification (March 3)
- Community marketplace (browse, search, filter, request new communities)
- Legal framework (ToS, Privacy Policy, signup consent)
- Bot prevention (rate limiting, timing analysis, auto-flagging)
- Scheduled quizzes — Quiz Night feature with commissioner scheduling, countdown, live play, leaderboard
- Question difficulty voting — post-answer voting (too easy/just right/too hard), auto-computed difficulty at 5+ votes with 60% threshold, commissioner mismatch analytics (March 4)
- Mobile touch target fixes — global 44px minimum, 48px quiz answers, icon tap zones, overflow-x fix across 7+ CSS files (March 3)

### Shared Infrastructure — ✅ Live

- Turborepo monorepo with CRACO config for CRA workspace builds
- Shared QuestionManager, CommunityAnalytics, chart primitives (packages/shared)
- Shared multiplayer components (RoomCreator, RoomJoin, OpenRoomsBrowser, RoomLobby, LiveGame, GameResults)
- Shared CommunityChat component with Realtime
- Shared permissions module
- Supabase Edge Functions (send-email, generate-questions, sync-subscriber)
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

## Phase 3 — Depth ✅ MOSTLY SHIPPED

| Item | Status |
|------|--------|
| Campaign email builder with segmentation | ✅ Shipped (March 2) — CampaignComposer wizard, 2 DB tables (email_templates, email_campaigns), template management, recipient segmentation (all/engaged/new/custom), send tracking |
| Site Builder wizard | ✅ Shipped (March 2) — 5 templates (Trivia League, Classroom, Brand Engagement, Event, Community Hub), 3 layouts (hero/sidebar/minimal), 5 color presets, live preview, publish to `#/site/SLUG`, community_sites table |
| Contact merge | ✅ Shipped (March 3) — find_duplicate_contacts + merge_contacts RPCs, admin UI |
| Visual workflow builder | DEFERRED — too complex, no demand signal |
| Full engagement analytics (cohorts, funnels, heatmaps) | Future |
| Widget studio with conditional display | DEFERRED — wait for demand |
| Discussion forums | Future |
| Content block editor (Notion-style) | DEFERRED |

---

## Trivia Platform Backlog

### Remaining
- [ ] Member question submissions with approval flow
- [ ] Server-side RLS role enforcement (Phase 2)
- [ ] Mobile app (React Native / Capacitor)

### Completed (moved from backlog)
- [x] Grand Master badge — earn all 6 original badges
- [x] Community Champion badge — play 25 community games
- [x] Streak tracking with badges — Duolingo-style daily play streaks, 3 streak badges (On Fire 3-day, Week Warrior 7-day, Unstoppable 30-day), Dashboard streak card + 30-day dot calendar, UserProfile streak display
- [x] Question difficulty auto-rating — via player difficulty voting system (March 4)
- [x] Admin undo approve/reject — "Revert to Pending" with confirmation + notification (March 3)
- [x] Scheduled quizzes — Quiz Night feature with commissioner scheduling, countdown, live play, leaderboard
- [x] Question difficulty voting — post-answer feedback, auto-computed difficulty at 5+ votes with 60% threshold, commissioner mismatch analytics (March 4)

---

## CRM / Contacts Layer — Designed (Not Yet Migrated)

5 new tables specced in `docs/CRM_CONTACTS_SPEC.md`. No migrations created yet.

- `organizations` — ownership wrapper, future billing anchor
- `organization_members` — multi-user org access (owner/admin/viewer)
- `contacts` — unified identity per org (email + profile_id + tags + notes + status)
- `contact_communities` — contact↔community junction
- `contact_activity` — event stream (every interaction, timestamped, typed)

Implementation phases: A (schema + triggers) → B (Contacts Tab UI) → C (activity feed, scores, CSV) → D (webhooks, segment export, broadcast targeting)

---

## New Direction — Trivia Engagement as a Service

The Reading FC proof-of-concept represents a shift from platform-building to client delivery. The model:

- **Drop-in trivia widget** pre-seeded with client-specific questions (e.g., Reading FC history, players, match stats)
- **Redesigned site mockup** showing seamless integration into an existing team/brand website
- **Repeatable playbook** — the same approach works for any sports team, brand, or organization that wants to engage their audience with trivia
- **Separate project repo** planned for the POC delivery, with the embed widget system as the technical foundation

This validates the embed architecture as a B2B offering: one Supabase backend, per-client communities, themed widgets dropped into client sites.

---

## Known Issues

| Issue | Status |
|-------|--------|
| Community leaderboard staleness | Mitigated — live computation with season_start fallback |
| GitHub Pages CSS caching | Workaround — inline styles for critical layout |
| No email confirmation on signup | By design — frictionless onboarding |
| Auth.users orphaned on user delete | Open — manual cleanup needed |
| Sentry confirmation pending | Open |
| Project file copies drift from repo | Canonical source is always the repo `docs/` folder |

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
| 2026-03-02 | Campaign email in embed admin | Site owners need to communicate with subscribers without external tools |
| 2026-03-02 | Site Builder with templates | "Zero to live site in 5 minutes" — deterministic templates, no AI |
| 2026-03-03 | Mobile touch targets audit | 23/24 elements undersized — CSS-only fix, no layout changes |
| 2026-03-03 | Reading FC as POC direction | Shift from platform-building to client delivery |

---

## Code TODOs

No `TODO`, `FIXME`, `HACK`, or `XXX` comments found in `src/**/*.{js,jsx,css}` as of March 4, 2026.
