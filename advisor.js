/**
 * AgentDock Operations Advisor
 * Proactive AI-assisted operations manager for agent orchestration.
 * Uses Gemini API when available, falls back to rule-based intelligence.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const ADVISOR_MEMORY = path.join(ROOT, 'state', 'advisor-memory.json');
const ADVISOR_LOG = path.join(ROOT, 'logs', 'advisor.log');

function readJSON(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}
function writeJSON(file, obj) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(obj, null, 2), 'utf8');
}
function nowStamp() { return new Date().toISOString(); }
function logAdvisor(msg) {
  const line = `[${nowStamp()}] ${msg}\n`;
  fs.appendFileSync(ADVISOR_LOG, line, 'utf8');
}

function getApiKey() {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || null;
}

async function geminiChat(contents, model = 'gemini-2.0-flash') {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('No GEMINI_API_KEY or GOOGLE_API_KEY in environment');
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const body = JSON.stringify({ contents, generationConfig: { temperature: 0.3, maxOutputTokens: 4096 } });
  return new Promise((resolve, reject) => {
    const req = https.request(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      timeout: 30000,
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.error) return reject(new Error(json.error.message || JSON.stringify(json.error)));
          const text = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
          resolve(text);
        } catch (e) { reject(new Error('Gemini parse error: ' + e.message)); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Gemini timeout')); });
    req.write(body);
    req.end();
  });
}

function buildSystemContext(scan, project, profiles, sessions) {
  const ctx = {
    timestamp: nowStamp(),
    system: scan?.system || {},
    hardware: scan?.hardware || {},
    activeProject: project || null,
    installedAgents: (scan?.coders || []).filter(c => c.detection?.present).map(c => c.id),
    missingAgents: (scan?.coders || []).filter(c => !c.detection?.present).map(c => c.id),
    envKeys: Object.entries(scan?.env || {}).filter(([_, v]) => v?.present).map(([k]) => k),
    ollamaLoaded: scan?.ollama?.loaded_models || [],
    activeSessions: (sessions || []).map(s => ({ id: s.id, profile: s.profileId, status: s.status })),
  };
  return ctx;
}

function ruleBasedAdvice(ctx, question) {
  const advice = [];
  const { activeProject, installedAgents, missingAgents, envKeys, ollamaLoaded } = ctx;

  // Project awareness
  if (activeProject) {
    if (!activeProject.hasGit) advice.push(`⚠️ ${activeProject.name} has no Git repository. Initialize git immediately to prevent data loss.`);
    if (activeProject.git && !activeProject.git.hasRemote) advice.push(`⚠️ ${activeProject.name} has no upstream remote. Push to GitHub to protect your work.`);
    if (activeProject.git && !activeProject.git.clean) advice.push(`📦 ${activeProject.name} has ${activeProject.git.uncommitted} uncommitted changes. Consider committing before launching agents.`);
    if (activeProject.type === 'ue5' && !installedAgents.includes('claude-code')) advice.push(`🎮 UE5 project detected. Claude Code or Kimi Heavy Code recommended for C++ refactoring.`);
    if (activeProject.type === 'node' && !installedAgents.includes('codex')) advice.push(`📦 Node.js project detected. Codex Patch/Test or Aider are strong choices for JS/TS work.`);
  }

  // Agent setup gaps
  if (!installedAgents.includes('ollama') && missingAgents.includes('hermes')) {
    advice.push(`🔧 No local Ollama or Hermes detected. For private work, install Ollama + Hermes.`);
  }
  if (installedAgents.includes('ollama') && !ollamaLoaded.length) {
    advice.push(`🦙 Ollama is installed but no model is loaded. Run a scan and load your preferred model before launching local agents.`);
  }

  // Auth gaps
  if (missingAgents.includes('codex') && envKeys.includes('OPENAI_API_KEY')) advice.push(`🔑 OPENAI_API_KEY detected but Codex CLI not installed. Consider installing Codex to use your API key.`);
  if (missingAgents.includes('kimi') && envKeys.includes('MOONSHOT_API_KEY')) advice.push(`🔑 MOONSHOT_API_KEY detected but Kimi CLI not installed. Install Kimi for long-context cloud work.`);

  // Default greeting
  if (!advice.length && !question) {
    advice.push(`👋 Welcome to AgentDock. Select a project to get personalized recommendations.`);
    if (ollamaLoaded.length) advice.push(`🦙 Local models ready: ${ollamaLoaded.map(m => m.name).join(', ')}.`);
  }

  return {
    source: 'rule-based',
    advice: advice.join('\n\n'),
    actions: [],
  };
}

async function advisorAnalyze({ scan, project, profiles, sessions, question, useGemini = true }) {
  logAdvisor(`Analyzing: project=${project?.name || 'none'}, question=${question || 'none'}, useGemini=${useGemini}`);
  const ctx = buildSystemContext(scan, project, profiles, sessions);

  // Always generate rule-based fallback
  const fallback = ruleBasedAdvice(ctx, question);

  if (!useGemini || !getApiKey()) {
    logAdvisor('No Gemini API key; returning rule-based advice.');
    return { ...fallback, geminiAvailable: false };
  }

  try {
    const systemPrompt = `You are AgentDock Operations Advisor, a proactive AI operations manager. You help users orchestrate AI coding agents by analyzing their system state, active project, and goals. Be concise, actionable, and technically specific. Never hallucinate tools that are not installed.`;
    const userPrompt = `System State:\n${JSON.stringify(ctx, null, 2)}\n\nUser Question: ${question || 'What should I do next? Give me proactive recommendations based on my setup and active project.'}`;
    const contents = [
      { role: 'user', parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }
    ];
    const text = await geminiChat(contents);
    logAdvisor('Gemini response received.');
    return {
      source: 'gemini',
      advice: text,
      fallback: fallback.advice,
      geminiAvailable: true,
    };
  } catch (e) {
    logAdvisor(`Gemini error: ${e.message}`);
    return { ...fallback, geminiAvailable: true, geminiError: e.message };
  }
}

module.exports = { advisorAnalyze, geminiChat, getApiKey, buildSystemContext };
