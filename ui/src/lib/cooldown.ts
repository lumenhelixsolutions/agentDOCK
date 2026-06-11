/** Shared types + math for the Cooldown Command Deck gauges, strip, and popout. */

export type ProviderLimits = {
  limit_type?: string;
  max_messages?: number | null;
  window_hours?: number | null;
  replenish_rate_minutes?: number | null;
  max_requests?: number | null;
  reset_time_utc?: string | null;
  lockout_duration_hours?: number | null;
  recovery_note?: string | null;
  notes?: string | null;
};

export type ProviderRow = {
  label: string;
  status: string;
  effective_status?: string;
  cooldown_until?: string | null;
  eta?: string | null;
  cooldown_label?: string | null;
  ready_at_iso?: string | null;
  seconds_remaining?: number | null;
  progress?: number | null;
  cooldown_started?: string | null;
  est_messages_recovered?: number | null;
  next_reset_iso?: string | null;
  limits_ref?: ProviderLimits | null;
  source?: string;
  last_updated?: string | null;
};

export type CooldownRegistry = {
  version?: number;
  providers: Record<string, ProviderRow>;
  current_session_provider?: string | null;
  matrix_line: string;
  updated_at?: string;
};

export const PROVIDER_ORDER = [
  "claude",
  "chatgpt",
  "gemini",
  "kimi",
  "deepseek",
  "perplexity",
  "ollama",
  "llamacpp",
] as const;

export type GaugeState = "active" | "cooldown" | "local" | "unknown";

export function gaugeState(row?: ProviderRow): GaugeState {
  if (!row) return "unknown";
  if (row.status === "local") return "local";
  const s = row.effective_status || row.status;
  if (s === "active") return "active";
  if (s === "cooldown") return "cooldown";
  return "unknown";
}

/** Hex colors chosen to read in both sepia-light and dark themes. */
export const STATE_COLORS: Record<GaugeState, { stroke: string; text: string; label: string }> = {
  active: { stroke: "#34d399", text: "text-emerald-400", label: "ACTIVE" },
  cooldown: { stroke: "#f87171", text: "text-red-400", label: "COOLDOWN" },
  local: { stroke: "#38bdf8", text: "text-sky-400", label: "LOCAL" },
  unknown: { stroke: "#9ca3af", text: "text-muted-foreground", label: "UNKNOWN" },
};

/** Seconds until unlock, derived client-side so the UI ticks without polling. */
export function liveRemaining(row: ProviderRow | undefined, nowMs: number): number | null {
  const iso = row?.ready_at_iso || row?.cooldown_until;
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.round((t - nowMs) / 1000));
}

/** Fraction of the cooldown window still remaining (1 = just locked, 0 = ready). */
export function liveRemainingFraction(row: ProviderRow | undefined, nowMs: number): number | null {
  const untilIso = row?.ready_at_iso || row?.cooldown_until;
  const startedIso = row?.cooldown_started || row?.last_updated;
  if (!untilIso || !startedIso) return null;
  const until = Date.parse(untilIso);
  const started = Date.parse(startedIso);
  if (Number.isNaN(until) || Number.isNaN(started) || started >= until) return null;
  return Math.max(0, Math.min(1, (until - nowMs) / (until - started)));
}

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export function formatShortEta(totalSeconds: number): string {
  const s = Math.max(0, totalSeconds);
  if (s < 60) return `${s}s`;
  const m = Math.ceil(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem ? `${h}h ${rem}m` : `${h}h`;
}

export function limitsLine(row?: ProviderRow): string {
  const l = row?.limits_ref;
  if (!l) return "";
  if (l.limit_type === "local") return "local · hardware-bound";
  if (l.limit_type === "daily_reset") {
    const cap = l.max_requests ? `${l.max_requests}/day` : "daily cap";
    return `${cap} · resets ${String(l.reset_time_utc || "").slice(0, 5)} UTC`;
  }
  if (l.max_messages && l.window_hours) {
    const rate = l.replenish_rate_minutes ? ` · ~1 msg / ${l.replenish_rate_minutes} min` : "";
    return `${l.max_messages} msg / ${l.window_hours}h${rate}`;
  }
  if (l.lockout_duration_hours) return `${l.lockout_duration_hours}h lockout on freeze`;
  return l.recovery_note || "";
}

export function formatTimeLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
