/**
 * HOOT handoff packet — strict paste-ready project state dump.
 */

const fs = require('fs');
const path = require('path');
const { formatRegistryHeader } = require('./provider-cooldown');
const { getActiveRootPath } = require('./workspace-roots');

const HANDOFF_HEADER = '### [PROJECT STATE DUMP - DO NOT TRANSLATE]';

const FIELD_RE = /^-\s+\*\*(Target Directory|Current Goals|Completed Artifacts|Immutable Decisions|Reasoning Gaps|Next Immediate Action):\*\*\s*(.*)$/im;

function readTextIfExists(filePath, max = 2400) {
  try {
    if (!filePath || !fs.existsSync(filePath)) return null;
    const text = fs.readFileSync(filePath, 'utf8').trim();
    if (!text) return null;
    return text.length > max ? `${text.slice(0, max)}…` : text;
  } catch {
    return null;
  }
}

function extractSection(markdown, heading) {
  if (!markdown) return null;
  const re = new RegExp(`(?:^|\\n)#+\\s*${heading}[^\\n]*\\n([\\s\\S]*?)(?=\\n#+\\s|$)`, 'i');
  const m = markdown.match(re);
  return m ? m[1].trim().slice(0, 1200) : null;
}

function readProjectBrain(projectPath, filename) {
  if (!projectPath) return null;
  const rel = path.join('.agentdock', 'project-brain', filename);
  return readTextIfExists(path.join(projectPath, rel));
}

function summarizeGit(gitSnap) {
  if (!gitSnap) return 'No git snapshot available.';
  const parts = [];
  if (gitSnap.branch) parts.push(`branch ${gitSnap.branch}`);
  if (gitSnap.status) parts.push(`status: ${gitSnap.status.split('\n').slice(0, 8).join('; ')}`);
  if (gitSnap.recentCommits) parts.push(`recent: ${gitSnap.recentCommits.split('\n').slice(0, 4).join(' | ')}`);
  if (gitSnap.lastDiffStat) parts.push(`last diff: ${gitSnap.lastDiffStat}`);
  return parts.join(' · ') || 'Git repo present.';
}

function summarizeActivity(activityData) {
  const events = activityData?.events || [];
  if (!events.length) return 'No recent activity sessions.';
  const recent = events.slice(-12);
  const groups = new Map();
  for (const ev of recent) {
    const key = ev.agent_name || ev.agent || ev.type || 'event';
    groups.set(key, (groups.get(key) || 0) + 1);
  }
  return [...groups.entries()].map(([k, n]) => `${k} (${n})`).join(', ');
}

function extractMemoryDecisions(memoryText) {
  if (!memoryText) return null;
  const blocks = memoryText.split(/\n(?=## Evidence:)/g).filter((b) => b.includes('## Evidence:'));
  const locked = blocks
    .filter((b) => /status:\s*locked|immutable|decision/i.test(b))
    .slice(-3)
    .map((b) => b.split('\n').slice(0, 6).join(' ').trim());
  if (locked.length) return locked.join(' | ');
  const last = blocks.slice(-2).map((b) => b.split('\n')[1] || b.slice(0, 120).trim());
  return last.join(' | ') || null;
}

function buildPacketFields({
  targetDirectory,
  currentGoals,
  completedArtifacts,
  immutableDecisions,
  reasoningGaps,
  nextAction,
}) {
  return {
    target_directory: targetDirectory || '—',
    current_goals: currentGoals || '—',
    completed_artifacts: completedArtifacts || '—',
    immutable_decisions: immutableDecisions || '—',
    reasoning_gaps: reasoningGaps || '—',
    next_immediate_action: nextAction || '—',
  };
}

function renderMarkdown(fields) {
  return [
    HANDOFF_HEADER,
    `- **Target Directory:** ${fields.target_directory}`,
    `- **Current Goals:** ${fields.current_goals}`,
    `- **Completed Artifacts:** ${fields.completed_artifacts}`,
    `- **Immutable Decisions:** ${fields.immutable_decisions}`,
    `- **Reasoning Gaps:** ${fields.reasoning_gaps}`,
    `- **Next Immediate Action:** ${fields.next_immediate_action}`,
  ].join('\n');
}

async function generateHandoffPacket({
  activeProject,
  rootsState,
  registry,
  gitSnapshotFn,
  activityData,
  memoryText,
  nextAction,
  projectName,
  sessionProvider,
}) {
  const projectPath = activeProject ? path.normalize(activeProject) : null;
  const targetDirectory = getActiveRootPath(rootsState, projectPath) || projectPath || '—';

  const currentState = readProjectBrain(projectPath, 'current-state.md');
  const openQuestions = readProjectBrain(projectPath, 'open-questions.md');
  const summary = readProjectBrain(projectPath, 'summary.md');

  let gitSnap = null;
  if (gitSnapshotFn && projectPath) {
    try {
      gitSnap = await gitSnapshotFn(projectPath);
    } catch { /* optional */ }
  }

  const fields = buildPacketFields({
    targetDirectory,
    currentGoals: extractSection(currentState, 'Goals') || extractSection(currentState, 'Current') || (currentState ? currentState.split('\n').slice(0, 12).join(' ') : summary?.split('\n').slice(0, 6).join(' ')) || '—',
    completedArtifacts: summarizeGit(gitSnap) + (activityData ? ` · sessions: ${summarizeActivity(activityData)}` : ''),
    immutableDecisions: extractSection(currentState, 'Locked decisions') || extractSection(currentState, 'Decisions') || extractMemoryDecisions(memoryText) || '—',
    reasoningGaps: openQuestions || extractSection(currentState, 'Gaps') || extractSection(currentState, 'Open questions') || '—',
    nextAction: nextAction || extractSection(currentState, 'Next') || 'Resume from Target Directory; confirm goals before editing.',
  });

  const markdown = renderMarkdown(fields);
  const registryHeader = registry ? formatRegistryHeader(registry, {
    sessionProvider: sessionProvider || registry.current_session_provider,
    activeRoot: rootsState ? getActiveRootPath(rootsState) : null,
    projectName,
  }) : null;

  const fullMarkdown = registryHeader ? `${registryHeader}\n\n${markdown}` : markdown;

  return {
    markdown: fullMarkdown,
    json: { ...fields, registry_header: registryHeader, generated_at: new Date().toISOString() },
    copied_at: new Date().toISOString(),
    fields,
  };
}

function writeHandoffSnapshot(projectPath, markdown) {
  if (!projectPath) return null;
  const dir = path.join(projectPath, '.agentdock', 'project-brain');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'handoff-packet.md');
  fs.writeFileSync(file, markdown, 'utf8');
  const autoFile = path.join(projectPath, 'auto_handoff.md');
  fs.writeFileSync(autoFile, markdown, 'utf8');
  return file;
}

function parseInboundHandoff(markdown) {
  const text = String(markdown || '').trim();
  if (!text) return { ok: false, error: 'Empty handoff' };
  const fields = {};
  for (const line of text.split('\n')) {
    const m = line.match(FIELD_RE);
    if (m) fields[m[1].toLowerCase().replace(/\s+/g, '_')] = m[2].trim();
  }
  const hasAny = Object.keys(fields).length > 0;
  if (!hasAny) return { ok: false, error: 'No recognized handoff fields' };

  const draft = [
    '# Current State (imported handoff)',
    `Timestamp: ${new Date().toISOString()}`,
    'Canonical-For-Project: false',
    'Source: inbound-handoff',
    '',
    '## Goals',
    fields.current_goals || '—',
    '',
    '## Completed Artifacts',
    fields.completed_artifacts || '—',
    '',
    '## Locked decisions',
    fields.immutable_decisions || '—',
    '',
    '## Open questions',
    fields.reasoning_gaps || '—',
    '',
    '## Next',
    fields.next_immediate_action || '—',
    '',
    `Target Directory: ${fields.target_directory || '—'}`,
  ].join('\n');

  return { ok: true, fields, draft };
}

function writeInboundDraft(projectPath, draft) {
  if (!projectPath || !draft) return null;
  const dir = path.join(projectPath, '.agentdock', 'project-brain');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'current-state.md');
  fs.writeFileSync(file, draft, 'utf8');
  return file;
}

module.exports = {
  HANDOFF_HEADER,
  generateHandoffPacket,
  writeHandoffSnapshot,
  parseInboundHandoff,
  writeInboundDraft,
  renderMarkdown,
  buildPacketFields,
};