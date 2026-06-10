const fs = require('fs');
const path = require('path');

function readJSON(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function listCachedSkills(cacheDir) {
  if (!fs.existsSync(cacheDir)) return [];
  return fs.readdirSync(cacheDir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && fs.existsSync(path.join(cacheDir, e.name, 'SKILL.md')))
    .map((e) => e.name);
}

function countProfiles(profilesDir) {
  if (!fs.existsSync(profilesDir)) return { total: 0, compound: 0 };
  const files = fs.readdirSync(profilesDir).filter((f) => f.endsWith('.md'));
  return {
    total: files.length,
    compound: files.filter((f) => f.startsWith('compound-')).length,
  };
}

function createPrefabInventory({ root, moduleManager, lastScan }) {
  const catalog = moduleManager.loadCatalog();
  const skillsCatalog = readJSON(path.join(root, 'skills/compound-engineering/skills-catalog.json'), { skills: [] });
  const agentsCatalog = readJSON(path.join(root, 'skills/compound-engineering/agents-catalog.json'), { agents: [] });
  const codersCatalog = readJSON(path.join(root, 'coders-catalog.json'), { coders: [] });
  const mcpCatalog = readJSON(path.join(root, 'state/mcp-catalog.json'), { servers: [] });
  const cacheDir = path.join(root, 'skills/compound-engineering/cache');
  const cached = listCachedSkills(cacheDir);
  const profiles = countProfiles(path.join(root, 'profiles'));

  const modules = catalog.modules || [];
  const packs = modules.filter((m) => m.type === 'plugin-pack');
  const builtins = modules.filter((m) => m.type === 'builtin');
  const mcpModules = modules.filter((m) => m.type === 'mcp-server');

  const ce = packs.find((m) => m.id === 'compound-engineering');
  const skills = skillsCatalog.skills || [];
  const agents = agentsCatalog.agents || [];

  return {
    version: '1.0',
    bundled: {
      plugin_packs: packs.length,
      builtins: builtins.map((m) => ({ id: m.id, name: m.name, always_on: Boolean(m.always_on) })),
      mcp_modules: mcpModules.map((m) => ({ id: m.id, mcp_id: m.mcp_id, default_enabled: Boolean(m.default_enabled) })),
      mcp_catalog_servers: (mcpCatalog.servers || []).length,
      skills_catalog: skills.length,
      skills_cached: cached.length,
      skills_cached_ids: cached,
      agents_catalog: agents.length,
      agents_upstream: ce?.counts?.agents || 51,
      coders_catalog: (codersCatalog.tools || codersCatalog.coders || []).length,
      launch_profiles: profiles.total,
      compound_profiles: profiles.compound,
      stack_templates: 9,
    },
    gaps: {
      skills_metadata_only: Math.max(0, skills.length - cached.length),
      agents_catalog_vs_upstream: Math.max(0, (ce?.counts?.agents || 51) - agents.length),
      on_demand_skill_fetch: false,
    },
    user_install: {
      note: 'CE full plugin, MCP uvx packages, and agent CLIs install on the host machine.',
      mcp_requires: ['uvx'],
      ce_frontends: ['claude', 'codex', 'gemini', 'opencode'],
    },
  };
}

async function getPrefabInventory(ctx) {
  const bundled = createPrefabInventory(ctx);
  let detected = null;
  try {
    const listed = await ctx.moduleManager.listModules(ctx.lastScan);
    const ce = listed.modules?.find((m) => m.id === 'compound-engineering');
    detected = {
      modules_enabled: listed.modules?.filter((m) => m.enabled).length || 0,
      ce_status: ce?.detection?.status || 'unknown',
      ce_cache_files: ce?.detection?.cache_files || 0,
      ce_claude_plugin: Boolean(ce?.detection?.claude_plugin),
      ce_codex_skills: Boolean(ce?.detection?.codex_skills),
      ce_codex_agents: Boolean(ce?.detection?.codex_agents),
      mcp_enabled: listed.modules?.filter((m) => m.type === 'mcp-server' && m.enabled).map((m) => m.mcp_id) || [],
    };
  } catch {
    detected = { error: 'Could not load module detection' };
  }
  return { ...bundled, detected };
}

module.exports = { createPrefabInventory, getPrefabInventory };