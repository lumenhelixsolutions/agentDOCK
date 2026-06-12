/**
 * Unified external agent session radar — merges top-model telemetry into agent radar.
 */

const {
  summarizeSessions,
  buildAgentRunningMap,
  pickPrimaryProductionContext,
} = require('./session-radar-shared');
const { SESSION_RADAR_ADAPTERS } = require('./session-radar-adapters');

function buildAllSessionRadars({ activeProject, processes = [] } = {}) {
  const runningMap = buildAgentRunningMap(processes);
  const by_agent = {};
  const production_sessions = [];

  for (const adapter of SESSION_RADAR_ADAPTERS) {
    try {
      const result = adapter.build({ activeProject, runningMap, processes });
      by_agent[adapter.id] = {
        agent_id: adapter.id,
        agent_name: adapter.name,
        scanned_at: result.scanned_at,
        sessions: result.sessions || [],
        summary: result.summary || summarizeSessions(result.sessions),
        home: result.home || result.grok_home || null,
      };
      production_sessions.push(...(result.sessions || []));
    } catch {
      by_agent[adapter.id] = {
        agent_id: adapter.id,
        agent_name: adapter.name,
        scanned_at: new Date().toISOString(),
        sessions: [],
        summary: summarizeSessions([]),
        error: 'adapter_failed',
      };
    }
  }

  production_sessions.sort((a, b) => {
    const aScore = (a.active ? 4 : 0) + (a.matched_project ? 2 : 0) + (a.est_context_tokens || 0) / 100000;
    const bScore = (b.active ? 4 : 0) + (b.matched_project ? 2 : 0) + (b.est_context_tokens || 0) / 100000;
    return bScore - aScore;
  });

  const session_summary = summarizeSessions(production_sessions);
  const production_context = pickPrimaryProductionContext(production_sessions);

  return {
    scanned_at: new Date().toISOString(),
    production_sessions,
    production_context,
    session_summary,
    by_agent,
    grok_sessions: by_agent.grok?.sessions || [],
    grok_summary: by_agent.grok?.summary || summarizeSessions([]),
  };
}

module.exports = {
  buildAllSessionRadars,
  SESSION_RADAR_ADAPTERS,
};