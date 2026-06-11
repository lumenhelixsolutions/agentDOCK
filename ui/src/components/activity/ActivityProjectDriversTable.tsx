import type { ActivityProjectDriver } from "@/lib/activity-types";

export default function ActivityProjectDriversTable({ drivers }: { drivers: ActivityProjectDriver[] }) {
  if (drivers.length === 0) {
    return <div style={{ fontSize: 12, opacity: 0.5 }}>Project attribution appears when stop events include a project path.</div>;
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            {["Project", "Minutes", "Share", "Stops"].map((h) => (
              <th key={h} style={{ textAlign: "left", padding: "8px 10px", opacity: 0.5, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 500 }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {drivers.slice(0, 10).map((d) => (
            <tr key={d.project} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <td style={{ padding: "10px", fontWeight: 500 }} title={d.project}>{d.label}</td>
              <td style={{ padding: "10px", color: "#ffb042" }}>{d.minutes}m</td>
              <td style={{ padding: "10px" }}>{Math.round(d.share * 100)}%</td>
              <td style={{ padding: "10px", opacity: 0.65 }}>{d.stops}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}