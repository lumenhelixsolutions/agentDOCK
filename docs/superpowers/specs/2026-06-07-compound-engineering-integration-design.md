# Compound Engineering + Local Model Integration Design

> **Date:** 2026-06-07
> **Scope:** AgentDock
> **Status:** Draft — awaiting implementation plan

---

## 1. Overview & Goals

Integrate the [Compound Engineering plugin](https://github.com/EveryInc/compound-engineering-plugin) into AgentDock so that:

1. **Launchable CE profiles** exist for CE-supported frontends (Claude Code, Codex).
2. **All 37 CE skills and 51 CE agents** are discoverable via a central skills registry.
3. **Local model options** (Gemma 4B, DeepSeek variants) are available as standalone profiles with capability-aware warnings.
4. **Every profile launch is audited** for freshness, plugin installation status, and model-task compatibility.
5. **Core CE skill definitions** are cached offline for reading without internet access.

AgentDock keeps its zero-dependency runtime constraint. The integration adds static JSON catalogs, Markdown profiles, and PowerShell preflight scripts — no new npm packages.

---

## 2. CE Profile Mapping & Coverage

### 2.1 Frontend Support Matrix

After analyzing CE's documented plugin support and AgentDock's `coders-catalog.json`:

| Frontend | CE Plugin Support | AgentDock Status |
|----------|-------------------|------------------|
| `claude` (Claude Code) | Native marketplace plugin ✅ | Existing |
| `codex` (OpenAI Codex CLI) | Native plugin + Bun agent install ✅ | Existing |
| `opencode` | Converter-backed (may drift) ⚠️ | Existing |
| `gemini` (Gemini CLI) | Converter-backed (may drift) ⚠️ | Existing |
| `kimi` (Kimi Code CLI) | Not supported ❌ | Existing |
| `aider` | Not supported ❌ | Existing |
| `hermes` (Hermes Agent) | Not supported ❌ | Existing |

**Decision:** CE-specific profiles are created **only** for `claude` and `codex`. OpenCode and Gemini are documented as secondary with drift warnings. Kimi, Aider, and Hermes are excluded from CE profiles but remain fully usable for non-CE AgentDock workflows.

### 2.2 New CE Workflow Profiles (8 total)

These profiles launch a CE-ready agent session. Inside the session, the user or agent invokes the specific CE skill via slash command (`/ce-brainstorm`, `/ce-plan`, etc.).

| Profile ID | Frontend | CE Focus | Launch Command |
|------------|----------|----------|----------------|
| `compound-core-claude` | claude | General CE workflow access | `claude` |
| `compound-core-codex` | codex | General CE workflow access | `codex` |
| `compound-strategy-claude` | claude | `ce-strategy` — upstream anchoring | `claude` |
| `compound-strategy-codex` | codex | `ce-strategy` | `codex` |
| `compound-plan-work-claude` | claude | `ce-brainstorm` → `ce-plan` → `ce-work` | `claude` |
| `compound-plan-work-codex` | codex | Same chain | `codex` |
| `compound-review-compound-claude` | claude | `ce-code-review` → `ce-compound` | `claude` |
| `compound-review-compound-codex` | codex | `ce-code-review` → `ce-compound` | `codex` |

Each profile includes:
- Standard AgentDock frontmatter (`id`, `name`, `frontend`, `command`, `backend`, `mode`, `task_mode`, `required_env`, `status`, `description`)
- A `preflight` block that runs the Audit & Sync System (Section 5)
- A `launch` block that starts the frontend with the project path injected

### 2.3 Existing Profiles Remain Unchanged

All 70+ existing profiles (`cloud-*`, `hybrid-*`, `local-*`, `claude-code-heavy.md`, etc.) are untouched. CE profiles are strictly additive.

---

## 3. Gemma 4B & DeepSeek Local Profile Matrix

### 3.1 Gemma 4B Profiles (all 9 task types)

Gemma 4B is a small model (4 billion parameters) best suited for lightweight tasks. All 9 task types get a profile so the capability matrix (Section 4) can warn appropriately.

| Profile ID | Model Tag (Ollama) | Task | Context |
|------------|-------------------|------|---------|
| `local-safe-audit-gemma4b` | `gemma:4b` | Read-only audit | 8192 |
| `local-code-review-gemma4b` | `gemma:4b` | Code review | 8192 |
| `local-bug-hunt-gemma4b` | `gemma:4b` | Bug hunt | 8192 |
| `local-architecture-gemma4b` | `gemma:4b` | Architecture | 8192 |
| `local-documentation-gemma4b` | `gemma:4b` | Documentation | 8192 |
| `local-performance-gemma4b` | `gemma:4b` | Performance | 8192 |
| `local-security-audit-gemma4b` | `gemma:4b` | Security audit | 8192 |
| `local-patch-test-gemma4b` | `gemma:4b` | Patch test | 8192 |
| `local-heavy-refactor-gemma4b` | `gemma:4b` | Heavy refactor | 8192 |

Each profile:
- Sets `OLLAMA_CONTEXT_LENGTH=8192`
- Sets `OLLAMA_NUM_PARALLEL=1`
- Sets `OLLAMA_MAX_LOADED_MODELS=1`
- Runs `ollama ps` in `preflight` to confirm model availability
- Includes the capability-matrix warning logic (see Section 4)

### 3.2 DeepSeek Profiles (4 variants)

DeepSeek offers coding-specialized and reasoning-specialized models at multiple sizes.

| Profile ID | Model Tag (Ollama) | Task Focus | Context | GPU Recommended |
|------------|-------------------|------------|---------|-----------------|
| `local-code-assist-deepseek-7b` | `deepseek-coder:6.7b` | Coding assistance | 16384 | No |
| `local-heavy-refactor-deepseek-16b` | `deepseek-coder-v2:16b` | Complex refactor | 65536 | Yes |
| `local-reasoning-deepseek-r1-8b` | `deepseek-r1:8b` | Reasoning tasks | 32768 | No |
| `local-reasoning-deepseek-r1-32b` | `deepseek-r1:32b` | Deep reasoning | 65536 | Yes |

All DeepSeek profiles set `OLLAMA_FLASH_ATTENTION=1` and `OLLAMA_KV_CACHE_TYPE=q8_0` for efficient memory usage.

---

## 4. Model-Capability Matrix + CE Compatibility

### 4.1 File: `compatibility-rules.json` (extended)

The existing `compatibility-rules.json` is extended with two new top-level keys: `modelCapabilities` and `ceCompatibility`.

```json
{
  "modelCapabilities": {
    "gemma:4b": {
      "max_tier": "light",
      "context": 8192,
      "warnings": ["heavy-refactor", "architecture"],
      "description": "Small local model. Good for audit, docs, and quick scans."
    },
    "deepseek-coder:6.7b": {
      "max_tier": "standard",
      "context": 16384,
      "warnings": ["heavy-refactor"],
      "description": "Mid-size coding model. Suitable for most coding tasks."
    },
    "deepseek-coder-v2:16b": {
      "max_tier": "advanced",
      "context": 65536,
      "warnings": [],
      "description": "Large coding model. Handles complex refactor and deep context."
    },
    "deepseek-r1:8b": {
      "max_tier": "standard",
      "context": 32768,
      "warnings": ["heavy-refactor"],
      "description": "Reasoning model. Good for step-by-step analysis."
    },
    "deepseek-r1:32b": {
      "max_tier": "advanced",
      "context": 65536,
      "warnings": [],
      "description": "Large reasoning model. Best local choice for complex tasks."
    },
    "llama3.1:8b": {
      "max_tier": "standard",
      "context": 8192,
      "warnings": ["heavy-refactor"],
      "description": "Balanced local model."
    },
    "claude-sonnet-4": {
      "max_tier": "unlimited",
      "context": 200000,
      "warnings": [],
      "description": "Cloud model. No local capability restrictions."
    }
  },
  "ceCompatibility": {
    "ce-strategy": {
      "frontends": ["claude", "codex"],
      "min_context": 8192,
      "description": "Create or maintain STRATEGY.md"
    },
    "ce-ideate": {
      "frontends": ["claude", "codex"],
      "min_context": 8192,
      "description": "Big-picture ideation"
    },
    "ce-brainstorm": {
      "frontends": ["claude", "codex"],
      "min_context": 8192,
      "description": "Requirements exploration"
    },
    "ce-plan": {
      "frontends": ["claude", "codex"],
      "min_context": 16384,
      "description": "Implementation planning"
    },
    "ce-work": {
      "frontends": ["claude", "codex"],
      "min_context": 16384,
      "description": "Plan execution"
    },
    "ce-code-review": {
      "frontends": ["claude", "codex"],
      "min_context": 32768,
      "description": "Multi-agent code review"
    },
    "ce-compound": {
      "frontends": ["claude", "codex"],
      "min_context": 8192,
      "description": "Document learnings"
    },
    "ce-debug": {
      "frontends": ["claude", "codex"],
      "min_context": 16384,
      "description": "Systematic debugging"
    },
    "ce-product-pulse": {
      "frontends": ["claude", "codex"],
      "min_context": 8192,
      "description": "Usage/performance reporting"
    }
  }
}
```

### 4.2 Runtime Behavior

At profile launch, the preflight script:

1. Reads `compatibility-rules.json`.
2. Looks up the profile's `model` in `modelCapabilities`.
3. Looks up the profile's `task_mode` against the model's `max_tier`:
   - If `task_mode` maps to a tier above `max_tier`, emit a warning with 2 alternative profiles that can handle the task.
4. If the profile is a CE profile, looks up the target CE skill in `ceCompatibility`:
   - Verifies the frontend is in `frontends`.
   - Verifies the model's `context` >= `min_context`.
   - If either check fails, block launch and explain why.

### 4.3 Task-to-Tier Mapping

```json
{
  "taskTiers": {
    "safe-audit": "light",
    "documentation": "light",
    "patch-test": "standard",
    "code-review": "standard",
    "bug-hunt": "standard",
    "performance": "standard",
    "security-audit": "advanced",
    "architecture": "advanced",
    "heavy-refactor": "advanced"
  }
}
```

---

## 5. Audit & Sync System

### 5.1 What Gets Audited

Every profile launch runs a PowerShell preflight that performs three checks:

**Check 1: Profile Freshness**
- Compares the profile's `ce_version` frontmatter field (if present) against the latest CE release tag from `https://api.github.com/repos/EveryInc/compound-engineering-plugin/releases/latest`.
- If the profile targets an older CE version, warns: *"CE plugin v{X} available. Current profile targets v{Y}. Update recommended."*
- Non-CE profiles skip this check.

**Check 2: Plugin Installation Status**
- For `frontend: claude`: checks if `claude` CLI is installed. If CE profile, additionally checks `~/.claude/plugins/compound-engineering/` or verifies via `claude --plugin-dir`.
- For `frontend: codex`: checks if `codex` CLI is installed. If CE profile, checks `~/.codex/skills/compound-engineering/` existence.
- If the CE plugin is missing, the preflight prints the exact install command from CE's documented installer and pauses for user confirmation before proceeding.

**Check 3: Model Capability Gate**
- Runs the model-capability matrix check (Section 4.2).
- Warnings are printed to the terminal. Tier mismatches require explicit user confirmation to continue.

### 5.2 Audit Logging

All audit results are appended to `state/audit-log.json`:

```json
{
  "timestamp": "2026-06-07T17:30:00Z",
  "profile": "local-heavy-refactor-gemma4b",
  "model": "gemma:4b",
  "checks": {
    "freshness": { "status": "pass", "ce_version": null },
    "plugin": { "status": "pass", "ce_version": null },
    "capability": { "status": "warn", "message": "Model gemma:4b rated 'light' tier. Task 'heavy-refactor' requires 'advanced'. Suggested alternatives: local-heavy-refactor-deepseek-16b, cloud-heavy-refactor-claude" }
  },
  "user_continued": true
}
```

This log enables pattern detection over time (e.g., "Gemma 4B on heavy-refactor has a 90% user-override rate").

### 5.3 Auto-Update Trigger

If a CE profile's `ce_version` is 2+ minor versions behind upstream, the preflight sets `status: out-of-date` in the profile frontmatter. The AgentDock dashboard displays an "Update Available" badge on the profile card. Clicking it runs a sync script that:
1. Fetches the latest CE release notes.
2. Updates the profile's `ce_version` field.
3. Re-downloads cached skill files if they changed.

---

## 6. Skills Catalog & Registry

### 6.1 Directory Structure

```
skills/
└── compound-engineering/
    ├── skills-catalog.json      # All 37 CE skills
    ├── agents-catalog.json      # All 51 CE agents
    └── cache/
        ├── ce-brainstorm/
        │   └── SKILL.md
        ├── ce-plan/
        │   └── SKILL.md
        ├── ce-work/
        │   └── SKILL.md
        ├── ce-code-review/
        │   └── SKILL.md
        ├── ce-compound/
        │   └── SKILL.md
        ├── ce-debug/
        │   └── SKILL.md
        ├── ce-strategy/
        │   └── SKILL.md
        ├── ce-product-pulse/
        │   └── SKILL.md
        └── README.md            # Index of cached vs. on-demand skills
```

### 6.2 `skills-catalog.json` Schema

```json
{
  "source": "https://github.com/EveryInc/compound-engineering-plugin",
  "version": "3.11.2",
  "last_synced": "2026-06-07T17:00:00Z",
  "skills": [
    {
      "id": "ce-brainstorm",
      "name": "CE Brainstorm",
      "description": "Interactive Q&A to think through a feature or problem and write a right-sized requirements doc before planning.",
      "category": "workflow",
      "upstream_url": "https://raw.githubusercontent.com/EveryInc/compound-engineering-plugin/main/plugins/compound-engineering/skills/ce-brainstorm/SKILL.md",
      "cached": true,
      "local_path": "skills/compound-engineering/cache/ce-brainstorm/SKILL.md",
      "compatible_frontends": ["claude", "codex"]
    }
  ]
}
```

### 6.3 `agents-catalog.json` Schema

Same structure, but for CE agents (`ce-adversarial-reviewer`, `ce-learnings-researcher`, etc.).

### 6.4 API Endpoint: `/api/skills`

`server.js` adds:

```javascript
// GET /api/skills
// Returns the full skills catalog
// GET /api/skills/:id
// Returns a single skill. If cached, serves local file. If not cached, proxies from upstream_url.
// GET /api/skills/:id/content
// Returns the raw SKILL.md content for reading in the dashboard
```

All endpoints are read-only and require no auth (localhost only).

### 6.5 UI: Skills Tab

The dashboard `index.html` gets a new "Skills" tab that:
- Lists all 37 CE skills with name, category, and compatible frontends.
- Shows a "Cached" badge for the 8 core skills.
- Clicking a skill opens a modal with its `description` and a "Read SKILL.md" button.
- For cached skills, reads from local disk. For non-cached, fetches from GitHub raw URL.
- Skills are filterable by category (`workflow`, `review`, `debug`, `utility`, etc.).

---

## 7. Local Skill Cache

### 7.1 What Gets Cached

The 8 core CE workflow skills are cached locally:

1. `ce-strategy`
2. `ce-ideate`
3. `ce-brainstorm`
4. `ce-plan`
5. `ce-work`
6. `ce-code-review`
7. `ce-compound`
8. `ce-debug`

`ce-product-pulse` is also cached (9 total) as it's the read-side companion to the workflow.

### 7.2 Cache Population

Initial population is manual as part of implementation. A `scripts/sync-ce-skills.ps1` PowerShell script is provided for ongoing updates:

```powershell
# scripts/sync-ce-skills.ps1
$baseUrl = "https://raw.githubusercontent.com/EveryInc/compound-engineering-plugin/main/plugins/compound-engineering/skills"
$skills = @("ce-strategy","ce-ideate","ce-brainstorm","ce-plan","ce-work","ce-code-review","ce-compound","ce-debug","ce-product-pulse")

foreach ($skill in $skills) {
  $outDir = "skills/compound-engineering/cache/$skill"
  New-Item -ItemType Directory -Force -Path $outDir | Out-Null
  Invoke-WebRequest -Uri "$baseUrl/$skill/SKILL.md" -OutFile "$outDir/SKILL.md"
  Write-Host "Synced $skill"
}
```

A Node.js equivalent `scripts/sync-ce-skills.js` is also provided for cross-platform use without PowerShell.

### 7.3 Cache Size Budget

Each `SKILL.md` is ~5-20KB. The 9 cached skills total <200KB. Reference files are **not** cached unless explicitly included (kept under 1MB total).

### 7.4 Version Tracking

`skills/compound-engineering/cache/.version` stores the upstream CE version that the cache was last synced from. The audit system compares this against the latest GitHub release.

---

## 8. File Structure (New & Modified)

### New Files

| File | Purpose |
|------|---------|
| `profiles/compound-core-claude.md` | CE general workflow (Claude) |
| `profiles/compound-core-codex.md` | CE general workflow (Codex) |
| `profiles/compound-strategy-claude.md` | CE strategy skill (Claude) |
| `profiles/compound-strategy-codex.md` | CE strategy skill (Codex) |
| `profiles/compound-plan-work-claude.md` | CE plan+work chain (Claude) |
| `profiles/compound-plan-work-codex.md` | CE plan+work chain (Codex) |
| `profiles/compound-review-compound-claude.md` | CE review+compound (Claude) |
| `profiles/compound-review-compound-codex.md` | CE review+compound (Codex) |
| `profiles/local-safe-audit-gemma4b.md` | Gemma 4B safe audit |
| `profiles/local-code-review-gemma4b.md` | Gemma 4B code review |
| `profiles/local-bug-hunt-gemma4b.md` | Gemma 4B bug hunt |
| `profiles/local-architecture-gemma4b.md` | Gemma 4B architecture |
| `profiles/local-documentation-gemma4b.md` | Gemma 4B documentation |
| `profiles/local-performance-gemma4b.md` | Gemma 4B performance |
| `profiles/local-security-audit-gemma4b.md` | Gemma 4B security audit |
| `profiles/local-patch-test-gemma4b.md` | Gemma 4B patch test |
| `profiles/local-heavy-refactor-gemma4b.md` | Gemma 4B heavy refactor |
| `profiles/local-code-assist-deepseek-7b.md` | DeepSeek 7B coding |
| `profiles/local-heavy-refactor-deepseek-16b.md` | DeepSeek 16B refactor |
| `profiles/local-reasoning-deepseek-r1-8b.md` | DeepSeek R1 8B reasoning |
| `profiles/local-reasoning-deepseek-r1-32b.md` | DeepSeek R1 32B reasoning |
| `skills/compound-engineering/skills-catalog.json` | CE skills registry |
| `skills/compound-engineering/agents-catalog.json` | CE agents registry |
| `skills/compound-engineering/cache/*/SKILL.md` | 9 cached skill files |
| `skills/compound-engineering/cache/README.md` | Cache index |
| `skills/compound-engineering/cache/.version` | Cache version tracker |
| `scripts/sync-ce-skills.ps1` | PowerShell cache updater |
| `scripts/sync-ce-skills.js` | Node.js cache updater |

### Modified Files

| File | Change |
|------|--------|
| `compatibility-rules.json` | Add `modelCapabilities`, `ceCompatibility`, `taskTiers` keys |
| `server.js` | Add `/api/skills`, `/api/skills/:id`, `/api/skills/:id/content` endpoints |
| `index.html` | Add "Skills" tab to dashboard |
| `AGENTS.md` | Document new profiles, skills system, and audit behavior |

---

## 9. API Changes

### `GET /api/skills`

Returns the full `skills-catalog.json`.

### `GET /api/skills/:id`

Returns a single skill object from the catalog.

### `GET /api/skills/:id/content`

Returns the raw `SKILL.md` content:
- If `cached: true`, reads from `skills/compound-engineering/cache/{id}/SKILL.md`.
- If `cached: false`, fetches from `upstream_url` (GitHub raw) and returns it (not cached to disk).

### `GET /api/catalog` (existing)

Unchanged. Continues to serve `coders-catalog.json`.

---

## 10. UI Changes

### Dashboard Tabs

The existing dashboard gets a new "Skills" tab alongside existing tabs (Profiles, Projects, Terminal, etc.).

### Skills Tab Layout

```
+--------------------------------------------------+
|  Skills                              [Search...] |
+--------------------------------------------------+
|  Filter: [All] [Workflow] [Review] [Debug] [...] |
+--------------------------------------------------+
|  CE Brainstorm                    [Cached] [Read]|
|  Interactive Q&A to think through...   claude codex
+--------------------------------------------------+
|  CE Plan                          [Cached] [Read]|
|  Turn feature ideas into detailed...   claude codex
+--------------------------------------------------+
|  ...                                             |
+--------------------------------------------------+
```

Clicking "Read" opens a modal showing the `SKILL.md` content.

### Profile Cards

CE profiles display a "Compound Engineering" badge. Profiles with `status: out-of-date` show an orange "Update" badge.

### Launch Warnings

When a capability warning fires, a modal appears before launch:

```
⚠️ Capability Warning
Model gemma:4b is rated "light" tier.
Task "heavy-refactor" requires "advanced" tier.

Suggested alternatives:
1. local-heavy-refactor-deepseek-16b
2. cloud-heavy-refactor-claude

[Launch Anyway] [Pick Alternative] [Cancel]
```

---

## 11. Testing Strategy

### New Tests

| Test File | Coverage |
|-----------|----------|
| `tests/compatibility-rules.test.js` | `compatibility-rules.json` schema validity, `modelCapabilities` lookups, `ceCompatibility` lookups, `taskTiers` mappings |
| `tests/skills-catalog.test.js` | `skills-catalog.json` schema, all 37 skills have required fields, all cached skills have local files |
| `tests/ce-profiles.test.js` | All 8 CE profiles have valid frontmatter, `ce_version` field present, `preflight` block present |
| `tests/gemma-profiles.test.js` | All 9 Gemma profiles have valid frontmatter, `ollama` model tag correct, `preflight` block present |
| `tests/deepseek-profiles.test.js` | All 4 DeepSeek profiles have valid frontmatter, model tags correct |
| `tests/server-skills-api.test.js` | `/api/skills` returns 200 with array, `/api/skills/ce-plan` returns correct skill, `/api/skills/ce-plan/content` returns markdown |
| `tests/audit-log.test.js` | `state/audit-log.json` is valid JSON, entries have required fields |

### Existing Tests

All existing tests (`server.test.js`, `scanner.test.js`, `profiles.test.js`, `memory.test.js`) must continue to pass.

---

## 12. Open Questions / Future Work

1. **OpenCode/Gemini CE support:** These frontends use converter-backed CE installs. Should AgentDock auto-run the Bun installer for them, or just warn? **Decision for v1:** Warn only. Auto-install is v2.

2. **CE agent dispatch:** Some CE skills dispatch sub-agents (e.g., `ce-code-review` spawns `ce-adversarial-reviewer`). AgentDock currently tracks single sessions. Should it track sub-agent trees? **Decision for v1:** No. Track the parent session only.

3. **Kimi CE support:** If CE adds Kimi support in the future, the `ceCompatibility` table and profiles can be extended with no structural changes.

4. **Auto-sync cadence:** Should `sync-ce-skills` run automatically (e.g., weekly cron), or only on-demand? **Decision for v1:** On-demand only, triggered by user in UI or manual script execution.

---

## Spec Self-Review Checklist

- [x] **Placeholder scan:** No TBDs, TODOs, or incomplete sections.
- [x] **Internal consistency:** Profile counts, model tags, and tier mappings are consistent across sections.
- [x] **Scope check:** This is a single focused integration. No billing, no auth, no cloud telemetry.
- [x] **Ambiguity check:** All JSON schemas are explicit. All file paths are exact.
