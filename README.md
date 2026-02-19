# Trivia Quiz App

A full-featured trivia quiz platform with community leagues, custom questions, achievements, and analytics — built with React and Supabase, deployed on GitHub Pages.

**Live Demo:** https://gstreet-ops.github.io/trivia-app

---

## Features

### Core Quiz
- Multiple question sources: The Trivia API (live), approved platform-wide custom questions, community-specific questions
- Categories: General Knowledge, Film, Music, Geography, History, Sports, Science & Nature, Arts & Literature
- Difficulties: Easy, Medium, Hard
- Question counts: 3, 5, 10, 15, or 20 per game
- 50/50 hint per question (removes 2 wrong answers)
- Full answer review after each game

### User Features
- Email/password authentication with password reset via email
- Personal dashboard: total games, average score, best score
- Score trend line chart and per-category bar chart (Recharts)
- Achievement badge system (6 unlockable badges)
- Game history with per-game answer review
- Community leaderboard with clickable player profiles
- Privacy controls (profile visibility, leaderboard opt-out)

### Community / Leagues
- Create leagues with auto-generated 8-character invite codes
- Join leagues via invite code
- View league leaderboard, members, and question bank count
- Commissioner dashboard for league management

### Commissioner Tools
- Tabbed dashboard: Overview, Questions, Members, Settings, Analytics
- Bulk CSV question upload with validation and row-level error reporting
- Download CSV template for bulk upload
- Export full question bank to CSV
- Question search + filter by category, difficulty, and custom tags
- Bulk tag operations across multiple selected questions
- Per-question version history (up to 10 versions) with restore
- Save questions as reusable templates; create questions from templates
- Remove members from the league
- Edit community name, season dates, and member cap

### Admin Tools
- Platform-wide stats: total users, games, public games, avg games/user, most popular category
- Pending custom question review queue (approve / reject)
- Recent users table
- Recent games table with visibility status

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 |
| Backend / DB | Supabase (PostgreSQL + Auth + RLS) |
| Charts | Recharts 3 |
| CSV Parsing | PapaParse 5 |
| Hosting | GitHub Pages |
| Deployment | gh-pages CLI |
| External API | The Trivia API v2 (https://the-trivia-api.com) |

---

## Project Structure

```
trivia-app/
├── public/
│   ├── index.html
│   └── favicon.svg
├── src/
│   ├── App.js                           # Root router + persistent top nav bar
│   ├── App.css                          # Global styles
│   ├── supabaseClient.js                # Supabase connection
│   ├── index.js / index.css
│   ├── components/
│   │   ├── StartScreen.js/css           # Login / sign-up / password reset
│   │   ├── Dashboard.js/css             # Home: stats, achievements, charts, leaderboard
│   │   ├── QuizSourceSelector.js/css    # Quiz configuration (source, category, difficulty, count)
│   │   ├── QuizScreen.js/css            # Active quiz with 50/50 hint
│   │   ├── ResultsScreen.js/css         # Post-quiz score summary
│   │   ├── GameReview.js/css            # Per-game answer review
│   │   ├── Achievements.js/css          # Achievement badge grid
│   │   ├── PerformanceCharts.js/css     # Recharts score trend + category charts
│   │   ├── Settings.js/css              # Profile + privacy settings + logout
│   │   ├── CommunityFeed.js/css         # Public game activity feed
│   │   ├── CommunitiesList.js/css       # League browser + create/join modals
│   │   ├── CommunityDetail.js/css       # League overview + leaderboard + quiz entry
│   │   ├── CommissionerDashboard.js/css # Full commissioner tools (tabbed)
│   │   ├── AdminDashboard.js/css        # Platform admin panel
│   │   ├── QuestionCreator.js/css       # Submit custom question for review
│   │   └── UserProfile.js/css           # View another user's public stats
│   └── utils/
│       └── achievementChecker.js        # Badge unlock logic
├── docs/
│   ├── DATABASE_SCHEMA.md
│   ├── USER_GUIDE.md
│   ├── COMMISSIONER_GUIDE.md
│   ├── ADMIN_GUIDE.md
│   └── ROADMAP.md
├── package.json
└── README.md
```

---

## Setup Instructions

### Prerequisites

- Node.js 16+ and npm
- A [Supabase](https://supabase.com) project with the schema in [docs/DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md)
- A GitHub repository with GitHub Pages enabled (for deployment)

### 1. Clone and Install

```bash
git clone https://github.com/gstreet-ops/trivia-app.git
cd trivia-app
npm install
```

### 2. Configure Supabase

Edit `src/supabaseClient.js` and replace the URL and anon key:

```js
const supabaseUrl = 'https://YOUR_PROJECT_ID.supabase.co'
const supabaseAnonKey = 'YOUR_ANON_KEY'
```

Both values are in your Supabase project under **Settings → API**.

### 3. Environment Variables (Optional)

The current setup uses hard-coded credentials. To use environment variables instead:

1. Create `.env` in the project root:
   ```
   REACT_APP_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
   REACT_APP_SUPABASE_ANON_KEY=YOUR_ANON_KEY
   ```
2. Update `src/supabaseClient.js`:
   ```js
   const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
   const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY
   ```

> `.env` is listed in `.gitignore` and will not be committed.

### 4. Sentry Error Monitoring (Optional)

The app is instrumented with [Sentry](https://sentry.io) for runtime error tracking. To enable it:

1. Create a free account at [sentry.io](https://sentry.io) and create a new **React** project.
2. Copy the **DSN** from **Settings → Projects → your project → Client Keys (DSN)**.
3. Add it to your local `.env` file:
   ```
   REACT_APP_SENTRY_DSN=https://YOUR_KEY@oXXXXXX.ingest.sentry.io/XXXXXXX
   ```

The app builds and runs normally without the DSN set — Sentry is silently disabled when the variable is absent.

### 5. Run Locally

```bash
npm start
```

Opens at http://localhost:3000

---

## Deployment

### GitHub Pages

1. Set `homepage` in `package.json`:
   ```json
   "homepage": "https://YOUR_USERNAME.github.io/trivia-app"
   ```

2. Deploy:
   ```bash
   npm run deploy
   ```

This builds the app and pushes to the `gh-pages` branch. GitHub Pages serves from that branch automatically.

> After deploying, hard-refresh (Ctrl+Shift+R) to bypass CDN cache.

---

## Database Tables

See [docs/DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md) for full schema.

| Table | Purpose |
|-------|---------|
| `profiles` | User profile, roles, privacy settings |
| `games` | Game records with score and metadata |
| `game_answers` | Per-answer records for game review |
| `communities` | League definitions |
| `community_members` | League membership |
| `community_questions` | Community-owned question bank |
| `community_leaderboards` | Community ranking view |
| `custom_questions` | User-submitted questions (pending admin review) |
| `question_templates` | Reusable question templates per community |

---

## Documentation

| File | Contents |
|------|---------|
| [docs/DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md) | Full table schemas, relationships, RLS policies |
| [docs/USER_GUIDE.md](docs/USER_GUIDE.md) | End-user guide: quiz, stats, communities |
| [docs/COMMISSIONER_GUIDE.md](docs/COMMISSIONER_GUIDE.md) | League management guide |
| [docs/ADMIN_GUIDE.md](docs/ADMIN_GUIDE.md) | Platform admin guide |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Completed features, in progress, planned |

---

## License

MIT
