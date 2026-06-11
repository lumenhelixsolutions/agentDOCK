import type { ActivityDay } from "@/lib/activity-types";

export default function ActivityDriverTable({
  days,
  onSelect,
  selectedDate,
}: {
  days: ActivityDay[];
  selectedDate: string | null;
  onSelect: (date: string) => void;
}) {
  const rows = [...days].reverse().slice(0, 14);

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            {["Date", "Minutes", "Moment", "Driver"].map((h) => (
              <th key={h} style={{ textAlign: "left", padding: "8px 10px", fontWeight: 500, opacity: 0.5, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const selected = selectedDate === row.date;
            return (
              <tr
                key={row.date}
                onClick={() => onSelect(row.date)}
                style={{
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                  cursor: "pointer",
                  background: selected ? "rgba(255,176,66,0.08)" : "transparent",
                }}
              >
                <td style={{ padding: "10px", fontFamily: "'GeistMono', monospace", opacity: 0.85 }}>{row.date}</td>
                <td style={{ padding: "10px", color: "#ffb042" }}>{row.total_minutes}m</td>
                <td style={{ padding: "10px", opacity: 0.65 }}>{row.peak_hour != null ? `${String(row.peak_hour).padStart(2, "0")}:00` : "—"}</td>
                <td style={{ padding: "10px", opacity: 0.8 }}>{row.driver?.name || "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}