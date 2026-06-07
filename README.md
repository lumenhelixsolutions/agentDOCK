# AgentDock v2.0

Project-aware agent command center. Private local AI agent stack scanner, planner, Markdown memory core, research watch, monitored terminal, and launcher.

## Install

No npm dependencies required. Just clone and run:

```bash
cd agentdock
node server.js
```

Or on Windows, double-click `start-agentdock.bat`.

Open `http://127.0.0.1:7777` in your browser.

## Usage

- **Scan** — Click "System Scan" to detect installed agents, models, env keys, and hardware.
- **Plan** — Choose a goal (privacy, fastest, cheapest, heavy, audit) to get ranked profile recommendations.
- **Launch** — Select a profile and launch a monitored terminal session.
- **Chat** — Ask AgentDock AI for help choosing stacks or fixing setup issues.
- **Research** — Run the research watch to pull latest briefs from configured sources.

## Tests

```bash
node --test tests/*.test.js
```

Tests cover:
- Scanner JSON schema validation
- Profile frontmatter and PowerShell block validation
- Server health endpoint and API smoke tests
- Memory.md structure and evidence parsing

## Architecture

```
┌─────────────┐
│  index.html │  ← Dashboard UI
└──────┬──────┘
       │ HTTP (localhost only)
┌──────▼──────┐
│  server.js  │  ← Router, session manager, evaluator
└──────┬──────┘
       │
  ┌────┼────┬────────┬─────────┐
  ▼    ▼    ▼        ▼         ▼
scanner.ps1 advisor.js chat.js profiles/*.md
   │                    │           │
   ▼                    ▼           ▼
  JSON              Gemini API   launch blocks
   │                    │           │
   └────────────────────┴───────────┘
              │
         memory.md
         state/*.json
         logs/*.md
```

| Component | Responsibility |
|-----------|--------------|
| `server.js` | HTTP server, route handler, session manager, project registry, stack evaluation |
| `scanner.ps1` | PowerShell probe — tools, env vars, Ollama models, hardware |
| `advisor.js` | Rule-based + optional Gemini-powered operations advisor |
| `chat.js` | Session-based chat controller with structured command responses |
| `profiles/*.md` | Launch profiles with frontmatter metadata and PowerShell blocks |
| `memory.md` | Local learning layer — successes, failures, ethos, avoided loops |

## Safety Model

- Binds to `127.0.0.1` only.
- No cloud telemetry.
- No arbitrary shell command box.
- No secret values printed — key names and provider hints only.
- Launches only profile-defined command blocks.
- Dangerous patterns are preview-warned.
- Terminal sessions are logged locally.

## New in 2.0

- Project-aware registry with Git status, AGENTS.md detection, and portfolio health.
- Automated smoke tests using Node.js built-ins (`node:test`, `node:assert`).
- AGENTS.md for agent onboarding and architecture context.
- `/api/status` health endpoint.
