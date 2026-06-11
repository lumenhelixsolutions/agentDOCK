/**
 * HOOT Activity analytics — aggregates session diary, radar history, usage, and burn bridge.
 */

const STOP_TYPES = new Set(['agent.dock.stop', 'agent.external.stop', 'session.end', 'session.fail']);

function isoDate(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function parseDate(str) {
  return new Date(`${str}T12:00:00.000Z`);
}

function addDays(dateStr, delta) {
  const d = parseDate(dateStr);
  d.setUTCDate(d.getUTCDate() + delta);
  return isoDate(d);
}

function dateRange(days, toDate) {
  const to = toDate || isoDate();
  const from = addDays(to, -(Math.max(1, days) - 1));
  return { from, to, days: Math.max(1, days) };
}

function log1p(n) {
  return Math.log1p(Math.max(0, Number(n) || 0));
}

function normalizeIntensity(value, max) {
  if (!max || max <= 0) return 0;
  return Math.min(1, log1p(value) / log1p(max));
}

function emptyDay(date) {
  return {
    date,
    events: 0,
    dock_minutes: 0,
    external_minutes: 0,
    launches: 0,
    successes: 0,
    failures: 0,
    total_minutes: 0,
    peak_hour: null,
    driver: null,
    intensity: 0,
  };
}

function eventMinutes(ev) {
  if (ev.duration_ms) return Math.round(ev.duration_ms / 60000);
  return 0;
}

function agentKey(ev) {
  return ev.agent || ev.agent_name || 'unknown';
}

function buildDailySeries(events, dailyRollup, range) {
  const byDate = new Map();
  let cursor = range.from;
  while (cursor <= range.to) {
    byDate.set(cursor, emptyDay(cursor));
    cursor = addDays(cursor, 1);
  }

  for (const [date, rollup] of Object.entries(dailyRollup || {})) {
    if (!byDate.has(date)) continue;
    const row = byDate.get(date);
    row.events = rollup.events || 0;
    row.dock_minutes = rollup.dock_minutes || 0;
    row.external_minutes = rollup.external_minutes || 0;
    row.launches = rollup.launches || 0;
    row.total_minutes = row.dock_minutes + row.external_minutes;
  }

  const hourBuckets = new Map();
  const agentMinutesByDay = new Map();

  for (const ev of events) {
    const day = ev.at?.slice(0, 10);
    if (!day || !byDate.has(day)) continue;
    const row = byDate.get(day);

    if (ev.type === 'session.end') row.successes += 1;
    if (ev.type === 'session.fail') row.failures += 1;

    const hour = Number(ev.at?.slice(11, 13));
    if (!Number.isNaN(hour)) {
      const hk = `${day}:${hour}`;
      hourBuckets.set(hk, (hourBuckets.get(hk) || 0) + 1);
    }

    if (STOP_TYPES.has(ev.type)) {
      const mins = eventMinutes(ev);
      if (mins > 0) {
        const ak = `${day}:${agentKey(ev)}`;
        agentMinutesByDay.set(ak, (agentMinutesByDay.get(ak) || 0) + mins);
        if (!dailyRollup?.[day]) {
          if (ev.type === 'agent.dock.stop') row.dock_minutes += mins;
          if (ev.type === 'agent.external.stop') row.external_minutes += mins;
        }
      }
    }

    if (!dailyRollup?.[day]) {
      row.events += 1;
      if (ev.type === 'session.launch') row.launches += 1;
    }
  }

  for (const row of byDate.values()) {
    row.total_minutes = row.dock_minutes + row.external_minutes;

    let peakHour = null;
    let peakCount = 0;
    for (let h = 0; h < 24; h += 1) {
      const c = hourBuckets.get(`${row.date}:${h}`) || 0;
      if (c > peakCount) {
        peakCount = c;
        peakHour = h;
      }
    }
    row.peak_hour = peakCount > 0 ? peakHour : null;

    let topAgent = null;
    let topMins = 0;
    for (const [key, mins] of agentMinutesByDay) {
      const [d, agent] = key.split(':');
      if (d !== row.date || mins <= topMins) continue;
      topMins = mins;
      topAgent = agent;
    }
    if (topAgent) {
      row.driver = { type: 'agent', id: topAgent, name: topAgent, minutes: topMins };
    } else if (row.events > 0) {
      row.driver = { type: 'activity', id: 'mixed', name: 'Mixed activity', minutes: row.total_minutes };
    }
  }

  const maxIntensity = Math.max(...[...byDate.values()].map((d) => d.total_minutes || d.events), 1);
  for (const row of byDate.values()) {
    row.intensity = normalizeIntensity(row.total_minutes || row.events, maxIntensity);
  }

  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function buildCalendarWeeks(dailySeries, rangeEnd) {
  const byDate = new Map(dailySeries.map((d) => [d.date, d]));
  const end = parseDate(rangeEnd);
  const endDow = end.getUTCDay();
  const gridEnd = new Date(end);
  gridEnd.setUTCDate(gridEnd.getUTCDate() + (6 - endDow));

  const weeks = [];
  for (let w = 4; w >= 0; w -= 1) {
    const week = [];
    for (let d = 0; d < 7; d += 1) {
      const cell = new Date(gridEnd);
      cell.setUTCDate(cell.getUTCDate() - w * 7 - (6 - d));
      const date = isoDate(cell);
      const row = byDate.get(date) || emptyDay(date);
      const inRange = date >= dailySeries[0]?.date && date <= rangeEnd;
      week.push({
        date,
        in_range: inRange,
        events: row.events,
        dock_minutes: row.dock_minutes,
        external_minutes: row.external_minutes,
        total_minutes: row.total_minutes,
        intensity: inRange ? row.intensity : 0,
      });
    }
    weeks.push(week);
  }
  return weeks;
}

function buildDrivers(events, range) {
  const totals = new Map();
  const evidence = new Map();

  for (const ev of events) {
    const day = ev.at?.slice(0, 10);
    if (!day || day < range.from || day > range.to) continue;
    const key = agentKey(ev);
    if (!totals.has(key)) {
      totals.set(key, { agent_id: key, agent_name: ev.agent_name || key, minutes: 0, sessions: 0, launches: 0 });
      evidence.set(key, { sessions: 0, launches: 0, stops: 0 });
    }
    const bucket = totals.get(key);
    const evd = evidence.get(key);

    if (ev.type === 'session.launch') {
      bucket.launches += 1;
      evd.launches += 1;
    }
    if (ev.type?.includes('.start')) {
      bucket.sessions += 1;
      evd.sessions += 1;
    }
    if (STOP_TYPES.has(ev.type)) {
      const mins = eventMinutes(ev);
      bucket.minutes += mins;
      evd.stops += 1;
    }
  }

  const totalMinutes = [...totals.values()].reduce((s, r) => s + r.minutes, 0) || 1;
  return [...totals.values()]
    .map((row) => ({
      ...row,
      share: row.minutes / totalMinutes,
      evidence: evidence.get(row.agent_id) || { sessions: 0, launches: 0, stops: 0 },
    }))
    .sort((a, b) => b.minutes - a.minutes || b.launches - a.launches);
}

function buildAgentComparison(events, dailySeries, range) {
  const agents = new Map();
  const today = isoDate();

  const ensure = (id, name) => {
    if (!agents.has(id)) {
      agents.set(id, {
        agent_id: id,
        agent_name: name || id,
        today_min: 0,
        d7_min: 0,
        d30_min: 0,
        peak_date: null,
        peak_minutes: 0,
        active_days: 0,
        sparkline: [],
      });
    }
    return agents.get(id);
  };

  const d7From = addDays(today, -6);
  const dayMinutes = new Map();

  for (const ev of events) {
    if (!STOP_TYPES.has(ev.type)) continue;
    const day = ev.at?.slice(0, 10);
    if (!day || day < range.from || day > range.to) continue;
    const id = agentKey(ev);
    const mins = eventMinutes(ev);
    if (mins <= 0) continue;
    ensure(id, ev.agent_name);
    const dk = `${day}:${id}`;
    dayMinutes.set(dk, (dayMinutes.get(dk) || 0) + mins);
  }

  for (const [dk, mins] of dayMinutes) {
    const [day, id] = dk.split(':');
    const row = ensure(id, id);
    row.d30_min += mins;
    if (day >= d7From) row.d7_min += mins;
    if (day === today) row.today_min += mins;
    if (mins > row.peak_minutes) {
      row.peak_minutes = mins;
      row.peak_date = day;
    }
  }

  for (const row of agents.values()) {
    const activeDates = new Set();
    for (const [dk, mins] of dayMinutes) {
      const [day, id] = dk.split(':');
      if (id === row.agent_id && mins > 0) activeDates.add(day);
    }
    row.active_days = activeDates.size;
    row.sparkline = dailySeries.map((d) => dayMinutes.get(`${d.date}:${row.agent_id}`) || 0);
  }

  return [...agents.values()].sort((a, b) => b.d30_min - a.d30_min);
}

function mergeTimeline(events, usage, range, limit = 200) {
  const outcomeBySession = new Map();
  for (const o of usage?.outcomes || []) {
    if (o.sessionId) outcomeBySession.set(o.sessionId, o);
  }

  const timeline = events
    .filter((e) => {
      const day = e.at?.slice(0, 10);
      return day && day >= range.from && day <= range.to;
    })
    .map((e) => {
      const outcome = e.session_ref ? outcomeBySession.get(e.session_ref) : null;
      return {
        ...e,
        outcome: outcome?.outcome || (e.type === 'session.end' ? 'success' : e.type === 'session.fail' ? 'failure' : null),
      };
    })
    .sort((a, b) => String(b.at).localeCompare(String(a.at)))
    .slice(0, limit);

  return timeline;
}

function sessionGroupOutcome(events) {
  const end = events.find((e) => e.type === 'session.end' || e.type === 'session.fail');
  if (!end) return null;
  if (end.outcome) return end.outcome;
  return end.type === 'session.end' ? 'success' : 'failure';
}

function buildSessionGroups(events, range, openSessions = {}, limit = 80) {
  const inRange = (events || []).filter((e) => {
    const day = e.at?.slice(0, 10);
    return day && day >= range.from && day <= range.to;
  });
  const groups = new Map();

  const ensure = (key, seed) => {
    if (!groups.has(key)) {
      groups.set(key, {
        id: key,
        kind: seed.kind,
        agent_id: seed.agent_id || null,
        agent_name: seed.agent_name || null,
        project: seed.project || null,
        source: seed.source || null,
        session_ref: seed.session_ref || null,
        started_at: seed.started_at || null,
        ended_at: null,
        duration_ms: null,
        running: false,
        events: [],
        outcome: null,
        sparkline: [],
      });
    }
    return groups.get(key);
  };

  const sorted = [...inRange].sort((a, b) => String(a.at).localeCompare(String(b.at)));

  for (const ev of sorted) {
    if (ev.session_ref) {
      const key = `hoot:${ev.session_ref}`;
      const g = ensure(key, {
        kind: 'hoot',
        agent_id: ev.agent,
        agent_name: ev.agent_name,
        project: ev.project,
        source: ev.source || 'agentdock',
        session_ref: ev.session_ref,
        started_at: ev.at,
      });
      g.events.push(ev);
      if (ev.type === 'session.launch' && !g.started_at) g.started_at = ev.at;
      if (ev.type === 'session.end' || ev.type === 'session.fail') {
        g.ended_at = ev.at;
        g.duration_ms = ev.duration_ms || g.duration_ms;
        g.outcome = ev.outcome || (ev.type === 'session.end' ? 'success' : 'failure');
      }
      if (ev.project) g.project = ev.project;
      if (ev.agent_name) g.agent_name = ev.agent_name;
      continue;
    }

    const pid = ev.meta?.pid;
    if (!pid || !String(ev.type || '').startsWith('agent.')) continue;
    const key = `radar:${pid}`;
    const g = ensure(key, {
      kind: 'radar',
      agent_id: ev.agent,
      agent_name: ev.agent_name,
      project: ev.project,
      source: ev.source,
      session_ref: ev.session_ref || null,
      started_at: ev.at,
    });
    g.events.push(ev);
    if (ev.type.includes('.start')) {
      g.started_at = g.started_at || ev.at;
      g.running = true;
    }
    if (ev.type.includes('.stop')) {
      g.ended_at = ev.at;
      g.duration_ms = ev.duration_ms || g.duration_ms;
      g.running = false;
    }
    if (ev.project) g.project = ev.project;
    if (ev.session_ref) g.session_ref = ev.session_ref;
  }

  for (const [key, sess] of Object.entries(openSessions || {})) {
    const pid = sess?.pid;
    if (!pid) continue;
    const gkey = `radar:${pid}`;
    if (groups.has(gkey)) {
      const g = groups.get(gkey);
      g.running = true;
      continue;
    }
    groups.set(gkey, {
      id: gkey,
      kind: 'radar',
      agent_id: sess.agent_id,
      agent_name: sess.agent_name,
      project: sess.project || null,
      source: sess.source || null,
      session_ref: sess.session_ref || null,
      started_at: sess.started_at || null,
      ended_at: null,
      duration_ms: null,
      running: true,
      events: [],
      outcome: null,
      sparkline: [],
    });
  }

  const result = [...groups.values()]
    .map((g) => {
      if (!g.outcome) g.outcome = sessionGroupOutcome(g.events);
      if (!g.duration_ms && g.started_at && g.ended_at) {
        g.duration_ms = Math.max(0, new Date(g.ended_at).getTime() - new Date(g.started_at).getTime());
      }
      if (g.duration_ms) {
        const blocks = Math.min(12, Math.max(1, Math.round(g.duration_ms / 600000)));
        g.sparkline = Array.from({ length: blocks }, () => 1);
      }
      return g;
    })
    .sort((a, b) => String(b.started_at || '').localeCompare(String(a.started_at || '')))
    .slice(0, limit);

  return result;
}

function buildProjectDrivers(events, range) {
  const totals = new Map();
  for (const ev of events) {
    if (!STOP_TYPES.has(ev.type)) continue;
    const day = ev.at?.slice(0, 10);
    if (!day || day < range.from || day > range.to) continue;
    const mins = eventMinutes(ev);
    if (mins <= 0) continue;
    const project = ev.project || '(no project)';
    const short = String(project).split(/[/\\]/).pop() || project;
    if (!totals.has(project)) {
      totals.set(project, { project, label: short, minutes: 0, stops: 0 });
    }
    const row = totals.get(project);
    row.minutes += mins;
    row.stops += 1;
  }
  const totalMinutes = [...totals.values()].reduce((s, r) => s + r.minutes, 0) || 1;
  return [...totals.values()]
    .map((row) => ({ ...row, share: row.minutes / totalMinutes }))
    .sort((a, b) => b.minutes - a.minutes);
}

function buildTelemetryHealth(events, live, lastScannedAt) {
  const now = Date.now();
  const radarTypes = new Set(['agent.dock.start', 'agent.dock.stop', 'agent.external.start', 'agent.external.stop']);
  const recentRadar = (events || []).filter((e) => {
    if (!radarTypes.has(e.type)) return false;
    const t = new Date(e.at).getTime();
    return now - t < 24 * 60 * 60 * 1000;
  });
  const lastRadarEvent = recentRadar.sort((a, b) => String(b.at).localeCompare(String(a.at)))[0]?.at || null;
  const lastScan = lastScannedAt || live?.scanned_at || null;
  const lastScanAgeMs = lastScan ? now - new Date(lastScan).getTime() : null;
  const running = live?.running ?? 0;
  const gapWarning =
    running > 0 && lastScanAgeMs != null && lastScanAgeMs > 5 * 60 * 1000
      ? 'Agents are running but radar scan is stale — refresh or keep a HOOT tab open.'
      : running > 0 && recentRadar.length === 0
        ? 'No radar events in 24h while agents appear active — history may be incomplete.'
        : null;

  return {
    last_scanned_at: lastScan,
    last_radar_event_at: lastRadarEvent,
    radar_events_24h: recentRadar.length,
    open_radar_sessions: live?.open_sessions ?? 0,
    gap_warning: gapWarning,
    fresh: lastScanAgeMs != null && lastScanAgeMs < 120000,
  };
}

function buildKpis(dailySeries, usage, tokenBurn, events = [], anchorDate = null) {
  const today = anchorDate || isoDate();
  const todayRow = dailySeries.find((d) => d.date === today) || emptyDay(today);
  const loggedSessions = new Set(
    events
      .filter((e) => e.at?.startsWith(today) && e.session_ref && (e.type === 'session.end' || e.type === 'session.fail'))
      .map((e) => e.session_ref),
  );
  const outcomes = (usage?.outcomes || []).filter((o) => {
    const day = String(o.at || o.endedAt || '');
    if (!day.startsWith(today)) return false;
    if (o.sessionId && loggedSessions.has(o.sessionId)) return false;
    return true;
  });
  const success = outcomes.filter((o) => o.outcome === 'success').length;
  const fail = outcomes.filter((o) => o.outcome === 'failure').length;
  const ok = todayRow.successes + success;
  const bad = todayRow.failures + fail;
  const rate = ok + bad > 0 ? ok / (ok + bad) : null;

  return {
    today: {
      events: todayRow.events,
      dock_minutes: todayRow.dock_minutes,
      external_minutes: todayRow.external_minutes,
      launches: todayRow.launches,
      successes: ok,
      failures: bad,
      success_rate: rate,
      total_minutes: todayRow.total_minutes,
    },
    rtk_saved: tokenBurn?.formatted?.total_saved || null,
  };
}

function buildActivityAnalytics({
  activityData = { events: [], daily: {}, sessions: {} },
  usage = { launches: [], outcomes: [] },
  tokenBurn = null,
  days = 30,
  toDate = null,
  live = null,
} = {}) {
  const range = dateRange(days, toDate);
  const allEvents = activityData.events || [];
  const events = allEvents.filter((e) => {
    const day = e.at?.slice(0, 10);
    return day && day >= range.from && day <= range.to;
  });

  const dailySeries = buildDailySeries(events, activityData.daily, range);
  const calendarWeeks = buildCalendarWeeks(dailySeries, range.to);
  const drivers = buildDrivers(events, range);
  const projectDrivers = buildProjectDrivers(events, range);
  const agentComparison = buildAgentComparison(events, dailySeries, range);
  const timeline = mergeTimeline(allEvents, usage, range);
  const sessionGroups = buildSessionGroups(allEvents, range, activityData.sessions || {});
  const kpis = buildKpis(dailySeries, usage, tokenBurn, allEvents, range.to);
  const openSessions = Object.keys(activityData.sessions || {}).length;
  const liveSnapshot = live
    ? {
        running: live.running ?? live.summary?.total ?? 0,
        dock: live.dock ?? live.summary?.dock ?? 0,
        external: live.external ?? live.summary?.external ?? 0,
        scanned_at: live.scanned_at || null,
        agents: live.agents || [],
        open_sessions: openSessions,
      }
    : {
        running: 0,
        dock: 0,
        external: 0,
        scanned_at: null,
        agents: [],
        open_sessions: openSessions,
      };
  const telemetryHealth = buildTelemetryHealth(allEvents, liveSnapshot, liveSnapshot.scanned_at);
  const radarMeta = {
    last_scanned_at: liveSnapshot.scanned_at,
    events_from_radar_24h: telemetryHealth.radar_events_24h,
    poll_hint: 'Radar history grows when /api/agent-radar runs (Coach poll or Activity refresh).',
  };

  const rollup30 = dailySeries.map((d) => ({
    date: d.date,
    events: d.events,
    dock_minutes: d.dock_minutes,
    external_minutes: d.external_minutes,
    launches: d.launches,
    successes: d.successes,
    failures: d.failures,
    total_minutes: d.total_minutes,
    top_agent: d.driver?.name || '—',
  }));

  return {
    version: 2,
    generated_at: new Date().toISOString(),
    range,
    kpis,
    daily_series: dailySeries,
    calendar_weeks: calendarWeeks,
    drivers,
    project_drivers: projectDrivers,
    agent_comparison: agentComparison,
    timeline,
    session_groups: sessionGroups,
    live: liveSnapshot,
    radar_meta: radarMeta,
    telemetry_health: telemetryHealth,
    rollup_30d: rollup30,
    burn_bridge: {
      rtk: tokenBurn?.prevention?.rtk || { present: false },
      gain_has_data: Boolean(tokenBurn?.gain?.has_data),
      total_saved: tokenBurn?.formatted?.total_saved || null,
      codeburn: null,
    },
    empty: events.length === 0,
  };
}

function formatDiaryMarkdown(date, analytics) {
  const day = date || isoDate();
  const series = analytics?.daily_series?.find((d) => d.date === day);
  const drivers = (analytics?.drivers || []).slice(0, 5);
  const timeline = (analytics?.timeline || []).filter((e) => e.at?.startsWith(day)).reverse();
  const kpi = analytics?.kpis?.today;

  const lines = [
    `# HOOT Activity — ${day}`,
    '',
    '## Summary',
    `- ${series?.events ?? timeline.length} events`,
    `- ${series?.launches ?? 0} HOOT launches`,
    `- ~${series?.dock_minutes ?? 0}m docked agent time`,
    `- ~${series?.external_minutes ?? 0}m external agent time`,
    series?.driver ? `- Top driver: **${series.driver.name}** (${series.driver.minutes || 0}m)` : null,
    kpi?.success_rate != null ? `- Launch success rate: ${Math.round(kpi.success_rate * 100)}%` : null,
    analytics?.kpis?.rtk_saved ? `- RTK tokens kept out of context: ~${analytics.kpis.rtk_saved}` : null,
    '',
    '## Top agents (30d window)',
  ].filter(Boolean);

  if (drivers.length === 0) {
    lines.push('- No attributed agent time yet.');
  } else {
    for (const d of drivers) {
      lines.push(`- ${d.agent_name}: ${d.minutes}m (${Math.round(d.share * 100)}%) · ${d.launches} launches`);
    }
  }

  const groups = (analytics?.session_groups || []).filter((g) => g.started_at?.startsWith(day)).slice(0, 20);
  lines.push('', '## Sessions');
  if (groups.length === 0) {
    lines.push('- No grouped sessions for this day.');
  } else {
    for (const g of groups) {
      const dur = g.duration_ms ? ` · ${Math.round(g.duration_ms / 60000)}m` : g.running ? ' · running' : '';
      const outcome = g.outcome ? ` · ${g.outcome}` : '';
      lines.push(`- ${g.kind} · ${g.agent_name || 'unknown'}${dur}${outcome}`);
    }
  }

  lines.push('', '## Timeline');
  if (timeline.length === 0) {
    lines.push('- No activity logged yet.');
  } else {
    for (const e of timeline) {
      const t = e.at.slice(11, 16);
      const dur = e.duration_ms ? ` · ${Math.round(e.duration_ms / 60000)}m` : '';
      const outcome = e.outcome ? ` · ${e.outcome}` : '';
      lines.push(`- ${t} — ${e.type}${e.agent_name ? ` · ${e.agent_name}` : ''}${dur}${outcome}`);
    }
  }
  lines.push('');
  return lines.join('\n');
}

module.exports = {
  buildActivityAnalytics,
  buildDailySeries,
  buildCalendarWeeks,
  buildDrivers,
  buildSessionGroups,
  buildProjectDrivers,
  buildTelemetryHealth,
  formatDiaryMarkdown,
  dateRange,
  log1p,
  normalizeIntensity,
};