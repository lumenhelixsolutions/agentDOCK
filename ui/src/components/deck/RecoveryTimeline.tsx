import { useMemo } from "react";
import { type CooldownRegistry, PROVIDER_ORDER, formatTimeLabel, gaugeState } from "@/lib/cooldown";

const SPAN_HOURS = 8;

type Marker = {
  id: string;
  label: string;
  atMs: number;
  kind: "unlock" | "reset";
};

/** Horizontal next-8-hours ribbon: when does each provider come back? */
export default function RecoveryTimeline({ registry, nowMs }: { registry: CooldownRegistry; nowMs: number }) {
  const spanMs = SPAN_HOURS * 3600 * 1000;

  const markers = useMemo(() => {
    const out: Marker[] = [];
    for (const id of PROVIDER_ORDER) {
      const row = registry.providers?.[id];
      if (!row) continue;
      const state = gaugeState(row);
      const unlockIso = row.ready_at_iso || row.cooldown_until;
      if (state === "cooldown" && unlockIso) {
        const at = Date.parse(unlockIso);
        if (!Number.isNaN(at) && at > nowMs && at - nowMs <= spanMs) {
          out.push({ id, label: row.label || id, atMs: at, kind: "unlock" });
          continue;
        }
      }
      if (row.next_reset_iso && state !== "cooldown") {
        const at = Date.parse(row.next_reset_iso);
        if (!Number.isNaN(at) && at > nowMs && at - nowMs <= spanMs) {
          out.push({ id, label: row.label || id, atMs: at, kind: "reset" });
        }
      }
    }
    return out.sort((a, b) => a.atMs - b.atMs);
  }, [registry, nowMs, spanMs]);

  const pct = (atMs: number) => Math.max(0, Math.min(100, ((atMs - nowMs) / spanMs) * 100));

  return (
    <div>
      <div className="relative h-[110px]">
        {/* baseline */}
        <div className="absolute left-0 right-0 top-1/2 h-px bg-gradient-to-r from-emerald-400/50 via-foreground/15 to-transparent" />

        {/* hour ticks */}
        {Array.from({ length: SPAN_HOURS + 1 }).map((_, h) => (
          <div key={h} className="absolute top-1/2" style={{ left: `${(h / SPAN_HOURS) * 100}%` }}>
            <div className="h-2 w-px -translate-y-1/2 bg-foreground/20" />
            <div className="mt-2 -translate-x-1/2 font-mono text-[9px] opacity-35">{h === 0 ? "now" : `+${h}h`}</div>
          </div>
        ))}

        {/* NOW cursor */}
        <div className="absolute bottom-6 top-6 w-px bg-emerald-400/70" style={{ left: 0 }}>
          <span className="absolute -top-1 left-1 font-mono text-[9px] uppercase tracking-[0.14em] text-emerald-400">
            now
          </span>
        </div>

        {/* markers — alternate above/below the line to avoid label collisions */}
        {markers.map((m, i) => {
          const above = i % 2 === 0;
          const tone = m.kind === "unlock" ? "text-red-400" : "text-sky-400";
          const dot = m.kind === "unlock" ? "bg-red-400" : "bg-sky-400";
          return (
            <div key={`${m.id}-${m.kind}`} className="absolute top-1/2" style={{ left: `${pct(m.atMs)}%` }}>
              <div className={`h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ${dot} shadow-[0_0_8px_currentColor]`} />
              <div
                className={`absolute -translate-x-1/2 whitespace-nowrap text-center ${above ? "bottom-4" : "top-4"}`}
              >
                <div className={`text-[10px] font-semibold uppercase tracking-[0.08em] ${tone}`}>{m.label}</div>
                <div className="font-mono text-[10px] opacity-55">
                  {formatTimeLabel(new Date(m.atMs).toISOString())}
                  {m.kind === "reset" ? " reset" : ""}
                </div>
              </div>
            </div>
          );
        })}

        {markers.length === 0 && (
          <div className="absolute inset-x-0 top-[62%] text-center text-xs opacity-45">
            No unlocks or resets in the next {SPAN_HOURS} hours — everything available is available now.
          </div>
        )}
      </div>
      <div className="mt-1 flex items-center gap-4 text-[10px] opacity-50">
        <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-red-400" /> cooldown unlock</span>
        <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-sky-400" /> daily quota reset</span>
      </div>
    </div>
  );
}
