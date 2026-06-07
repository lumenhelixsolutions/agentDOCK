/**
 * AgentDock AI Chat / Mascot Controller
 * Maintains chat history, processes user messages + system events,
 * generates AI responses with structured app-control commands.
 */

const { advisorAnalyze, geminiChat } = require('./advisor');

const MAX_HISTORY = 50;
const chats = new Map(); // sessionId -> { messages[], lastActive }

function getChat(sessionId) {
  if (!chats.has(sessionId)) {
    chats.set(sessionId, {
      messages: [
        { role: 'system', text: 'You are AgentDock AI, the operations mascot and assistant. You help users manage AI coding agents, choose profiles, fix setup issues, and control AgentDock. Be concise, helpful, and proactive. You can issue commands to control the app.' }
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
    const system = chat.messages.filter(m => m.role === 'system');
    const rest = chat.messages.filter(m => m.role !== 'system').slice(-(MAX_HISTORY - system.length));
    chat.messages = [...system, ...rest];
  }
}

function buildCommandPrompt(context) {
  return `You can control AgentDock by returning JSON commands in your response. Wrap them in a markdown code block labeled \`\`\`json commands.

Available commands:
- { "type": "launch", "profileId": "string" } — launch a profile
- { "type": "switchProject", "path": "string" } — switch active project
- { "type": "runScan" } — run system scan
- { "type": "generatePlan", "goal": "string" } — generate a plan
- { "type": "showMessage", "text": "string" } — show a toast message
- { "type": "openUrl", "url": "string" } — open URL in new tab
- { "type": "askUser", "question": "string" } — ask the user a question
- { "type": "setMemory", "text": "string" } — update AgentDock memory

Current context:
${JSON.stringify(context, null, 2)}

Respond naturally to the user. If you want to take action, include the command block.`;
}

async function processChatMessage({ sessionId, text, event, context }) {
  const chat = getChat(sessionId);
  
  if (event) {
    chat.messages.push({ role: 'system', text: `[EVENT] ${event.type}: ${JSON.stringify(event.data || {})}` });
  }
  
  if (text) {
    chat.messages.push({ role: 'user', text });
  }
  
  trimHistory(chat);
  
  // Build Gemini contents
  const systemMsg = chat.messages.find(m => m.role === 'system')?.text || '';
  const commandPrompt = buildCommandPrompt(context);
  
  const contents = [];
  const history = chat.messages.filter(m => m.role !== 'system');
  
  // Add context as first user message
  contents.push({
    role: 'user',
    parts: [{ text: `${systemMsg}\n\n${commandPrompt}\n\n---\n\nConversation history:\n${history.map(m => `${m.role}: ${m.text}`).join('\n')}` }]
  });
  
  let aiText = '';
  let commands = [];
  
  try {
    aiText = await geminiChat(contents, 'gemini-2.0-flash');
    
    // Extract commands
    const cmdMatch = /```json commands\s*\n([\s\S]*?)```/i.exec(aiText);
    if (cmdMatch) {
      try {
        const parsed = JSON.parse(cmdMatch[1]);
        commands = Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        // ignore parse errors
      }
      aiText = aiText.replace(/```json commands\s*\n[\s\S]*?```/i, '').trim();
    }
  } catch (e) {
    // Fallback to advisor
    const advisor = await advisorAnalyze({
      scan: context.scan,
      project: context.project,
      profiles: context.profiles,
      sessions: context.sessions,
      question: text || event?.type,
      useGemini: false,
    });
    aiText = advisor.advice || 'I am having trouble connecting. Here is what I know: ' + advisor.fallback;
  }
  
  chat.messages.push({ role: 'model', text: aiText });
  trimHistory(chat);
  
  return { text: aiText, commands };
}

function getChatHistory(sessionId) {
  const chat = getChat(sessionId);
  return chat.messages.filter(m => m.role !== 'system');
}

function clearChat(sessionId) {
  chats.delete(sessionId);
}

module.exports = { processChatMessage, getChatHistory, clearChat };
