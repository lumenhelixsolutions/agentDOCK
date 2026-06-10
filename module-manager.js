const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');
const { spawn } = require('child_process');

const DEFAULT_AUTO_SYNC_DAYS = 7;
const GITHUB_REPO = 'EveryInc/compound-engineering-plugin';

function readJSON(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJSON(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

function dirExists(p) {
  try { return fs.existsSync(p) && fs.statSync(p).isDirectory(); } catch { return false; }
}

function fileExists(p) {
  try { return fs.existsSync(p) && fs.statSync(p).isFile(); } catch { return false; }
}

function findNamedDir(root, name, depth = 4) {
  const hits = [];
  if (!dirExists(root) || depth < 0) return hits;
  try {
    for (const ent of fs.readdirSync(root, { withFileTypes: true })) {
      const full = path.join(root, ent.name);
      if (ent.isDirectory()) {
        if (ent.name.toLowerCase() === name.toLowerCase()) hits.push(full);
        if (depth > 0) hits.push(...findNamedDir(full, name, depth - 1));
      }
    }
  } catch { /* ignore permission errors */ }
  return hits;
}

function countMdFiles(dir) {
  if (!dirExists(dir)) return 0;
  let n = 0;
  const walk = (d, depth) => {
    if (depth > 5) return;
    try {
      for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
        const full = path.join(d, ent.name);
        if (ent.isDirectory()) walk(full, depth + 1);
        else if (ent.name.endsWith('.md')) n += 1;
      }
    } catch { /* ignore */ }
  };
  walk(dir, 0);
  return n;
}

function probeCePluginPaths() {
  const home = os.homedir();
  const probes = [
    { frontend: 'claude', path: path.join(home, '.claude', 'plugins', 'compound-engineering') },
    { frontend: 'claude', path: path.join(home, '.claude', 'plugins', 'compound-engineering-plugin', 'plugins', 'compound-engineering') },
    { frontend: 'codex', path: path.join(home, '.codex', 'skills', 'compound-engineering') },
    { frontend: 'gemini', path: path.join(home, '.gemini', 'skills', 'compound-engineering') },
    { frontend: 'opencode', path: path.join(home, '.opencode', 'skills', 'compound-engineering') },
  ];
  const found = [];
  for (const p of probes) {
    if (dirExists(p.path)) {
      found.push({ ...p, md_files: countMdFiles(p.path), kind: 'plugin-dir' });
    }
  }
  for (const [frontend, relParts] of [
    ['claude', ['.claude']],
    ['codex', ['.codex']],
    ['gemini', ['.gemini']],
  ]) {
    const base = path.join(home, ...relParts);
    for (const hit of findNamedDir(base, 'compound-engineering', 3)) {
      if (!found.some((f) => f.path === hit)) {
        found.push({ frontend, path: hit, md_files: countMdFiles(hit), kind: 'discovered' });
      }
    }
  }
  const codexAgents = path.join(home, '.codex', 'skills', 'compound-engineering');
  const agentsHint = dirExists(codexAgents) && countMdFiles(codexAgents) > 3;
  return { home, plugin_dirs: found, codex_agents_likely: agentsHint };
}

function fetchUpstreamRelease() {
  return new Promise((resolve) => {
    const url = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;
    const req = https.get(url, { headers: { 'User-Agent': 'AgentDock/2.0', Accept: 'application/vnd.github+json' } }, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (res.statusCode !== 200) return resolve({ ok: false, error: json.message || `HTTP ${res.statusCode}` });
          resolve({ ok: true, tag: String(json.tag_name || '').replace(/^v/, ''), published_at: json.published_at, html_url: json.html_url });
        } catch (e) {
          resolve({ ok: false, error: e.message });
        }
      });
    });
    req.setTimeout(12000, () => { req.destroy(); resolve({ ok: false, error: 'timeout' }); });
    req.on('error', (e) => resolve({ ok: false, error: e.message }));
  });
}

function runCommand(command, args, { cwd, timeoutMs = 120000 } = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd, windowsHide: true, shell: process.platform === 'win32' });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill();
      resolve({ ok: false, code: -1, stdout, stderr, error: 'timeout' });
    }, timeoutMs);
    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ ok: code === 0, code, stdout: stdout.trim(), stderr: stderr.trim() });
    });
    child.on('error', (e) => {
      clearTimeout(timer);
      resolve({ ok: false, code: -1, stdout, stderr, error: e.message });
    });
  });
}

function createModuleManager({ root, files, loadUserSettings, saveUserSettings, loadMcpCatalog }) {
  const CATALOG_PATH = path.join(root, 'modules', 'modules-catalog.json');
  const STATE_PATH = files.modulesState || path.join(root, 'state', 'modules-state.json');
  let upstreamCache = { at: 0, data: null };

  function loadCatalog() {
    return readJSON(CATALOG_PATH, { version: '1.0', modules: [] });
  }

  function loadState() {
    const state = readJSON(STATE_PATH, {
      version: 2,
      enabled: [],
      last_sync: {},
      auto_sync: { enabled: true, interval_days: DEFAULT_AUTO_SYNC_DAYS },
      install_log: [],
      notes: {},
    });
    if (!Array.isArray(state.enabled)) state.enabled = [];
    if (!state.last_sync || typeof state.last_sync !== 'object') state.last_sync = {};
    if (!state.auto_sync) state.auto_sync = { enabled: true, interval_days: DEFAULT_AUTO_SYNC_DAYS };
    if (!Array.isArray(state.install_log)) state.install_log = [];
    return state;
  }

  function saveState(state) {
    if (state.install_log.length > 50) state.install_log = state.install_log.slice(-50);
    writeJSON(STATE_PATH, state);
    return state;
  }

  function appendInstallLog(entry) {
    const state = loadState();
    state.install_log.push({ ...entry, at: new Date().toISOString() });
    saveState(state);
  }

  function ensureDefaults(state, catalog) {
    const enabled = new Set(state.enabled);
    for (const mod of catalog.modules || []) {
      if (mod.default_enabled && !enabled.has(mod.id)) enabled.add(mod.id);
      if (mod.always_on) enabled.add(mod.id);
    }
    state.enabled = [...enabled];
    return state;
  }

  function countCacheFiles(cacheRel) {
    return countMdFiles(path.join(root, cacheRel));
  }

  async function getUpstreamInfo(force = false) {
    const now = Date.now();
    if (!force && upstreamCache.data && now - upstreamCache.at < 3600000) return upstreamCache.data;
    const data = await fetchUpstreamRelease();
    upstreamCache = { at: now, data };
    return data;
  }

  function isSyncStale(moduleId, catalogVersion) {
    const state = loadState();
    const last = state.last_sync[moduleId];
    if (!last) return true;
    const ageMs = Date.now() - new Date(last).getTime();
    const intervalDays = state.auto_sync?.interval_days || DEFAULT_AUTO_SYNC_DAYS;
    return ageMs > intervalDays * 86400000;
  }

  function detectPluginPack(mod, scan) {
    const cacheFiles = mod.cache_dir ? countCacheFiles(mod.cache_dir) : 0;
    const minFiles = mod.detect?.cache_min_files ?? 1;
    const cacheOk = cacheFiles >= minFiles;
    const cacheVersionPath = mod.cache_dir ? path.join(root, mod.cache_dir, '.version') : null;
    const cachedVersion = cacheVersionPath && fileExists(cacheVersionPath)
      ? fs.readFileSync(cacheVersionPath, 'utf8').trim()
      : null;

    const frontendIds = { claude: 'claude-code', codex: 'codex', gemini: 'gemini-cli', opencode: 'opencode' };
    const frontends = (mod.detect?.frontends || ['claude', 'codex', 'gemini']).map((f) => {
      const coderId = frontendIds[f] || f;
      const coder = (scan?.coders || []).find((c) => c.id === coderId || c.id === f || c.command === f);
      return { id: f, coder_id: coderId, present: Boolean(coder?.detection?.present) };
    });

    const probe = probeCePluginPaths();
    const pluginByFrontend = {};
    for (const dir of probe.plugin_dirs) {
      if (!pluginByFrontend[dir.frontend]) pluginByFrontend[dir.frontend] = [];
      pluginByFrontend[dir.frontend].push({ path: dir.path, md_files: dir.md_files, kind: dir.kind });
    }

    const claudeInstalled = (pluginByFrontend.claude || []).length > 0;
    const codexSkills = (pluginByFrontend.codex || []).length > 0;
    const codexAgents = probe.codex_agents_likely;
    const anyPlugin = probe.plugin_dirs.length > 0;
    const anyFrontend = frontends.some((f) => f.present);

    let status = 'missing';
    if (cacheOk && (claudeInstalled || codexSkills)) status = 'ready';
    else if (cacheOk && anyFrontend) status = 'cached-only';
    else if (claudeInstalled || codexSkills) status = 'plugin-only';
    else if (cacheOk) status = 'cached-only';
    else if (anyFrontend) status = 'needs-sync';

    return {
      cache_files: cacheFiles,
      cache_ok: cacheOk,
      cached_version: cachedVersion,
      frontends,
      plugin_probe: probe,
      plugin_by_frontend: pluginByFrontend,
      claude_plugin: claudeInstalled,
      codex_skills: codexSkills,
      codex_agents: codexAgents,
      installed: cacheOk || anyPlugin || anyFrontend,
      status,
    };
  }

  function detectMcp(mod, scan, settings) {
    const mcpId = mod.mcp_id;
    const enabled = (settings.mcp?.enabledServers || []).includes(mcpId);
    const catalog = loadMcpCatalog();
    const srv = (catalog.servers || []).find((s) => s.id === mcpId);
    const missingReqs = (mod.requires || []).filter((r) => !scan?.tools?.[r]?.present);
    const uvxReady = Boolean(scan?.tools?.uvx?.present);
    return {
      enabled,
      in_catalog: Boolean(srv),
      missing_requirements: missingReqs,
      uvx_ready: uvxReady,
      installed: enabled && missingReqs.length === 0,
      status: enabled ? (missingReqs.length ? 'blocked' : 'ready') : 'disabled',
    };
  }

  function detectBuiltin(mod) {
    return { installed: true, status: 'ready', always_on: Boolean(mod.always_on) };
  }

  async function enrichModule(mod, scan, settings, state) {
    let detection = { installed: false, status: 'unknown' };
    if (mod.type === 'plugin-pack') detection = detectPluginPack(mod, scan);
    else if (mod.type === 'mcp-server') detection = detectMcp(mod, scan, settings);
    else if (mod.type === 'builtin') detection = detectBuiltin(mod);

    const enabled = mod.always_on || state.enabled.includes(mod.id);
    const upstream = mod.type === 'plugin-pack' ? await getUpstreamInfo() : null;
    const catalogVersion = mod.version || null;
    const stale = mod.sync ? isSyncStale(mod.id, catalogVersion) : false;
    const version_behind = upstream?.ok && catalogVersion && upstream.tag && catalogVersion !== upstream.tag
      ? { catalog: catalogVersion, upstream: upstream.tag, url: upstream.html_url }
      : null;

    return {
      ...mod,
      enabled,
      detection,
      last_sync: state.last_sync[mod.id] || null,
      sync_stale: stale,
      upstream: upstream?.ok ? { tag: upstream.tag, published_at: upstream.published_at, url: upstream.html_url } : null,
      version_behind,
    };
  }

  async function listModules(scan) {
    const catalog = loadCatalog();
    const settings = loadUserSettings();
    let state = loadState();
    state = ensureDefaults(state, catalog);
    saveState(state);
    const modules = [];
    for (const m of catalog.modules || []) {
      modules.push(await enrichModule(m, scan, settings, state));
    }
    return { version: '2.0', catalog_version: catalog.version, auto_sync: state.auto_sync, modules };
  }

  function setEnabled(moduleId, enabled) {
    const catalog = loadCatalog();
    const mod = (catalog.modules || []).find((m) => m.id === moduleId);
    if (!mod) return { ok: false, error: 'Module not found' };
    if (mod.always_on && !enabled) return { ok: false, error: 'Built-in modules cannot be disabled' };

    const state = loadState();
    const set = new Set(state.enabled);
    if (enabled) set.add(moduleId);
    else set.delete(moduleId);
    state.enabled = [...set];
    saveState(state);

    if (mod.type === 'mcp-server' && mod.mcp_id) {
      const settings = loadUserSettings();
      const servers = new Set(settings.mcp?.enabledServers || []);
      if (enabled) servers.add(mod.mcp_id);
      else servers.delete(mod.mcp_id);
      settings.mcp = { ...settings.mcp, enabledServers: [...servers] };
      saveUserSettings(settings);
    }

    return { ok: true, moduleId, enabled };
  }

  function setAutoSyncSettings(partial) {
    const state = loadState();
    state.auto_sync = { ...state.auto_sync, ...partial };
    saveState(state);
    return { ok: true, auto_sync: state.auto_sync };
  }

  function syncModule(moduleId) {
    const catalog = loadCatalog();
    const mod = (catalog.modules || []).find((m) => m.id === moduleId);
    if (!mod) return Promise.resolve({ ok: false, error: 'Module not found' });
    if (!mod.sync?.script) return Promise.resolve({ ok: false, error: 'Module has no sync script' });

    const scriptPath = path.join(root, mod.sync.script);
    if (!fs.existsSync(scriptPath)) return Promise.resolve({ ok: false, error: `Sync script missing: ${mod.sync.script}` });

    return new Promise((resolve) => {
      const child = spawn(process.execPath, [scriptPath], { cwd: root, windowsHide: true });
      let out = '';
      let err = '';
      child.stdout.on('data', (d) => { out += d.toString(); });
      child.stderr.on('data', (d) => { err += d.toString(); });
      child.on('close', async (code) => {
        const state = loadState();
        if (code === 0) {
          state.last_sync[moduleId] = new Date().toISOString();
          saveState(state);
          const upstream = await getUpstreamInfo(true);
          resolve({ ok: true, moduleId, output: out.trim(), synced_at: state.last_sync[moduleId], upstream_tag: upstream?.tag || null });
        } else {
          resolve({ ok: false, error: err.trim() || out.trim() || `Sync exited ${code}` });
        }
      });
      child.on('error', (e) => resolve({ ok: false, error: e.message }));
    });
  }

  function getInstallTargets(mod) {
    return mod.install?.targets || {};
  }

  function getInstallPlan(moduleId) {
    const catalog = loadCatalog();
    const mod = (catalog.modules || []).find((m) => m.id === moduleId);
    if (!mod) return { ok: false, error: 'Module not found' };

    if (mod.type === 'plugin-pack') {
      const targets = getInstallTargets(mod);
      const steps = [
        { id: 'sync', label: mod.sync?.label || 'Sync skill cache', command: `node ${mod.sync?.script || 'scripts/sync-ce-skills.js'}`, runnable: true, target: 'sync' },
      ];
      for (const [key, t] of Object.entries(targets)) {
        steps.push({
          id: key,
          label: t.label,
          command: `${t.command} ${(t.args || []).join(' ')}`.trim(),
          runnable: t.runnable !== false,
          target: key,
          manual_note: t.manual_note || null,
        });
      }
      return { ok: true, moduleId, steps, note: mod.install?.note || null };
    }

    if (mod.type === 'mcp-server') {
      return {
        ok: true,
        moduleId,
        steps: [
          { id: 'enable', label: 'Enable in AgentDock', command: null, runnable: true, target: 'enable' },
          { id: 'run', label: 'MCP launch snippet', command: mod.install_snippet, runnable: false },
        ],
        note: 'Enable here, then add the snippet to your agent MCP config.',
      };
    }

    return { ok: true, moduleId, steps: [], note: 'Built-in — always active.' };
  }

  async function runInstallTarget(moduleId, target, scan) {
    const catalog = loadCatalog();
    const mod = (catalog.modules || []).find((m) => m.id === moduleId);
    if (!mod) return { ok: false, error: 'Module not found' };

    if (target === 'sync') {
      const r = await syncModule(moduleId);
      appendInstallLog({ moduleId, target, ok: r.ok, summary: r.ok ? 'sync ok' : r.error });
      return r;
    }

    if (target === 'enable' && mod.type === 'mcp-server') {
      const r = setEnabled(moduleId, true);
      appendInstallLog({ moduleId, target, ok: r.ok });
      return { ...r, output: 'MCP module enabled in AgentDock settings.' };
    }

    if (mod.type !== 'plugin-pack') return { ok: false, error: 'Install target not supported for this module type' };

    const targets = getInstallTargets(mod);
    const recipe = targets[target];
    if (!recipe) return { ok: false, error: `Unknown install target: ${target}` };

    if (recipe.requires_frontend) {
      const frontendIds = { claude: 'claude-code', codex: 'codex', gemini: 'gemini-cli' };
      const coderId = frontendIds[recipe.requires_frontend] || recipe.requires_frontend;
      const present = (scan?.coders || []).some((c) => c.id === coderId && c.detection?.present);
      if (!present) {
        return { ok: false, error: `${recipe.requires_frontend} CLI not detected — run scan first` };
      }
    }

    if (recipe.requires_tool && !scan?.tools?.[recipe.requires_tool]?.present) {
      return { ok: false, error: `${recipe.requires_tool} not detected — install it first` };
    }

    if (recipe.manual_only) {
      return {
        ok: true,
        manual: true,
        output: recipe.manual_note || 'Complete this step in the agent TUI.',
        command: `${recipe.command} ${(recipe.args || []).join(' ')}`.trim(),
      };
    }

    const result = await runCommand(recipe.command, recipe.args || [], { cwd: root, timeoutMs: recipe.timeout_ms || 180000 });
    appendInstallLog({
      moduleId,
      target,
      ok: result.ok,
      code: result.code,
      summary: result.ok ? 'install ok' : (result.error || result.stderr || result.stdout || 'failed'),
    });

    if (!result.ok) {
      return {
        ok: false,
        error: result.error || result.stderr || result.stdout || `Exit ${result.code}`,
        stdout: result.stdout,
        stderr: result.stderr,
      };
    }

    return {
      ok: true,
      target,
      output: [result.stdout, result.stderr].filter(Boolean).join('\n'),
      next_steps: recipe.next_steps || [],
    };
  }

  async function runFullSetup(moduleId, scan) {
    const results = [];
    const r1 = await runInstallTarget(moduleId, 'sync', scan);
    results.push({ step: 'sync', ...r1 });
    if (!r1.ok) return { ok: false, results, error: r1.error };

    const order = ['claude_marketplace', 'claude_plugin', 'codex_marketplace', 'codex_agents', 'gemini_convert'];
    for (const target of order) {
      const catalog = loadCatalog();
      const mod = catalog.modules.find((m) => m.id === moduleId);
      if (!mod?.install?.targets?.[target]) continue;
      const recipe = mod.install.targets[target];
      if (recipe.requires_frontend) {
        const frontendIds = { claude: 'claude-code', codex: 'codex', gemini: 'gemini-cli' };
        const coderId = frontendIds[recipe.requires_frontend];
        if (!(scan?.coders || []).some((c) => c.id === coderId && c.detection?.present)) continue;
      }
      if (recipe.requires_tool && !scan?.tools?.[recipe.requires_tool]?.present) continue;
      if (recipe.manual_only) {
        results.push({ step: target, ok: true, manual: true, output: recipe.manual_note });
        continue;
      }
      const r = await runInstallTarget(moduleId, target, scan);
      results.push({ step: target, ...r });
      if (!r.ok && !recipe.optional) break;
    }

    const ok = results.every((r) => r.ok || r.manual);
    return { ok, results, manual_steps: results.filter((r) => r.manual) };
  }

  async function maybeAutoSync(scan) {
    const state = loadState();
    if (!state.auto_sync?.enabled) return { ran: false, reason: 'auto_sync disabled' };

    const catalog = loadCatalog();
    const ran = [];
    for (const mod of catalog.modules || []) {
      if (!mod.sync?.script) continue;
      if (!state.enabled.includes(mod.id) && !mod.default_enabled) continue;
      if (!isSyncStale(mod.id, mod.version)) continue;
      const r = await syncModule(mod.id);
      ran.push({ moduleId: mod.id, ok: r.ok, error: r.error || null });
    }
    return { ran: ran.length > 0, results: ran };
  }

  function getLaunchPayload(scan) {
    const catalog = loadCatalog();
    const settings = loadUserSettings();
    const state = loadState();
    const modules = (catalog.modules || []).map((m) => {
      let detection = {};
      if (m.type === 'plugin-pack') detection = detectPluginPack(m, scan);
      else if (m.type === 'mcp-server') detection = detectMcp(m, scan, settings);
      else detection = detectBuiltin(m);
      return {
        ...m,
        enabled: m.always_on || state.enabled.includes(m.id),
        detection,
      };
    });

    const enabled = modules.filter((m) => m.enabled);
    const mcpServers = enabled.filter((m) => m.type === 'mcp-server').map((m) => m.mcp_id).filter(Boolean);
    const pluginPacks = enabled.filter((m) => m.type === 'plugin-pack').map((m) => m.id);

    const env = {
      AGENTDOCK_MODULES: enabled.map((m) => m.id).join(','),
      AGENTDOCK_MCP_SERVERS: mcpServers.join(','),
      AGENTDOCK_PLUGIN_PACKS: pluginPacks.join(','),
    };

    const ce = enabled.find((m) => m.id === 'compound-engineering');
    if (ce?.cache_dir) {
      env.AGENTDOCK_SKILLS_CACHE = path.join(root, ce.cache_dir);
      const probe = probeCePluginPaths();
      if (probe.plugin_dirs[0]) env.AGENTDOCK_CE_PLUGIN_PATH = probe.plugin_dirs[0].path;
    }

    return { env, enabled: enabled.map((m) => m.id), mcpServers, pluginPacks };
  }

  return {
    loadCatalog,
    loadState,
    listModules,
    setEnabled,
    setAutoSyncSettings,
    syncModule,
    getInstallPlan,
    runInstallTarget,
    runFullSetup,
    maybeAutoSync,
    getLaunchPayload,
    probeCePluginPaths,
    CATALOG_PATH,
    STATE_PATH,
  };
}

module.exports = {
  createModuleManager,
  readJSON,
  writeJSON,
  probeCePluginPaths,
  fetchUpstreamRelease,
};