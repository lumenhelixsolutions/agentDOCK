import type { ActivityDriver } from "@/lib/activity-types";

export default function ActivityDriversTable({ drivers }: { drivers: ActivityDriver[] }) {
  if (drivers.length === 0) {
    return <div style={{ fontSize: 12, opacity: 0.5 }}>Launch agents or let radar detect external tools to populate drivers.</div>;
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            {["Agent", "Minutes", "Share", "Evidence"].map((h) => (
              <th key={h} style={{ textAlign: "left", padding: "8px 10px", opacity: 0.5, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 500 }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {drivers.slice(0, 12).map((d) => (
            <tr key={d.agent_id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <td style={{ padding: "10px", fontWeight: 500 }}>{d.agent_name}</td>
              <td style={{ padding: "10px", color: "#ffb042" }}>{d.minutes}m</td>
              <td style={{ padding: "10px" }}>{Math.round(d.share * 100)}%</td>
              <td style={{ padding: "10px", opacity: 0.65, fontSize: 11 }}>
                {d.evidence.sessions} sessions · {d.evidence.launches} launches · {d.evidence.stops} stops
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}