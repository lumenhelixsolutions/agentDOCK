/** Map /api/agent-radar Grok telemetry into Coach pageContext fields. */

export type GrokProductionContext = {
  provider?: string;
  agent_id?: string;
  model_id?: string | null;
  est_context_tokens?: number;
  completed_turns?: number;
  compaction_count?: number;
  last_user_query?: string | null;
  session_id?: string;
  cwd?: string;
  matched_project?: boolean;
  yolo_mode?: boolean;
  chat_bytes?: number;
};

export type AgentRadarGrokPayload = {
  grok_summary?: {
    active?: number;
    matched_project?: number;
    est_context_tokens?: number;
    turn_count?: number;
    compaction_events?: number;
  };
  production_context?: GrokProductionContext | null;
};

export function grokFieldsFromRadar(radar: AgentRadarGrokPayload | null | undefined) {
  const pc = radar?.production_context;
  const summary = radar?.grok_summary;
  const grokActive = Boolean(pc?.session_id || (summary?.active ?? 0) > 0);
  return {
    grokSessionActive: grokActive,
    grokEstContextTokens: pc?.est_context_tokens ?? summary?.est_context_tokens ?? 0,
    grokModelId: pc?.model_id ?? null,
    grokLastUserQuery: pc?.last_user_query ?? null,
    grokCompletedTurns: pc?.completed_turns ?? summary?.turn_count ?? 0,
    grokCompactionCount: pc?.compaction_count ?? summary?.compaction_events ?? 0,
    grokMatchedProject: pc?.matched_project ?? false,
    productionContext: pc ?? null,
    grokSummary: summary ?? null,
  };
}