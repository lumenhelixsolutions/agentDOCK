/**
 * C.O.R.E. — Budget alerts and mediated-call notifications.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { queryUsage, getProjectBudget } = require('./storage');

function notificationsFile(coreDir) {
  return path.join(coreDir, 'notifications.json');
}

function readJSON(file, fallback) {
  try {
    if (!fs.existsSync(file)) return JSON.parse(JSON.stringify(fallback));
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return JSON.parse(JSON.stringify(fallback));
  }
}

function writeJSON(file, obj) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(obj, null, 2), 'utf8');
}

function loadNotifications(coreDir) {
  return readJSON(notificationsFile(coreDir), { version: 1, items: [] });
}

function saveNotifications(coreDir, data) {
  const next = { ...data, version: 1, updated_at: new Date().toISOString() };
  writeJSON(notificationsFile(coreDir), next);
  return next;
}

function newNotificationId() {
  return crypto.randomUUID();
}

function pushNotification(coreDir, item) {
  const data = loadNotifications(coreDir);
  const entry = {
    id: item.id || newNotificationId(),
    at: item.at || new Date().toISOString(),
    type: item.type,
    severity: item.severity || 'info',
    project_id: item.project_id || 'default',
    title: item.title,
    message: item.message,
    data: item.data || {},
    read: false,
    dismissed: false,
    source: item.source || 'core',
  };
  const dedupeKey = item.dedupe_key || `${entry.type}:${entry.project_id}:${entry.message}`;
  const existing = data.items.find((r) => !r.dismissed && r.dedupe_key === dedupeKey);
  if (existing) {
    existing.at = entry.at;
    existing.data = { ...existing.data, ...entry.data };
    saveNotifications(coreDir, data);
    return existing;
  }
  entry.dedupe_key = dedupeKey;
  data.items.unshift(entry);
  data.items = data.items.slice(0, 200);
  saveNotifications(coreDir, data);
  return entry;
}

function listActiveNotifications(coreDir, { project_id, includeRead = false } = {}) {
  const data = loadNotifications(coreDir);
  return data.items.filter((item) => {
    if (item.dismissed) return false;
    if (!includeRead && item.read) return false;
    if (project_id && item.project_id !== project_id) return false;
    return true;
  });
}

function markNotificationRead(coreDir, id) {
  const data = loadNotifications(coreDir);
  const row = data.items.find((i) => i.id === id);
  if (row) row.read = true;
  saveNotifications(coreDir, data);
  return row || null;
}

function dismissNotification(coreDir, id) {
  const data = loadNotifications(coreDir);
  const row = data.items.find((i) => i.id === id);
  if (row) row.dismissed = true;
  saveNotifications(coreDir, data);
  return row || null;
}

function evaluateBudgetNotifications(coreDir, projectId, { pricing } = {}) {
  const budget = getProjectBudget(coreDir, projectId);
  if (!budget.daily_usd_cap) return [];
  const usage = queryUsage(coreDir, projectId, 'day');
  const spend = usage.current_spend;
  const cap = budget.daily_usd_cap;
  const pct = cap > 0 ? spend / cap : 0;
  const emitted = [];

  if (budget.alert_threshold != null && spend >= budget.alert_threshold) {
    emitted.push(pushNotification(coreDir, {
      type: 'budget_alert',
      severity: 'warning',
      project_id: projectId,
      title: 'Budget alert',
      message: `Project "${projectId}" has spent $${spend.toFixed(4)} today (alert at $${budget.alert_threshold}).`,
      data: { spend, cap, alert_threshold: budget.alert_threshold, pct },
      dedupe_key: `budget_alert:${projectId}:${new Date().toISOString().slice(0, 10)}`,
    }));
  }

  if (pct >= 0.8 && pct < 1) {
    emitted.push(pushNotification(coreDir, {
      type: 'budget_warning',
      severity: 'warning',
      project_id: projectId,
      title: 'Budget nearing cap',
      message: `Project "${projectId}" is at ${Math.round(pct * 100)}% of the $${cap}/day cap ($${spend.toFixed(4)} spent).`,
      data: { spend, cap, pct },
      dedupe_key: `budget_warning:${projectId}:${new Date().toISOString().slice(0, 10)}`,
    }));
  }

  if (spend >= cap) {
    emitted.push(pushNotification(coreDir, {
      type: 'budget_exceeded',
      severity: 'error',
      project_id: projectId,
      title: 'Daily budget exceeded',
      message: `Project "${projectId}" exceeded the $${cap}/day cap ($${spend.toFixed(4)} spent). Mediated LLM calls are blocked.`,
      data: { spend, cap, pct, pricing_source: pricing?.pricing_source },
      dedupe_key: `budget_exceeded:${projectId}:${new Date().toISOString().slice(0, 10)}`,
    }));
  }

  return emitted.filter(Boolean);
}

function notifyBudgetHardStop(coreDir, err, { source = 'mediated' } = {}) {
  const details = err?.details || {};
  return pushNotification(coreDir, {
    type: 'budget_hard_stop',
    severity: 'error',
    project_id: details.project_id || 'default',
    title: 'LLM call blocked',
    message: err.message,
    data: { ...details, source },
    dedupe_key: `budget_hard_stop:${details.project_id}:${Date.now()}`,
  });
}

function toCoachHints(notifications) {
  return notifications.map((n) => ({
    id: `core-${n.type}-${n.id}`,
    priority: n.severity === 'error' ? 96 : 78,
    tone: n.severity === 'error' ? 'warning' : 'tip',
    message: n.message,
    actions: [
      { label: 'View usage', type: 'navigate', target: '/scan' },
      { label: 'Budget settings', type: 'chat', prompt: `Explain my C.O.R.E. budget status for project ${n.project_id}.` },
      { label: 'Dismiss', type: 'action', target: `core-dismiss-${n.id}` },
    ],
  }));
}

module.exports = {
  loadNotifications,
  pushNotification,
  listActiveNotifications,
  markNotificationRead,
  dismissNotification,
  evaluateBudgetNotifications,
  notifyBudgetHardStop,
  toCoachHints,
};