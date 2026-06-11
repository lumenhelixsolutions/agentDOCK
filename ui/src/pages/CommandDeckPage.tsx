import { Clock3, Gauge, PictureInPicture2, RefreshCw } from "lucide-react";
import { Panel, WidgetError, WidgetSkeleton } from "@/components/dashboard/primitives";
import { useCooldownRegistry } from "@/hooks/useCooldownRegistry";
import { PROVIDER_ORDER } from "@/lib/cooldown";
import MatrixTicker from "@/components/deck/MatrixTicker";
import ProviderGauge from "@/components/deck/ProviderGauge";
import RecoveryTimeline from "@/components/deck/RecoveryTimeline";
import ContextRadar from "@/components/deck/ContextRadar";
import HandoffConsole from "@/components/deck/HandoffConsole";
import TelemetryHealth from "@/components/deck/TelemetryHealth";
import { PopoutSurface, useDeckPopout } from "@/components/deck/popout";

export default function CommandDeckPage() {
  const { registry, loading, failed, nowMs, reload, patch } = useCooldownRegistry(30000);
  const { pipWindow, toggle } = useDeckPopout();

  if (loading && !registry) {
    return (
      <div className="grid gap-[18px]">
        <WidgetSkeleton rows={2} title="Command Deck" />
        <WidgetSkeleton rows={4} />
      </div>
    );
  }

  if (failed && !registry) {
    return <WidgetError title="Command Deck" onRetry={reload} />;
  }

  if (!registry) return null;

  return (
    <div className="grid gap-[18px]">
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <MatrixTicker registry={registry} />
        </div>
        <button
          type="button"
          onClick={toggle}
          title={pipWindow ? "Close floating monitor" : "Pop out always-on-top floating monitor"}
          className={`flex shrink-0 items-center gap-2 rounded-2xl border px-3 py-3 text-xs transition ${
            pipWindow ? "hoot-gold-chip font-semibold" : "border-border opacity-70 hover:opacity-100"
          }`}
        >
          <PictureInPicture2 size={15} />
          <span className="hidden sm:inline">{pipWindow ? "Floating" : "Pop out"}</span>
        </button>
        <button
          type="button"
          onClick={reload}
          title="Refresh registry"
          className="flex shrink-0 items-center rounded-2xl border border-border px-3 py-3 opacity-70 transition hover:opacity-100"
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      <Panel title="Provider gauges" subtitle="Live cooldown matrix · click a gauge's actions to mark status" icon={Gauge}>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {PROVIDER_ORDER.map((id) => {
            const row = registry.providers?.[id];
            if (!row) return null;
            return <ProviderGauge key={id} id={id} row={row} nowMs={nowMs} onPatch={patch} />;
          })}
        </div>
      </Panel>

      <Panel title="Recovery timeline" subtitle="Next 8 hours · unlocks and daily resets" icon={Clock3}>
        <RecoveryTimeline registry={registry} nowMs={nowMs} />
      </Panel>

      <div className="grid gap-[18px] xl:grid-cols-2">
        <ContextRadar />
        <div className="grid gap-[18px] content-start">
          <HandoffConsole />
          <TelemetryHealth />
        </div>
      </div>

      {pipWindow && <PopoutSurface pipWindow={pipWindow} registry={registry} nowMs={nowMs} />}
    </div>
  );
}
