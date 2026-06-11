import type { ActivityDay } from "@/lib/activity-types";

export default function ActivityDayRollup({ day }: { day: ActivityDay | null }) {
  if (!day) return null;
  return (
    <div
      style={{
        marginTop: 16,
        padding: "12px 14px",
        borderRadius: 10,
        background: "rgba(255,176,66,0.04)",
        border: "1px solid rgba(255,176,66,0.1)",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))",
        gap: 12,
        fontSize: 11,
      }}
    >
      <div>
        <div style={{ opacity: 0.45, textTransform: "uppercase", letterSpacing: "0.08em", fontSize: 9 }}>{day.date}</div>
        <div style={{ marginTop: 4, fontWeight: 600 }}>{day.events} events</div>
      </div>
      <div>
        <div style={{ opacity: 0.45, fontSize: 9 }}>Dock / Ext</div>
        <div style={{ marginTop: 4 }}>{day.dock_minutes}m / {day.external_minutes}m</div>
      </div>
      <div>
        <div style={{ opacity: 0.45, fontSize: 9 }}>Launches</div>
        <div style={{ marginTop: 4 }}>{day.launches}</div>
      </div>
      <div>
        <div style={{ opacity: 0.45, fontSize: 9 }}>Outcomes</div>
        <div style={{ marginTop: 4 }}>{day.successes} ok · {day.failures} fail</div>
      </div>
      <div>
        <div style={{ opacity: 0.45, fontSize: 9 }}>Top driver</div>
        <div style={{ marginTop: 4 }}>{day.driver?.name || "—"}</div>
      </div>
    </div>
  );
}