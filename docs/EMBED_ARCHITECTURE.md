# Embed Platform Architecture: Four-Tier Model

**Status:** Phase 2 Mostly Complete — March 2, 2026
**Projects:** trivia-monorepo (monorepo), trivia-app (platform), quiz-embed (embed widget + admin)
**Author:** Claude / Hella
**Live Admin:** https://gstreet-ops.github.io/gstreet-ops-quiz-embed/#/admin
**Live Embed:** https://gstreet-ops.github.io/gstreet-ops-quiz-embed/?community=SLUG

---

## Implementation Status

| Component | Status | Notes |
|-----------|--------|-------|
| Admin Panel | ✅ Deployed | 15 tabs (5 core + 4 pro + 4 business + 2 platform) |
| Setup Wizard | ✅ Deployed | 4-step onboarding, end-to-end tested |
| Hash-based Routing | ✅ Deployed | `#/admin`, `#/admin?community=SLUG`, `#/admin/setup` |
| Mobile Responsive | ✅ Deployed | CSS media queries, hamburger nav |
| Community Picker | ✅ Deployed | Lists all owner/commissioner communities |
| Embed Widget | ✅ Deployed | 9 web components with Vite builds |
| DB: community_tier | ✅ Deployed | lite/pro/business/platform with tab gating |
| DB: embed_profiles | ✅ Deployed | Multi-profile with auto-migration |
| Site Tool Widgets | ✅ Deployed | 6 web components (banner, subscribe, contact, events, content, analytics) |
| Standalone Widgets | ✅ Deployed | 3 web components (leaderboard, achievements, feed) |
| Integrations Tab | ✅ Deployed | GA4, SEO, meta tags, Zapier, email import, platform guides |
| Pages Tab | ✅ Deployed | Page builder with templates, CRUD, slug management |
| Cross-Widget Analytics | ✅ Deployed | 7-section unified analytics (business+ tier) |
| Granular RBAC | ✅ Deployed | PermissionContext, RolesTab, community role hierarchy |
| Shared Components | ✅ Deployed | QuestionManager, CommunityAnalytics, multiplayer, chat, permissions |
| Widget Embed Generators | ✅ Deployed | All 9 widgets with copy-paste snippets in Settings tab |

---

## Four-Tier Model

| Feature | Lite | Pro | Business | Platform |
|---------|------|-----|----------|----------|
| Quiz embed | ✓ | ✓ | ✓ | ✓ |
| Questions, Theme, Analytics, Settings | ✓ | ✓ | ✓ | ✓ |
| Members, Announcements, Multiplayer, Chat | — | ✓ | ✓ | ✓ |
| Site tools (subscribe, contact, events, content, analytics beacon) | — | — | ✓ | ✓ |
| Integrations (GA4, SEO, Zapier, meta tags), Pages | — | — | ✓ | ✓ |
| Cross-widget analytics, conversion funnel | — | — | ✓ | ✓ |
| Marketplace, full platform features | — | — | — | ✓ |

---

## Widget Inventory (9 total)

| Widget | Web Component | Admin Tab | DB Table | Vite Config |
|--------|--------------|-----------|----------|-------------|
| Quiz | `<quiz-embed>` | Theme & Behavior | games | vite.config.wc.js |
| Banner | `<gstreet-banner>` | AnnouncementsTab | community_announcements | vite.config.banner.js |
| Email Collector | `<gstreet-subscribe>` | SubscribersTab | subscribers | vite.config.subscribe.js |
| Contact Form | `<gstreet-contact>` | FormsTab | form_submissions | vite.config.contact.js |
| Events | `<gstreet-events>` | EventsTab | community_events | vite.config.events.js |
| Content Blocks | `<gstreet-content>` | ContentTab | content_blocks | vite.config.content.js |
| Analytics Beacon | `<gstreet-analytics>` | AnalyticsTab (traffic) | page_views | vite.config.analytics.js |
| Leaderboard | `<gstreet-leaderboard>` | — | games (computed) | vite.config.leaderboard.js |
| Achievements | `<gstreet-achievements>` | — | games (computed) | vite.config.achievements.js |
| Activity Feed | `<gstreet-feed>` | — | games | vite.config.feed.js |

All widgets: Shadow DOM, themed via attributes (bg, surface, primary, accent, text, font), standalone JS builds.

---

## Technical Architecture

### Repository Structure

```
trivia-monorepo/
├── apps/quiz-embed/
│   ├── src/
│   │   ├── App.js                    # Hash router: / → embed, #/admin → admin
│   │   ├── admin/
│   │   │   ├── AdminApp.js           # Auth gating, community resolution
│   │   │   ├── AdminShell.js         # Sidebar nav, tab rendering, tier gating
│   │   │   ├── SetupWizard.js        # 4-step onboarding
│   │   │   ├── permissions.js        # Role-based access control
│   │   │   ├── tabs/                 # 15 admin tabs
│   │   │   └── components/           # CrossWidgetAnalytics, SiteTrafficAnalytics
│   │   ├── components/               # Embed widget components
│   │   └── web-component/            # 9 web component builds
│   └── vite.config.*.js              # Per-widget Vite build configs (10 total)
├── apps/trivia-app/                  # Full platform
└── packages/shared/                  # Shared components
```

---

## Open Questions

1. **Pricing/gating:** Are higher tiers free or paid?
2. **Email auto-sync:** Build Mailchimp/ConvertKit API integration or stay with CSV export?
3. **Stripe Connect:** When to build paid community access?

---

## Revision History

| Date | Change |
|------|--------|
| 2026-02-27 | Initial draft — three-tier architecture design |
| 2026-02-28 | Tier 1 deployed: 5 admin tabs, setup wizard, community tier column, embed profiles |
| 2026-02-28 | Four-tier hierarchy, 6 site tool widgets shipped |
| 2026-02-28 | Shared component extraction to packages/shared |
| 2026-03-01 | IntegrationsTab (GA4, SEO, Zapier, meta tags), PagesTab, platform guides |
| 2026-03-02 | Granular RBAC (PermissionContext, RolesTab, Members integration) |
| 2026-03-02 | 3 standalone widgets (leaderboard, achievements, feed) |
| 2026-03-02 | Cross-widget analytics (7-section unified analytics, business+ tier) |
| 2026-03-02 | Admin panel: 13 → 15 tabs, 7 → 9 widgets, Phase 2 mostly complete |
