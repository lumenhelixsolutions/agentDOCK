import { useEffect, useMemo, useState } from "react";
import { CalendarDays, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";
import { useCoach } from "@/context/CoachContext";

type ActivityEvent = {
  id: string;
  at: string;
  type: string;
  agent_name?: string | null;
  source?: string | null;
  duration_ms?: number | null;
};

export default function ActivityPage() {
  const [today, setToday] = useState<any>(null);
  const [range, setRange] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [writing, setWriting] = useState(false);
  const { setPageContext } = useCoach();

  const load = async () => {
    setLoading(true);
    try {
      const from = new Date();
      from.setDate(from.getDate() - 14);
      const [todayData, weekData] = await Promise.all([
        api.getActivityToday(),
        api.getActivity(from.toISOString().slice(0, 10)),
      ]);
      setToday(todayData);
      setRange(weekData);
      setPageContext({ activityToday: todayData?.events?.length || 0 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const dailyRows = useMemo(() => {
    const daily = range?.daily || today?.rollup ? { [today?.date]: today?.rollup } : {};
    return Object.values(daily || {}).sort((a: any, b: any) => String(b.date).localeCompare(String(a.date))).slice(0, 14);
  }, [range, today]);

  const writeDiary = async () => {
    setWriting(true);
    try {
      await api.writeDiary();
      await load();
    } finally {
      setWriting(false);
    }
  };

  if (loading) return <div style={{ opacity: 0.5, fontSize: 13 }}>Loading activity diary…</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: 20, margin: 0 }}>Activity Diary</h2>
          <p style={{ margin: "6px 0 0", fontSize: 12, opacity: 0.6 }}>Session radar history, launches, and telemetry — shared across LAN devices.</p>
        </div>
        <button
          type="button"
          onClick={writeDiary}
          disabled={writing}
          style={{
            padding: "10px 16px",
            borderRadius: 10,
            border: "1px solid rgba(52,211,153,0.3)",
            background: "rgba(52,211,153,0.08)",
            color: "#34d399",
            cursor: writing ? "not-allowed" : "pointer",
            fontSize: 12,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <RefreshCw size={14} className={writing ? "spin" : undefined} />
          {writing ? "Writing…" : "Write diary .md"}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        <Stat label="Today" value={String(today?.events?.length || 0)} sub="events" />
        <Stat label="Launches" value={String(today?.rollup?.launches || 0)} sub="HOOT" />
        <Stat label="Docked" value={`${today?.rollup?.dock_minutes || 0}m`} sub="agent time" />
        <Stat label="External" value={`${today?.rollup?.external_minutes || 0}m`} sub="agent time" />
      </div>

      <Section title="Calendar heatmap (14 days)">
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end", minHeight: 80 }}>
          {dailyRows.length > 0 ? (
            dailyRows.map((day: any) => {
              const intensity = Math.min(1, (day.events || 0) / 20);
              return (
                <div key={day.date} style={{ flex: 1, textAlign: "center" }}>
                  <div
                    title={`${day.date}: ${day.events} events`}
                    style={{
                      height: `${24 + intensity * 48}px`,
                      borderRadius: 8,
                      background: `linear-gradient(180deg, rgba(52,211,153,${0.15 + intensity * 0.55}), rgba(52,211,153,0.08))`,
                      border: "1px solid rgba(52,211,153,0.2)",
                    }}
                  />
                  <div style={{ fontSize: 9, opacity: 0.45, marginTop: 6 }}>{day.date?.slice(5)}</div>
                </div>
              );
            })
          ) : (
            <div style={{ fontSize: 12, opacity: 0.5 }}>No daily rollups yet — agent radar will populate this as you work.</div>
          )}
        </div>
      </Section>

      <Section title="Today's timeline">
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {(today?.events || []).length > 0 ? (
            (today.events as ActivityEvent[]).map((ev) => (
              <div
                key={ev.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: "10px 12px",
                  borderRadius: 10,
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.04)",
                }}
              >
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{ev.type.replace(/\./g, " · ")}</div>
                  <div style={{ fontSize: 11, opacity: 0.55, marginTop: 3 }}>
                    {ev.agent_name || ev.source || "system"}
                    {ev.duration_ms ? ` · ${Math.round(ev.duration_ms / 60000)}m` : ""}
                  </div>
                </div>
                <div style={{ fontSize: 11, opacity: 0.45, fontFamily: "'GeistMono', monospace" }}>{ev.at.slice(11, 16)}</div>
              </div>
            ))
          ) : (
            <div style={{ fontSize: 12, opacity: 0.5, display: "flex", alignItems: "center", gap: 8 }}>
              <CalendarDays size={14} /> No events logged today yet.
            </div>
          )}
        </div>
      </Section>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div style={{ padding: 14, borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
      <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.45 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 600, color: "#34d399", marginTop: 4 }}>{value}</div>
      <div style={{ fontSize: 10, opacity: 0.4, marginTop: 2 }}>{sub}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 style={{ fontSize: 11, letterSpacing: "3px", textTransform: "uppercase", opacity: 0.5, fontWeight: 300, margin: "0 0 12px" }}>{title}</h3>
      {children}
    </div>
  );
}