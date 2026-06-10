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

function loadPrefabManifest(root) {
  return readJSON(path.join(root, 'prefab-manifest.json'), {
    version: '1.0',
    packs: [],
    builtins: [],
    mcp_servers: [],
  });
}

function createPrefabInventory({ root, moduleManager, lastScan }) {
  const manifest = loadPrefabManifest(root);
  const catalog = moduleManager.loadCatalog();
  const modules = catalog.modules || [];

  const packs = (manifest.packs || []).map((entry) => {
    const mod = modules.find((m) => m.id === entry.id);
    return {
      ...entry,
      name: mod?.name || entry.name,
      description: mod?.description || null,
      default_enabled: mod?.default_enabled ?? true,
    };
  });

  const builtins = (manifest.builtins || []).map((entry) => {
    const mod = modules.find((m) => m.id === entry.id);
    return {
      ...entry,
      name: mod?.name || entry.name,
      description: mod?.description || null,
    };
  });

  const mcp_servers = (manifest.mcp_servers || []).map((entry) => {
    const mod = modules.find((m) => m.id === entry.module_id || m.mcp_id === entry.id);
    return {
      ...entry,
      name: mod?.name || entry.name,
      description: mod?.description || null,
      install_snippet: mod?.install_snippet || null,
      requires: mod?.requires || [],
    };
  });

  return {
    version: manifest.version || '1.0',
    description: manifest.description,
    prefab: { packs, builtins, mcp_servers },
    counts: {
      packs: packs.length,
      builtins: builtins.length,
      mcp_servers: mcp_servers.length,
    },
  };
}

async function getPrefabInventory(ctx) {
  const inventory = createPrefabInventory(ctx);
  let detected = null;
  try {
    const listed = await ctx.moduleManager.listModules(ctx.lastScan);
    detected = {
      packs: listed.modules
        ?.filter((m) => m.type === 'plugin-pack')
        .map((m) => ({ id: m.id, status: m.detection?.status || 'unknown', enabled: m.enabled })) || [],
      builtins: listed.modules
        ?.filter((m) => m.type === 'builtin')
        .map((m) => ({ id: m.id, status: 'always_on', enabled: true })) || [],
      mcp_servers: listed.modules
        ?.filter((m) => m.type === 'mcp-server')
        .map((m) => ({ id: m.mcp_id, module_id: m.id, enabled: m.enabled })) || [],
    };
  } catch {
    detected = { error: 'Could not load module detection' };
  }
  return { ...inventory, detected };
}

module.exports = { loadPrefabManifest, createPrefabInventory, getPrefabInventory };