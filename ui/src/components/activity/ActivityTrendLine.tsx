import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BRAND_COLORS } from "@/lib/brand";
import type { ActivityDay } from "@/lib/activity-types";

export default function ActivityTrendLine({ series }: { series: ActivityDay[] }) {
  const data = series.slice(-14).map((d) => ({
    date: d.date.slice(5),
    minutes: Math.max(1, d.total_minutes || d.events),
    raw: d.total_minutes,
  }));

  if (data.every((d) => d.raw === 0)) {
    return <div style={{ fontSize: 12, opacity: 0.5, padding: "24px 0" }}>No agent minutes yet — radar polling will populate this chart.</div>;
  }

  return (
    <div style={{ width: "100%", height: 160 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.45)" }} axisLine={false} tickLine={false} />
          <YAxis
            scale="log"
            domain={["auto", "auto"]}
            tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }}
            axisLine={false}
            tickLine={false}
            width={32}
          />
          <Tooltip
            contentStyle={{ background: "#12100e", border: "1px solid rgba(255,176,66,0.2)", borderRadius: 8, fontSize: 11 }}
            formatter={(v: number, _n, p) => [`${(p?.payload as { raw?: number })?.raw ?? v}m`, "Agent time"]}
          />
          <Line type="monotone" dataKey="minutes" stroke={BRAND_COLORS.gold} strokeWidth={2} dot={{ r: 2, fill: BRAND_COLORS.gold }} />
        </LineChart>
      </ResponsiveContainer>
      <div style={{ fontSize: 10, opacity: 0.42, marginTop: 6 }}>14-day agent minutes · log y-scale</div>
    </div>
  );
}