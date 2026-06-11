/**
 * HOOT operator command executor — allowlisted app tools only (no coding/shell).
 */

const BLOCKED_TYPES = new Set([
  'shell', 'writefile', 'editfile', 'launchcodingprofile', 'exec', 'npm', 'git',
  'gitpush', 'runshell', 'deletefile',
]);

const BLOCKED_ALIASES = new Set([
  'shell', 'writefile', 'editfile', 'launchcodingprofile', 'exec', 'npm', 'git', 'gitpush', 'runshell', 'deletefile',
]);

const {
  COACH_ACTION_TARGETS,
  normalizeCoachActionTarget,
  isCoachActionAllowed,
  coachActionLabel,
  listCoachActions,
} = require('./coach-actions');

function normalizeType(cmd) {
  const raw = String(cmd?.type || '').trim();
  const map = {
    launch: 'launchProfile',
    generateplan: 'makePlan',
    setmemory: 'appendMemory',
    getstatus: 'getStatus',
    runscan: 'runScan',
    switchproject: 'switchProject',
    readmemory: 'readMemory',
    appendmemory: 'appendMemory',
    makeplan: 'makePlan',
    launchprofile: 'launchProfile',
    coachaction: 'coachAction',
    getprefab: 'getPrefab',
    getactivity: 'getActivity',
    navigate: 'navigate',
    showmessage: 'showMessage',
    openurl: 'openUrl',
  };
  return map[raw.toLowerCase()] || raw;
}

function operatorLaunchOk(profile) {
  if (!profile) return false;
  const meta = profile.meta || profile.frontmatter || profile;
  const mode = String(meta.task_mode || profile.task_mode || '').toLowerCase();
  const tier = String(meta.task_tier || profile.task_tier || 'light').toLowerCase();
  const tags = Array.isArray(meta.tags) ? meta.tags : (profile.tags || []);
  const id = String(profile.id || '').toLowerCase();

  if (['coding', 'heavy-refactor', 'refactor'].includes(mode)) return false;
  if (id.includes('heavy-refactor') || id.includes('code-assist') || id.includes('patch-test')) return false;
  if (['safe-audit', 'read-only', 'operator', 'monitoring'].includes(mode)) return true;
  if (mode === 'monitoring' || tags.includes('terminal-session')) return true;
  return tier === 'light' || tier === 'safe-audit';
}

function formatEvidenceBlock(entry) {
  const kind = entry.kind || entry.status || 'observation';
  const title = entry.title || entry.profileId || 'HOOT observation';
  return {
    title,
    profileId: entry.profileId || 'n/a',
    status: kind,
    observed: entry.observed || entry.text || entry.detail || 'n/a',
    reason: entry.reason || entry.summary || `Logged by HOOT operator (${kind})`,
  };
}

function isBlockedCommand(cmd) {
  const type = normalizeType(cmd);
  const key = String(type || '').toLowerCase().replace(/[^a-z]/g, '');
  if (BLOCKED_ALIASES.has(key)) return true;
  return BLOCKED_TYPES.has(key);
}

async function executeCoachCommand(cmd, deps) {
  if (!cmd || typeof cmd !== 'object') {
    return { ok: false, error: 'Invalid command' };
  }
  if (isBlockedCommand(cmd)) {
    return { ok: false, blocked: true, error: `Command blocked by operator policy: ${cmd.type}` };
  }

  const type = normalizeType(cmd);

  switch (type) {
    case 'navigate': {
      const route = String(cmd.route || cmd.target || cmd.path || '/');
      return { ok: true, type, route };
    }
    case 'showMessage':
      return { ok: true, type, message: String(cmd.text || cmd.message || '') };
    case 'openUrl':
      return { ok: true, type, url: String(cmd.url || '') };
    case 'coachAction': {
      const raw = String(cmd.target || cmd.action || '');
      const target = normalizeCoachActionTarget(raw);
      if (!isCoachActionAllowed(raw)) {
        return { ok: false, blocked: true, error: `coachAction target not allowlisted: ${raw}` };
      }
      return { ok: true, type, target, label: coachActionLabel(target) };
    }
    case 'readMemory':
      return { ok: true, type, text: deps.readMemory() };
    case 'appendMemory': {
      const block = formatEvidenceBlock(cmd);
      deps.appendMemory(block);
      return { ok: true, type, appended: block };
    }
    case 'switchProject': {
      const projectPath = cmd.path || cmd.projectPath;
      if (!projectPath) return { ok: false, error: 'switchProject requires path' };
      const data = deps.setActiveProject(projectPath);
      return { ok: true, type, active: data.active, projects: data.projects };
    }
    case 'makePlan': {
      const goal = String(cmd.goal || 'privacy');
      const plan = deps.buildPlan(goal, deps.lastScan);
      return { ok: true, type, plan };
    }
    case 'getPrefab': {
      const inventory = await deps.getPrefabInventory();
      return { ok: true, type, inventory };
    }
    case 'getActivity': {
      const summary = deps.activityToday ? deps.activityToday() : { events: [] };
      return { ok: true, type, activity: summary };
    }
    case 'getStatus': {
      const memory = deps.readMemory();
      const profiles = deps.listProfiles().map((p) => {
        const ev = deps.evaluateProfile(p, deps.lastScan, memory);
        return { id: p.id, name: p.name, state: ev.state, score: ev.score };
      });
      let radar = null;
      try {
        radar = await deps.getAgentRadar?.({ force: false });
      } catch { /* optional */ }
      return {
        ok: true,
        type,
        status: {
          scan: deps.lastScan ? { tools: deps.lastScan.tools, hardware: deps.lastScan.hardware } : null,
          activeProject: deps.activeProject,
          profiles: profiles.slice(0, 20),
          sessions: [...(deps.sessions?.values?.() || [])].map(deps.publicSession).slice(0, 8),
          radar: radar?.summary || null,
        },
      };
    }
    case 'runScan': {
      const repo = cmd.repo || deps.activeProject || undefined;
      const scan = await deps.runScanner(repo);
      return { ok: true, type, scan };
    }
    case 'launchProfile': {
      const profileId = cmd.profileId || cmd.id;
      if (!profileId) return { ok: false, error: 'launchProfile requires profileId' };
      const profile = deps.getProfile(profileId);
      if (!profile) return { ok: false, error: `Profile not found: ${profileId}` };
      if (!operatorLaunchOk(profile)) {
        return {
          ok: false,
          blocked: true,
          error: `Profile ${profileId} is not allowed for HOOT operator launch (coding/refactor blocked)`,
        };
      }
      let script = deps.extractLaunchScript(profile.body);
      if (!script) return { ok: false, error: 'No launch block in profile' };
      script = deps.injectLaunchContext(script, deps.activeProject);
      const blocked = deps.isBlockedByMemory(profile, deps.readMemory());
      if (blocked && !cmd.overrideReason) {
        return { ok: false, blocked: true, error: `Blocked by memory: ${blocked.title}`, evidence: blocked.raw?.slice(0, 800) };
      }
      const allProfiles = deps.listProfiles();
      const audit = deps.auditProfile(profile, allProfiles);
      if (audit.errors.length > 0 && !cmd.overrideReason) {
        return { ok: false, auditBlocked: true, errors: audit.errors, profile: profile.id };
      }
      const sess = deps.createSession(profile, script, cmd);
      return {
        ok: true,
        type,
        launched: true,
        session: deps.publicSession(sess),
        route: '/terminal',
        auditWarnings: audit.warnings,
      };
    }
    default:
      return { ok: false, error: `Unknown or unsupported operator command: ${type}` };
  }
}

module.exports = {
  BLOCKED_TYPES,
  COACH_ACTION_TARGETS,
  normalizeType,
  operatorLaunchOk,
  isBlockedCommand,
  executeCoachCommand,
  formatEvidenceBlock,
  listCoachActions,
};