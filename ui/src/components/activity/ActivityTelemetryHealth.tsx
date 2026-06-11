import { AlertTriangle, CheckCircle2 } from "lucide-react";
import type { ActivityAnalytics, ActivityTelemetryHealth as Health } from "@/lib/activity-types";

type RadarMeta = ActivityAnalytics["radar_meta"];

export default function ActivityTelemetryHealthPanel({
  health,
  radarMeta,
}: {
  health: Health;
  radarMeta: RadarMeta;
}) {
  return (
    <div
      style={{
        padding: "14px 16px",
        borderRadius: 10,
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
        fontSize: 11,
        lineHeight: 1.5,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        {health.fresh ? <CheckCircle2 size={14} color="#4ade80" /> : <AlertTriangle size={14} color="#ffb042" />}
        <span style={{ fontWeight: 600, color: "#f5e6d0" }}>Radar & telemetry health</span>
      </div>
      <div style={{ opacity: 0.55 }}>
        Last scan: {health.last_scanned_at?.slice(0, 19).replace("T", " ") || "—"} ·{" "}
        {radarMeta.events_from_radar_24h} radar events (24h) · {health.open_radar_sessions} open radar session
        {health.open_radar_sessions === 1 ? "" : "s"}
      </div>
      {health.gap_warning && (
        <div style={{ marginTop: 8, color: "#fb923c", display: "flex", gap: 6, alignItems: "flex-start" }}>
          <AlertTriangle size={12} style={{ flexShrink: 0, marginTop: 2 }} />
          <span>{health.gap_warning}</span>
        </div>
      )}
      <div style={{ marginTop: 6, opacity: 0.42 }}>{radarMeta.poll_hint}</div>
    </div>
  );
}