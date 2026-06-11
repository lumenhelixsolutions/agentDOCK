/**
 * HOOT operator native tool schemas (Ollama / OpenAI tools API) + execution bridge.
 */

const { normalizeType } = require('./coach-operator');
const { normalizeCoachActionTarget } = require('./coach-actions');
const { readAllowedExcerpt, gitSnapshot } = require('./coach-mcp');

const MAX_TOOL_ROUNDS = 6;

function buildOperatorToolSchemas() {
  return [
    {
      type: 'function',
      function: {
        name: 'navigate',
        description: 'Navigate the HOOT UI to a route path',
        parameters: {
          type: 'object',
          properties: { route: { type: 'string', description: 'e.g. /scan, /profiles, /terminal, /launch' } },
          required: ['route'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'run_scan',
        description: 'Run system readiness scan (tools, agents, Ollama, env)',
        parameters: { type: 'object', properties: { repo: { type: 'string' } } },
      },
    },
    {
      type: 'function',
      function: {
        name: 'get_status',
        description: 'Get live HOOT status: scan summary, profiles, sessions, agent radar',
        parameters: { type: 'object', properties: {} },
      },
    },
    {
      type: 'function',
      function: {
        name: 'launch_profile',
        description: 'Launch a safe-audit/read-only/monitoring profile only (never coding profiles)',
        parameters: {
          type: 'object',
          properties: { profile_id: { type: 'string' } },
          required: ['profile_id'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'read_memory',
        description: 'Read HOOT memory.md evidence log',
        parameters: { type: 'object', properties: {} },
      },
    },
    {
      type: 'function',
      function: {
        name: 'append_memory',
        description: 'Append a structured evidence block to memory.md',
        parameters: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            kind: { type: 'string' },
            observed: { type: 'string' },
            reason: { type: 'string' },
            profile_id: { type: 'string' },
          },
          required: ['title', 'observed'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'coach_action',
        description: 'Trigger an in-page UI action (scan-run, launch-staged-go, wizard-agent, etc.)',
        parameters: {
          type: 'object',
          properties: { target: { type: 'string' } },
          required: ['target'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'make_plan',
        description: 'Build a launch plan for a goal (privacy, audit, etc.)',
        parameters: {
          type: 'object',
          properties: { goal: { type: 'string' } },
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'git_snapshot',
        description: 'Read-only git status and recent commits for the active project',
        parameters: { type: 'object', properties: {} },
      },
    },
    {
      type: 'function',
      function: {
        name: 'read_hoot_file',
        description: 'Read an allowlisted HOOT root file excerpt (memory.md, profiles/, state/)',
        parameters: {
          type: 'object',
          properties: { path: { type: 'string' } },
          required: ['path'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'set_provider_status',
        description: 'Update provider cooldown registry (claude, chatgpt, gemini, kimi, ollama, llamacpp)',
        parameters: {
          type: 'object',
          properties: {
            provider: { type: 'string' },
            status: { type: 'string', enum: ['active', 'cooldown', 'unknown'] },
            cooldown_until: { type: 'string' },
            preset: { type: 'string', enum: ['3hr', '5hr', 'midnight_pt'] },
          },
          required: ['provider'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'generate_handoff',
        description: 'Generate paste-ready handoff packet for switching cloud providers',
        parameters: {
          type: 'object',
          properties: {
            next_action: { type: 'string' },
            write_snapshot: { type: 'boolean' },
          },
        },
      },
    },
  ];
}

function parseToolArgs(raw) {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function toolCallToCommand(name, args) {
  const a = args || {};
  switch (name) {
    case 'navigate':
      return { type: 'navigate', route: a.route };
    case 'run_scan':
      return { type: 'runScan', repo: a.repo };
    case 'get_status':
      return { type: 'getStatus' };
    case 'launch_profile':
      return { type: 'launchProfile', profileId: a.profile_id || a.profileId };
    case 'read_memory':
      return { type: 'readMemory' };
    case 'append_memory':
      return { type: 'appendMemory', title: a.title, kind: a.kind, observed: a.observed, reason: a.reason, profileId: a.profile_id };
    case 'coach_action':
      return { type: 'coachAction', target: normalizeCoachActionTarget(a.target) };
    case 'make_plan':
      return { type: 'makePlan', goal: a.goal || 'privacy' };
    default:
      return null;
  }
}

async function executeNativeTool(name, args, { deps, hootRoot, activeProject, policy, hybridFns }) {
  const parsed = parseToolArgs(args);

  if (name === 'set_provider_status') {
    const fn = hybridFns?.patchProvider || hybridFns?.applyCooldownPreset;
    if (!fn) return { ok: false, error: 'Provider cooldown module unavailable' };
    try {
      const state = parsed.preset
        ? hybridFns.applyCooldownPreset(parsed.provider, parsed.preset, parsed.cooldown_until)
        : hybridFns.patchProvider(parsed);
      const registry = hybridFns.enrichRegistry(state, { scan: deps?.lastScan });
      return { ok: true, type: 'set_provider_status', registry };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  if (name === 'generate_handoff') {
    if (!hybridFns?.generateHandoffPacket) return { ok: false, error: 'Handoff module unavailable' };
    try {
      const packet = await hybridFns.generateHandoffPacket({
        activeProject,
        nextAction: parsed.next_action,
        writeSnapshot: parsed.write_snapshot !== false,
      });
      return { ok: true, type: 'generate_handoff', packet };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  if (name === 'git_snapshot') {
    if (policy?.mcp_git === false) return { ok: false, blocked: true, error: 'git MCP disabled in operator policy' };
    const snap = await gitSnapshot(activeProject);
    return { ok: true, type: 'git_snapshot', snapshot: snap || { error: 'No git repo on active project' } };
  }

  if (name === 'read_hoot_file') {
    if (policy?.mcp_filesystem === false) return { ok: false, blocked: true, error: 'filesystem MCP disabled in operator policy' };
    const rel = parsed.path || parsed.file;
    const item = readAllowedExcerpt(hootRoot, rel);
    if (!item) return { ok: false, blocked: true, error: `Path not allowlisted: ${rel}` };
    return { ok: true, type: 'read_hoot_file', file: item };
  }

  const cmd = toolCallToCommand(name, parsed);
  if (!cmd) return { ok: false, error: `Unknown tool: ${name}` };
  return deps.executeCoachCommand(cmd, deps.coachDeps);
}

function summarizeToolResult(name, result) {
  if (!result?.ok) return `${name}: blocked — ${result?.error || 'failed'}`;
  if (name === 'run_scan') return 'run_scan: scan complete';
  if (name === 'get_status') return 'get_status: live status fetched';
  if (name === 'launch_profile') return `launch_profile: launched ${result.session?.profileName || result.session?.profileId || ''}`.trim();
  if (name === 'navigate') return `navigate: ${result.route}`;
  if (name === 'coach_action') return `coach_action: ${result.target}`;
  if (name === 'read_memory') return 'read_memory: memory loaded';
  if (name === 'append_memory') return 'append_memory: evidence logged';
  if (name === 'git_snapshot') return `git_snapshot: ${result.snapshot?.branch || 'no repo'}`;
  if (name === 'read_hoot_file') return `read_hoot_file: ${result.file?.path}`;
  if (name === 'set_provider_status') return `set_provider_status: ${result.registry?.matrix_line || 'updated'}`;
  if (name === 'generate_handoff') return `generate_handoff: packet ready (${result.packet?.markdown?.length || 0} chars)`;
  return `${name}: ok`;
}

function toolRunsFromResults(calls) {
  return calls.map((c) => ({
    type: c.name,
    ok: Boolean(c.result?.ok),
    summary: summarizeToolResult(c.name, c.result),
    route: c.result?.route || null,
    target: c.result?.target || null,
    launched: Boolean(c.result?.launched),
  }));
}

module.exports = {
  MAX_TOOL_ROUNDS,
  buildOperatorToolSchemas,
  toolCallToCommand,
  parseToolArgs,
  executeNativeTool,
  summarizeToolResult,
  toolRunsFromResults,
};