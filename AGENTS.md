# AgentDock

AgentDock is a local-only AI agent stack scanner, planner, terminal monitor, launcher, and memory system. It binds to `127.0.0.1` only, uses zero npm dependencies, and launches only commands embedded in approved Markdown profile files.

## Quick Start

```bash
node server.js
```

Open `http://127.0.0.1:7777` in your browser.

## Run Tests

```bash
node --test tests/*.test.js
```

## Architecture

| File | Role |
|------|------|
| `server.js` | HTTP server, route handler, session manager, project registry, stack evaluation |
| `scanner.ps1` | PowerShell system scanner — detects tools, env vars, Ollama models, hardware |
| `advisor.js` | Operations advisor — rule-based + optional Gemini API integration |
| `chat.js` | AI chat / mascot controller — maintains history, processes messages |
| `profiles/*.md` | Launch profiles — frontmatter metadata + PowerShell `launch` blocks |
| `memory.md` | Local learning layer — known successes, failures, work ethos, avoided loops |
| `index.html` | Single-page dashboard |

### Data Flow

1. **Scan** — `scanner.ps1` probes the local system and emits JSON.
2. **Evaluate** — `server.js` evaluates profiles against the scan + `memory.md`.
3. **Plan** — Build a ranked plan based on goal (privacy, fastest, cheapest, heavy, audit).
4. **Launch** — Execute a profile's PowerShell `launch` block in a monitored child process.
5. **Remember** — Outcomes are logged to `memory.md` and `state/stack-usage.json`.

## Key Files

- `server.js` — Core runtime. Exposes REST API on localhost.
- `scanner.ps1` — System probe. Outputs JSON consumed by `/api/scan`.
- `advisor.js` — Proactive advisor with optional Gemini fallback.
- `chat.js` — Session-based chat with structured command responses.
- `profiles/` — Markdown profiles defining agent stacks.
- `state/` — JSON state (projects, stack usage, sessions).
- `logs/` — Scan logs, launch logs, session transcripts.
- `briefs/` — Auto-generated research briefs.

## Safety Model

- **No arbitrary commands** — Only profile-defined PowerShell blocks are executed.
- **Preview warnings** — Dangerous patterns (`remove-item`, `git push`, `iex`, etc.) trigger warnings.
- **Secret redaction** — `.env` values are redacted; only key names and provider hints are shown.
- **Localhost only** — Binds to `127.0.0.1`. No cloud telemetry.
- **Session monitoring** — All launches are tracked, logged, and written to local memory.
