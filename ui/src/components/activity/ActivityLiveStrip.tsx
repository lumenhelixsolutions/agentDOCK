import { Link } from "react-router-dom";
import { Radio, TerminalSquare } from "lucide-react";
import type { ActivityLiveSnapshot, ActivityTelemetryHealth } from "@/lib/activity-types";

function formatScanAge(scannedAt: string | null) {
  if (!scannedAt) return "never";
  const ms = Date.now() - new Date(scannedAt).getTime();
  if (ms < 60000) return "just now";
  if (ms < 3600000) return `${Math.round(ms / 60000)}m ago`;
  return `${Math.round(ms / 3600000)}h ago`;
}

export default function ActivityLiveStrip({
  live,
  health,
}: {
  live: ActivityLiveSnapshot;
  health: ActivityTelemetryHealth;
}) {
  const running = live.running;
  const agentList = live.agents?.slice(0, 4).map((a) => a.name).join(", ");

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 16,
        flexWrap: "wrap",
        padding: "14px 18px",
        borderRadius: 12,
        background: "rgba(255,176,66,0.06)",
        border: `1px solid ${health.fresh ? "rgba(74,222,128,0.25)" : "rgba(255,176,66,0.2)"}`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <Radio size={16} color={running > 0 ? "#4ade80" : "#888"} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#f5e6d0" }}>
            {running > 0 ? `${running} agent${running === 1 ? "" : "s"} running` : "No agents detected"}
          </div>
          <div style={{ fontSize: 11, opacity: 0.55, marginTop: 2 }}>
            Dock {live.dock} · External {live.external}
            {agentList ? ` · ${agentList}` : ""}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 11, opacity: 0.55 }}>
        <span>Radar {formatScanAge(live.scanned_at)}</span>
        <Link to="/terminal" style={{ display: "flex", alignItems: "center", gap: 6, color: "#ffb042", textDecoration: "none" }}>
          <TerminalSquare size={14} />
          Terminal
        </Link>
      </div>
    </div>
  );
}