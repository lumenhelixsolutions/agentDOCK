import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Gauge, PictureInPicture2 } from "lucide-react";
import { useCooldownRegistry } from "@/hooks/useCooldownRegistry";
import {
  PROVIDER_ORDER,
  STATE_COLORS,
  formatClock,
  gaugeState,
  liveRemaining,
  liveRemainingFraction,
} from "@/lib/cooldown";
import GaugeRing from "./GaugeRing";
import { PopoutSurface, useDeckPopout } from "./popout";

/**
 * Always-visible top-bar cooldown indicator: mini gauge per provider, the
 * soonest unlock countdown, a link to the full Command Deck, and the
 * always-on-top popout toggle.
 */
export default function CooldownStrip() {
  const { registry, nowMs } = useCooldownRegistry(45000);
  const { pipWindow, toggle } = useDeckPopout();

  const soonest = useMemo(() => {
    if (!registry) return null;
    let best: { id: string; label: string; remaining: number } | null = null;
    for (const id of PROVIDER_ORDER) {
      const row = registry.providers?.[id];
      if (!row || gaugeState(row) !== "cooldown") continue;
      const remaining = liveRemaining(row, nowMs);
      if (remaining === null || remaining <= 0) continue;
      if (!best || remaining < best.remaining) best = { id, label: row.label || id, remaining };
    }
    return best;
  }, [registry, nowMs]);

  if (!registry) return null;

  return (
    <div className="hoot-card-soft hidden items-center gap-2.5 rounded-2xl px-3 py-1.5 lg:flex" aria-label="Provider cooldown monitor">
      <Link to="/deck" className="flex items-center gap-2 no-underline" title="Open Command Deck">
        <div className="flex items-center gap-1">
          {PROVIDER_ORDER.map((id) => {
            const row = registry.providers?.[id];
            if (!row) return null;
            const state = gaugeState(row);
            const fraction = liveRemainingFraction(row, nowMs);
            const nearlyBack = state === "cooldown" && fraction !== null && fraction < 0.25;
            const color = nearlyBack ? "#fbbf24" : STATE_COLORS[state].stroke;
            const value = state === "cooldown" ? (fraction ?? 1) : state === "unknown" ? 0 : 1;
            const remaining = state === "cooldown" ? liveRemaining(row, nowMs) : null;
            return (
              <span key={id} title={`${row.label}: ${state}${remaining ? ` · ${formatClock(remaining)} left` : ""}`}>
                <GaugeRing size={20} stroke={3} value={value} color={color}>
                  <span className="sr-only">{row.label}</span>
                </GaugeRing>
              </span>
            );
          })}
        </div>
        {soonest ? (
          <span className="font-mono text-[10px] tabular-nums text-red-400" title={`Next unlock: ${soonest.label}`}>
            {soonest.label.split(" ")[0].toUpperCase()} {formatClock(soonest.remaining)}
          </span>
        ) : (
          <span className="text-[10px] uppercase tracking-[0.1em] text-emerald-400/80">all clear</span>
        )}
        <Gauge size={14} className="hoot-gold-text" />
      </Link>
      <button
        type="button"
        onClick={toggle}
        title={pipWindow ? "Close floating monitor" : "Pop out floating always-on-top monitor"}
        className={`rounded-lg border px-1.5 py-1 transition ${
          pipWindow ? "hoot-gold-chip" : "border-border opacity-60 hover:opacity-100"
        }`}
      >
        <PictureInPicture2 size={13} />
      </button>
      {pipWindow && <PopoutSurface pipWindow={pipWindow} registry={registry} nowMs={nowMs} />}
    </div>
  );
}
