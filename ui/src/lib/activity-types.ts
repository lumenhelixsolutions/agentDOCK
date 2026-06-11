export type ActivityDriver = {
  agent_id: string;
  agent_name: string;
  minutes: number;
  share: number;
  sessions: number;
  launches: number;
  evidence: { sessions: number; launches: number; stops: number };
};

export type ActivityProjectDriver = {
  project: string;
  label: string;
  minutes: number;
  stops: number;
  share: number;
};

export type ActivityDay = {
  date: string;
  events: number;
  dock_minutes: number;
  external_minutes: number;
  launches: number;
  total_minutes: number;
  peak_hour: number | null;
  driver: { type: string; id: string; name: string; minutes?: number } | null;
  intensity: number;
};

export type ActivityCalendarCell = {
  date: string;
  in_range: boolean;
  events: number;
  dock_minutes: number;
  external_minutes: number;
  total_minutes: number;
  intensity: number;
};

export type ActivityAgentRow = {
  agent_id: string;
  agent_name: string;
  today_min: number;
  d7_min: number;
  d30_min: number;
  peak_date: string | null;
  active_days: number;
  sparkline: number[];
};

export type ActivityTimelineEvent = {
  id: string;
  at: string;
  type: string;
  agent_name?: string | null;
  agent?: string | null;
  source?: string | null;
  project?: string | null;
  duration_ms?: number | null;
  session_ref?: string | null;
  outcome?: string | null;
  meta?: Record<string, unknown>;
};

export type ActivitySessionGroup = {
  id: string;
  kind: "hoot" | "radar";
  agent_id: string | null;
  agent_name: string | null;
  project: string | null;
  source: string | null;
  session_ref: string | null;
  started_at: string | null;
  ended_at: string | null;
  duration_ms: number | null;
  running: boolean;
  events: ActivityTimelineEvent[];
  outcome: string | null;
  sparkline: number[];
};

export type ActivityLiveSnapshot = {
  running: number;
  dock: number;
  external: number;
  scanned_at: string | null;
  agents: Array<{ id: string; name: string; count: number; dock: number; external: number }>;
  open_sessions: number;
};

export type ActivityTelemetryHealth = {
  last_scanned_at: string | null;
  last_radar_event_at: string | null;
  radar_events_24h: number;
  open_radar_sessions: number;
  gap_warning: string | null;
  fresh: boolean;
};

export type ActivityAnalytics = {
  version: number;
  generated_at: string;
  range: { from: string; to: string; days: number };
  kpis: {
    today: {
      events: number;
      dock_minutes: number;
      external_minutes: number;
      launches: number;
      successes: number;
      failures: number;
      success_rate: number | null;
      total_minutes: number;
    };
    rtk_saved: string | null;
  };
  daily_series: ActivityDay[];
  calendar_weeks: ActivityCalendarCell[][];
  drivers: ActivityDriver[];
  project_drivers: ActivityProjectDriver[];
  agent_comparison: ActivityAgentRow[];
  timeline: ActivityTimelineEvent[];
  session_groups: ActivitySessionGroup[];
  live: ActivityLiveSnapshot;
  radar_meta: {
    last_scanned_at: string | null;
    events_from_radar_24h: number;
    poll_hint: string;
  };
  telemetry_health: ActivityTelemetryHealth;
  rollup_30d: Array<{
    date: string;
    events: number;
    dock_minutes: number;
    external_minutes: number;
    launches: number;
    successes: number;
    failures: number;
    total_minutes: number;
    top_agent: string;
  }>;
  burn_bridge: {
    rtk: { present: boolean };
    gain_has_data: boolean;
    total_saved: string | null;
    codeburn: null;
  };
  empty: boolean;
};

export type DiaryViewMode = "grouped" | "raw";
export type DiarySourceFilter = "all" | "hoot" | "dock" | "external";