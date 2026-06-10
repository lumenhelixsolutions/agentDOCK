/**
 * HOOT Token Burn — RTK prevention layer (v1 local ingest from scan + rtk gain).
 */

const { execFile } = require('child_process');

function formatTokens(n) {
  const v = Number(n) || 0;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return String(Math.round(v));
}

function normalizeDailyRow(row) {
  if (!row || typeof row !== 'object') return null;
  return {
    date: row.date || row.day || null,
    commands: Number(row.cmds ?? row.commands ?? row.total_commands ?? 0),
    input: Number(row.input ?? row.total_input ?? 0),
    output: Number(row.output ?? row.total_output ?? 0),
    saved: Number(row.saved ?? row.total_saved ?? row.saved_tokens ?? 0),
    savings_pct: Number(row.save_pct ?? row.savings_pct ?? row.avg_savings_pct ?? 0),
  };
}

function parseRtkGain(raw) {
  if (!raw) {
    return { summary: null, daily: [], weekly: [], monthly: [], has_data: false };
  }
  let data = raw;
  if (typeof raw === 'string') {
    try {
      data = JSON.parse(raw);
    } catch {
      return { summary: null, daily: [], weekly: [], monthly: [], has_data: false };
    }
  }
  const summary = data.summary
    ? {
        total_commands: Number(data.summary.total_commands) || 0,
        total_input: Number(data.summary.total_input) || 0,
        total_output: Number(data.summary.total_output) || 0,
        total_saved: Number(data.summary.total_saved) || 0,
        avg_savings_pct: Number(data.summary.avg_savings_pct) || 0,
      }
    : null;
  const daily = (Array.isArray(data.daily) ? data.daily : [])
    .map(normalizeDailyRow)
    .filter(Boolean);
  const weekly = (Array.isArray(data.weekly) ? data.weekly : []).map(normalizeDailyRow).filter(Boolean);
  const monthly = (Array.isArray(data.monthly) ? data.monthly : []).map(normalizeDailyRow).filter(Boolean);
  return {
    summary,
    daily: daily.slice(-14),
    weekly: weekly.slice(-8),
    monthly: monthly.slice(-6),
    has_data: Boolean(summary && summary.total_commands > 0),
  };
}

const SHELL_HEAVY_AGENT_IDS = new Set([
  'claude-code',
  'codex',
  'cursor-agent',
  'hermes',
  'opencode',
  'kimi',
  'gemini-cli',
  'grok',
]);

function listShellHeavyAgents(scan) {
  return (scan?.coders || [])
    .filter((c) => c.detection?.present && (SHELL_HEAVY_AGENT_IDS.has(c.id) || ['claude', 'codex', 'hermes', 'gemini'].includes(c.command)))
    .map((c) => ({ id: c.id, name: c.name, command: c.command }));
}

function buildRecommendations({ rtkPresent, wslPresent, rtkProfiles, shellAgents, gain, settings }) {
  const recs = [];
  if (!rtkPresent) {
    recs.push({
      id: 'install-rtk',
      priority: 90,
      title: 'Install RTK in WSL',
      detail: 'Shell-heavy agents burn tokens on raw git/test/eslint output. RTK compresses before context.',
      action: 'settings',
    });
  } else if (!wslPresent && process.platform === 'win32') {
    recs.push({
      id: 'wsl-rtk-hooks',
      priority: 75,
      title: 'Enable WSL for full RTK hooks',
      detail: 'Native Windows limits auto-rewrite. WSL + rtk init -g gives full savings.',
      action: 'settings',
    });
  }
  if (rtkProfiles.length > 0 && !rtkPresent) {
    recs.push({
      id: 'rtk-profiles-blocked',
      priority: 85,
      title: `${rtkProfiles.length} profile(s) expect RTK`,
      detail: rtkProfiles.map((p) => p.name).slice(0, 3).join(', '),
      action: 'profiles',
    });
  }
  if (rtkPresent && !gain.has_data) {
    recs.push({
      id: 'rtk-no-gain-yet',
      priority: 55,
      title: 'No RTK savings logged yet',
      detail: 'Run agent sessions with RTK hooks, then refresh burn stats.',
      action: 'refresh',
    });
  }
  if (settings?.tokenEfficiency?.rtkRecommended === false && shellAgents.length > 0) {
    recs.push({
      id: 'enable-rtk-setting',
      priority: 60,
      title: 'Re-enable RTK recommendations in Settings',
      detail: 'Token efficiency hints are turned off.',
      action: 'settings',
    });
  }
  return recs.sort((a, b) => b.priority - a.priority).slice(0, 4);
}

function assessBurnRisk({ rtkPresent, wslPresent, rtkProfiles, shellAgents, gain }) {
  const reasons = [];
  let level = 'low';

  if (!rtkPresent && (rtkProfiles.length > 0 || shellAgents.length >= 2)) {
    level = 'high';
    reasons.push('RTK missing while shell-heavy agents or RTK-tagged profiles are active');
  } else if (!rtkPresent && shellAgents.length > 0) {
    level = 'medium';
    reasons.push('RTK not installed — agent shell output may inflate token burn');
  } else if (rtkPresent && !wslPresent && process.platform === 'win32') {
    level = 'medium';
    reasons.push('RTK on Windows without WSL — auto-rewrite hooks are limited');
  } else if (gain.has_data && gain.summary) {
    level = 'low';
    reasons.push(`RTK prevented ~${formatTokens(gain.summary.total_saved)} tokens from reaching agents`);
  } else if (rtkPresent) {
    level = 'low';
    reasons.push('RTK installed — run sessions to accumulate savings data');
  } else {
    level = 'medium';
    reasons.push('Install RTK before long Claude/Codex sessions');
  }

  return { level, reasons };
}

function buildTokenBurnReport({ scan = null, profiles = [], settings = {}, gainOverride = null } = {}) {
  const te = scan?.token_efficiency || {};
  const rtkTool = scan?.tools?.rtk || {};
  const rtkPresent = Boolean(te.rtk?.present ?? rtkTool.present);
  const wsl = {
    present: Boolean(te.wsl?.present ?? scan?.tools?.wsl?.present),
    full_hooks: Boolean(te.wsl?.full_hooks),
  };
  const gain = parseRtkGain(gainOverride ?? te.rtk?.gain ?? null);
  const rtkProfiles = profiles
    .filter((p) => p.meta?.token_efficiency === 'rtk')
    .map((p) => ({ id: p.id, name: p.name, frontend: p.meta?.frontend || null }));
  const shellAgents = listShellHeavyAgents(scan);
  const risk = assessBurnRisk({ rtkPresent, wslPresent: wsl.present, rtkProfiles, shellAgents, gain });
  const recommendations = buildRecommendations({
    rtkPresent,
    wslPresent: wsl.present,
    rtkProfiles,
    shellAgents,
    gain,
    settings,
  });

  return {
    version: 1,
    scanned_at: new Date().toISOString(),
    prevention: {
      rtk: {
        present: rtkPresent,
        version: te.rtk?.version || rtkTool.version || null,
        path: rtkTool.path || null,
      },
      wsl,
    },
    gain,
    rtk_profiles: rtkProfiles,
    shell_agents: shellAgents,
    risk,
    recommendations,
    settings: {
      rtk_recommended: settings?.tokenEfficiency?.rtkRecommended !== false,
    },
    docs: {
      token_efficiency: 'docs/TOKEN_EFFICIENCY.md',
      rtk_guide: 'https://www.rtk-ai.app/docs/analytics/gain/',
      skill_id: 'token-efficiency',
    },
    formatted: {
      total_saved: gain.summary ? formatTokens(gain.summary.total_saved) : null,
      avg_savings_pct: gain.summary ? `${gain.summary.avg_savings_pct.toFixed(1)}%` : null,
    },
  };
}

function refreshRtkGain() {
  return new Promise((resolve) => {
    const bin = process.platform === 'win32' ? 'rtk.exe' : 'rtk';
    execFile(bin, ['gain', '--all', '--format', 'json'], { timeout: 20000, windowsHide: true }, (err, stdout) => {
      if (err) return resolve({ ok: false, error: err.message, gain: null });
      try {
        const gain = JSON.parse(String(stdout).trim());
        return resolve({ ok: true, gain });
      } catch (e) {
        return resolve({ ok: false, error: e.message, gain: null });
      }
    });
  });
}

module.exports = {
  formatTokens,
  parseRtkGain,
  buildTokenBurnReport,
  refreshRtkGain,
  listShellHeavyAgents,
};