/**
 * Conversational AI Coach — view-aware replies (never dumps Operations Report).
 */

const { getViewGuide, ORCHESTRATION_LOOP } = require('./coach-guides');

function suggestCommands(context) {
  const cmds = [];
  const view = context.coachView || '/';
  if (view !== '/scan' && !context.scan?.tools?.ollama?.present) {
    cmds.push({ type: 'runScan' });
  }
  if (view === '/profiles' || view === '/launch') {
    cmds.push({ type: 'launch', profileId: context.pageContext?.easyTopPickId || undefined });
  }
  return cmds.filter((c) => c.type !== 'launch' || c.profileId);
}

function buildCoachChatResponse({ text, context = {} }) {
  const view = context.coachView || '/';
  const guide = context.viewGuide || getViewGuide(view);
  const pageContext = context.pageContext || {};
  const scan = context.scan || {};
  const question = String(text || '').trim();
  const lower = question.toLowerCase();

  const lines = [];
  lines.push(`You're on **${guide.title}** — ${guide.summary}`);

  if (lower.includes('help') || lower.includes('what') || lower.includes('how') || !question) {
    lines.push('');
    lines.push('**On this screen you can:**');
    for (const f of guide.features || []) lines.push(`• ${f}`);
    lines.push('');
    lines.push(`**Operator loop:** ${ORCHESTRATION_LOOP.compose}`);
    lines.push(`**Recommended next:** ${guide.nextActions?.[0] || 'Ask me something specific about this screen.'}`);
  }

  // Live state from pageContext
  const live = [];
  if (pageContext.readyCount != null) live.push(`${pageContext.readyCount} profiles ready`);
  if (pageContext.blockedCount > 0) live.push(`${pageContext.blockedCount} blocked`);
  if (pageContext.stackScore != null) live.push(`stack health ${pageContext.stackScore}/100`);
  if (pageContext.runningCount > 0) live.push(`${pageContext.runningCount} sessions running`);
  if (pageContext.viewMode) live.push(`${pageContext.viewMode} mode`);
  if (pageContext.easyStep === 3 && pageContext.easyTopPickName) {
    live.push(`top pick: ${pageContext.easyTopPickName}`);
  }
  if (live.length) {
    lines.push('');
    lines.push(`**Right now:** ${live.join(' · ')}`);
  }

  // Actionable blockers (brief, not a full report)
  const blockers = [];
  if (!scan.tools?.ollama?.present && ['/builder', '/profiles', '/launch', '/'].includes(view)) {
    blockers.push('Ollama is not detected — open **Readiness**, run a scan, then install Ollama if you want local profiles.');
  }
  if (!context.activeProject && ['/builder', '/launch', '/'].includes(view)) {
    blockers.push('No **active project** — pick one on Overview so launches and scans target the right repo.');
  }
  if (pageContext.blockedCount > 0) {
    blockers.push('Some profiles are **blocked by Memory** — open Memory or ask me to explain a safe alternative.');
  }
  if (blockers.length) {
    lines.push('');
    lines.push('**What I\'d fix first:**');
    for (const b of blockers) lines.push(`• ${b}`);
  }

  // Direct answer hooks
  if (lower.includes('orchestrat') || lower.includes('loop') || lower.includes('workflow')) {
    lines.push('');
    lines.push('**Your loop for this session:**');
    for (const step of ORCHESTRATION_LOOP.steps) {
      const here = step.path === view ? ' ← you are here' : '';
      lines.push(`• ${step.label}${here}: ${step.purpose}`);
    }
  }

  if (lower.includes('stack') && view === '/builder') {
    lines.push('');
    if (pageContext.stackScore >= 80) lines.push('Stack looks healthy — **Save profile** or **Launch** from the right panel.');
    else if (pageContext.stackIssues?.length) lines.push(`Top issue: ${pageContext.stackIssues[0]}. Open the **Install** tab or use a quick-start template.`);
    else lines.push('Start with **Local audit** template or the wizard: Agent → Model → Tools → Review.');
  }

  lines.push('');
  lines.push('_I\'m answering from your current screen and live state — not a generic system dump. Add a Gemini key in Settings for deeper LLM reasoning._');

  return {
    text: lines.join('\n'),
    commands: suggestCommands(context),
    source: 'coach-local',
  };
}

function summarizeCoachContext(context) {
  const guide = context.viewGuide || getViewGuide(context.coachView);
  return {
    coachView: context.coachView,
    screen: guide.title,
    screenSummary: guide.summary,
    features: guide.features,
    orchestration: ORCHESTRATION_LOOP.compose,
    pageContext: context.pageContext,
    activeProject: context.activeProject?.name || null,
    ollamaPresent: context.scan?.tools?.ollama?.present || false,
    installedAgents: context.installedAgents?.slice(0, 8),
    readyProfiles: (context.profiles || []).filter((p) => p.state === 'READY').length,
  };
}

module.exports = { buildCoachChatResponse, summarizeCoachContext, suggestCommands };