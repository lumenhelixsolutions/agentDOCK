import { Line, LineChart, ResponsiveContainer } from "recharts";
import { BRAND_COLORS } from "@/lib/brand";
import type { ActivityAgentRow } from "@/lib/activity-types";

function Sparkline({ values }: { values: number[] }) {
  const data = values.map((v, i) => ({ i, v: Math.max(0, v) }));
  const hasData = values.some((v) => v > 0);
  if (!hasData) return <span style={{ opacity: 0.3 }}>—</span>;
  return (
    <div style={{ width: 72, height: 24 }}>
      <ResponsiveContainer>
        <LineChart data={data}>
          <Line type="monotone" dataKey="v" stroke={BRAND_COLORS.gold} strokeWidth={1.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function ActivityAgentTable({ agents }: { agents: ActivityAgentRow[] }) {
  if (agents.length === 0) {
    return <div style={{ fontSize: 12, opacity: 0.5 }}>Agent radar has not recorded stop events yet.</div>;
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            {["Agent", "Today", "7d", "30d", "Peak day", "Active days", "30d shape"].map((h) => (
              <th key={h} style={{ textAlign: "left", padding: "8px 10px", fontWeight: 500, opacity: 0.5, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {agents.map((row) => (
            <tr key={row.agent_id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <td style={{ padding: "10px", fontWeight: 500 }}>{row.agent_name}</td>
              <td style={{ padding: "10px", color: "#ffb042" }}>{row.today_min}m</td>
              <td style={{ padding: "10px" }}>{row.d7_min}m</td>
              <td style={{ padding: "10px" }}>{row.d30_min}m</td>
              <td style={{ padding: "10px", opacity: 0.65, fontFamily: "'GeistMono', monospace" }}>{row.peak_date?.slice(5) || "—"}</td>
              <td style={{ padding: "10px" }}>{row.active_days}</td>
              <td style={{ padding: "10px" }}>
                <Sparkline values={row.sparkline} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}