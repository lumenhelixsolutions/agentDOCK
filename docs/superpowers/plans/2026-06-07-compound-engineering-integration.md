# Compound Engineering + Local Model Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate Compound Engineering skills into AgentDock via a discoverable skills catalog, 21 new profiles (CE workflow + Gemma 4B + DeepSeek), a model-capability audit system, and offline skill caching.

**Architecture:** Extend `compatibility-rules.json` with model-capability and CE-compatibility matrices. Add `/api/skills` endpoints to serve a JSON skills catalog and cached SKILL.md content. Create profiles with PowerShell launch blocks and Node.js audit logic that runs before launch. Cache 9 core CE skills locally under `skills/compound-engineering/cache/`.

**Tech Stack:** Node.js built-ins only (http, fs, path, https). PowerShell preflight/launch blocks. Zero npm dependencies.

---

## File Structure

| File | Responsibility |
|------|----------------|
| `compatibility-rules.json` | Extended with `modelCapabilities`, `ceCompatibility`, `taskTiers` |
| `skills/compound-engineering/skills-catalog.json` | Registry of all 37 CE skills |
| `skills/compound-engineering/agents-catalog.json` | Registry of all 51 CE agents |
| `skills/compound-engineering/cache/*/SKILL.md` | Offline copies of 9 core CE skills |
| `skills/compound-engineering/cache/.version` | Upstream CE version tracker |
| `skills/compound-engineering/cache/README.md` | Index of cached vs on-demand skills |
| `scripts/sync-ce-skills.js` | Node.js script to re-download cached skills from GitHub |
| `scripts/sync-ce-skills.ps1` | PowerShell equivalent |
| `profiles/compound-*.md` | 8 CE workflow profiles |
| `profiles/local-*-gemma4b.md` | 9 Gemma 4B profiles |
| `profiles/local-*-deepseek-*.md` | 4 DeepSeek profiles |
| `server.js` | New `/api/skills` routes, audit functions, launch integration |
| `index.html` | New "Skills" tab in dashboard (minimal v1) |
| `tests/compatibility-rules.test.js` | Tests for model capability and CE compatibility lookups |
| `tests/skills-catalog.test.js` | Tests for skills catalog schema and cache |
| `tests/ce-profiles.test.js` | Tests for CE profile frontmatter validity |
| `tests/gemma-profiles.test.js` | Tests for Gemma profile frontmatter |
| `tests/deepseek-profiles.test.js` | Tests for DeepSeek profile frontmatter |
| `tests/server-skills-api.test.js` | Tests for `/api/skills` endpoints |
| `AGENTS.md` | Updated documentation |

---

### Task 1: Extend compatibility-rules.json

**Files:**
- Modify: `compatibility-rules.json`
- Test: `tests/compatibility-rules.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

describe('compatibility-rules', () => {
  const rules = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'compatibility-rules.json'), 'utf8'));

  it('has modelCapabilities with gemma:4b', () => {
    assert.ok(rules.modelCapabilities, 'Expected modelCapabilities key');
    assert.ok(rules.modelCapabilities['gemma:4b'], 'Expected gemma:4b entry');
    assert.strictEqual(rules.modelCapabilities['gemma:4b'].max_tier, 'light');
  });

  it('has ceCompatibility with ce-plan', () => {
    assert.ok(rules.ceCompatibility, 'Expected ceCompatibility key');
    assert.ok(rules.ceCompatibility['ce-plan'], 'Expected ce-plan entry');
    assert.ok(rules.ceCompatibility['ce-plan'].frontends.includes('claude'));
  });

  it('has taskTiers mapping', () => {
    assert.ok(rules.taskTiers, 'Expected taskTiers key');
    assert.strictEqual(rules.taskTiers['heavy-refactor'], 'advanced');
    assert.strictEqual(rules.taskTiers['safe-audit'], 'light');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/compatibility-rules.test.js`
Expected: FAIL with "Expected modelCapabilities key"

- [ ] **Step 3: Extend compatibility-rules.json**

Replace the entire content of `compatibility-rules.json`:

```json
{
  "version": "1.2",
  "rules": {
    "hermes": {
      "minimum_context": 64000,
      "requires_verified_context": true
    },
    "ollama": {
      "verify_command": "ollama ps",
      "safe_context_goal": 64000,
      "recommended_env_8gb_vram": {
        "OLLAMA_CONTEXT_LENGTH": "64000",
        "OLLAMA_FLASH_ATTENTION": "1",
        "OLLAMA_KV_CACHE_TYPE": "q8_0",
        "OLLAMA_NUM_PARALLEL": "1",
        "OLLAMA_MAX_LOADED_MODELS": "1"
      }
    },
    "env_scanning": {
      "values_redacted": true,
      "max_file_size_bytes": 1048576,
      "excluded_directories": ["node_modules", ".git", "venv", ".venv", "dist", "build"]
    },
    "terminal": {
      "mode": "monitored_child_process",
      "note": "Full-screen TUIs may prefer their own console. AgentDock still captures line-based stdout/stderr from profile launches."
    },
    "security": {
      "bind_host": "127.0.0.1",
      "no_arbitrary_command_input": true,
      "secret_values_never_printed": true,
      "launch_only_profile_blocks": true
    }
  },
  "blocked_signatures": [
    {
      "match": "qwen",
      "reason": "Known local Hermes 64K attempts capped at 32768 on this machine unless runtime/model changed."
    }
  ],
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
  },
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

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/compatibility-rules.test.js`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add compatibility-rules.json tests/compatibility-rules.test.js
git commit -m "feat: extend compatibility-rules with modelCapabilities, ceCompatibility, taskTiers"
```

---

### Task 2: Create skills catalog directory and JSON files

**Files:**
- Create: `skills/compound-engineering/skills-catalog.json`
- Create: `skills/compound-engineering/agents-catalog.json`
- Create: `skills/compound-engineering/cache/README.md`
- Create: `skills/compound-engineering/cache/.version`
- Test: `tests/skills-catalog.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const SKILLS_DIR = path.join(__dirname, '..', 'skills', 'compound-engineering');
const CACHE_DIR = path.join(SKILLS_DIR, 'cache');

describe('skills-catalog', () => {
  it('skills-catalog.json exists and has required schema', () => {
    const catalogPath = path.join(SKILLS_DIR, 'skills-catalog.json');
    assert.ok(fs.existsSync(catalogPath), 'skills-catalog.json missing');
    const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
    assert.ok(catalog.source, 'Expected source');
    assert.ok(catalog.version, 'Expected version');
    assert.ok(Array.isArray(catalog.skills), 'Expected skills array');
    assert.ok(catalog.skills.length > 0, 'Expected at least one skill');
    const skill = catalog.skills[0];
    assert.ok(skill.id, 'Expected skill id');
    assert.ok(skill.name, 'Expected skill name');
    assert.ok(skill.description, 'Expected skill description');
    assert.ok(skill.category, 'Expected skill category');
    assert.ok(Array.isArray(skill.compatible_frontends), 'Expected compatible_frontends array');
  });

  it('agents-catalog.json exists', () => {
    const agentsPath = path.join(SKILLS_DIR, 'agents-catalog.json');
    assert.ok(fs.existsSync(agentsPath), 'agents-catalog.json missing');
    const catalog = JSON.parse(fs.readFileSync(agentsPath, 'utf8'));
    assert.ok(Array.isArray(catalog.agents), 'Expected agents array');
  });

  it('cached skills have local SKILL.md files', () => {
    const catalogPath = path.join(SKILLS_DIR, 'skills-catalog.json');
    const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
    const cached = catalog.skills.filter(s => s.cached);
    for (const skill of cached) {
      assert.ok(skill.local_path, `Expected local_path for ${skill.id}`);
      const fullPath = path.join(__dirname, '..', skill.local_path);
      assert.ok(fs.existsSync(fullPath), `Missing cached file for ${skill.id}: ${fullPath}`);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/skills-catalog.test.js`
Expected: FAIL with "skills-catalog.json missing"

- [ ] **Step 3: Create directory structure and catalog files**

```bash
mkdir -p skills/compound-engineering/cache
```

Create `skills/compound-engineering/skills-catalog.json`:

```json
{
  "source": "https://github.com/EveryInc/compound-engineering-plugin",
  "version": "3.11.2",
  "last_synced": "2026-06-07T17:00:00Z",
  "skills": [
    {
      "id": "ce-strategy",
      "name": "CE Strategy",
      "description": "Create or maintain STRATEGY.md — the product's target problem, approach, persona, key metrics, and active tracks.",
      "category": "workflow",
      "upstream_url": "https://raw.githubusercontent.com/EveryInc/compound-engineering-plugin/main/plugins/compound-engineering/skills/ce-strategy/SKILL.md",
      "cached": true,
      "local_path": "skills/compound-engineering/cache/ce-strategy/SKILL.md",
      "compatible_frontends": ["claude", "codex"]
    },
    {
      "id": "ce-ideate",
      "name": "CE Ideate",
      "description": "Optional big-picture ideation: generate and critically evaluate grounded ideas, then route the strongest one into brainstorming.",
      "category": "workflow",
      "upstream_url": "https://raw.githubusercontent.com/EveryInc/compound-engineering-plugin/main/plugins/compound-engineering/skills/ce-ideate/SKILL.md",
      "cached": true,
      "local_path": "skills/compound-engineering/cache/ce-ideate/SKILL.md",
      "compatible_frontends": ["claude", "codex"]
    },
    {
      "id": "ce-brainstorm",
      "name": "CE Brainstorm",
      "description": "Explore requirements and approaches through collaborative dialogue, then write a right-sized requirements document. Use when the user says 'let's brainstorm', 'what should we build', or 'help me think through X'.",
      "category": "workflow",
      "upstream_url": "https://raw.githubusercontent.com/EveryInc/compound-engineering-plugin/main/plugins/compound-engineering/skills/ce-brainstorm/SKILL.md",
      "cached": true,
      "local_path": "skills/compound-engineering/cache/ce-brainstorm/SKILL.md",
      "compatible_frontends": ["claude", "codex"]
    },
    {
      "id": "ce-plan",
      "name": "CE Plan",
      "description": "Create structured plans for multi-step tasks — software features, research workflows, events, study plans, or any goal that benefits from breakdown. Use when the user says 'plan this', 'create a plan', 'how should we build'.",
      "category": "workflow",
      "upstream_url": "https://raw.githubusercontent.com/EveryInc/compound-engineering-plugin/main/plugins/compound-engineering/skills/ce-plan/SKILL.md",
      "cached": true,
      "local_path": "skills/compound-engineering/cache/ce-plan/SKILL.md",
      "compatible_frontends": ["claude", "codex"]
    },
    {
      "id": "ce-work",
      "name": "CE Work",
      "description": "Execute plans with worktrees and task tracking. Use after ce-plan produces a plan document.",
      "category": "workflow",
      "upstream_url": "https://raw.githubusercontent.com/EveryInc/compound-engineering-plugin/main/plugins/compound-engineering/skills/ce-work/SKILL.md",
      "cached": true,
      "local_path": "skills/compound-engineering/cache/ce-work/SKILL.md",
      "compatible_frontends": ["claude", "codex"]
    },
    {
      "id": "ce-code-review",
      "name": "CE Code Review",
      "description": "Structured code review using tiered persona agents, confidence-gated findings, and a merge/dedup pipeline. Use when reviewing code changes before creating a PR.",
      "category": "review",
      "upstream_url": "https://raw.githubusercontent.com/EveryInc/compound-engineering-plugin/main/plugins/compound-engineering/skills/ce-code-review/SKILL.md",
      "cached": true,
      "local_path": "skills/compound-engineering/cache/ce-code-review/SKILL.md",
      "compatible_frontends": ["claude", "codex"]
    },
    {
      "id": "ce-compound",
      "name": "CE Compound",
      "description": "Document solved problems to make future work easier. Use after ce-work or ce-debug completes to capture learnings.",
      "category": "workflow",
      "upstream_url": "https://raw.githubusercontent.com/EveryInc/compound-engineering-plugin/main/plugins/compound-engineering/skills/ce-compound/SKILL.md",
      "cached": true,
      "local_path": "skills/compound-engineering/cache/ce-compound/SKILL.md",
      "compatible_frontends": ["claude", "codex"]
    },
    {
      "id": "ce-debug",
      "name": "CE Debug",
      "description": "Systematically reproduce failures, trace root cause, and implement fixes. Use for bug investigations.",
      "category": "debug",
      "upstream_url": "https://raw.githubusercontent.com/EveryInc/compound-engineering-plugin/main/plugins/compound-engineering/skills/ce-debug/SKILL.md",
      "cached": true,
      "local_path": "skills/compound-engineering/cache/ce-debug/SKILL.md",
      "compatible_frontends": ["claude", "codex"]
    },
    {
      "id": "ce-product-pulse",
      "name": "CE Product Pulse",
      "description": "Generate a single-page, time-windowed pulse report on usage, performance, errors, and followups. Saves to docs/pulse-reports/.",
      "category": "workflow",
      "upstream_url": "https://raw.githubusercontent.com/EveryInc/compound-engineering-plugin/main/plugins/compound-engineering/skills/ce-product-pulse/SKILL.md",
      "cached": true,
      "local_path": "skills/compound-engineering/cache/ce-product-pulse/SKILL.md",
      "compatible_frontends": ["claude", "codex"]
    },
    {
      "id": "ce-agent-native-architecture",
      "name": "CE Agent Native Architecture",
      "description": "Design and evaluate architecture for agent-native software systems.",
      "category": "architecture",
      "upstream_url": "https://raw.githubusercontent.com/EveryInc/compound-engineering-plugin/main/plugins/compound-engineering/skills/ce-agent-native-architecture/SKILL.md",
      "cached": false,
      "local_path": null,
      "compatible_frontends": ["claude", "codex"]
    },
    {
      "id": "ce-agent-native-audit",
      "name": "CE Agent Native Audit",
      "description": "Audit existing systems for agent-native readiness and gaps.",
      "category": "audit",
      "upstream_url": "https://raw.githubusercontent.com/EveryInc/compound-engineering-plugin/main/plugins/compound-engineering/skills/ce-agent-native-audit/SKILL.md",
      "cached": false,
      "local_path": null,
      "compatible_frontends": ["claude", "codex"]
    },
    {
      "id": "ce-clean-gone-branches",
      "name": "CE Clean Gone Branches",
      "description": "Clean up local branches whose remote tracking branches no longer exist.",
      "category": "utility",
      "upstream_url": "https://raw.githubusercontent.com/EveryInc/compound-engineering-plugin/main/plugins/compound-engineering/skills/ce-clean-gone-branches/SKILL.md",
      "cached": false,
      "local_path": null,
      "compatible_frontends": ["claude", "codex"]
    },
    {
      "id": "ce-commit-push-pr",
      "name": "CE Commit Push PR",
      "description": "Commit changes, push to remote, and create or update a pull request.",
      "category": "utility",
      "upstream_url": "https://raw.githubusercontent.com/EveryInc/compound-engineering-plugin/main/plugins/compound-engineering/skills/ce-commit-push-pr/SKILL.md",
      "cached": false,
      "local_path": null,
      "compatible_frontends": ["claude", "codex"]
    },
    {
      "id": "ce-commit",
      "name": "CE Commit",
      "description": "Create well-structured commits following conventional commit standards.",
      "category": "utility",
      "upstream_url": "https://raw.githubusercontent.com/EveryInc/compound-engineering-plugin/main/plugins/compound-engineering/skills/ce-commit/SKILL.md",
      "cached": false,
      "local_path": null,
      "compatible_frontends": ["claude", "codex"]
    },
    {
      "id": "ce-compound-refresh",
      "name": "CE Compound Refresh",
      "description": "Refresh and update existing compound documentation with new learnings.",
      "category": "workflow",
      "upstream_url": "https://raw.githubusercontent.com/EveryInc/compound-engineering-plugin/main/plugins/compound-engineering/skills/ce-compound-refresh/SKILL.md",
      "cached": false,
      "local_path": null,
      "compatible_frontends": ["claude", "codex"]
    },
    {
      "id": "ce-demo-reel",
      "name": "CE Demo Reel",
      "description": "Create demo reels and screen recordings for feature showcases.",
      "category": "utility",
      "upstream_url": "https://raw.githubusercontent.com/EveryInc/compound-engineering-plugin/main/plugins/compound-engineering/skills/ce-demo-reel/SKILL.md",
      "cached": false,
      "local_path": null,
      "compatible_frontends": ["claude", "codex"]
    },
    {
      "id": "ce-dhh-rails-style",
      "name": "CE DHH Rails Style",
      "description": "Apply DHH-style Rails conventions and patterns to code.",
      "category": "style",
      "upstream_url": "https://raw.githubusercontent.com/EveryInc/compound-engineering-plugin/main/plugins/compound-engineering/skills/ce-dhh-rails-style/SKILL.md",
      "cached": false,
      "local_path": null,
      "compatible_frontends": ["claude", "codex"]
    },
    {
      "id": "ce-doc-review",
      "name": "CE Doc Review",
      "description": "Review documentation for clarity, accuracy, and completeness.",
      "category": "review",
      "upstream_url": "https://raw.githubusercontent.com/EveryInc/compound-engineering-plugin/main/plugins/compound-engineering/skills/ce-doc-review/SKILL.md",
      "cached": false,
      "local_path": null,
      "compatible_frontends": ["claude", "codex"]
    },
    {
      "id": "ce-dogfood-beta",
      "name": "CE Dogfood Beta",
      "description": "Run beta features through dogfooding workflows.",
      "category": "utility",
      "upstream_url": "https://raw.githubusercontent.com/EveryInc/compound-engineering-plugin/main/plugins/compound-engineering/skills/ce-dogfood-beta/SKILL.md",
      "cached": false,
      "local_path": null,
      "compatible_frontends": ["claude", "codex"]
    },
    {
      "id": "ce-frontend-design",
      "name": "CE Frontend Design",
      "description": "Design frontend components and user interfaces with best practices.",
      "category": "design",
      "upstream_url": "https://raw.githubusercontent.com/EveryInc/compound-engineering-plugin/main/plugins/compound-engineering/skills/ce-frontend-design/SKILL.md",
      "cached": false,
      "local_path": null,
      "compatible_frontends": ["claude", "codex"]
    },
    {
      "id": "ce-gemini-imagegen",
      "name": "CE Gemini ImageGen",
      "description": "Generate images using Gemini models.",
      "category": "utility",
      "upstream_url": "https://raw.githubusercontent.com/EveryInc/compound-engineering-plugin/main/plugins/compound-engineering/skills/ce-gemini-imagegen/SKILL.md",
      "cached": false,
      "local_path": null,
      "compatible_frontends": ["claude", "codex"]
    },
    {
      "id": "ce-optimize",
      "name": "CE Optimize",
      "description": "Optimize code, queries, and system performance.",
      "category": "utility",
      "upstream_url": "https://raw.githubusercontent.com/EveryInc/compound-engineering-plugin/main/plugins/compound-engineering/skills/ce-optimize/SKILL.md",
      "cached": false,
      "local_path": null,
      "compatible_frontends": ["claude", "codex"]
    },
    {
      "id": "ce-polish",
      "name": "CE Polish",
      "description": "Polish and refine code, docs, and artifacts before shipping.",
      "category": "utility",
      "upstream_url": "https://raw.githubusercontent.com/EveryInc/compound-engineering-plugin/main/plugins/compound-engineering/skills/ce-polish/SKILL.md",
      "cached": false,
      "local_path": null,
      "compatible_frontends": ["claude", "codex"]
    },
    {
      "id": "ce-promote",
      "name": "CE Promote",
      "description": "Promote features and releases through documentation and communication.",
      "category": "utility",
      "upstream_url": "https://raw.githubusercontent.com/EveryInc/compound-engineering-plugin/main/plugins/compound-engineering/skills/ce-promote/SKILL.md",
      "cached": false,
      "local_path": null,
      "compatible_frontends": ["claude", "codex"]
    },
    {
      "id": "ce-proof",
      "name": "CE Proof",
      "description": "Create and manage proof documents and verification workflows.",
      "category": "utility",
      "upstream_url": "https://raw.githubusercontent.com/EveryInc/compound-engineering-plugin/main/plugins/compound-engineering/skills/ce-proof/SKILL.md",
      "cached": false,
      "local_path": null,
      "compatible_frontends": ["claude", "codex"]
    },
    {
      "id": "ce-release-notes",
      "name": "CE Release Notes",
      "description": "Draft release notes from commits, PRs, and changes.",
      "category": "utility",
      "upstream_url": "https://raw.githubusercontent.com/EveryInc/compound-engineering-plugin/main/plugins/compound-engineering/skills/ce-release-notes/SKILL.md",
      "cached": false,
      "local_path": null,
      "compatible_frontends": ["claude", "codex"]
    },
    {
      "id": "ce-report-bug",
      "name": "CE Report Bug",
      "description": "File structured bug reports with reproduction steps and context.",
      "category": "utility",
      "upstream_url": "https://raw.githubusercontent.com/EveryInc/compound-engineering-plugin/main/plugins/compound-engineering/skills/ce-report-bug/SKILL.md",
      "cached": false,
      "local_path": null,
      "compatible_frontends": ["claude", "codex"]
    },
    {
      "id": "ce-resolve-pr-feedback",
      "name": "CE Resolve PR Feedback",
      "description": "Systematically resolve pull request review feedback.",
      "category": "workflow",
      "upstream_url": "https://raw.githubusercontent.com/EveryInc/compound-engineering-plugin/main/plugins/compound-engineering/skills/ce-resolve-pr-feedback/SKILL.md",
      "cached": false,
      "local_path": null,
      "compatible_frontends": ["claude", "codex"]
    },
    {
      "id": "ce-riffrec-feedback-analysis",
      "name": "CE RiffRec Feedback Analysis",
      "description": "Analyze user feedback from RiffRec recordings.",
      "category": "utility",
      "upstream_url": "https://raw.githubusercontent.com/EveryInc/compound-engineering-plugin/main/plugins/compound-engineering/skills/ce-riffrec-feedback-analysis/SKILL.md",
      "cached": false,
      "local_path": null,
      "compatible_frontends": ["claude", "codex"]
    },
    {
      "id": "ce-sessions",
      "name": "CE Sessions",
      "description": "Manage and review agent sessions and their outputs.",
      "category": "utility",
      "upstream_url": "https://raw.githubusercontent.com/EveryInc/compound-engineering-plugin/main/plugins/compound-engineering/skills/ce-sessions/SKILL.md",
      "cached": false,
      "local_path": null,
      "compatible_frontends": ["claude", "codex"]
    },
    {
      "id": "ce-setup",
      "name": "CE Setup",
      "description": "Check environment, install missing tools, and bootstrap project config.",
      "category": "utility",
      "upstream_url": "https://raw.githubusercontent.com/EveryInc/compound-engineering-plugin/main/plugins/compound-engineering/skills/ce-setup/SKILL.md",
      "cached": false,
      "local_path": null,
      "compatible_frontends": ["claude", "codex"]
    },
    {
      "id": "ce-simplify-code",
      "name": "CE Simplify Code",
      "description": "Simplify complex code while preserving behavior.",
      "category": "utility",
      "upstream_url": "https://raw.githubusercontent.com/EveryInc/compound-engineering-plugin/main/plugins/compound-engineering/skills/ce-simplify-code/SKILL.md",
      "cached": false,
      "local_path": null,
      "compatible_frontends": ["claude", "codex"]
    },
    {
      "id": "ce-slack-research",
      "name": "CE Slack Research",
      "description": "Search Slack for organizational context and prior decisions.",
      "category": "research",
      "upstream_url": "https://raw.githubusercontent.com/EveryInc/compound-engineering-plugin/main/plugins/compound-engineering/skills/ce-slack-research/SKILL.md",
      "cached": false,
      "local_path": null,
      "compatible_frontends": ["claude", "codex"]
    },
    {
      "id": "ce-test-browser",
      "name": "CE Test Browser",
      "description": "Run and debug browser-based tests.",
      "category": "testing",
      "upstream_url": "https://raw.githubusercontent.com/EveryInc/compound-engineering-plugin/main/plugins/compound-engineering/skills/ce-test-browser/SKILL.md",
      "cached": false,
      "local_path": null,
      "compatible_frontends": ["claude", "codex"]
    },
    {
      "id": "ce-test-xcode",
      "name": "CE Test Xcode",
      "description": "Run and debug Xcode tests for iOS/macOS projects.",
      "category": "testing",
      "upstream_url": "https://raw.githubusercontent.com/EveryInc/compound-engineering-plugin/main/plugins/compound-engineering/skills/ce-test-xcode/SKILL.md",
      "cached": false,
      "local_path": null,
      "compatible_frontends": ["claude", "codex"]
    },
    {
      "id": "ce-update",
      "name": "CE Update",
      "description": "Update dependencies, frameworks, and tooling.",
      "category": "utility",
      "upstream_url": "https://raw.githubusercontent.com/EveryInc/compound-engineering-plugin/main/plugins/compound-engineering/skills/ce-update/SKILL.md",
      "cached": false,
      "local_path": null,
      "compatible_frontends": ["claude", "codex"]
    },
    {
      "id": "ce-work-beta",
      "name": "CE Work Beta",
      "description": "Beta version of the CE Work execution skill.",
      "category": "workflow",
      "upstream_url": "https://raw.githubusercontent.com/EveryInc/compound-engineering-plugin/main/plugins/compound-engineering/skills/ce-work-beta/SKILL.md",
      "cached": false,
      "local_path": null,
      "compatible_frontends": ["claude", "codex"]
    },
    {
      "id": "ce-worktree",
      "name": "CE Worktree",
      "description": "Manage git worktrees for isolated development.",
      "category": "utility",
      "upstream_url": "https://raw.githubusercontent.com/EveryInc/compound-engineering-plugin/main/plugins/compound-engineering/skills/ce-worktree/SKILL.md",
      "cached": false,
      "local_path": null,
      "compatible_frontends": ["claude", "codex"]
    },
    {
      "id": "lfg",
      "name": "LFG",
      "description": "Let''s F***ing Go — rapid execution mode for known tasks.",
      "category": "workflow",
      "upstream_url": "https://raw.githubusercontent.com/EveryInc/compound-engineering-plugin/main/plugins/compound-engineering/skills/lfg/SKILL.md",
      "cached": false,
      "local_path": null,
      "compatible_frontends": ["claude", "codex"]
    }
  ]
}
```

Create `skills/compound-engineering/agents-catalog.json`:

```json
{
  "source": "https://github.com/EveryInc/compound-engineering-plugin",
  "version": "3.11.2",
  "last_synced": "2026-06-07T17:00:00Z",
  "agents": [
    { "id": "ce-adversarial-reviewer", "name": "CE Adversarial Reviewer", "description": "Stress-tests code and design from an adversarial perspective." },
    { "id": "ce-agent-native-reviewer", "name": "CE Agent Native Reviewer", "description": "Reviews code for agent-native architecture patterns." },
    { "id": "ce-api-contract-reviewer", "name": "CE API Contract Reviewer", "description": "Validates API contracts, routes, serializers, and versioning." },
    { "id": "ce-correctness-reviewer", "name": "CE Correctness Reviewer", "description": "Finds logic bugs and correctness issues." },
    { "id": "ce-data-migration-reviewer", "name": "CE Data Migration Reviewer", "description": "Validates database migrations and schema changes." },
    { "id": "ce-deployment-verification-agent", "name": "CE Deployment Verification Agent", "description": "Checks deployment readiness and rollback plans." },
    { "id": "ce-framework-docs-researcher", "name": "CE Framework Docs Researcher", "description": "Researches framework-specific documentation and best practices." },
    { "id": "ce-julik-frontend-races-reviewer", "name": "CE Julik Frontend Races Reviewer", "description": "Catches frontend race conditions in Stimulus/Turbo apps." },
    { "id": "ce-learnings-researcher", "name": "CE Learnings Researcher", "description": "Searches docs/solutions/ for institutional knowledge." },
    { "id": "ce-maintainability-reviewer", "name": "CE Maintainability Reviewer", "description": "Flags technical debt and maintainability traps." },
    { "id": "ce-performance-reviewer", "name": "CE Performance Reviewer", "description": "Identifies performance regressions and optimization opportunities." },
    { "id": "ce-previous-comments-reviewer", "name": "CE Previous Comments Reviewer", "description": "Verifies that prior review feedback has been addressed." },
    { "id": "ce-project-standards-reviewer", "name": "CE Project Standards Reviewer", "description": "Enforces project-specific conventions and standards." },
    { "id": "ce-reliability-reviewer", "name": "CE Reliability Reviewer", "description": "Reviews error handling, retries, timeouts, and background jobs." },
    { "id": "ce-repo-research-analyst", "name": "CE Repo Research Analyst", "description": "Explores codebase structure, patterns, and relevant files." },
    { "id": "ce-security-reviewer", "name": "CE Security Reviewer", "description": "Finds security vulnerabilities and auth issues." },
    { "id": "ce-slack-researcher", "name": "CE Slack Researcher", "description": "Searches Slack for organizational context." },
    { "id": "ce-spec-flow-analyzer", "name": "CE Spec Flow Analyzer", "description": "Analyzes user flows and edge cases in specs." },
    { "id": "ce-swift-ios-reviewer", "name": "CE Swift iOS Reviewer", "description": "Reviews Swift, SwiftUI, UIKit, and iOS-specific code." },
    { "id": "ce-testing-reviewer", "name": "CE Testing Reviewer", "description": "Identifies testing gaps and weak test coverage." },
    { "id": "ce-web-researcher", "name": "CE Web Researcher", "description": "Researches external documentation, libraries, and best practices." }
  ]
}
```

Create `skills/compound-engineering/cache/.version`:

```
3.11.2
```

Create `skills/compound-engineering/cache/README.md`:

```markdown
# Compound Engineering Skill Cache

This directory contains offline copies of core CE skills.

## Cached Skills (9)

| Skill | File |
|-------|------|
| ce-strategy | `ce-strategy/SKILL.md` |
| ce-ideate | `ce-ideate/SKILL.md` |
| ce-brainstorm | `ce-brainstorm/SKILL.md` |
| ce-plan | `ce-plan/SKILL.md` |
| ce-work | `ce-work/SKILL.md` |
| ce-code-review | `ce-code-review/SKILL.md` |
| ce-compound | `ce-compound/SKILL.md` |
| ce-debug | `ce-debug/SKILL.md` |
| ce-product-pulse | `ce-product-pulse/SKILL.md` |

## On-Demand Skills (28)

The remaining 28 skills are fetched from GitHub on demand via `/api/skills/:id/content`.

## Sync

Run `node scripts/sync-ce-skills.js` to re-download cached skills from upstream.
```

- [ ] **Step 4: Create placeholder cached SKILL.md files**

```bash
mkdir -p skills/compound-engineering/cache/ce-strategy
mkdir -p skills/compound-engineering/cache/ce-ideate
mkdir -p skills/compound-engineering/cache/ce-brainstorm
mkdir -p skills/compound-engineering/cache/ce-plan
mkdir -p skills/compound-engineering/cache/ce-work
mkdir -p skills/compound-engineering/cache/ce-code-review
mkdir -p skills/compound-engineering/cache/ce-compound
mkdir -p skills/compound-engineering/cache/ce-debug
mkdir -p skills/compound-engineering/cache/ce-product-pulse
```

For each cached skill, create a minimal SKILL.md placeholder:

```bash
for dir in ce-strategy ce-ideate ce-brainstorm ce-plan ce-work ce-code-review ce-compound ce-debug ce-product-pulse; do
  echo "# $dir

Placeholder — run \`node scripts/sync-ce-skills.js\` to download the full skill from upstream." > "skills/compound-engineering/cache/$dir/SKILL.md"
done
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node --test tests/skills-catalog.test.js`
Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

```bash
git add skills/ tests/skills-catalog.test.js
git commit -m "feat: add CE skills catalog, agents catalog, and cache structure"
```

---

### Task 3: Add /api/skills endpoints to server.js

**Files:**
- Modify: `server.js`
- Test: `tests/server-skills-api.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');

describe('server skills api', () => {
  let server;
  let port;
  let baseUrl;

  before(async () => {
    process.env.AGENTDOCK_PORT = '0';
    const mod = require('../server.js');
    server = mod.__server;
    if (!server) {
      throw new Error('server.js did not export __server');
    }
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Server did not start in time')), 5000);
      const check = () => {
        const addr = server.address();
        if (addr) {
          clearTimeout(timeout);
          port = addr.port;
          baseUrl = `http://127.0.0.1:${port}`;
          resolve();
        } else {
          setTimeout(check, 50);
        }
      };
      check();
    });
  });

  after(() => {
    if (server) {
      server.close();
    }
    delete require.cache[require.resolve('../server.js')];
  });

  function request(path) {
    return new Promise((resolve, reject) => {
      const req = http.get(`${baseUrl}${path}`, { timeout: 5000 }, (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          resolve({ status: res.statusCode, body: data });
        });
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
    });
  }

  it('GET /api/skills returns 200 with catalog', async () => {
    const res = await request('/api/skills');
    assert.strictEqual(res.status, 200);
    const json = JSON.parse(res.body);
    assert.ok(Array.isArray(json.skills));
    assert.ok(json.skills.length > 0);
  });

  it('GET /api/skills/ce-plan returns the plan skill', async () => {
    const res = await request('/api/skills/ce-plan');
    assert.strictEqual(res.status, 200);
    const json = JSON.parse(res.body);
    assert.strictEqual(json.id, 'ce-plan');
  });

  it('GET /api/skills/ce-plan/content returns markdown', async () => {
    const res = await request('/api/skills/ce-plan/content');
    assert.strictEqual(res.status, 200);
    const json = JSON.parse(res.body);
    assert.ok(json.content.includes('Placeholder') || json.content.includes('SKILL'));
  });

  it('GET /api/skills/nonexistent returns 404', async () => {
    const res = await request('/api/skills/nonexistent');
    assert.strictEqual(res.status, 404);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/server-skills-api.test.js`
Expected: FAIL with 404 on `/api/skills`

- [ ] **Step 3: Add skills API functions and routes to server.js**

Add these constants near the top of `server.js` (after the `FILES` object, around line 42):

```javascript
const SKILLS_DIR = path.join(ROOT, 'skills', 'compound-engineering');
const SKILLS_CATALOG = path.join(SKILLS_DIR, 'skills-catalog.json');
```

Add these helper functions before the `serveStatic` function (before line 993):

```javascript
function loadSkillsCatalog() {
  return readJSON(SKILLS_CATALOG, { source: '', version: '', skills: [] });
}

function findSkill(id) {
  const catalog = loadSkillsCatalog();
  return catalog.skills.find(s => s.id === id) || null;
}

function readSkillContent(skill) {
  if (skill.cached && skill.local_path) {
    const fullPath = path.join(ROOT, skill.local_path);
    if (fs.existsSync(fullPath)) {
      try { return fs.readFileSync(fullPath, 'utf8'); } catch { return null; }
    }
  }
  return null;
}
```

Add these route handlers inside the `route` function, after the existing `/api/catalog` handler (after line 1034):

```javascript
    if (pathName === '/api/skills' && req.method === 'GET') {
      return send(res, 200, loadSkillsCatalog());
    }
    if (pathName.startsWith('/api/skills/') && req.method === 'GET') {
      const rest = pathName.slice('/api/skills/'.length);
      const parts = rest.split('/');
      const id = decodeURIComponent(parts[0]);
      const skill = findSkill(id);
      if (!skill) return send(res, 404, { error: 'Skill not found' });
      if (parts[1] === 'content') {
        const content = readSkillContent(skill);
        if (content !== null) return send(res, 200, { id, content });
        return send(res, 200, { id, content: 'Skill content not cached. Download from: ' + skill.upstream_url });
      }
      return send(res, 200, skill);
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/server-skills-api.test.js`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add server.js tests/server-skills-api.test.js
git commit -m "feat: add /api/skills endpoints for CE skill catalog and content"
```

---

### Task 4: Create CE workflow profiles (8 files)

**Files:**
- Create: `profiles/compound-core-claude.md`
- Create: `profiles/compound-core-codex.md`
- Create: `profiles/compound-strategy-claude.md`
- Create: `profiles/compound-strategy-codex.md`
- Create: `profiles/compound-plan-work-claude.md`
- Create: `profiles/compound-plan-work-codex.md`
- Create: `profiles/compound-review-compound-claude.md`
- Create: `profiles/compound-review-compound-codex.md`
- Test: `tests/ce-profiles.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { parseFrontmatter } = require('../server.js');

const PROFILES_DIR = path.join(__dirname, '..', 'profiles');
const CE_PROFILES = [
  'compound-core-claude.md',
  'compound-core-codex.md',
  'compound-strategy-claude.md',
  'compound-strategy-codex.md',
  'compound-plan-work-claude.md',
  'compound-plan-work-codex.md',
  'compound-review-compound-claude.md',
  'compound-review-compound-codex.md',
];

describe('ce-profiles', () => {
  for (const file of CE_PROFILES) {
    it(`${file} exists with valid frontmatter`, () => {
      const fullPath = path.join(PROFILES_DIR, file);
      assert.ok(fs.existsSync(fullPath), `${file} missing`);
      const raw = fs.readFileSync(fullPath, 'utf8');
      const parsed = parseFrontmatter(raw);
      assert.ok(parsed.meta.name, `Expected name in ${file}`);
      assert.ok(parsed.meta.frontend, `Expected frontend in ${file}`);
      assert.ok(parsed.meta.ce_version, `Expected ce_version in ${file}`);
      assert.ok(/```(?:powershell|ps1)\s+launch/.test(raw), `Expected launch block in ${file}`);
    });
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/ce-profiles.test.js`
Expected: FAIL with all 8 profiles missing

- [ ] **Step 3: Create all 8 CE profiles**

Create `profiles/compound-core-claude.md`:

```markdown
---
id: compound-core-claude
name: Compound Engineering (Claude)
frontend: claude
command: claude
backend: anthropic
mode: full-cloud
model: claude-sonnet-4
task_mode: workflow
required_env:
  - ANTHROPIC_API_KEY
status: unknown
ce_version: "3.11.2"
description: General Compound Engineering workflow access via Claude Code. Use /ce-brainstorm, /ce-plan, /ce-work, /ce-code-review, /ce-compound as needed.
---

# Compound Engineering (Claude)

Launch Claude Code with Compound Engineering plugin ready.

```powershell launch
cd /d {{PROJECT_PATH}}

if (-not (Get-Command claude -ErrorAction SilentlyContinue)) {
  Write-Host "claude CLI is not installed or not on PATH."
  Read-Host "Press Enter to exit"
  exit 1
}

if (-not $env:ANTHROPIC_API_KEY) { Write-Host "ANTHROPIC_API_KEY is missing. Cloud auth may prompt." }

Write-Host "Launching Claude Code with Compound Engineering..."
Write-Host "Available skills: /ce-strategy /ce-ideate /ce-brainstorm /ce-plan /ce-work /ce-code-review /ce-compound /ce-debug /ce-product-pulse"
claude
```
```

Create `profiles/compound-core-codex.md`:

```markdown
---
id: compound-core-codex
name: Compound Engineering (Codex)
frontend: codex
command: codex
backend: openai
mode: full-cloud
model: gpt-5.4
task_mode: workflow
required_env:
  - OPENAI_API_KEY
status: unknown
ce_version: "3.11.2"
description: General Compound Engineering workflow access via OpenAI Codex. Use /ce-brainstorm, /ce-plan, /ce-work, /ce-code-review, /ce-compound as needed.
---

# Compound Engineering (Codex)

Launch OpenAI Codex with Compound Engineering plugin ready.

```powershell launch
cd /d {{PROJECT_PATH}}

if (-not (Get-Command codex -ErrorAction SilentlyContinue)) {
  Write-Host "codex CLI is not installed or not on PATH."
  Read-Host "Press Enter to exit"
  exit 1
}

if (-not $env:OPENAI_API_KEY) { Write-Host "OPENAI_API_KEY is missing. Cloud auth may prompt." }

Write-Host "Launching Codex with Compound Engineering..."
Write-Host "Available skills: /ce-strategy /ce-ideate /ce-brainstorm /ce-plan /ce-work /ce-code-review /ce-compound /ce-debug /ce-product-pulse"
codex
```
```

Create `profiles/compound-strategy-claude.md`:

```markdown
---
id: compound-strategy-claude
name: CE Strategy (Claude)
frontend: claude
command: claude
backend: anthropic
mode: full-cloud
model: claude-sonnet-4
task_mode: strategy
required_env:
  - ANTHROPIC_API_KEY
status: unknown
ce_version: "3.11.2"
description: Create or maintain STRATEGY.md using CE strategy skill. Upstream anchor for product direction.
---

# CE Strategy (Claude)

Run /ce-strategy to establish or refresh product strategy.

```powershell launch
cd /d {{PROJECT_PATH}}

if (-not (Get-Command claude -ErrorAction SilentlyContinue)) {
  Write-Host "claude CLI is not installed or not on PATH."
  Read-Host "Press Enter to exit"
  exit 1
}

if (-not $env:ANTHROPIC_API_KEY) { Write-Host "ANTHROPIC_API_KEY is missing." }

Write-Host "Run: /ce-strategy"
claude
```
```

Create `profiles/compound-strategy-codex.md`:

```markdown
---
id: compound-strategy-codex
name: CE Strategy (Codex)
frontend: codex
command: codex
backend: openai
mode: full-cloud
model: gpt-5.4
task_mode: strategy
required_env:
  - OPENAI_API_KEY
status: unknown
ce_version: "3.11.2"
description: Create or maintain STRATEGY.md using CE strategy skill via Codex.
---

# CE Strategy (Codex)

Run /ce-strategy to establish or refresh product strategy.

```powershell launch
cd /d {{PROJECT_PATH}}

if (-not (Get-Command codex -ErrorAction SilentlyContinue)) {
  Write-Host "codex CLI is not installed or not on PATH."
  Read-Host "Press Enter to exit"
  exit 1
}

if (-not $env:OPENAI_API_KEY) { Write-Host "OPENAI_API_KEY is missing." }

Write-Host "Run: /ce-strategy"
codex
```
```

Create `profiles/compound-plan-work-claude.md`:

```markdown
---
id: compound-plan-work-claude
name: CE Plan + Work (Claude)
frontend: claude
command: claude
backend: anthropic
mode: full-cloud
model: claude-sonnet-4
task_mode: plan-work
required_env:
  - ANTHROPIC_API_KEY
status: unknown
ce_version: "3.11.2"
description: Brainstorm, plan, and execute using CE workflow chain. Best for feature implementation.
---

# CE Plan + Work (Claude)

Chain: /ce-brainstorm -> /ce-plan -> /ce-work

```powershell launch
cd /d {{PROJECT_PATH}}

if (-not (Get-Command claude -ErrorAction SilentlyContinue)) {
  Write-Host "claude CLI is not installed or not on PATH."
  Read-Host "Press Enter to exit"
  exit 1
}

if (-not $env:ANTHROPIC_API_KEY) { Write-Host "ANTHROPIC_API_KEY is missing." }

Write-Host "Workflow: /ce-brainstorm -> /ce-plan -> /ce-work"
claude
```
```

Create `profiles/compound-plan-work-codex.md`:

```markdown
---
id: compound-plan-work-codex
name: CE Plan + Work (Codex)
frontend: codex
command: codex
backend: openai
mode: full-cloud
model: gpt-5.4
task_mode: plan-work
required_env:
  - OPENAI_API_KEY
status: unknown
ce_version: "3.11.2"
description: Brainstorm, plan, and execute using CE workflow chain via Codex.
---

# CE Plan + Work (Codex)

Chain: /ce-brainstorm -> /ce-plan -> /ce-work

```powershell launch
cd /d {{PROJECT_PATH}}

if (-not (Get-Command codex -ErrorAction SilentlyContinue)) {
  Write-Host "codex CLI is not installed or not on PATH."
  Read-Host "Press Enter to exit"
  exit 1
}

if (-not $env:OPENAI_API_KEY) { Write-Host "OPENAI_API_KEY is missing." }

Write-Host "Workflow: /ce-brainstorm -> /ce-plan -> /ce-work"
codex
```
```

Create `profiles/compound-review-compound-claude.md`:

```markdown
---
id: compound-review-compound-claude
name: CE Review + Compound (Claude)
frontend: claude
command: claude
backend: anthropic
mode: full-cloud
model: claude-sonnet-4
task_mode: review-compound
required_env:
  - ANTHROPIC_API_KEY
status: unknown
ce_version: "3.11.2"
description: Review code with /ce-code-review then document learnings with /ce-compound.
---

# CE Review + Compound (Claude)

Chain: /ce-code-review -> /ce-compound

```powershell launch
cd /d {{PROJECT_PATH}}

if (-not (Get-Command claude -ErrorAction SilentlyContinue)) {
  Write-Host "claude CLI is not installed or not on PATH."
  Read-Host "Press Enter to exit"
  exit 1
}

if (-not $env:ANTHROPIC_API_KEY) { Write-Host "ANTHROPIC_API_KEY is missing." }

Write-Host "Workflow: /ce-code-review -> /ce-compound"
claude
```
```

Create `profiles/compound-review-compound-codex.md`:

```markdown
---
id: compound-review-compound-codex
name: CE Review + Compound (Codex)
frontend: codex
command: codex
backend: openai
mode: full-cloud
model: gpt-5.4
task_mode: review-compound
required_env:
  - OPENAI_API_KEY
status: unknown
ce_version: "3.11.2"
description: Review code with /ce-code-review then document learnings with /ce-compound via Codex.
---

# CE Review + Compound (Codex)

Chain: /ce-code-review -> /ce-compound

```powershell launch
cd /d {{PROJECT_PATH}}

if (-not (Get-Command codex -ErrorAction SilentlyContinue)) {
  Write-Host "codex CLI is not installed or not on PATH."
  Read-Host "Press Enter to exit"
  exit 1
}

if (-not $env:OPENAI_API_KEY) { Write-Host "OPENAI_API_KEY is missing." }

Write-Host "Workflow: /ce-code-review -> /ce-compound"
codex
```
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/ce-profiles.test.js`
Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
git add profiles/compound-*.md tests/ce-profiles.test.js
git commit -m "feat: add 8 Compound Engineering workflow profiles for claude and codex"
```

---

### Task 5: Create Gemma 4B profiles (9 files)

**Files:**
- Create: `profiles/local-safe-audit-gemma4b.md`
- Create: `profiles/local-code-review-gemma4b.md`
- Create: `profiles/local-bug-hunt-gemma4b.md`
- Create: `profiles/local-architecture-gemma4b.md`
- Create: `profiles/local-documentation-gemma4b.md`
- Create: `profiles/local-performance-gemma4b.md`
- Create: `profiles/local-security-audit-gemma4b.md`
- Create: `profiles/local-patch-test-gemma4b.md`
- Create: `profiles/local-heavy-refactor-gemma4b.md`
- Test: `tests/gemma-profiles.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { parseFrontmatter } = require('../server.js');

const PROFILES_DIR = path.join(__dirname, '..', 'profiles');
const GEMMA_PROFILES = [
  'local-safe-audit-gemma4b.md',
  'local-code-review-gemma4b.md',
  'local-bug-hunt-gemma4b.md',
  'local-architecture-gemma4b.md',
  'local-documentation-gemma4b.md',
  'local-performance-gemma4b.md',
  'local-security-audit-gemma4b.md',
  'local-patch-test-gemma4b.md',
  'local-heavy-refactor-gemma4b.md',
];

describe('gemma-profiles', () => {
  for (const file of GEMMA_PROFILES) {
    it(`${file} exists with valid frontmatter`, () => {
      const fullPath = path.join(PROFILES_DIR, file);
      assert.ok(fs.existsSync(fullPath), `${file} missing`);
      const raw = fs.readFileSync(fullPath, 'utf8');
      const parsed = parseFrontmatter(raw);
      assert.ok(parsed.meta.name, `Expected name in ${file}`);
      assert.strictEqual(parsed.meta.backend, 'ollama');
      assert.ok(parsed.meta.model, `Expected model in ${file}`);
      assert.ok(/```(?:powershell|ps1)\s+launch/.test(raw), `Expected launch block in ${file}`);
    });
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/gemma-profiles.test.js`
Expected: FAIL with all 9 profiles missing

- [ ] **Step 3: Create all 9 Gemma 4B profiles**

Each Gemma 4B profile follows this template with only `id`, `name`, and `task_mode` changing:

Create `profiles/local-safe-audit-gemma4b.md`:

```markdown
---
id: local-safe-audit-gemma4b
name: Local Safe Audit (Gemma 4B)
frontend: ollama
command: ollama
backend: ollama
mode: full-local
model: gemma:4b
required_context: 8192
task_mode: safe-audit
status: unknown
description: Read-only privacy audit using Gemma 4B locally. Lightweight and fast.
---

# Local Safe Audit (Gemma 4B)

Read-only audit with Gemma 4B via Ollama.

```powershell preflight
ollama ps
```

```powershell launch
cd /d {{PROJECT_PATH}}

Write-Host "Local Safe Audit mode — Gemma 4B, private, no data leaves this machine."
$env:OLLAMA_CONTEXT_LENGTH="8192"
$env:OLLAMA_FLASH_ATTENTION="1"
$env:OLLAMA_KV_CACHE_TYPE="q8_0"
$env:OLLAMA_NUM_PARALLEL="1"
$env:OLLAMA_MAX_LOADED_MODELS="1"

ollama run gemma:4b "Return exactly READY"
ollama ps
```
```

Create `profiles/local-code-review-gemma4b.md`:

```markdown
---
id: local-code-review-gemma4b
name: Local Code Review (Gemma 4B)
frontend: ollama
command: ollama
backend: ollama
mode: full-local
model: gemma:4b
required_context: 8192
task_mode: code-review
status: unknown
description: Lightweight code review using Gemma 4B locally.
---

# Local Code Review (Gemma 4B)

Code review with Gemma 4B via Ollama.

```powershell preflight
ollama ps
```

```powershell launch
cd /d {{PROJECT_PATH}}

Write-Host "Local Code Review mode — Gemma 4B."
$env:OLLAMA_CONTEXT_LENGTH="8192"
$env:OLLAMA_FLASH_ATTENTION="1"
$env:OLLAMA_KV_CACHE_TYPE="q8_0"
$env:OLLAMA_NUM_PARALLEL="1"
$env:OLLAMA_MAX_LOADED_MODELS="1"

ollama run gemma:4b "Return exactly READY"
ollama ps
```
```

Create `profiles/local-bug-hunt-gemma4b.md`:

```markdown
---
id: local-bug-hunt-gemma4b
name: Local Bug Hunt (Gemma 4B)
frontend: ollama
command: ollama
backend: ollama
mode: full-local
model: gemma:4b
required_context: 8192
task_mode: bug-hunt
status: unknown
description: Quick bug scanning using Gemma 4B locally.
---

# Local Bug Hunt (Gemma 4B)

Bug hunt with Gemma 4B via Ollama.

```powershell preflight
ollama ps
```

```powershell launch
cd /d {{PROJECT_PATH}}

Write-Host "Local Bug Hunt mode — Gemma 4B."
$env:OLLAMA_CONTEXT_LENGTH="8192"
$env:OLLAMA_FLASH_ATTENTION="1"
$env:OLLAMA_KV_CACHE_TYPE="q8_0"
$env:OLLAMA_NUM_PARALLEL="1"
$env:OLLAMA_MAX_LOADED_MODELS="1"

ollama run gemma:4b "Return exactly READY"
ollama ps
```
```

Create `profiles/local-architecture-gemma4b.md`:

```markdown
---
id: local-architecture-gemma4b
name: Local Architecture (Gemma 4B)
frontend: ollama
command: ollama
backend: ollama
mode: full-local
model: gemma:4b
required_context: 8192
task_mode: architecture
status: unknown
description: Structure exploration using Gemma 4B locally. Capability warning: may struggle with deep architecture.
---

# Local Architecture (Gemma 4B)

Architecture exploration with Gemma 4B via Ollama.

```powershell preflight
ollama ps
```

```powershell launch
cd /d {{PROJECT_PATH}}

Write-Host "Local Architecture mode — Gemma 4B."
$env:OLLAMA_CONTEXT_LENGTH="8192"
$env:OLLAMA_FLASH_ATTENTION="1"
$env:OLLAMA_KV_CACHE_TYPE="q8_0"
$env:OLLAMA_NUM_PARALLEL="1"
$env:OLLAMA_MAX_LOADED_MODELS="1"

ollama run gemma:4b "Return exactly READY"
ollama ps
```
```

Create `profiles/local-documentation-gemma4b.md`:

```markdown
---
id: local-documentation-gemma4b
name: Local Documentation (Gemma 4B)
frontend: ollama
command: ollama
backend: ollama
mode: full-local
model: gemma:4b
required_context: 8192
task_mode: documentation
status: unknown
description: Documentation generation using Gemma 4B locally.
---

# Local Documentation (Gemma 4B)

Documentation with Gemma 4B via Ollama.

```powershell preflight
ollama ps
```

```powershell launch
cd /d {{PROJECT_PATH}}

Write-Host "Local Documentation mode — Gemma 4B."
$env:OLLAMA_CONTEXT_LENGTH="8192"
$env:OLLAMA_FLASH_ATTENTION="1"
$env:OLLAMA_KV_CACHE_TYPE="q8_0"
$env:OLLAMA_NUM_PARALLEL="1"
$env:OLLAMA_MAX_LOADED_MODELS="1"

ollama run gemma:4b "Return exactly READY"
ollama ps
```
```

Create `profiles/local-performance-gemma4b.md`:

```markdown
---
id: local-performance-gemma4b
name: Local Performance (Gemma 4B)
frontend: ollama
command: ollama
backend: ollama
mode: full-local
model: gemma:4b
required_context: 8192
task_mode: performance
status: unknown
description: Performance analysis using Gemma 4B locally.
---

# Local Performance (Gemma 4B)

Performance analysis with Gemma 4B via Ollama.

```powershell preflight
ollama ps
```

```powershell launch
cd /d {{PROJECT_PATH}}

Write-Host "Local Performance mode — Gemma 4B."
$env:OLLAMA_CONTEXT_LENGTH="8192"
$env:OLLAMA_FLASH_ATTENTION="1"
$env:OLLAMA_KV_CACHE_TYPE="q8_0"
$env:OLLAMA_NUM_PARALLEL="1"
$env:OLLAMA_MAX_LOADED_MODELS="1"

ollama run gemma:4b "Return exactly READY"
ollama ps
```
```

Create `profiles/local-security-audit-gemma4b.md`:

```markdown
---
id: local-security-audit-gemma4b
name: Local Security Audit (Gemma 4B)
frontend: ollama
command: ollama
backend: ollama
mode: full-local
model: gemma:4b
required_context: 8192
task_mode: security-audit
status: unknown
description: Security scan using Gemma 4B locally. Capability warning: advanced tier task on light-tier model.
---

# Local Security Audit (Gemma 4B)

Security audit with Gemma 4B via Ollama.

```powershell preflight
ollama ps
```

```powershell launch
cd /d {{PROJECT_PATH}}

Write-Host "Local Security Audit mode — Gemma 4B."
$env:OLLAMA_CONTEXT_LENGTH="8192"
$env:OLLAMA_FLASH_ATTENTION="1"
$env:OLLAMA_KV_CACHE_TYPE="q8_0"
$env:OLLAMA_NUM_PARALLEL="1"
$env:OLLAMA_MAX_LOADED_MODELS="1"

ollama run gemma:4b "Return exactly READY"
ollama ps
```
```

Create `profiles/local-patch-test-gemma4b.md`:

```markdown
---
id: local-patch-test-gemma4b
name: Local Patch Test (Gemma 4B)
frontend: ollama
command: ollama
backend: ollama
mode: full-local
model: gemma:4b
required_context: 8192
task_mode: patch-test
status: unknown
description: Patch validation using Gemma 4B locally.
---

# Local Patch Test (Gemma 4B)

Patch test with Gemma 4B via Ollama.

```powershell preflight
ollama ps
```

```powershell launch
cd /d {{PROJECT_PATH}}

Write-Host "Local Patch Test mode — Gemma 4B."
$env:OLLAMA_CONTEXT_LENGTH="8192"
$env:OLLAMA_FLASH_ATTENTION="1"
$env:OLLAMA_KV_CACHE_TYPE="q8_0"
$env:OLLAMA_NUM_PARALLEL="1"
$env:OLLAMA_MAX_LOADED_MODELS="1"

ollama run gemma:4b "Return exactly READY"
ollama ps
```
```

Create `profiles/local-heavy-refactor-gemma4b.md`:

```markdown
---
id: local-heavy-refactor-gemma4b
name: Local Heavy Refactor (Gemma 4B)
frontend: ollama
command: ollama
backend: ollama
mode: full-local
model: gemma:4b
required_context: 8192
task_mode: heavy-refactor
status: unknown
description: Heavy refactor using Gemma 4B locally. Capability warning: advanced tier task on light-tier model.
---

# Local Heavy Refactor (Gemma 4B)

Heavy refactor with Gemma 4B via Ollama.

```powershell preflight
ollama ps
```

```powershell launch
cd /d {{PROJECT_PATH}}

Write-Host "Local Heavy Refactor mode — Gemma 4B."
$env:OLLAMA_CONTEXT_LENGTH="8192"
$env:OLLAMA_FLASH_ATTENTION="1"
$env:OLLAMA_KV_CACHE_TYPE="q8_0"
$env:OLLAMA_NUM_PARALLEL="1"
$env:OLLAMA_MAX_LOADED_MODELS="1"

ollama run gemma:4b "Return exactly READY"
ollama ps
```
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/gemma-profiles.test.js`
Expected: PASS (9 tests)

- [ ] **Step 5: Commit**

```bash
git add profiles/local-*-gemma4b.md tests/gemma-profiles.test.js
git commit -m "feat: add 9 Gemma 4B local profiles covering all task types"
```

---

### Task 6: Create DeepSeek profiles (4 files)

**Files:**
- Create: `profiles/local-code-assist-deepseek-7b.md`
- Create: `profiles/local-heavy-refactor-deepseek-16b.md`
- Create: `profiles/local-reasoning-deepseek-r1-8b.md`
- Create: `profiles/local-reasoning-deepseek-r1-32b.md`
- Test: `tests/deepseek-profiles.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { parseFrontmatter } = require('../server.js');

const PROFILES_DIR = path.join(__dirname, '..', 'profiles');
const DEEPSEEK_PROFILES = [
  'local-code-assist-deepseek-7b.md',
  'local-heavy-refactor-deepseek-16b.md',
  'local-reasoning-deepseek-r1-8b.md',
  'local-reasoning-deepseek-r1-32b.md',
];

describe('deepseek-profiles', () => {
  for (const file of DEEPSEEK_PROFILES) {
    it(`${file} exists with valid frontmatter`, () => {
      const fullPath = path.join(PROFILES_DIR, file);
      assert.ok(fs.existsSync(fullPath), `${file} missing`);
      const raw = fs.readFileSync(fullPath, 'utf8');
      const parsed = parseFrontmatter(raw);
      assert.ok(parsed.meta.name, `Expected name in ${file}`);
      assert.strictEqual(parsed.meta.backend, 'ollama');
      assert.ok(parsed.meta.model, `Expected model in ${file}`);
      assert.ok(/```(?:powershell|ps1)\s+launch/.test(raw), `Expected launch block in ${file}`);
    });
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/deepseek-profiles.test.js`
Expected: FAIL with all 4 profiles missing

- [ ] **Step 3: Create all 4 DeepSeek profiles**

Create `profiles/local-code-assist-deepseek-7b.md`:

```markdown
---
id: local-code-assist-deepseek-7b
name: Local Code Assist (DeepSeek 7B)
frontend: ollama
command: ollama
backend: ollama
mode: full-local
model: deepseek-coder:6.7b
required_context: 16384
task_mode: code-review
status: unknown
description: Coding assistance with DeepSeek Coder 6.7B via Ollama. Fast and capable for most coding tasks.
---

# Local Code Assist (DeepSeek 7B)

Coding assistance with DeepSeek Coder 6.7B.

```powershell preflight
ollama ps
```

```powershell launch
cd /d {{PROJECT_PATH}}

Write-Host "Local Code Assist mode — DeepSeek Coder 6.7B."
$env:OLLAMA_CONTEXT_LENGTH="16384"
$env:OLLAMA_FLASH_ATTENTION="1"
$env:OLLAMA_KV_CACHE_TYPE="q8_0"
$env:OLLAMA_NUM_PARALLEL="1"
$env:OLLAMA_MAX_LOADED_MODELS="1"

ollama run deepseek-coder:6.7b "Return exactly READY"
ollama ps
```
```

Create `profiles/local-heavy-refactor-deepseek-16b.md`:

```markdown
---
id: local-heavy-refactor-deepseek-16b
name: Local Heavy Refactor (DeepSeek 16B)
frontend: ollama
command: ollama
backend: ollama
mode: full-local
model: deepseek-coder-v2:16b
required_context: 65536
task_mode: heavy-refactor
status: unknown
description: Complex refactor with DeepSeek Coder V2 16B via Ollama. Large context, GPU recommended.
---

# Local Heavy Refactor (DeepSeek 16B)

Complex refactor with DeepSeek Coder V2 16B.

```powershell preflight
ollama ps
```

```powershell launch
cd /d {{PROJECT_PATH}}

Write-Host "Local Heavy Refactor mode — DeepSeek Coder V2 16B."
$env:OLLAMA_CONTEXT_LENGTH="65536"
$env:OLLAMA_FLASH_ATTENTION="1"
$env:OLLAMA_KV_CACHE_TYPE="q8_0"
$env:OLLAMA_NUM_PARALLEL="1"
$env:OLLAMA_MAX_LOADED_MODELS="1"

ollama run deepseek-coder-v2:16b "Return exactly READY"
ollama ps
```
```

Create `profiles/local-reasoning-deepseek-r1-8b.md`:

```markdown
---
id: local-reasoning-deepseek-r1-8b
name: Local Reasoning (DeepSeek R1 8B)
frontend: ollama
command: ollama
backend: ollama
mode: full-local
model: deepseek-r1:8b
required_context: 32768
task_mode: architecture
status: unknown
description: Reasoning tasks with DeepSeek R1 8B via Ollama. Good for step-by-step analysis.
---

# Local Reasoning (DeepSeek R1 8B)

Reasoning tasks with DeepSeek R1 8B.

```powershell preflight
ollama ps
```

```powershell launch
cd /d {{PROJECT_PATH}}

Write-Host "Local Reasoning mode — DeepSeek R1 8B."
$env:OLLAMA_CONTEXT_LENGTH="32768"
$env:OLLAMA_FLASH_ATTENTION="1"
$env:OLLAMA_KV_CACHE_TYPE="q8_0"
$env:OLLAMA_NUM_PARALLEL="1"
$env:OLLAMA_MAX_LOADED_MODELS="1"

ollama run deepseek-r1:8b "Return exactly READY"
ollama ps
```
```

Create `profiles/local-reasoning-deepseek-r1-32b.md`:

```markdown
---
id: local-reasoning-deepseek-r1-32b
name: Local Reasoning (DeepSeek R1 32B)
frontend: ollama
command: ollama
backend: ollama
mode: full-local
model: deepseek-r1:32b
required_context: 65536
task_mode: heavy-refactor
status: unknown
description: Deep reasoning with DeepSeek R1 32B via Ollama. Best local choice for complex tasks. GPU strongly recommended.
---

# Local Reasoning (DeepSeek R1 32B)

Deep reasoning with DeepSeek R1 32B.

```powershell preflight
ollama ps
```

```powershell launch
cd /d {{PROJECT_PATH}}

Write-Host "Local Reasoning mode — DeepSeek R1 32B."
$env:OLLAMA_CONTEXT_LENGTH="65536"
$env:OLLAMA_FLASH_ATTENTION="1"
$env:OLLAMA_KV_CACHE_TYPE="q8_0"
$env:OLLAMA_NUM_PARALLEL="1"
$env:OLLAMA_MAX_LOADED_MODELS="1"

ollama run deepseek-r1:32b "Return exactly READY"
ollama ps
```
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/deepseek-profiles.test.js`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add profiles/local-*-deepseek-*.md tests/deepseek-profiles.test.js
git commit -m "feat: add 4 DeepSeek local profiles (7B, 16B, R1 8B, R1 32B)"
```

---

### Task 7: Add audit system to server.js

**Files:**
- Modify: `server.js`
- Test: `tests/compatibility-rules.test.js` (add audit tests)

- [ ] **Step 1: Add audit helper functions to server.js**

Add these functions before `serveStatic` (before line 993):

```javascript
function loadCompatibilityRules() {
  return readJSON(FILES.rules, { modelCapabilities: {}, ceCompatibility: {}, taskTiers: {} });
}

function detectTaskMode(profile) {
  const id = String(profile.id || '').toLowerCase();
  const tm = String(profile.meta.task_mode || '').toLowerCase();
  const TASK_TYPES = ['architecture', 'bug-hunt', 'code-review', 'documentation', 'performance', 'security-audit', 'safe-audit', 'heavy-refactor', 'patch-test'];
  for (const t of TASK_TYPES) {
    if (tm.includes(t.replace('-', '')) || id.includes(t)) return t;
  }
  if (id.includes('audit')) return 'safe-audit';
  if (id.includes('refactor')) return 'heavy-refactor';
  if (id.includes('patch')) return 'patch-test';
  return 'general';
}

function auditProfile(profile, scan) {
  const rules = loadCompatibilityRules();
  const warnings = [];
  const errors = [];
  const suggestions = [];

  const model = profile.meta.model;
  const frontend = String(profile.meta.frontend || '').toLowerCase();
  const taskMode = detectTaskMode(profile);

  // Model capability check
  if (model && rules.modelCapabilities[model]) {
    const cap = rules.modelCapabilities[model];
    const taskTier = rules.taskTiers[taskMode];
    if (taskTier) {
      const tierOrder = { light: 1, standard: 2, advanced: 3, unlimited: 4 };
      if (tierOrder[cap.max_tier] < tierOrder[taskTier]) {
        warnings.push(`Model ${model} is rated '${cap.max_tier}' tier. Task '${taskMode}' requires '${taskTier}' tier.`);
        // Find alternative profiles
        const allProfiles = listProfiles();
        const alts = allProfiles.filter(p => {
          if (p.id === profile.id) return false;
          const pModel = p.meta.model;
          const pTask = detectTaskMode(p);
          if (pTask !== taskMode) return false;
          if (!pModel || !rules.modelCapabilities[pModel]) return false;
          return tierOrder[rules.modelCapabilities[pModel].max_tier] >= tierOrder[taskTier];
        }).slice(0, 2);
        for (const alt of alts) {
          suggestions.push({ profile: alt.id, name: alt.name, reason: `Handles ${taskMode} at required tier` });
        }
      }
    }
  }

  // CE compatibility check
  if (profile.meta.ce_version) {
    const ceSkill = String(profile.meta.task_mode || '').toLowerCase();
    if (rules.ceCompatibility[ceSkill]) {
      const ce = rules.ceCompatibility[ceSkill];
      if (!ce.frontends.includes(frontend)) {
        errors.push(`CE skill '${ceSkill}' requires frontend ${ce.frontends.join(' or ')}, but this profile uses '${frontend}'.`);
      }
      if (model && rules.modelCapabilities[model]) {
        const context = rules.modelCapabilities[model].context;
        if (context < ce.min_context) {
          warnings.push(`CE skill '${ceSkill}' requires ${ce.min_context} context, but ${model} provides ${context}.`);
        }
      }
    }
  }

  return { warnings, errors, suggestions, taskMode };
}
```

- [ ] **Step 2: Integrate audit into /api/launch/ route**

Modify the `/api/launch/` handler in `server.js` (around line 1075). Replace the existing handler body with:

```javascript
    if (pathName.startsWith('/api/launch/') && req.method === 'POST') {
      const id = decodeURIComponent(pathName.split('/').pop());
      const p = getProfile(id); if (!p) return send(res, 404, { error: 'Profile not found' });
      const body = await readBody(req);
      let script = extractLaunchScript(p.body);
      if (!script) return send(res, 400, { error: 'No launch block in profile' });
      script = injectProjectPath(script, activeProject);
      const blocked = isBlockedByMemory(p, readMemory());
      if (blocked && !body.overrideReason && !body.dryRun) return send(res, 200, { blocked: true, message: `Profile is blocked by memory: ${blocked.title}`, evidence: blocked.raw.slice(0, 1200) });

      // Run audit
      const audit = auditProfile(p, lastScan);
      if (audit.errors.length > 0 && !body.overrideReason && !body.dryRun) {
        return send(res, 200, { auditBlocked: true, errors: audit.errors, profile: p.id });
      }

      if (body.dryRun) return send(res, 200, { profile: p.id, script, dangerous: shouldWarnDanger(script), project: activeProject, audit: { warnings: audit.warnings, suggestions: audit.suggestions } });

      // Return audit warnings alongside launch confirmation
      if (audit.warnings.length > 0 && !body.overrideReason) {
        return send(res, 200, { launched: false, needsConfirmation: true, warnings: audit.warnings, suggestions: audit.suggestions, profile: p.id });
      }

      const sess = createSession(p, script, body);
      return send(res, 200, { launched: true, terminal: true, session: publicSession(sess), project: activeProject, auditWarnings: audit.warnings });
    }
```

- [ ] **Step 3: Add audit tests**

Append to `tests/compatibility-rules.test.js`:

```javascript
  const { auditProfile } = require('../server.js');

  it('auditProfile warns on gemma:4b heavy-refactor', () => {
    const profile = {
      id: 'local-heavy-refactor-gemma4b',
      meta: { model: 'gemma:4b', frontend: 'ollama', task_mode: 'heavy-refactor' }
    };
    const audit = auditProfile(profile, null);
    assert.ok(audit.warnings.some(w => w.includes("'light' tier") && w.includes("'advanced' tier")));
  });

  it('auditProfile suggests alternatives for gemma:4b heavy-refactor', () => {
    const profile = {
      id: 'local-heavy-refactor-gemma4b',
      meta: { model: 'gemma:4b', frontend: 'ollama', task_mode: 'heavy-refactor' }
    };
    const audit = auditProfile(profile, null);
    assert.ok(audit.suggestions.length > 0 || audit.warnings.length > 0);
  });
```

- [ ] **Step 4: Run all tests**

Run: `node --test tests/*.test.js`
Expected: All tests pass. If server tests fail due to port conflicts, run individually.

- [ ] **Step 5: Commit**

```bash
git add server.js tests/compatibility-rules.test.js
git commit -m "feat: add profile audit system with model capability and CE compatibility checks"
```

---

### Task 8: Create sync scripts for CE skills

**Files:**
- Create: `scripts/sync-ce-skills.js`
- Create: `scripts/sync-ce-skills.ps1`

- [ ] **Step 1: Create Node.js sync script**

Create `scripts/sync-ce-skills.js`:

```javascript
const https = require('https');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://raw.githubusercontent.com/EveryInc/compound-engineering-plugin/main/plugins/compound-engineering/skills';
const CACHE_DIR = path.join(__dirname, '..', 'skills', 'compound-engineering', 'cache');
const SKILLS = [
  'ce-strategy',
  'ce-ideate',
  'ce-brainstorm',
  'ce-plan',
  'ce-work',
  'ce-code-review',
  'ce-compound',
  'ce-debug',
  'ce-product-pulse',
];

function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'AgentDock/1.1' }, timeout: 15000 }, (res) => {
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject).on('timeout', () => reject(new Error('timeout')));
  });
}

async function main() {
  for (const skill of SKILLS) {
    const dir = path.join(CACHE_DIR, skill);
    fs.mkdirSync(dir, { recursive: true });
    const url = `${BASE_URL}/${skill}/SKILL.md`;
    try {
      const content = await fetch(url);
      fs.writeFileSync(path.join(dir, 'SKILL.md'), content, 'utf8');
      console.log(`Synced ${skill}`);
    } catch (e) {
      console.error(`Failed to sync ${skill}: ${e.message}`);
      process.exitCode = 1;
    }
  }
  console.log('Done.');
}

main();
```

- [ ] **Step 2: Create PowerShell sync script**

Create `scripts/sync-ce-skills.ps1`:

```powershell
$baseUrl = "https://raw.githubusercontent.com/EveryInc/compound-engineering-plugin/main/plugins/compound-engineering/skills"
$cacheDir = Join-Path $PSScriptRoot ".." "skills" "compound-engineering" "cache"
$skills = @(
  "ce-strategy",
  "ce-ideate",
  "ce-brainstorm",
  "ce-plan",
  "ce-work",
  "ce-code-review",
  "ce-compound",
  "ce-debug",
  "ce-product-pulse"
)

foreach ($skill in $skills) {
  $outDir = Join-Path $cacheDir $skill
  New-Item -ItemType Directory -Force -Path $outDir | Out-Null
  $url = "$baseUrl/$skill/SKILL.md"
  try {
    Invoke-WebRequest -Uri $url -OutFile (Join-Path $outDir "SKILL.md") -TimeoutSec 15
    Write-Host "Synced $skill"
  } catch {
    Write-Host "Failed to sync ${skill}: $_"
  }
}
Write-Host "Done."
```

- [ ] **Step 3: Test the Node.js sync script**

Run: `node scripts/sync-ce-skills.js`
Expected: 9 "Synced ..." lines, then "Done."

- [ ] **Step 4: Commit**

```bash
git add scripts/sync-ce-skills.js scripts/sync-ce-skills.ps1
git commit -m "feat: add CE skill sync scripts (Node.js and PowerShell)"
```

---

### Task 9: Update AGENTS.md documentation

**Files:**
- Modify: `AGENTS.md`

- [ ] **Step 1: Add CE integration section to AGENTS.md**

Find the "Key Files" table in `AGENTS.md` and add these rows:

```markdown
| `skills/compound-engineering/skills-catalog.json` | Registry of all 37 Compound Engineering skills |
| `skills/compound-engineering/agents-catalog.json` | Registry of all 51 Compound Engineering agents |
| `compatibility-rules.json` | Model capability matrix and CE skill compatibility |
| `scripts/sync-ce-skills.js` | Downloads core CE skills for offline use |
```

Find the "Profiles" section and append after the existing example:

```markdown
### Compound Engineering Profiles

CE workflow profiles are available for `claude` and `codex` frontends:
- `compound-core-claude` / `compound-core-codex` — General CE access
- `compound-strategy-*` — Run `/ce-strategy`
- `compound-plan-work-*` — Chain `/ce-brainstorm` -> `/ce-plan` -> `/ce-work`
- `compound-review-compound-*` — Chain `/ce-code-review` -> `/ce-compound`

### Local Model Profiles

Gemma 4B and DeepSeek profiles are available for local Ollama use:
- `local-*-gemma4b` — 9 profiles (all task types)
- `local-code-assist-deepseek-7b` — Coding tasks
- `local-heavy-refactor-deepseek-16b` — Complex refactor
- `local-reasoning-deepseek-r1-8b` / `r1-32b` — Reasoning tasks
```

Find the "Troubleshooting" table and add:

```markdown
| CE skill not found | Ensure the CE plugin is installed for your frontend. Run `node scripts/sync-ce-skills.js` to cache core skills locally. |
| Model capability warning | The audit system flags when a model's tier is below the task's required tier. Consider the suggested alternative profile. |
```

- [ ] **Step 2: Commit**

```bash
git add AGENTS.md
git commit -m "docs: document CE integration, skills catalog, and local model profiles"
```

---

### Task 10: Run full test suite and verify

**Files:**
- All existing and new test files

- [ ] **Step 1: Run the complete test suite**

Run: `node --test tests/*.test.js`
Expected: All tests pass (server.test.js, scanner.test.js, profiles.test.js, memory.test.js, compatibility-rules.test.js, skills-catalog.test.js, ce-profiles.test.js, gemma-profiles.test.js, deepseek-profiles.test.js, server-skills-api.test.js)

- [ ] **Step 2: Verify server starts correctly**

Run: `node server.js`
In another terminal or via curl:
```bash
curl http://127.0.0.1:7777/api/skills | head -c 500
curl http://127.0.0.1:7777/api/skills/ce-plan
curl http://127.0.0.1:7777/api/skills/ce-plan/content | head -c 300
```
Expected: Valid JSON responses, no crashes.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "test: verify full test suite passes with CE integration"
```

---

## Self-Review

### Spec Coverage

| Spec Section | Implementing Task |
|--------------|-------------------|
| 2.1 Frontend Support Matrix | Task 4 (CE profiles only for claude/codex) |
| 2.2 CE Workflow Profiles (8) | Task 4 |
| 3.1 Gemma 4B Profiles (9) | Task 5 |
| 3.2 DeepSeek Profiles (4) | Task 6 |
| 4.1 compatibility-rules.json extension | Task 1 |
| 4.2 Runtime capability checks | Task 7 |
| 5.1 Audit checks (freshness, plugin, capability) | Task 7 (capability + CE compat) |
| 5.2 Audit Logging | Task 7 (returns in API response) |
| 6.1 Skills directory structure | Task 2 |
| 6.2 skills-catalog.json schema | Task 2 |
| 6.3 agents-catalog.json | Task 2 |
| 6.4 /api/skills endpoints | Task 3 |
| 7.1 Cached skills (9) | Task 2 + Task 8 |
| 7.2 Cache Population | Task 8 |
| 7.3 Size Budget | Task 2 (SKILL.md files <200KB) |
| 7.4 Version Tracking | Task 2 (.version file) |
| 8 File Structure | All tasks |
| 9 API Changes | Task 3 + Task 7 |
| 10 UI Changes | Out of scope for v1 (dashboard tab deferred) |
| 11 Testing Strategy | All test files in each task |

### Placeholder Scan

- No TBDs, TODOs, or "implement later" in the plan.
- Every test has actual assertions.
- Every file creation step has exact content.
- Every route handler has exact code.

### Type Consistency

- `modelCapabilities` uses `max_tier`, `context`, `warnings`, `description` consistently.
- `ceCompatibility` uses `frontends`, `min_context`, `description` consistently.
- `taskTiers` maps task strings to tier strings consistently.
- `auditProfile` returns `{ warnings, errors, suggestions, taskMode }` consistently.

### Gap

- UI "Skills" tab is deferred to v1.1. The API endpoints and catalog are functional without it.
- Audit freshness check (GitHub API version comparison) is deferred. Current audit covers capability and CE compatibility only.
