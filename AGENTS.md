# HOOT — Local AI Command Center

HOOT is a local-only AI agent command center (engine package: `agentdock`). It scans your machine, plans agent stacks, monitors terminals, launches approved profiles, and learns from memory. It binds to `127.0.0.1` only, uses zero runtime npm dependencies, and launches only commands embedded in approved Markdown profile files.

## Quick Start

```bash
node server.js
```

Open `http://127.0.0.1:7777` in your browser.

## Build & Test

HOOT has **zero runtime npm dependencies**. All tests use Node.js built-in modules.

### Run All Tests

```bash
npm test
# or explicitly:
node --test tests/*.test.js
```

### Test Structure

| Test File | Coverage |
|-----------|----------|
| `tests/server.test.js` | HTTP server startup, `/api/status`, `/api/catalog`, `/api/profiles` |
| `tests/scanner.test.js` | Scan JSON schema, `parseOllamaPsRaw`, `normalizeLoadedModels` |
| `tests/profiles.test.js` | Frontmatter parsing, required fields, PowerShell block presence |
| `tests/memory.test.js` | `memory.md` structure, evidence block parsing, status validation |

### Adding Tests

Create a new file in `tests/`:

```js
const { describe, it } = require('node:test');
const assert = require('node:assert');

describe('my feature', () => {
  it('does something', () => {
    assert.strictEqual(1 + 1, 2);
  });
});
```

### Linting

No linter is configured by design (zero dependencies). Follow the existing style:
- 2-space indentation
- Single quotes for strings
- Semicolons optional but consistent within a file
- Use `const` / `let`, avoid `var`

## Architecture

| File | Role |
|------|------|
| `server.js` | HTTP server, route handler, session manager, project registry, stack evaluation |
| `scanner.ps1` | PowerShell system scanner — detects tools, env vars, Ollama models, hardware |
| `advisor.js` | Operations advisor — rule-based + optional Gemini API integration |
| `chat.js` | AI chat / mascot controller — maintains history, processes messages |
| `profiles/*.md` | Launch profiles — frontmatter metadata + PowerShell `launch` blocks |
| `memory.md` | Local learning layer — known successes, failures, work ethos, avoided loops |
| `index.html` | Single-page dashboard — theming, keyboard shortcuts, responsive layout |
| `compatibility-rules.json` | Stack evaluation rules — model capabilities, CE compatibility, task tiers |
| `skills/compound-engineering/skills-catalog.json` | Compound Engineering skills registry |
| `scripts/sync-ce-skills.js` | Node.js script to sync CE skills from GitHub |
| `scripts/sync-ce-skills.ps1` | PowerShell script to sync CE skills from GitHub |

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

## Integrations (Phase 1)

| Integration | Location |
|-------------|----------|
| RTK token efficiency | `state/user-settings.json`, scanner `token_efficiency` |
| MCP git catalog | `state/mcp-catalog.json`, `GET /api/mcp` |
| llama.cpp settings | Settings UI, `GET/POST /api/settings`, `backend: llamacpp` profiles |
| Docs | `D:\projects\docs/AI_OS_INTEGRATIONS.md` |

Sample profiles: `local-safe-audit-llamacpp.md`, `compound-core-claude-rtk.md`

## Upstream AgentDock framework (reference only)

HOOT is **not** [AgentDock/AgentDock](https://github.com/AgentDock/AgentDock) on GitHub. That repo ships `agentdock-core` (TypeScript nodes, orchestration, evaluation) and a Next.js hub client. Portfolio policy: borrow patterns, never vendor the monorepo or add `agentdock-core` as a runtime dependency.

| Topic | Local HOOT | Upstream reference |
|-------|------------|-------------------|
| Launch / profiles | `profiles/*.md` PowerShell blocks | `agents/*/config.yaml` templates |
| Evaluation | `bench-results.js`, `/api/bench/*` | `docs/evaluations/` harness |
| Orchestration | Phase 4 `coach-graph/` (planned) | `docs/architecture/orchestration/` |
| UI | `ui/` Vite/React | Next.js hub at hub.agentdock.ai |

| Doc / skill | Path |
|-------------|------|
| External capability | `D:\projects\docs\external-capabilities\agentdock-upstream.md` |
| Portfolio skill | `D:\projects\skills\agentdock-framework\SKILL.md` |
| ECC copy | `D:\projects\ecc\skills\agentdock-framework\SKILL.md` |

**M9 bench lane:** `scripts/bench-local-models.mjs` writes `state/bench-results.csv`; `applyBenchToProfile()` adjusts stack scores for Ollama/llama.cpp models.

## Chatbot / Coach UI

Build or upgrade conversational UI with **[assistant-ui](https://github.com/assistant-ui/assistant-ui)** — portfolio standard.

| Asset | Path |
|-------|------|
| Agent skill | `skills/chatbot-builder/SKILL.md` |
| Human doc | `docs/CHATBOT_BUILDER.md` |
| Portfolio standard | `D:\projects\docs\CHATBOT_STACK.md` |
| AI OS context | `D:\projects\docs\AI_OS_ARCHITECTURE.md` |

- UI packages live in `ui/` only (server stays zero runtime npm deps).
- Coach calls existing `POST /api/chat` via an assistant-ui external-store runtime.
- Launch commands from chat require UI approval before profile execution.

## Compound Engineering Integration

AgentDock integrates the [Compound Engineering](https://github.com/EveryInc/compound-engineering-plugin) skill library as an available set of build, planning, and review capabilities.

### Supported Frontends

| Frontend | CE Support | Notes |
|----------|-----------|-------|
| `claude` | Full | All 9 core CE skills available |
| `codex` | Full | All 9 core CE skills available |
| `gemini` | Converter-backed | CE blocks converted to Gemini equivalents; may drift |
| `opencode` | Converter-backed | CE blocks converted to OpenCode equivalents; may drift |
| `kimi` | None | Not compatible with CE skill library |
| `aider` | None | Not compatible with CE skill library |
| `hermes` | None | Not compatible with CE skill library |

### CE Workflow Profiles

Eight CE workflow profiles are available for `claude` and `codex`:

- **Core workflows:** `compound-core-claude.md`, `compound-core-codex.md` (brainstorm → plan → work → review)
- **Strategy workflows:** `compound-strategy-claude.md`, `compound-strategy-codex.md` (architecture + performance tasks)
- **Plan + Work workflows:** `compound-plan-work-claude.md`, `compound-plan-work-codex.md` (planning + execution)
- **Compound review workflows:** `compound-review-compound-claude.md`, `compound-review-compound-codex.md` (code review + compound analysis)

### Local Model Profiles

Local Ollama profiles are provided for lightweight and advanced tasks:

| Profile | Model | Best For | Tier |
|---------|-------|----------|------|
| `local-*-gemma4b.md` (×9) | `gemma:4b` | Light tasks (safe-audit, documentation) | `light` |
| `local-code-assist-deepseek-6.7b.md` | `deepseek-coder:6.7b` | Standard coding tasks | `standard` |
| `local-heavy-refactor-deepseek-16b.md` | `deepseek-coder-v2:16b` | Heavy refactor, architecture | `advanced` |
| `local-reasoning-deepseek-r1-8b.md` | `deepseek-r1:8b` | Reasoning tasks | `standard` |
| `local-reasoning-deepseek-r1-32b.md` | `deepseek-r1:32b` | Advanced reasoning | `advanced` |

### Syncing CE Skills

Run the sync script to download the latest CE skill definitions from GitHub:

```bash
# Node.js (cross-platform)
node scripts/sync-ce-skills.js

# PowerShell (Windows)
.\scripts\sync-ce-skills.ps1
```

This populates `skills/compound-engineering/cache/` with the 9 core CE skills.

### Audit System

Before launching a profile, AgentDock audits it against `compatibility-rules.json`:

- **Model capability check** — Verifies the model can handle the task tier (`light`/`standard`/`advanced`)
- **CE compatibility check** — For CE workflows, verifies the frontend supports CE and has sufficient context
- **Context check** — Warns if `required_context` exceeds the model's known limit
- **Auto-suggestions** — Suggests up to 2 alternative profiles if the current one has warnings

Audit results:
- **Errors** block launch until resolved
- **Warnings** require user confirmation before proceeding
- **Suggestions** are informational and non-blocking

## File Conventions

### Profiles (`profiles/*.md`)

Every profile must start with frontmatter delimited by `---`:

```markdown
---
id: my-profile
name: My Profile
task_mode: safe-audit
mode: local
frontend: ollama
backend: ollama
model: llama3.1:8b
required_context: 8192
required_env:
  - OPENAI_API_KEY
---

Description here.

```powershell launch
# Launch script goes here
ollama run llama3.1:8b
```
```

Required frontmatter fields:
- `name` (string)
- One of `goal`, `task_mode`, or `mode`
- One of `stack`, `frontend`, or `backend`
- At least one ````powershell launch` block

### Memory (`memory.md`)

Use evidence blocks so `memoryBlocks()` can parse them:

```markdown
## Evidence: profile-id run
Date: 2026-01-01T00:00:00Z
Profile: profile-id
Status: blocked
Observed: exitCode=1
Reason: Model context too low
```

Status values: `success`, `known-good`, `observed-run`, `blocked`, `failure`, `observed-failure`.

### Project Brain (`.agentdock/project-brain/*`)

Every repo that participates in the shared portfolio pipeline should maintain a canonical project-brain directory:

- `.agentdock/project-brain/summary.md`
- `.agentdock/project-brain/current-state.md`
- `.agentdock/project-brain/graph.json`
- `.agentdock/project-brain/wiki/index.md`
- `.agentdock/project-brain/artifacts.json`

Required coordination rules:
- `current-state.md` is the authoritative repo-wide pipeline snapshot for concurrent agents.
- `current-state.md` must include `Timestamp`, `Plan-Version`, `Milestone-Version`, and `Canonical-For-Project: true`.
- `artifacts.json` and `graph.json` must mirror the same timestamp/version family in machine-readable form.
- At session end, always try to refresh the repo's project-brain snapshot before stopping.
- Versioning is project-wide, not agent-local: all agents working the same repo should converge on the same build-plan and milestone versions.

## Safety Model

- **No arbitrary commands** — Only profile-defined PowerShell blocks are executed.
- **Preview warnings** — Dangerous patterns (`remove-item`, `git push`, `iex`, etc.) trigger warnings.
- **Secret redaction** — `.env` values are redacted; only key names and provider hints are shown.
- **Localhost only** — Binds to `127.0.0.1`. No cloud telemetry.
- **Session monitoring** — All launches are tracked, logged, and written to local memory.
- **Auto-blocking** — Two consecutive failures on the same project auto-block the profile in memory.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `EADDRINUSE` on startup | Kill the existing Node process on port 7777 or set `AGENTDOCK_PORT` to another port. |
| Scanner returns empty JSON | Ensure PowerShell is installed and `scanner.ps1` is not blocked by execution policy. Run `Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process`. |
| Gemini chat not responding | Set `GEMINI_API_KEY` or `GOOGLE_API_KEY` environment variable. Without it, the advisor falls back to rule-based output. |
| Profiles not showing | Verify `profiles/` exists and contains `.md` files with valid frontmatter. Check `npm test` output. |
| Sessions not appearing in terminal | Check browser console for network errors. Ensure the server is running on the expected port. |
| CE skills not showing in UI | Run `node scripts/sync-ce-skills.js` to download skill definitions. Verify `skills/compound-engineering/cache/` exists and contains `.md` files. |
| Audit blocks a CE profile launch | Check `compatibility-rules.json` for model capability and CE compatibility rules. Use a frontend with full CE support (`claude` or `codex`) or select a lower-tier task. |
| Sync script fails with timeout | The GitHub raw CDN may be slow. Retry or increase timeout in `scripts/sync-ce-skills.js` (`req.setTimeout(ms)`) or `scripts/sync-ce-skills.ps1` (`-TimeoutSec`). |

## API Key Vault (local)

AgentDock auto-imports API keys on every scan and at server startup:

| Source | Harvested into |
|--------|------------------|
| Process / user / machine env | `state/key-vault.json` |
| Scanned `.env` file paths | Same vault (values read server-side only) |
| Settings UI manual entry | `POST /api/keys` |

**Used for:** AI Coach (`chat.js`), profile evaluation, Stack Builder cloud checks, launch sessions (`createSession` injects vault env).

**API:** `GET /api/keys` (masked only), `POST /api/keys`, `POST /api/keys/sync`

**Display:** UI shows last 3 characters (`•••••••abc`). Full values never returned by API.

**Session start checklist:** Read `AGENTS.md`, `docs/plans/` latest milestone, and `.agentdock/project-brain/current-state.md` if present before large changes.

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `AGENTDOCK_PORT` | Server port (default `7777`) |
| `AGENTDOCK_DEBUG` | Include stack traces in 500 errors |
| `GEMINI_API_KEY` | Gemini API key — auto-imported to vault on scan/startup |
| `GOOGLE_API_KEY` | Alternative Gemini API key — same vault |

## Contributing

- Keep the zero-dependency runtime constraint.
- Update `tests/` when adding server-side logic.
- Update `README.md` for user-facing changes.
- Update `AGENTS.md` for architectural or workflow changes.
- Update `compatibility-rules.json` when adding new models or changing task tiers.
- Run `node scripts/sync-ce-skills.js` after CE plugin updates to refresh cached skills.
- Run `npm test` before committing.
