/** Map /api/agent-radar production telemetry into Coach pageContext fields. */

export type ProductionSession = {
  agent_id?: string;
  agent_name?: string;
  provider?: string;
  model_id?: string | null;
  est_context_tokens?: number;
  completed_turns?: number;
  compaction_count?: number;
  last_user_query?: string | null;
  session_id?: string;
  cwd?: string;
  matched_project?: boolean;
  active?: boolean;
  yolo_mode?: boolean;
  chat_bytes?: number;
  telemetry_source?: string | null;
  thread_name?: string | null;
};

export type ProductionContext = ProductionSession;

export type AgentRadarProductionPayload = {
  production_sessions?: ProductionSession[];
  production_context?: ProductionContext | null;
  session_summary?: {
    active?: number;
    matched_project?: number;
    est_context_tokens?: number;
    turn_count?: number;
    compaction_events?: number;
  };
  by_agent?: Record<string, { sessions?: ProductionSession[]; summary?: Record<string, number> }>;
  grok_sessions?: ProductionSession[];
  grok_summary?: {
    active?: number;
    matched_project?: number;
    est_context_tokens?: number;
    turn_count?: number;
    compaction_events?: number;
  };
};

export function formatEstTokens(n: number) {
  const v = Number(n) || 0;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${Math.round(v / 1_000)}K`;
  return String(Math.round(v));
}

export function productionFieldsFromRadar(radar: AgentRadarProductionPayload | null | undefined) {
  const sessions = radar?.production_sessions?.length
    ? radar.production_sessions
    : (radar?.grok_sessions || []);
  const primary = radar?.production_context || sessions.find((s) => s.active && s.matched_project) || sessions.find((s) => s.active) || sessions[0] || null;
  const summary = radar?.session_summary || radar?.grok_summary;
  const activeSessions = sessions.filter((s) => s.active);
  const grokPrimary = primary?.agent_id === "grok" ? primary : sessions.find((s) => s.agent_id === "grok" && s.active) || null;

  return {
    productionSessions: sessions,
    productionContext: primary,
    sessionSummary: summary ?? null,
    productionByAgent: radar?.by_agent ?? null,
    productionSessionActive: activeSessions.length > 0 || Boolean(primary?.active),
    productionActiveCount: activeSessions.length || (primary?.active ? 1 : 0),
    productionEstContextTokens: primary?.est_context_tokens ?? summary?.est_context_tokens ?? 0,
    productionModelId: primary?.model_id ?? null,
    productionAgentId: primary?.agent_id ?? null,
    productionAgentName: primary?.agent_name ?? null,
    productionLastUserQuery: primary?.last_user_query ?? null,
    // Grok backward-compat fields
    grokSessionActive: Boolean(grokPrimary?.active || grokPrimary?.session_id || (summary?.active ?? 0) > 0),
    grokEstContextTokens: grokPrimary?.est_context_tokens ?? radar?.grok_summary?.est_context_tokens ?? 0,
    grokModelId: grokPrimary?.model_id ?? null,
    grokLastUserQuery: grokPrimary?.last_user_query ?? null,
    grokCompletedTurns: grokPrimary?.completed_turns ?? radar?.grok_summary?.turn_count ?? 0,
    grokCompactionCount: grokPrimary?.compaction_count ?? radar?.grok_summary?.compaction_events ?? 0,
    grokMatchedProject: grokPrimary?.matched_project ?? false,
    grokSummary: radar?.grok_summary ?? null,
  };
}