# HOOT Activity Diary + Radar History — Sepia Dashboard Plan

> **For approval** — plan mode only. Do not implement until you pick an option and phase order.

**Reference:** [Nate's AI Token Burn Dashboard](https://dashboard-sepia-beta-83.vercel.app/)  
**Target surface:** HOOT `/activity` (Session diary, radar history, telemetry)  
**Date:** 2026-06-10

---

## Problem

The Activity page today is functional but thin. It shows four counters, a 14-day bar chart, and a flat event list. It does **not** answer the questions an operator actually asks:

- *What drove today's agent time?*
- *Which tools dominated this week?*
- *When was I docked vs running external agents?*
- *Did launches succeed — and on which projects?*
- *What pattern is emerging over 30 days?*

The reference dashboard answers analogous questions for token burn with:

| Reference pattern | HOOT equivalent |
|-------------------|-----------------|
| Daily burn calendar (log color, Sun–Sat grid) | Daily agent-minutes / event intensity calendar |
| Weekly total line (log y-scale) | 7-day rolling agent-time trend |
| Date · Burn · Moment · Driver table | Date · Minutes · Peak moment · Top agent/project |
| “What is driving the burn?” dot plot + work-family table | Agent/tool attribution + project/work-type breakdown |
| Tool comparison (today / 7d / 30d / peak / shape) | Per-agent radar stats (Claude, Codex, Grok, …) |
| 30-day moving average breakdown | Dock vs external · launches · outcomes · RTK savings |

**Constraint (from `docs/AI_OS_ARCHITECTURE.md`):** Do not rebuild Nate's dashboard wholesale or absorb unrelated product UIs. **Adapt its information architecture and visual density** to HOOT's existing telemetry — session diary + radar history + usage + token-burn prevention.

---

## Current State (verified)

| Asset | Status |
|-------|--------|
| `ui/src/pages/ActivityPage.tsx` | ~177 lines; inline styles; bar heatmap + timeline only |
| `activity-log.js` | Events, daily rollups, radar diff → start/stop events |
| `agent-radar.js` | Live process scan; dock vs external classification |
| `stack-usage.json` via `/api/usage` | Launches + outcomes (not wired to Activity page) |
| `token-burn.js` via `/api/token-burn` | RTK prevention stats (on Overview/Scan only) |
| `hoot-operator-log.js` | Coach tool-call audit (not exposed to Activity UI) |
| `recharts` | Installed in `ui/package.json`, **unused** on Activity |
| Tests | `tests/api.test.js` covers `/api/activity/today`; no UI/visual tests |

**Gap:** UI is one aggregation level above raw events. No analytics endpoint, no chart primitives, no drill-down tables, no sepia editorial layout matching the reference density.

---

## Design North Star

Match the **feel** of the reference dashboard while staying HOOT-branded:

- **Typography:** Keep EB Garamond headings + Inter body (already in `index.css`)
- **Palette:** Sepia/gold on ink (`#ffb042`, `#12100e`, `#0a0a0a`) — not Nate's exact colors
- **Density:** Full-width sections, labeled chart captions, sortable tables, legend keys
- **Honesty:** Empty states explain *what will populate them* (radar polling, launches, RTK gain)
- **No fake data:** If CodeBurn ingest is missing, show “RTK prevention only” — don't invent token counts

---

## Proposed Page Architecture

Rename mentally from “Activity Diary” → **“Operator Telemetry”** (nav label can stay “Activity”).

```
┌─────────────────────────────────────────────────────────────────────────┐
│  HOOT Operator Telemetry                          [Refresh] [Export .md] │
│  Session diary · radar history · launch outcomes                         │
├─────────────────────────────────────────────────────────────────────────┤
│  HERO KPIs (4–6 tiles)                                                   │
│  Today events · Dock min · External min · Launches · Success rate · RTK  │
├─────────────────────────────────────────────────────────────────────────┤
│  §1 Daily agent activity                                                 │
│  ┌─ 7-day line (log y) ─────────────┐  ┌─ 5-week calendar heatmap ────┐ │
│  │ total minutes / events           │  │ Sun–Sat · log color scale    │ │
│  └──────────────────────────────────┘  └──────────────────────────────┘ │
│  Table: Date | Minutes | Peak | Driver (top agent or project)            │
├─────────────────────────────────────────────────────────────────────────┤
│  §2 What is driving activity?                                            │
│  Horizontal dot plot: agents sorted by dock+external minutes (30d)       │
│  Table: Agent | Minutes | Share | Evidence (sessions, PIDs, launches)    │
├─────────────────────────────────────────────────────────────────────────┤
│  §3 Tool / agent comparison                                              │
│  Table: Agent | Today | 7d | 30d | Peak day | Active days | 30d sparkline│
├─────────────────────────────────────────────────────────────────────────┤
│  §4 Session diary (today + selected day)                                 │
│  Filterable timeline: launch · dock start/stop · module · fail           │
│  Click row → expand meta (profile, project, duration, exit code)         │
├─────────────────────────────────────────────────────────────────────────┤
│  §5 Prevention & efficiency (bridge panel)                               │
│  Compact TokenBurnPanel + “saved tokens” when RTK gain exists            │
│  Placeholder row for future CodeBurn JSON ingest (Burn v2)                │
├─────────────────────────────────────────────────────────────────────────┤
│  §6 30-day rollup table (optional Phase C)                               │
│  Date | Events | Dock | External | Launches | OK | Fail | Top agent      │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Data Plan — New `/api/activity/analytics`

Extend backend **before** UI rework. Single aggregation function in `activity-log.js` (or `activity-analytics.js`) that merges:

| Source | Fields used |
|--------|-------------|
| `activity-log.json` | `events[]`, `daily{}`, `sessions{}` |
| `stack-usage.json` | `launches[]`, `outcomes[]` |
| `token-burn` report | `gain.daily[]`, `formatted.total_saved` |
| `agent-radar` (optional snapshot) | Current dock/external counts for “live now” chip |

**Response shape (draft):**

```json
{
  "generated_at": "ISO",
  "range": { "from": "2026-05-11", "to": "2026-06-10", "days": 30 },
  "kpis": {
    "today": { "events": 12, "dock_minutes": 45, "external_minutes": 20, "launches": 3, "success_rate": 0.67 },
    "rtk_saved": "12.4k"
  },
  "daily_series": [
    { "date": "2026-06-10", "events": 12, "dock_minutes": 45, "external_minutes": 20, "launches": 3, "peak_hour": 14, "driver": { "type": "agent", "id": "claude-code", "name": "Claude Code" } }
  ],
  "calendar_weeks": [[{ "date", "intensity", "dock_minutes", "events" }]],
  "drivers": [
    { "agent_id": "codex", "agent_name": "OpenAI Codex", "minutes": 320, "share": 0.41, "evidence": { "sessions": 8, "launches": 2 } }
  ],
  "agent_comparison": [
    { "agent_id": "claude-code", "today_min": 20, "d7_min": 140, "d30_min": 520, "peak_date": "2026-06-08", "active_days": 18, "sparkline": [1,0,3,2,...] }
  ],
  "timeline": [/* same as today events, with merged usage outcomes */],
  "burn_bridge": { "rtk": {}, "codeburn": null }
}
```

**Aggregation rules:**
- Pair `agent.dock.start` / `agent.dock.stop` (and external variants) into session durations; ignore orphan stops
- Attribute minutes to `agent_id` + `project` when present
- `driver` for a day = agent or project with highest attributed minutes
- `intensity` for heatmap = `log1p(dock_minutes + external_minutes)` normalized to 0–1
- Merge `session.end` / `session.fail` with usage outcomes for success rate

**Tests:** New `tests/activity-analytics.test.js` with fixture JSON (no UI).

---

## UI Component Plan

| Component | Purpose | Library |
|-----------|---------|---------|
| `ActivityKpiStrip` | Hero metrics row | Tailwind + existing panel styles |
| `ActivityCalendarHeatmap` | 5-week Sun–Sat grid, log color | Custom CSS grid + scale legend |
| `ActivityTrendLine` | 7d/30d minutes trend, log y-axis | `recharts` `LineChart` |
| `ActivityDriverTable` | Sortable daily drill-down | HTML table + click → filter timeline |
| `ActivityDotPlot` | Sorted horizontal bars (“driving activity”) | `recharts` `BarChart` layout=vertical |
| `ActivityAgentTable` | Tool comparison + sparkline column | `recharts` `Sparkline` in cell |
| `ActivityTimeline` | Filterable diary with expand rows | React state |
| `ActivityBurnBridge` | Thin wrapper around `TokenBurnPanel` | Reuse existing component |

**Shared:** `ui/src/components/activity/` folder + `ui/src/lib/activity-metrics.ts` (pure transforms for tests).

---

## Phased Execution (approval units)

### Phase A — Analytics foundation (backend only)
**Effort:** Small · **Risk:** Low · **Unlocks:** Everything else

- Add `buildActivityAnalytics({ from, to })` 
- Add `GET /api/activity/analytics?from=&to=&days=30`
- Fixture tests for pairing, drivers, calendar weeks, agent comparison
- No UI changes

**Done when:** `node --test tests/activity-analytics.test.js` passes; endpoint returns sane empty state on fresh install.

---

### Phase B — Sepia layout + hero charts
**Effort:** Medium · **Risk:** Low · **Depends:** Phase A

- Replace `ActivityPage.tsx` shell with sectioned layout matching reference density
- Implement KPI strip + calendar heatmap + trend line + daily driver table
- Wire to `/api/activity/analytics` (single fetch on load + Refresh)
- Day click on heatmap filters §4 timeline

**Done when:** Page visually reads as “dashboard” not “debug panel”; empty states are instructive.

---

### Phase C — Attribution + agent comparison
**Effort:** Medium · **Risk:** Medium (data sparsity) · **Depends:** Phase B

- Dot plot + “What is driving activity?” table
- Agent comparison table with 30d sparklines
- Merge `/api/usage` outcomes into timeline badges (✓ launch / ✗ fail)

**Done when:** 30 days of synthetic fixture data renders correctly; live sparse data degrades gracefully.

---

### Phase D — Diary polish + export
**Effort:** Small · **Risk:** Low · **Depends:** Phase B

- Richer `generateDiaryMarkdown()` (drivers, top agents, success rate)
- Export menu: today `.md`, 7-day summary `.md`, JSON dump
- Optional: append analytics summary to `memory.md` evidence block (coach context)

**Done when:** “Write diary .md” produces reference-quality daily summary, not bullet stub.

---

### Phase E — Burn bridge (optional, scoped)
**Effort:** Small · **Risk:** Low · **Depends:** Phase B

- Embed compact `TokenBurnPanel` at bottom of Activity
- Stub UI row: “CodeBurn ingest — not configured” with link to `docs/TOKEN_EFFICIENCY.md`
- **Do not** block Phases A–D on CodeBurn / Nate JSON ingest

**Done when:** RTK savings visible on Activity; future ingest has a documented hook point.

---

## What we explicitly will NOT do (v1)

- Rebuild Nate's token-burn data pipeline inside HOOT
- Add MySQL, D3, or new chart dependencies beyond `recharts`
- Show estimated LLM token counts without a real ingest source
- Move Activity to a separate app or change HOOT nav cap (stays under Intelligence)
- Auto-commit diary files to git

---

## Options for Approval

### Option 1 — Full sepia dashboard (recommended)
**Phases A → B → C → D**, then E if you want burn on the same page.

- Best match to reference
- ~4 focused PRs
- Highest operator value

### Option 2 — Charts-first minimal
**Phases A → B only** — KPIs + calendar + trend + driver table; defer dot plot and agent table.

- Faster ship (~2 PRs)
- Leaves “what is driving activity?” unanswered until later

### Option 3 — Data-only sprint
**Phase A only** — analytics API + tests; Activity page stays ugly but coach/MCP can call `getActivityAnalytics`.

- Unblocks AI coach answers (“what did I work on this week?”)
- No visual payoff yet

---

## Success Criteria (acceptance)

| # | Test |
|---|------|
| 1 | Fresh HOOT install: Activity loads without error; empty states explain radar/launch prerequisites |
| 2 | After 1 HOOT launch + 1 radar poll: today KPIs and timeline show real events |
| 3 | Calendar heatmap uses Sun–Sat grid with log color legend (like reference) |
| 4 | Clicking a calendar day filters the session diary to that date |
| 5 | “Driver” column names top agent or project for days with data |
| 6 | Agent comparison table shows dock+external minutes, not duplicate launch counts |
| 7 | `node --test tests/activity-analytics.test.js` + existing `tests/api.test.js` pass |
| 8 | Page uses HOOT sepia/gold palette — not a pixel clone of Nate's site |

---

## Recommended PR stack

| PR | Scope |
|----|-------|
| PR1 | `activity-analytics.js` + `/api/activity/analytics` + tests |
| PR2 | Chart primitives + Activity page Phase B layout |
| PR3 | Driver dot plot + agent table + usage merge (Phase C) |
| PR4 | Diary export enrichment + burn bridge (Phases D + E) |

---

## Approval Ask

1. **Which option?** (1 Full / 2 Charts-first / 3 Data-only)  
2. **Range default:** 30 days or 14 days?  
3. **Nav label:** Keep “Activity” or rename to “Telemetry”?  
4. **Burn bridge:** Include Phase E on Activity page, or keep token burn only on Overview/Scan?

**Recommendation:** **Option 1**, 30-day default, keep nav label “Activity”, include Phase E as a slim footer panel.

Once approved, implementation starts at Phase A (backend analytics) — no UI churn until the API shape is locked.