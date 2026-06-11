const { describe, it } = require('node:test');
const assert = require('node:assert');
const {
  buildActivityAnalytics,
  buildCalendarWeeks,
  buildDailySeries,
  buildSessionGroups,
  buildTelemetryHealth,
  dateRange,
} = require('../activity-analytics');

const FIXTURE = {
  events: [
    { id: '1', at: '2026-06-10T09:00:00.000Z', type: 'agent.external.start', agent: 'claude-code', agent_name: 'Claude Code', source: 'external', meta: { pid: 1 } },
    { id: '2', at: '2026-06-10T10:00:00.000Z', type: 'agent.external.stop', agent: 'claude-code', agent_name: 'Claude Code', source: 'external', duration_ms: 3600000, meta: { pid: 1 } },
    { id: '3', at: '2026-06-10T11:00:00.000Z', type: 'session.launch', agent: 'local-safe-audit', agent_name: 'Safe Audit', source: 'agentdock', session_ref: 'sess-1' },
    { id: '4', at: '2026-06-10T12:00:00.000Z', type: 'session.end', agent: 'local-safe-audit', agent_name: 'Safe Audit', source: 'agentdock', session_ref: 'sess-1', duration_ms: 900000 },
    { id: '5', at: '2026-06-09T14:00:00.000Z', type: 'agent.dock.stop', agent: 'codex', agent_name: 'OpenAI Codex', source: 'agentdock', duration_ms: 1800000 },
  ],
  daily: {
    '2026-06-10': { date: '2026-06-10', events: 4, dock_minutes: 0, external_minutes: 60, launches: 1 },
    '2026-06-09': { date: '2026-06-09', events: 1, dock_minutes: 30, external_minutes: 0, launches: 0 },
  },
  sessions: {},
};

describe('activity-analytics', () => {
  it('dateRange returns inclusive window', () => {
    const r = dateRange(7, '2026-06-10');
    assert.strictEqual(r.to, '2026-06-10');
    assert.strictEqual(r.from, '2026-06-04');
    assert.strictEqual(r.days, 7);
  });

  it('buildDailySeries does not double-count rollup minutes', () => {
    const range = dateRange(3, '2026-06-10');
    const series = buildDailySeries(FIXTURE.events, FIXTURE.daily, range);
    const today = series.find((d) => d.date === '2026-06-10');
    const yesterday = series.find((d) => d.date === '2026-06-09');
    assert.ok(today);
    assert.strictEqual(today.external_minutes, 60);
    assert.strictEqual(today.dock_minutes, 0);
    assert.strictEqual(today.total_minutes, 60);
    assert.strictEqual(yesterday.dock_minutes, 30);
  });

  it('buildDailySeries computes drivers and peak hour', () => {
    const range = dateRange(3, '2026-06-10');
    const series = buildDailySeries(FIXTURE.events, FIXTURE.daily, range);
    const today = series.find((d) => d.date === '2026-06-10');
    assert.ok(today.driver);
    assert.strictEqual(today.driver.type, 'agent');
    assert.ok(today.peak_hour !== null);
    assert.ok(today.intensity >= 0 && today.intensity <= 1);
  });

  it('buildCalendarWeeks returns 5 weeks of 7 days', () => {
    const range = dateRange(14, '2026-06-10');
    const series = buildDailySeries(FIXTURE.events, FIXTURE.daily, range);
    const weeks = buildCalendarWeeks(series, '2026-06-10');
    assert.strictEqual(weeks.length, 5);
    assert.strictEqual(weeks[0].length, 7);
    const inRange = weeks.flat().filter((c) => c.in_range);
    assert.ok(inRange.length >= 2);
  });

  it('buildActivityAnalytics merges usage outcomes without duplicate KPIs', () => {
    const report = buildActivityAnalytics({
      activityData: FIXTURE,
      usage: {
        launches: [{ id: 'sess-1', profileId: 'local-safe-audit', at: '2026-06-10T11:00:00.000Z' }],
        outcomes: [{ sessionId: 'sess-1', outcome: 'success', at: '2026-06-10T12:00:00.000Z' }],
      },
      tokenBurn: { formatted: { total_saved: '12k' }, prevention: { rtk: { present: true } }, gain: { has_data: true } },
      days: 30,
      toDate: '2026-06-10',
    });

    assert.strictEqual(report.version, 2);
    assert.ok(report.drivers.length >= 2);
    assert.ok(report.agent_comparison.length >= 2);
    assert.strictEqual(report.kpis.rtk_saved, '12k');
    assert.ok(report.timeline.some((t) => t.session_ref === 'sess-1'));
    assert.strictEqual(report.burn_bridge.gain_has_data, true);
    assert.ok(report.rollup_30d.length >= 30);
    assert.strictEqual(report.kpis.today.successes, 1);
    assert.ok(report.session_groups.some((g) => g.session_ref === 'sess-1'));
    assert.ok(report.project_drivers.length >= 0);
    assert.ok(report.telemetry_health);
  });

  it('buildSessionGroups pairs radar start/stop by pid', () => {
    const range = dateRange(3, '2026-06-10');
    const groups = buildSessionGroups(FIXTURE.events, range, {});
    const radar = groups.find((g) => g.kind === 'radar' && g.agent_name === 'Claude Code');
    assert.ok(radar);
    assert.strictEqual(radar.duration_ms, 3600000);
    assert.strictEqual(radar.running, false);
  });

  it('buildTelemetryHealth flags stale radar when agents running', () => {
    const health = buildTelemetryHealth(FIXTURE.events, { running: 2, scanned_at: '2026-01-01T00:00:00.000Z' }, '2026-01-01T00:00:00.000Z');
    assert.ok(health.gap_warning);
    assert.strictEqual(health.fresh, false);
  });

  it('empty install returns instructive empty state', () => {
    const report = buildActivityAnalytics({ activityData: { events: [], daily: {} }, days: 14, toDate: '2026-06-10' });
    assert.strictEqual(report.empty, true);
    assert.strictEqual(report.timeline.length, 0);
    assert.ok(report.calendar_weeks.length === 5);
  });
});