/**
 * HOOT first-run onboarding — scan + registry driven (no hardcoded layout).
 */

const { inferRootsFromProject } = require('./workspace-infer');
const { validateRoots } = require('./workspace-roots');
const { enrichRegistry } = require('./provider-cooldown');

const STEPS = [
  { id: 'scan', title: 'System scan', summary: 'Detect agents, models, keys, and machine posture.' },
  { id: 'project', title: 'Active project', summary: 'Pick the repo HOOT should anchor launches and handoffs to.' },
  { id: 'layout', title: 'Workspace layout', summary: 'Confirm app / core / data trees inferred from the project folder.' },
  { id: 'providers', title: 'Provider matrix', summary: 'Mark cooldowns and choose your session provider.' },
  { id: 'ready', title: 'Ready', summary: 'Optional handoff import — then enter the command center.' },
];

const CODER_TO_PROVIDER = {
  'claude-code': 'claude',
  claude: 'claude',
  codex: 'chatgpt',
  'gemini-cli': 'gemini',
  gemini: 'gemini',
  kimi: 'kimi',
  ollama: 'ollama',
};

function scanReady(scan) {
  return Boolean(scan && !scan.empty && (scan.tools || scan.coders));
}

function suggestSessionProvider(scan, cooldownRegistry) {
  const active = new Set();
  for (const [id, row] of Object.entries(cooldownRegistry?.providers || {})) {
    const st = row.effective_status || row.status;
    if (st === 'active' || st === 'local') active.add(id);
  }
  const coders = (scan?.coders || []).filter((c) => c.detection?.present);
  for (const c of coders) {
    const pid = CODER_TO_PROVIDER[c.id] || CODER_TO_PROVIDER[c.command];
    if (pid && (active.size === 0 || active.has(pid))) return pid;
  }
  if (scan?.tools?.ollama?.present && (active.size === 0 || active.has('ollama'))) return 'ollama';
  if (active.has('gemini')) return 'gemini';
  if (active.has('claude')) return 'claude';
  return 'ollama';
}

function buildChecks({ scan, activeProject, rootsValidated, settings, cooldownRegistry }) {
  return {
    scan: scanReady(scan),
    project: Boolean(activeProject),
    layout: Boolean(rootsValidated?.roots?.length && rootsValidated.roots.some((r) => r.valid)),
    providers: Boolean(cooldownRegistry?.current_session_provider),
    completed: Boolean(settings?.onboarding?.completed),
  };
}

function resolveCurrentStep(checks) {
  if (checks.completed) return 'ready';
  if (!checks.scan) return 'scan';
  if (!checks.project) return 'project';
  if (!checks.layout) return 'layout';
  if (!checks.providers) return 'providers';
  return 'ready';
}

function buildOnboardingState({
  settings,
  scan,
  activeProject,
  registry,
  rootsState,
  rootsValidated,
  portfolioRoots,
  cooldownRaw,
}) {
  const cooldown = enrichRegistry(cooldownRaw || { providers: {}, version: 1 }, { scan });
  const checks = buildChecks({ scan, activeProject, rootsValidated, settings, cooldownRegistry: cooldown });
  const currentStep = resolveCurrentStep(checks);
  const inferred = activeProject ? inferRootsFromProject(activeProject) : null;

  const detectedAgents = (scan?.coders || [])
    .filter((c) => c.detection?.present)
    .map((c) => ({ id: c.id, name: c.name || c.id, command: c.command }));

  return {
    version: 1,
    completed: checks.completed,
    current_step: currentStep,
    steps: STEPS,
    checks,
    portfolio_roots: portfolioRoots || [],
    scan_summary: scanReady(scan)
      ? {
          repo_path: scan?.repo?.path || null,
          ollama: Boolean(scan?.tools?.ollama?.present),
          agents_detected: detectedAgents.length,
          agents: detectedAgents.slice(0, 12),
          rtk: Boolean(scan?.tools?.rtk?.present),
        }
      : null,
    projects: {
      active: activeProject,
      count: registry?.projects?.length || 0,
      items: (registry?.projects || []).slice(0, 24),
    },
    layout: {
      current: rootsValidated,
      inferred,
      needs_confirm: Boolean(inferred && (!rootsState?.inferred || rootsState?.inferred_from !== activeProject)),
    },
    providers: {
      registry: cooldown,
      suggested_session_provider: suggestSessionProvider(scan, cooldown),
    },
    onboarding: settings?.onboarding || { completed: false },
  };
}

module.exports = {
  STEPS,
  scanReady,
  suggestSessionProvider,
  inferRootsFromProject,
  buildOnboardingState,
  resolveCurrentStep,
  CODER_TO_PROVIDER,
};