/**
 * HOOT AI Coach chat — multi-provider with local brain + operator commands.
 */

const { providerChat, toGeminiContents, toOpenAIMessages, getApiKey, ollamaChatCompletion } = require('./advisor');
const { resolveProviderKey, isLocalProvider } = require('./key-vault');
const { resolveHootBrain } = require('./hoot-brain');
const { buildCoachChatResponse, summarizeCoachContext } = require('./coach-chat');
const { listCoachActions } = require('./coach-actions');
const {
  MAX_TOOL_ROUNDS,
  buildOperatorToolSchemas,
  executeNativeTool,
  toolRunsFromResults,
} = require('./coach-tools');

const MAX_HISTORY = 50;
const chats = new Map();

const OPERATOR_SYSTEM_PROMPT = `You are HOOT Operator — local ops owl for this command center.

YOU DO: explain screens, run scans, read repo/memory, recommend safe-audit profiles,
        navigate, stage launches, monitor sessions, manage modules/MCP policy.

YOU DO NOT: write code, edit source files, run shell, launch coding/refactor profiles,
             use write/delete MCP tools, or act as a coding agent.

When the user wants code changes, route them: Profiles → safe coding agent in Sessions.
Prefer app tools over prose. Use MCP only to read context (when available).
Answer conversationally. You may include \`\`\`json commands\`\`\` blocks for app actions.`;

function getChat(sessionId) {
  if (!chats.has(sessionId)) {
    chats.set(sessionId, {
      messages: [{ role: 'system', text: OPERATOR_SYSTEM_PROMPT }],
      lastActive: Date.now(),
    });
  }
  const chat = chats.get(sessionId);
  chat.lastActive = Date.now();
  return chat;
}

function trimHistory(chat) {
  if (chat.messages.length > MAX_HISTORY) {
    const system = chat.messages.filter((m) => m.role === 'system');
    const rest = chat.messages.filter((m) => m.role !== 'system').slice(-(MAX_HISTORY - system.length));
    chat.messages = [...system, ...rest];
  }
}

function buildCommandPrompt(context) {
  const summary = summarizeCoachContext(context);
  const mcpBlock = context.mcpContext
    ? `\n\nLive read-only context (git + HOOT files — cite when answering repo/memory questions):\n${JSON.stringify(context.mcpContext, null, 2)}`
    : '';
  return `Current screen context (use this — do NOT invent state):
${JSON.stringify(summary, null, 2)}${mcpBlock}

App commands (optional \`\`\`json commands\`\`\` block — server executes allowlisted tools):
- navigate { route } — e.g. /scan, /profiles, /terminal, /memory
- runScan { repo? }
- getStatus {}
- launchProfile { profileId } — safe-audit/read-only/monitoring only
- switchProject { path }
- readMemory {}
- appendMemory { title, kind, observed, reason, profileId? }
- makePlan { goal }
- coachAction { target } — UI actions: ${listCoachActions().map((a) => a.id).join(', ')}
- getPrefab {}, getActivity {}
- showMessage { text }, openUrl { url }

Aliases: launch→launchProfile, generatePlan→makePlan, setMemory→appendMemory

Operator loop via chat: runScan → getStatus → recommend safe profile → launchProfile → navigate /terminal.
Use coachAction for in-page buttons (scan-run, launch-staged-go, wizard-agent, modules-auto-sync, etc.).
When mcpContext is present, cite git/memory excerpts — do not invent repo state.

Respond to the user's message directly. Reference the screen they are on.`;
}

function extractCommands(aiText) {
  const cmdMatch = /```json commands\s*\n([\s\S]*?)```/i.exec(aiText);
  if (!cmdMatch) return { text: aiText, commands: [] };
  let commands = [];
  try {
    const parsed = JSON.parse(cmdMatch[1]);
    commands = Array.isArray(parsed) ? parsed : [parsed];
  } catch { /* ignore */ }
  const text = aiText.replace(/```json commands\s*\n[\s\S]*?```/i, '').trim();
  return { text, commands };
}

function operatorPolicy(settings) {
  const p = settings?.operator_policy || {};
  return {
    native_tools: p.native_tools !== false,
    mcp_git: p.mcp_git !== false,
    mcp_filesystem: p.mcp_filesystem !== false,
    audit_log: p.audit_log !== false,
  };
}

async function runOllamaNativeToolLoop({
  endpoint,
  model,
  messages,
  operatorRuntime,
  sessionId,
}) {
  const tools = buildOperatorToolSchemas();
  const toolCallLog = [];
  let workingMessages = [...messages];
  let finalContent = '';
  let rounds = 0;

  while (rounds < MAX_TOOL_ROUNDS) {
    rounds += 1;
    const res = await ollamaChatCompletion(endpoint, model, workingMessages, { tools });
    const assistantMsg = res.message || { role: 'assistant', content: '' };
    finalContent = res.content || assistantMsg.content || '';

    if (!res.tool_calls?.length) break;

    workingMessages.push({
      role: 'assistant',
      content: assistantMsg.content || '',
      tool_calls: res.tool_calls,
    });

    for (const tc of res.tool_calls) {
      const fn = tc.function || {};
      const name = fn.name;
      const args = fn.arguments;
      const result = await executeNativeTool(name, args, {
        deps: operatorRuntime.deps,
        hootRoot: operatorRuntime.hootRoot,
        activeProject: operatorRuntime.activeProject,
        policy: operatorRuntime.policy,
      });
      toolCallLog.push({ name, args, result });

      if (operatorRuntime.appendLog && operatorRuntime.policy?.audit_log !== false) {
        operatorRuntime.appendLog({
          source: 'chat-native-loop',
          sessionId,
          tool: name,
          ok: Boolean(result?.ok),
          blocked: Boolean(result?.blocked),
          error: result?.error || null,
        });
      }

      workingMessages.push({
        role: 'tool',
        tool_call_id: tc.id,
        content: JSON.stringify(result),
      });
    }
  }

  const toolRuns = toolRunsFromResults(toolCallLog.map((c) => ({ name: c.name, result: c.result })));
  return {
    text: finalContent,
    toolCallLog,
    toolRuns,
    nativeTools: toolCallLog.length > 0,
    rounds,
  };
}

function resolveEffectiveBrain({ provider, context, settings }) {
  const scan = context?.scanFull || context?.scan;
  const brainCfg = settings?.hoot_brain || {};
  const mode = String(brainCfg.mode || 'auto').toLowerCase();

  if (provider && provider !== 'auto') {
    if (isLocalProvider(provider)) {
      const brain = resolveHootBrain({ scan, settings, providerOverride: provider });
      return { ...brain, provider };
    }
    return { provider, model: null, endpoint: null, available: Boolean(resolveProviderKey(provider)), source: 'explicit' };
  }

  if (mode === 'cloud') {
    const cloudProvider = brainCfg.cloud_provider || 'gemini';
    return { provider: cloudProvider, model: null, endpoint: null, available: Boolean(resolveProviderKey(cloudProvider)), source: 'cloud' };
  }

  const brain = resolveHootBrain({ scan, settings });
  if (brain.available) return brain;
  if (brain.pulling) return brain;
  return brain;
}

async function processChatMessage({
  sessionId,
  text,
  event,
  context,
  provider,
  model,
  apiKey,
  customEndpoint,
  settings,
  operatorRuntime,
}) {
  const chat = getChat(sessionId);

  if (event) {
    chat.messages.push({ role: 'system', text: `[EVENT] ${event.type}: ${JSON.stringify(event.data || {})}` });
  }
  if (text) {
    chat.messages.push({ role: 'user', text });
  }

  trimHistory(chat);

  const brain = resolveEffectiveBrain({ provider, context, settings });
  const effectiveProvider = brain.provider || 'coach-local';
  const effectiveModel = model || brain.model;
  const effectiveEndpoint = customEndpoint || brain.endpoint;

  const systemMsg = chat.messages.find((m) => m.role === 'system')?.text || '';
  const commandPrompt = buildCommandPrompt(context || {});
  const history = chat.messages.filter((m) => m.role !== 'system');

  const resolvedKey = apiKey || resolveProviderKey(effectiveProvider) || (effectiveProvider === 'gemini' ? getApiKey() : undefined);
  const hasLlm = Boolean(
    (isLocalProvider(effectiveProvider) && brain.available)
    || (resolvedKey && resolvedKey !== '__local__')
    || (effectiveProvider === 'custom' && effectiveEndpoint),
  );

  if (brain.pulling && !hasLlm) {
    const local = buildCoachChatResponse({ text, context: context || {} });
    const pullMsg = '_HOOT is fetching your local brain (`llama3.2:3b`) — try again in a minute._';
    chat.messages.push({ role: 'model', text: `${local.text}\n\n${pullMsg}` });
    trimHistory(chat);
    return { text: `${local.text}\n\n${pullMsg}`, commands: local.commands, source: 'coach-local', brain };
  }

  if (!hasLlm) {
    const local = buildCoachChatResponse({ text, context: context || {} });
    chat.messages.push({ role: 'model', text: local.text });
    trimHistory(chat);
    return { text: local.text, commands: local.commands, source: 'coach-local', brain };
  }

  let aiText = '';
  let commands = [];
  let toolRuns = [];
  let nativeTools = false;
  const policy = operatorPolicy(settings);

  try {
    const openAiMessages = toOpenAIMessages([
      { role: 'system', text: `${systemMsg}\n\n${commandPrompt}` },
      ...history,
    ]);

    if (
      effectiveProvider === 'ollama'
      && policy.native_tools
      && operatorRuntime?.deps
    ) {
      const loop = await runOllamaNativeToolLoop({
        endpoint: effectiveEndpoint,
        model: effectiveModel,
        messages: openAiMessages,
        operatorRuntime: { ...operatorRuntime, policy },
        sessionId,
      });
      aiText = loop.text;
      toolRuns = loop.toolRuns;
      nativeTools = loop.nativeTools;
      if (!nativeTools) {
        const extracted = extractCommands(aiText);
        aiText = extracted.text;
        commands = extracted.commands;
      }
    } else if (effectiveProvider === 'gemini') {
      const contents = toGeminiContents([
        { role: 'system', text: `${systemMsg}\n\n${commandPrompt}` },
        ...history,
      ]);
      aiText = await providerChat({ provider: 'gemini', model: effectiveModel || 'gemini-2.0-flash', apiKey: resolvedKey, contents });
      const extracted = extractCommands(aiText);
      aiText = extracted.text;
      commands = extracted.commands;
    } else {
      aiText = await providerChat({
        provider: effectiveProvider,
        model: effectiveModel,
        apiKey: resolvedKey === '__local__' ? undefined : resolvedKey,
        customEndpoint: effectiveEndpoint,
        messages: openAiMessages,
      });
      const extracted = extractCommands(aiText);
      aiText = extracted.text;
      commands = extracted.commands;
    }
  } catch (e) {
    const local = buildCoachChatResponse({ text, context: context || {} });
    const shortErr = String(e.message || 'unavailable').split('\n')[0].slice(0, 120);
    aiText = `${local.text}\n\n_(LLM unavailable — ${shortErr}. Answering from your screen.)_`;
    commands = local.commands;
    chat.messages.push({ role: 'model', text: aiText });
    trimHistory(chat);
    return { text: aiText, commands, source: 'coach-local', llmError: shortErr, brain };
  }

  chat.messages.push({ role: 'model', text: aiText });
  trimHistory(chat);

  return {
    text: aiText,
    commands,
    toolRuns,
    nativeTools,
    source: effectiveProvider,
    brain: { provider: effectiveProvider, model: effectiveModel, endpoint: effectiveEndpoint },
  };
}

function getChatHistory(sessionId) {
  return getChat(sessionId).messages.filter((m) => m.role !== 'system');
}

function clearChat(sessionId) {
  chats.delete(sessionId);
}

module.exports = { processChatMessage, getChatHistory, clearChat, OPERATOR_SYSTEM_PROMPT };