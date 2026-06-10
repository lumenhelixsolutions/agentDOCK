/**
 * HOOT AI Coach chat — multi-provider with view-aware local fallback.
 */

const { providerChat, toGeminiContents, toOpenAIMessages, getApiKey } = require('./advisor');
const { resolveProviderKey } = require('./key-vault');
const { buildCoachChatResponse, summarizeCoachContext } = require('./coach-chat');

const MAX_HISTORY = 50;
const chats = new Map();

function getChat(sessionId) {
  if (!chats.has(sessionId)) {
    chats.set(sessionId, {
      messages: [
        {
          role: 'system',
          text: 'You are HOOT — My Ops OWL, the local AI command center coach. You see the user\'s current screen (coachView), live pageContext, and viewGuide. Answer conversationally — never dump a raw operations report. Explain features on the current screen, recommend the next step in the operator loop (Overview → Readiness → Profiles → Launch → Sessions → Memory), and give 2-3 concrete actions. Use markdown sparingly. You may include ```json commands blocks for app actions.',
        },
      ],
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
  return `Current screen context (use this — do NOT invent state):
${JSON.stringify(summary, null, 2)}

App commands (optional \`\`\`json commands block):
- launch, switchProject, runScan, generatePlan, showMessage, openUrl, askUser, setMemory

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

async function processChatMessage({ sessionId, text, event, context, provider, model, apiKey, customEndpoint }) {
  const chat = getChat(sessionId);

  if (event) {
    chat.messages.push({ role: 'system', text: `[EVENT] ${event.type}: ${JSON.stringify(event.data || {})}` });
  }
  if (text) {
    chat.messages.push({ role: 'user', text });
  }

  trimHistory(chat);

  const effectiveProvider = provider || 'gemini';
  const systemMsg = chat.messages.find((m) => m.role === 'system')?.text || '';
  const commandPrompt = buildCommandPrompt(context || {});
  const history = chat.messages.filter((m) => m.role !== 'system');

  const resolvedKey = apiKey || resolveProviderKey(effectiveProvider) || (effectiveProvider === 'gemini' ? getApiKey() : undefined);
  const hasLlm = Boolean(resolvedKey || (effectiveProvider === 'custom' && customEndpoint));

  // No key → conversational local coach (never operations report)
  if (!hasLlm) {
    const local = buildCoachChatResponse({ text, context: context || {} });
    chat.messages.push({ role: 'model', text: local.text });
    trimHistory(chat);
    return { text: local.text, commands: local.commands, source: local.source };
  }

  let aiText = '';
  let commands = [];

  try {
    if (effectiveProvider === 'gemini') {
      const contents = toGeminiContents([
        { role: 'system', text: `${systemMsg}\n\n${commandPrompt}` },
        ...history,
      ]);
      aiText = await providerChat({ provider: 'gemini', model: model || 'gemini-2.0-flash', apiKey: resolvedKey, contents });
    } else {
      const messages = toOpenAIMessages([
        { role: 'system', text: `${systemMsg}\n\n${commandPrompt}` },
        ...history,
      ]);
      aiText = await providerChat({ provider: effectiveProvider, model, apiKey: resolvedKey, customEndpoint, messages });
    }
    const extracted = extractCommands(aiText);
    aiText = extracted.text;
    commands = extracted.commands;
  } catch (e) {
    const local = buildCoachChatResponse({ text, context: context || {} });
    const shortErr = String(e.message || 'unavailable').split('\n')[0].slice(0, 120);
    aiText = `${local.text}\n\n_(LLM unavailable — ${shortErr}. Answering from your screen.)_`;
    commands = local.commands;
    chat.messages.push({ role: 'model', text: aiText });
    trimHistory(chat);
    return { text: aiText, commands, source: 'coach-local', llmError: shortErr };
  }

  chat.messages.push({ role: 'model', text: aiText });
  trimHistory(chat);

  return { text: aiText, commands, source: effectiveProvider };
}

function getChatHistory(sessionId) {
  return getChat(sessionId).messages.filter((m) => m.role !== 'system');
}

function clearChat(sessionId) {
  chats.delete(sessionId);
}

module.exports = { processChatMessage, getChatHistory, clearChat };