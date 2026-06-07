/**
 * AgentDock Operations Advisor
 * Proactive AI-assisted operations manager for agent orchestration.
 * Uses Gemini API when available, falls back to rule-based intelligence.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const ADVISOR_LOG = path.join(ROOT, 'logs', 'advisor.log');

function readJSON(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
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
  const localBackends = (scan?.local_models?.backends || []).filter(b => b.present);
  const ctx = {
    timestamp: nowStamp(),
    system: scan?.system || {},
    hardware: scan?.hardware || {},
    activeProject: project || null,
    installedAgents: (scan?.coders || []).filter(c => c.detection?.present).map(c => c.id),
    missingAgents: (scan?.coders || []).filter(c => !c.detection?.present).map(c => c.id),
    envKeys: Object.entries(scan?.env || {}).filter(([_, v]) => v?.present).map(([k]) => k),
    ollamaLoaded: scan?.ollama?.loaded_models || [],
    ollamaPresent: scan?.tools?.ollama?.present || false,
    localBackends: localBackends.map(b => ({ id: b.id, name: b.name, modelCount: b.model_count })),
    discoveredGgufs: (scan?.local_models?.discovered_ggufs || []).map(g => g.name),
    activeSessions: (sessions || []).map(s => ({ id: s.id, profile: s.profileId, status: s.status })),
  };
  return ctx;
}

function ruleBasedAdvice(ctx, question) {
  const lines = [];
  const { activeProject, installedAgents, missingAgents, envKeys, ollamaLoaded, ollamaPresent } = ctx;

  // Header
  lines.push('=== AgentDock Operations Report ===');
  lines.push('');

  // Hardware summary
  const hw = ctx.hardware || {};
  const gpu = (hw.gpu || [])[0] || {};
  lines.push(`💻 System: ${hw.cpu || 'unknown'} | ${hw.ram_gb || '?'} GB RAM | ${gpu.name || 'no GPU detected'}`);
  lines.push('');

  // Project section
  if (activeProject) {
    lines.push(`📁 Active Project: ${activeProject.name} (${activeProject.type})`);
    if (!activeProject.hasGit) {
      lines.push('   ⚠️  NO GIT REPO — Run: git init && git add -A && git commit -m "init"');
      lines.push('   🔗 Then create a GitHub repo and: git remote add origin <url> && git push -u origin main');
    } else if (!activeProject.git?.hasRemote) {
      lines.push('   ⚠️  NO UPSTREAM REMOTE — Your work is only on this machine.');
      lines.push('   🔗 Create GitHub repo, then: git remote add origin <url> && git push -u origin main');
    } else if (!activeProject.git?.clean) {
      lines.push(`   📦 ${activeProject.git.uncommitted} uncommitted changes — git status to review`);
    } else {
      lines.push('   ✅ Git clean, remote connected');
    }
    lines.push('');
  } else {
    lines.push('📁 No active project selected. Choose one from the dropdown above.');
    lines.push('');
  }

  // Local models section
  if (ollamaPresent) {
    if (ollamaLoaded.length) {
      lines.push(`🦙 Ollama running with ${ollamaLoaded.length} model(s):`);
      for (const m of ollamaLoaded) lines.push(`   • ${m.name} @ context ${m.context}`);
    } else {
      lines.push('🦙 Ollama is installed but NO MODELS are loaded.');
      lines.push('   💡 Run: ollama pull llama3.1:8b && ollama run llama3.1:8b');
      lines.push('   💡 Or for 64K context: ollama pull llama3.1:8b-instruct-q8_0');
    }
  } else {
    lines.push('🦙 Ollama NOT DETECTED — required for all local/private profiles');
    lines.push('   📥 Download: https://ollama.com/download/windows');
    lines.push('   💡 After install, run: ollama serve');
  }
  const localBackends = ctx.localBackends || [];
  if (localBackends.length) {
    lines.push('🏠 Other Local Backends Detected:');
    for (const b of localBackends) {
      lines.push(`   • ${b.name}${b.modelCount ? ' (' + b.modelCount + ' models)' : ''}`);
    }
  }
  const ggufs = ctx.discoveredGgufs || [];
  if (ggufs.length) {
    lines.push('📦 Discovered .gguf files:');
    for (const g of ggufs.slice(0, 5)) lines.push(`   • ${g}`);
  }
  lines.push('');

  // Installed agents
  if (installedAgents.length) {
    lines.push(`✅ Installed Agents: ${installedAgents.join(', ')}`);
  } else {
    lines.push('❌ No agent CLIs detected on PATH');
  }
  lines.push('');

  // Missing agents with specific install help
  if (missingAgents.length) {
    lines.push('📥 Missing Agents — Install Commands:');
    const catalog = readJSON(path.join(ROOT, 'coders-catalog.json'), { tools: [] });
    for (const agentId of missingAgents) {
      const tool = catalog.tools.find(t => t.id === agentId || t.command === agentId);
      if (tool) {
        const installCmd = tool.install_windows || tool.install_guide || 'See official docs';
        lines.push(`   • ${tool.name}: ${installCmd}`);
        lines.push(`     Docs: ${tool.official}`);
      } else {
        lines.push(`   • ${agentId}: not in catalog`);
      }
    }
    lines.push('');
  }

  // Auth / API keys
  const keyMap = {
    'OPENAI_API_KEY': ['codex', 'OpenAI Codex CLI'],
    'ANTHROPIC_API_KEY': ['claude-code', 'Claude Code'],
    'MOONSHOT_API_KEY': ['kimi', 'Kimi CLI'],
    'GEMINI_API_KEY': ['gemini-cli', 'Gemini CLI'],
    'OPENROUTER_API_KEY': ['opencode', 'OpenCode (OpenRouter mode)'],
  };
  const loadedKeys = envKeys.filter(k => keyMap[k]);
  const missingKeyTools = [];
  for (const [key, [toolId, name]] of Object.entries(keyMap)) {
    if (!envKeys.includes(key) && missingAgents.includes(toolId)) {
      missingKeyTools.push({ key, name });
    }
  }

  if (loadedKeys.length) {
    lines.push(`🔑 API Keys Loaded: ${loadedKeys.join(', ')}`);
  }
  if (missingKeyTools.length) {
    lines.push('📝 API Keys Needed:');
    for (const { key, name } of missingKeyTools) {
      lines.push(`   • ${key} → ${name}`);
    }
  }
  lines.push('');

  // Profile recommendations by project type
  if (activeProject) {
    lines.push('🎯 Recommended Stacks for this project:');
    if (activeProject.type === 'ue5') {
      lines.push('   Local:  local-safe-audit (private C++ review)');
      lines.push('   Cloud:  cloud-heavy-refactor-claude (Blueprint/C++ refactor)');
      lines.push('   Hybrid: hybrid-bug-hunt-aider (Git-aware bug hunting)');
    } else if (activeProject.type === 'node') {
      lines.push('   Local:  local-safe-audit (keep code private)');
      lines.push('   Cloud:  cloud-patch-test-codex (fast JS/TS fixes)');
      lines.push('   Hybrid: hybrid-code-review-gemini (large file handling)');
    } else if (activeProject.type === 'python') {
      lines.push('   Local:  local-performance (local profiling)');
      lines.push('   Cloud:  cloud-heavy-refactor-claude (big refactors)');
      lines.push('   Hybrid: hybrid-patch-test-aider (Git patch loops)');
    } else {
      lines.push('   Local:  local-safe-audit (start safe & private)');
      lines.push('   Cloud:  cloud-heavy-refactor-claude (powerful cloud work)');
      lines.push('   Hybrid: hybrid-patch-test-opencode (flexible routing)');
    }
    lines.push('');
  }

  // Troubleshooting section
  lines.push('🔧 Troubleshooting:');
  if (!ollamaPresent) {
    lines.push('   • Ollama missing → Install from https://ollama.com/download/windows');
  } else if (!ollamaLoaded.length) {
    lines.push('   • No models loaded → ollama pull llama3.1:8b');
    lines.push('   • For 64K context → ollama pull llama3.1:8b-instruct-q8_0');
  }
  if (missingAgents.includes('hermes') && ollamaPresent) {
    lines.push('   • Hermes missing → npm install -g @nousresearch/hermes-agent');
  }
  if (installedAgents.includes('claude') && !envKeys.includes('ANTHROPIC_API_KEY')) {
    lines.push('   • Claude installed but no ANTHROPIC_API_KEY → set env var or run claude login');
  }
  lines.push('');

  // Sessions
  if (ctx.activeSessions?.length) {
    lines.push(`📊 Active Sessions: ${ctx.activeSessions.length}`);
    for (const s of ctx.activeSessions) lines.push(`   • ${s.profile} — ${s.status}`);
  } else {
    lines.push('📊 No active sessions. Select a profile and click Launch + Monitor.');
  }

  lines.push('');
  lines.push('💡 Tip: Click the 🤖 AI Assistant button bottom-right for interactive help.');

  return {
    source: 'rule-based',
    advice: lines.join('\n'),
    actions: [],
  };
}

async function advisorAnalyze({ scan, project, profiles, sessions, question, useGemini = true }) {
  logAdvisor(`Analyzing: project=${project?.name || 'none'}, question=${question || 'none'}, useGemini=${useGemini}`);
  const ctx = buildSystemContext(scan, project, profiles, sessions);

  const fallback = ruleBasedAdvice(ctx, question);

  if (!useGemini || !getApiKey()) {
    logAdvisor('No Gemini API key; returning rule-based advice.');
    return { ...fallback, geminiAvailable: false };
  }

  try {
    const systemPrompt = `You are AgentDock Operations Advisor, a proactive AI operations manager. You help users orchestrate AI coding agents. Be concise, actionable, and technically specific.`;
    const userPrompt = `System State:\n${JSON.stringify(ctx, null, 2)}\n\nUser Question: ${question || 'What should I do next? Give me proactive recommendations.'}`;
    const contents = [{ role: 'user', parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }];
    const text = await geminiChat(contents);
    logAdvisor('Gemini response received.');
    return { source: 'gemini', advice: text, fallback: fallback.advice, geminiAvailable: true };
  } catch (e) {
    logAdvisor(`Gemini error: ${e.message}`);
    return { ...fallback, geminiAvailable: true, geminiError: e.message };
  }
}

module.exports = { advisorAnalyze, geminiChat, getApiKey, buildSystemContext };
