# AgentDock Integration Plan
## Combining Current v2.0 + Kimi_AgentDock Archive

---

## 1. Situation Analysis

You have two AgentDock projects:

### Project A: `D:/projects/agentdock` (Current v2.0)
**What it is:** A working, zero-dependency Node.js command center.
**What it does well:**
- Executes real agent launches via PowerShell (`scanner.ps1` + `server.js`)
- Monitors live terminal output with session tabs
- Evaluates 72 profiles against live scan data (tool presence, Ollama context, env vars)
- Blocks bad stacks via `memory.md` learning layer
- Discovers local projects, reads git status, renders AGENTS.md
- **77 tests pass.** It works today.

**What it lacks:**
- Single HTML file frontend (functional but not polished)
- No persistent database (JSON files only)
- Windows-centric scanner
- No visual pipeline builder

### Project B: `Kimi_AgentDock.zip` (Archived Full-Stack App)
**What it is:** A modern React 19 + TypeScript + tRPC + Drizzle ORM dashboard.
**What it does well:**
- Beautiful React UI: sidebar nav, dashboard, drag-and-drop Stack Builder
- Real DB schema (profiles, memory, scans, API keys, saved stacks)
- Cross-platform scanner (Node child_process, not PowerShell)
- Onboarding flow, floating AI advisor widget
- Visual pipeline health scoring

**What it lacks (critical):**
- **NO real launch execution.** Profiles have `launchCommands` but no router spawns processes.
- **NO real terminal monitoring.** No session manager, no stdout capture.
- **NO PowerShell integration.** The scanner reads env vars but doesn't run `scanner.ps1`.
- **Stubbed AI chat.** Returns hardcoded advice; no Gemini API call.
- **Memory engine doesn't block launches.** `checkAntiLoop` endpoint exists but isn't wired to launch validation.
- **Requires MySQL + 30+ npm packages.** Heavy setup for a local dev tool.
- **No tests for frontend.**

### The Core Insight
> **Project B is a beautiful dashboard without an engine. Project A is a powerful engine with a plain dashboard.**

They are complementary. Combining them means keeping the engine (A) and upgrading the face (B).

---

## 2. Strategic Options

### Option A: UI Transplant (Recommended)
**Approach:** Keep v2.0's zero-dependency backend exactly as-is. Replace the single `index.html` with Project B's React frontend, adapted to call v2.0's REST API.

**Pros:**
- Engine keeps working (77 tests still pass)
- No new runtime dependencies (MySQL, tRPC server)
- Fastest path to a polished product
- Can still run with `node server.js`

**Cons:**
- React build step added (but only at dev time)
- Lose tRPC type safety (HTTP REST instead)
- Lose Drizzle ORM (keep JSON persistence)

### Option B: Engine Backfill
**Approach:** Take Project B's codebase and implement the missing engine (launcher, scanner, monitor) inside its tRPC routers.

**Pros:**
- Modern full-stack architecture end-to-end
- Database persistence for everything
- tRPC type safety

**Cons:**
- Massive rewrite (months of work)
- Introduces MySQL dependency for a local tool
- Re-implementing v2.0's battle-tested logic from scratch
- 30+ npm packages = fragility

### Option C: Hybrid Bridge (Immediate Value)
**Approach:** Run both side-by-side. v2.0 on port 7777 as the "engine API." Project B's React app on port 3000 as the "dashboard." A thin proxy adapter connects them.

**Pros:**
- Immediate results without rewriting either
- Can test integration before committing
- Risk-free exploration

**Cons:**
- Two processes to manage
- Not a single unified product
- Temporary solution

---

## 3. Recommended Plan: "Phased Transplant"

**Phase 1: Hybrid Bridge (Week 1)**
- Run v2.0 server on `7777`
- Extract Project B's React frontend into `agentdock/ui/`
- Create a thin API client that wraps v2.0's REST endpoints
- Run React dev server on `3000` proxying to `7777`
- Validate all user flows work through the new UI

**Phase 2: UI Bundle (Week 2)**
- Build the React frontend to static files
- Teach `server.js` to serve the built React app as `index.html`
- Replace the old single-file HTML entirely
- Add `npm run build` step to v2.0's workflow
- Ship as one process: `node server.js` serves API + React SPA

**Phase 3: Selective Upgrade (Month 2)**
- Port Project B's Stack Builder visual pipeline to the React UI
- When a user builds a pipeline, serialize it to a v2.0 profile + launch script
- Add SQLite (via `better-sqlite3`) for persistent DB: profiles, memory, sessions
- Migrate JSON files (`projects.json`, `stack-usage.json`) to SQLite
- Keep zero external services (no MySQL)

**Phase 4: Polish (Month 3)**
- Port Project B's onboarding flow
- Implement real Gemini chat in the advisor (already stubbed in v2.0)
- Add cross-platform scanner improvements from Project B
- Frontend test coverage

---

## 4. Asset Inventory: What to Salvage from Each

### From Current v2.0 (Keep)
| Asset | Why |
|-------|-----|
| `server.js` | Engine: 31 API routes, session manager, project registry |
| `scanner.ps1` | Deep Windows scan: hardware, Ollama, .env, local models |
| `advisor.js` | Rule-based advisor + Gemini fallback |
| `chat.js` | AI mascot chat controller |
| `profiles/*.md` | 72 working launch profiles |
| `memory.md` | Learning layer format |
| `test/runner.js` | 77-test comprehensive suite |
| `coders-catalog.json` | Install guides for 12 tools |

### From Project B (Salvage)
| Asset | Why |
|-------|-----|
| `src/pages/` | Dashboard, Scan, Profiles, Memory, Research, Logs, Settings |
| `src/components/AppLayout.tsx` | Collapsible sidebar + top bar shell |
| `src/components/GeminiAdvisor.tsx` | Floating chat widget (adapt to v2.0 API) |
| `src/components/OnboardingTrainer.tsx` | 7-step onboarding flow |
| `src/pages/StackBuilder.tsx` | Visual drag-and-drop pipeline builder |
| `src/components/stack-builder/` | Node definitions, assessment panel, DnD kit setup |
| `db/schema.ts` | Table definitions (adapt to SQLite) |
| `src/index.css` | Tailwind + amber theme + animations |

### From Project B (Discard)
| Asset | Why |
|-------|-----|
| `api/routers/*.ts` | Stubbed or reimplementing v2.0 logic |
| `api/boot.ts` | Hono server (v2.0's http server replaces it) |
| `api/queries/connection.ts` | MySQL/PlanetScale (replace with SQLite) |
| `api/routers/scanner.ts` | Child_process scanner (inferior to `scanner.ps1`) |
| `package.json` deps | 30+ packages; keep only React + Vite + Tailwind + DnD |

---

## 5. Risk Assessment

| Risk | Mitigation |
|------|------------|
| React build breaks zero-dependency ethos | Build is dev-only; runtime remains `node server.js` |
| MySQL dependency adds ops burden | Use SQLite instead (single file, zero config) |
| Porting Stack Builder is complex | Phase 3; can ship without it initially |
| Two UI paradigms clash | Old HTML fully replaced; no hybrid UI state |
| Test coverage drops during transition | Keep `test/runner.js` running against API; add React tests later |

---

## 6. Success Criteria

1. `node server.js` starts one process serving API + React UI
2. All 77 existing API tests still pass
3. User can launch profiles, monitor terminals, and report outcomes through the React UI
4. Visual Stack Builder (Phase 3) can serialize a pipeline to a launchable v2.0 profile
5. No MySQL required; SQLite optional for persistence

---

## 7. Immediate Next Steps (If Approved)

1. Create `ui/` subdirectory in current agentdock
2. Extract React source from `Kimi_AgentDock.zip` into `ui/src/`
3. Strip Project B's backend code; keep only frontend assets
4. Create API client mapping tRPC calls → v2.0 REST endpoints
5. Run both servers; validate launch + monitor flow through React UI
6. Build and bundle into v2.0's static file serving
