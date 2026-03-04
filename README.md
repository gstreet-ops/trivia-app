# GStreet Trivia Platform

A full-stack trivia engagement platform with community leagues, embeddable widgets, multiplayer quiz, campaign email, and site builder — built with React, Supabase, and Vite.

**Live Platform:** https://gstreet-ops.github.io/trivia-app
**Embed Admin:** https://gstreet-ops.github.io/gstreet-ops-quiz-embed/#/admin

---

## Features

### Trivia Platform (trivia-app)
- Complete quiz engine — API + community + custom + mixed sources
- 8 categories, 3 difficulties, configurable count, per-question timer, 50/50 hints
- Media questions (images + YouTube), explanations, difficulty voting
- Community leagues — create, join, marketplace, chat, announcements, seasons
- Commissioner dashboard — 8 tabs, CSV import/export, AI question generation, media library, mismatch analytics
- Multiplayer quiz — create/join rooms, live game, real-time scoring, speed bonus
- Achievement badges — 11 badges including streaks (On Fire, Week Warrior, Unstoppable)
- Admin dashboard — user management, question review, AI request approval, flagged users
- Scheduled quizzes — Quiz Night feature with countdown + live play
- Dark mode, in-app notifications, email notifications (Resend)

### Embed Admin Panel (quiz-embed)
- 15-tab admin panel — Dashboard, Questions, Theme, Analytics, Members, Announcements, Multiplayer, Chat, Subscribers, Forms, Events, Content, Pages, Integrations, Settings
- 9 embeddable widgets — quiz, banner, email collector, contact form, events, content blocks, analytics beacon, leaderboard, achievements, activity feed
- Campaign email builder — template management, recipient segmentation (all/engaged/new/custom), send tracking
- Site Builder — 5 templates, 3 layouts, 5 color presets, live preview, publish to hosted URL
- Four-tier model (lite/pro/business/platform) with tab gating
- Granular RBAC — database-driven roles, per-user permission overrides, audit log

### Shared Infrastructure
- Turborepo monorepo with CRACO (CRA) + Vite builds
- Shared components — QuestionManager, CommunityAnalytics, multiplayer, chat, permissions
- Supabase Edge Functions — send-email, generate-questions, sync-subscriber
- GitHub Pages deployment for both apps

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite (embed widgets) |
| Backend / DB | Supabase (PostgreSQL + Auth + RLS + Realtime + Storage + Edge Functions) |
| Monorepo | Turborepo |
| Charts | Recharts 3 |
| CSV Parsing | PapaParse 5 |
| Mobile (Android) | Capacitor 8 |
| Hosting | GitHub Pages |
| Deployment | gh-pages CLI |
| Error Monitoring | Sentry (optional) |
| External API | The Trivia API v2 |

---

## Project Structure

```
trivia-monorepo/
├── apps/trivia-app/               Full platform (React/CRA)
│   ├── src/
│   │   ├── App.js                 Root router + top nav + session management
│   │   ├── supabaseClient.js      Supabase connection
│   │   ├── components/            25+ components (Dashboard, QuizScreen, CommissionerDashboard, etc.)
│   │   └── utils/                 achievementChecker, permissions, capacitor
│   └── docs/                      DATABASE_SCHEMA, USER_GUIDE, COMMISSIONER_GUIDE, ADMIN_GUIDE, ROADMAP
├── apps/quiz-embed/               Embed widget + admin panel (Vite)
│   ├── src/admin/tabs/            15 admin tabs
│   ├── src/web-component/         9 web component widget builds
│   └── vite.config.*.js           10 Vite build configs (1 per widget + admin)
├── packages/shared/               Shared components (QuestionManager, CommunityAnalytics, multiplayer, permissions)
├── supabase/
│   ├── migrations/                19 migration files
│   └── functions/                 Edge Functions (send-email, generate-questions, sync-subscriber)
└── package.json                   Turborepo root
```

---

## Setup

### Prerequisites
- Node.js 16+ and npm
- A [Supabase](https://supabase.com) project with the schema in [docs/DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md)

### Quick Start

```bash
git clone https://github.com/gstreet-ops/trivia-app.git
cd trivia-app
npm install
```

Edit `src/supabaseClient.js` with your Supabase URL and anon key (found in **Settings → API**).

```bash
npm start           # Dev server at http://localhost:3000
npm run build       # Production build
npm run deploy      # Deploy to GitHub Pages
```

### Environment Variables (Optional)

```
REACT_APP_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
REACT_APP_SUPABASE_ANON_KEY=YOUR_ANON_KEY
REACT_APP_SENTRY_DSN=https://YOUR_KEY@oXXXXXX.ingest.sentry.io/XXXXXXX
```

### Android (Capacitor)

```bash
npm run cap:android    # Build, sync, and open in Android Studio
npm run cap:dev        # Live reload on connected device
```

---

## Documentation

| File | Contents |
|------|---------|
| [docs/DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md) | Full table schemas, relationships, RLS policies, migration cross-reference |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Shipped features, phase status, backlog, decision log |
| [docs/EMBED_ARCHITECTURE.md](docs/EMBED_ARCHITECTURE.md) | Four-tier model, widget inventory, admin panel architecture |
| [docs/USER_GUIDE.md](docs/USER_GUIDE.md) | End-user guide: quiz, stats, communities |
| [docs/COMMISSIONER_GUIDE.md](docs/COMMISSIONER_GUIDE.md) | League management guide |
| [docs/ADMIN_GUIDE.md](docs/ADMIN_GUIDE.md) | Platform admin guide |
| [docs/CRM_CONTACTS_SPEC.md](docs/CRM_CONTACTS_SPEC.md) | CRM/Contacts layer design (not yet migrated) |

---

## License

MIT
