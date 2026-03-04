# Docs Sync — Claude Code Prompt

Copy everything below and paste into Claude Code:

---

cd ~/trivia-app && cat << 'PROMPT'

## Task: Sync Project Documentation

Updated docs and Gantt chart have been pre-written to disk. This prompt handles the file swaps, gist update, and git commit.

### Step 1: Replace roadmap and architecture docs

```bash
cp docs/ROADMAP_UPDATED.md docs/ROADMAP.md
cp docs/EMBED_ARCHITECTURE_UPDATED.md docs/EMBED_ARCHITECTURE.md
rm docs/ROADMAP_UPDATED.md docs/EMBED_ARCHITECTURE_UPDATED.md
```

### Step 2: Verify Gantt chart is in place

The phase-based Gantt chart has already been written to:
- `gantt.html` (root)
- `public/gantt.html` (served by GitHub Pages)

Verify both exist and contain "Phase 2 · Connections" to confirm they're the updated version:
```bash
grep -l "Phase 2" gantt.html public/gantt.html
```

### Step 3: Update the gist

```bash
gh gist edit 1a9d3dc2b33e7081b9412f7fbefbdb0e gantt.html
```

### Step 4: Git commit

```bash
git add docs/ROADMAP.md docs/EMBED_ARCHITECTURE.md gantt.html public/gantt.html
git commit -m "docs: sync roadmap, architecture, and Gantt chart to current state

- ROADMAP.md: mark Phase 2 items shipped (GA4, SEO, Zapier, cross-widget analytics, standalone widgets)
- EMBED_ARCHITECTURE.md: update to 15 tabs, 9 widgets, Phase 2 status  
- Gantt chart redesigned: phase-based layout with forward-looking roadmap through May 2026
- 9 phases: Foundation → Core → Social → Media → Security → P1 Site Tools → P2 Connections → P3 Depth → P4 Scale
- Status indicators: complete (green) / active (amber) / planned (blue) / future (dashed)"
git push
```

PROMPT
