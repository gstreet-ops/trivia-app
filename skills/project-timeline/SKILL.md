---
name: project-timeline
description: Display an ASCII Gantt chart of the GStreet trivia platform project timeline at the start of every trivia-related session. Use this skill ALWAYS at the beginning of any conversation about the trivia app, trivia platform, GStreet, quiz-embed, or when the user says "show timeline", "show gantt", "project status", "where are we", or "what's been done". Also trigger when the user references the trivia repo, deployment, roadmap, or asks to pick up where they left off. This skill should fire BEFORE any other trivia-related work begins.
---

# Project Timeline Skill

When this skill triggers, print the following ASCII Gantt chart at the start of your response, before any other content. This gives the user an instant visual snapshot of project progress.

## The Chart

Print this exactly (it is a living document — update dates/commits as the project evolves):

```
╔══════════════════════════════════════════════════════════════════════════════════╗
║  GStreet Platform Timeline — 163 commits, 59 features, 33 tables              ║
║  Feb 7 – Mar 2, 2026                                                          ║
╠══════════════════════════════════════════════════════════════════════════════════╣
║          Feb7    Feb14   Feb17   Feb19   Feb24   Feb25   Feb26   Mar1    Mar2  ║
║ 🔵 Found ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  11c  ║
║ 🔷 Quiz  ░░░░░░░░████████░░░░░░░░░░░░████████░░░░░░░░░░░░░░░░░░░░░░░░  11c  ║
║ 🟢 Comty ░░░░░░░░████████░░░░░░░░░░░░████████████░░░░░░░░░░░░░░░░░░░░  11c  ║
║ 🟣 Commr ░░░░░░░░░░░░░░░░████████░░░░████████████░░░░░░░░░░░░░░░░░░░░  18c  ║
║ 🟠 Admin ░░░░░░░░░░░░████████░░░░░░░░░░░░████████░░░░░░░░░░░░░░░░░░░░   8c  ║
║ 🔴 Multi ░░░░░░░░░░░░░░░░░░░░░░░░░░░░████████░░░░░░░░░░░░░░░░░░░░░░░   5c  ║
║ 🟣 Embed ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░████████░░░░░░░░░░░░░░░   7c  ║
║ ⚪ Polsh ░░░░░░░░░░░░░░░░░░░░████░░░░████████████░░░░░░░░░░░░░░░░░░░░   7c  ║
║ 🟧 Secur ░░░░░░░░░░░░░░░░░░░░████░░░░████░░░░████████░░░░████░░░░░░░░  27c  ║
║ 🟡 Perms ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░████░░░░░░░░░░░░░░░░████░░░   4c  ║
╠══════════════════════════════════════════════════════════════════════════════════╣
║ ◆ MVP(2/14) → Commissioner(2/17) → Multi(2/24) → Embed(2/26) → RBAC+P2(3/2)  ║
║ 🔗 Platform: gstreet-ops.github.io/trivia-app                                 ║
║ 🔗 Hallaron: gstreet-ops.github.io/ellie-hallaron-website/index.html           ║
║ 🔗 Gantt:    gistpreview.github.io/?1a9d3dc2b33e7081b9412f7fbefbdb0e           ║
╚══════════════════════════════════════════════════════════════════════════════════╝
```

## Legend

- `c` = git commits in that category
- `████` = active development period
- `░░░░` = no activity in that period
- `◆` = milestone markers

## Categories

| Emoji | Category | What it covers |
|-------|----------|---------------|
| 🔵 | Foundation | Auth, Supabase schema, deployment, PWA, docs |
| 🔷 | Core Quiz | Quiz engine, hints, timer, explanations, media questions |
| 🟢 | Community | Leagues, leaderboards, chat, marketplace, theming |
| 🟣 | Commissioner | Dashboard, CSV import, tags, templates, analytics, AI gen |
| 🟠 | Admin | Admin dashboard, user mgmt, question review, bot detection |
| 🔴 | Multiplayer | Rooms, lobby, live game, real-time scoring |
| 🟣 | Embed | Configurator, embed analytics, webhooks, site tools |
| ⚪ | Polish | Dark mode, icons, notifications, email, legal, help center |
| 🟧 | Security | Code reviews, a11y, bot prevention, RLS hardening |
| 🟡 | Permissions | Role system, granular RBAC, roles tab, permission overrides |

## After Printing

After the chart, proceed with whatever the user asked. If they just said hello or started a new session, follow up with: "What are we working on today?"

## Keeping It Updated

When new features ship during a session, note that the chart should be updated. The authoritative interactive version lives at the Gantt link above. This ASCII version is a quick-reference snapshot.
