import type { ActivityAnalytics } from "@/lib/activity-types";

export default function ActivityRollupTable({ rollup }: { rollup: ActivityAnalytics["rollup_30d"] }) {
  const rows = [...rollup].reverse().slice(0, 30);

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            {["Date", "Total", "Dock", "External", "Launches", "OK", "Fail", "Top agent"].map((h) => (
              <th key={h} style={{ textAlign: "left", padding: "8px 8px", opacity: 0.5, fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 500 }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.date} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
              <td style={{ padding: "8px", fontFamily: "'GeistMono', monospace" }}>{row.date}</td>
              <td style={{ padding: "8px", color: "#ffb042" }}>{row.total_minutes}m</td>
              <td style={{ padding: "8px" }}>{row.dock_minutes}m</td>
              <td style={{ padding: "8px" }}>{row.external_minutes}m</td>
              <td style={{ padding: "8px" }}>{row.launches}</td>
              <td style={{ padding: "8px", color: "#4ade80" }}>{row.successes}</td>
              <td style={{ padding: "8px", color: row.failures ? "#fb923c" : undefined }}>{row.failures}</td>
              <td style={{ padding: "8px", opacity: 0.75 }}>{row.top_agent}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}