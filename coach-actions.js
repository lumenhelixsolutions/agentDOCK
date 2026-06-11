/**
 * Allowlisted HOOT coach UI actions (emitCoachAction targets).
 * Keep in sync with page registerActionHandler handlers.
 */

/** Canonical targets pages listen for */
const COACH_ACTION_TARGETS = new Set([
  'scan-run',
  'radar-refresh',
  'token-burn-refresh',
  'launch-review-first',
  'launch-staged',
  'launch-staged-go',
  'module-sync',
  'modules-auto-sync',
  'hoot-dismiss',
  'profile-launch',
  'profiles-easy-mode',
  'profiles-launch-top',
  'wizard-agent',
  'wizard-llm',
  'template-local-audit',
  'stack-template-cloud-refactor',
  'tab-install',
  'filter-loaded',
  'add-mcp-git',
  'save-stack',
  'launch-stack',
]);

/** LLM / legacy aliases → canonical target returned to the UI */
const COACH_ACTION_ALIASES = {
  'stack-template-local-audit': 'template-local-audit',
  'stack-template-cloud-refactor': 'template-cloud-refactor',
};

const COACH_ACTION_LABELS = {
  'scan-run': 'system scan',
  'radar-refresh': 'agent radar refresh',
  'token-burn-refresh': 'token burn refresh',
  'launch-review-first': 'launch audit preview',
  'launch-staged': 'open staged launch',
  'launch-staged-go': 'launch staged profile',
  'module-sync': 'module sync',
  'modules-auto-sync': 'modules auto-sync',
  'hoot-dismiss': 'dismiss alert',
  'profile-launch': 'launch profile',
  'profiles-easy-mode': 'profiles easy mode',
  'profiles-launch-top': 'launch top profile',
  'wizard-agent': 'stack wizard — agent step',
  'wizard-llm': 'stack wizard — model step',
  'template-local-audit': 'local audit template',
  'stack-template-cloud-refactor': 'cloud refactor template',
  'tab-install': 'stack install tab',
  'filter-loaded': 'filter loaded models',
  'add-mcp-git': 'assign MCP git tool',
  'save-stack': 'save stack profile',
  'launch-stack': 'launch stack',
};

function normalizeCoachActionTarget(raw) {
  const target = String(raw || '').trim();
  if (!target) return '';
  return COACH_ACTION_ALIASES[target] || target;
}

function isCoachActionAllowed(raw) {
  const target = normalizeCoachActionTarget(raw);
  return COACH_ACTION_TARGETS.has(target);
}

function coachActionLabel(raw) {
  const target = normalizeCoachActionTarget(raw);
  return COACH_ACTION_LABELS[target] || target.replace(/-/g, ' ');
}

function listCoachActions() {
  return [...COACH_ACTION_TARGETS].sort().map((id) => ({
    id,
    label: COACH_ACTION_LABELS[id] || id,
    aliases: Object.entries(COACH_ACTION_ALIASES)
      .filter(([, canon]) => canon === id)
      .map(([alias]) => alias),
  }));
}

module.exports = {
  COACH_ACTION_TARGETS,
  COACH_ACTION_ALIASES,
  normalizeCoachActionTarget,
  isCoachActionAllowed,
  coachActionLabel,
  listCoachActions,
};