import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BRAND_COLORS } from "@/lib/brand";
import type { ActivityDriver } from "@/lib/activity-types";

export default function ActivityDotPlot({ drivers }: { drivers: ActivityDriver[] }) {
  const data = drivers.slice(0, 10).map((d) => ({
    name: d.agent_name.length > 18 ? `${d.agent_name.slice(0, 16)}…` : d.agent_name,
    minutes: Math.max(1, d.minutes),
    share: Math.round(d.share * 100),
    full: d.agent_name,
  }));

  if (data.length === 0) {
    return <div style={{ fontSize: 12, opacity: 0.5 }}>No attributed agent time in this window.</div>;
  }

  return (
    <div style={{ width: "100%", height: Math.max(120, data.length * 28) }}>
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, left: 4, bottom: 4 }}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11, fill: "rgba(255,255,255,0.7)" }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ background: "#12100e", border: "1px solid rgba(255,176,66,0.2)", borderRadius: 8, fontSize: 11 }}
            formatter={(v: number, _n, p) => [`${v}m (${(p?.payload as { share?: number })?.share ?? 0}%)`, "Agent time"]}
            labelFormatter={(_l, p) => (Array.isArray(p) && p[0]?.payload ? (p[0].payload as { full?: string }).full : "") as string}
          />
          <Bar dataKey="minutes" radius={[0, 4, 4, 0]} barSize={14}>
            {data.map((_, i) => (
              <Cell key={i} fill={BRAND_COLORS.gold} fillOpacity={0.55 + (i === 0 ? 0.35 : 0)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}