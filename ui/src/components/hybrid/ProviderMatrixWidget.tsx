import { useCallback, useEffect, useState } from "react";
import { Copy, RefreshCw, Timer } from "lucide-react";
import { api } from "@/lib/api";
import { Panel, Badge, WidgetError } from "@/components/dashboard/primitives";

type ProviderRow = {
  label: string;
  status: string;
  effective_status?: string;
  cooldown_until?: string | null;
  eta?: string | null;
  cooldown_label?: string | null;
};

const PROVIDER_ORDER = ["claude", "chatgpt", "gemini", "kimi", "ollama", "llamacpp"];

function statusTone(status?: string) {
  if (status === "active" || status === "local") return "READY";
  if (status === "cooldown") return "BLOCKED";
  return "UNKNOWN";
}

export default function ProviderMatrixWidget({
  onRegistryChange,
}: {
  onRegistryChange?: (matrixLine: string) => void;
}) {
  const [registry, setRegistry] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const data = await api.getProviderCooldown();
      setRegistry(data);
      onRegistryChange?.(data.matrix_line || "");
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [onRegistryChange]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleStatus = async (provider: string, row: ProviderRow) => {
    setBusy(provider);
    try {
      const status = row.effective_status === "cooldown" ? "active" : "cooldown";
      const body =
        status === "cooldown"
          ? { provider, preset: "3hr" as const }
          : { provider, status: "active", cooldown_until: null };
      const data = await api.patchProviderCooldown(body);
      setRegistry(data);
      onRegistryChange?.(data.matrix_line || "");
    } finally {
      setBusy(null);
    }
  };

  const copyRegistry = async () => {
    if (!registry) return;
    const header = registry.matrix_line || "";
    const session = registry.current_session_provider ? `\nSESSION: ${registry.current_session_provider}` : "";
    await navigator.clipboard.writeText(`${header}${session}`);
  };

  if (loading && !registry) {
    return (
      <Panel title="Provider matrix" subtitle="Global resource registry" icon={Timer}>
        <div className="opacity-55">Loading provider status…</div>
      </Panel>
    );
  }

  if (failed) {
    return (
      <Panel title="Provider matrix" subtitle="Global resource registry" icon={Timer}>
        <WidgetError title="Provider registry" onRetry={load} />
      </Panel>
    );
  }

  return (
    <Panel title="Provider matrix" subtitle="Cooldown rotation · click to toggle" icon={Timer}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="font-mono text-[11px] leading-relaxed opacity-60">{registry?.matrix_line}</div>
        <div className="flex shrink-0 gap-2">
          <button type="button" onClick={copyRegistry} className="rounded-lg border border-border px-2.5 py-1.5 text-xs opacity-70 hover:opacity-100" title="Copy registry line">
            <Copy size={14} />
          </button>
          <button type="button" onClick={load} className="rounded-lg border border-border px-2.5 py-1.5 text-xs opacity-70 hover:opacity-100" title="Refresh">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {PROVIDER_ORDER.map((id) => {
          const row = registry?.providers?.[id] as ProviderRow | undefined;
          if (!row) return null;
          const status = row.effective_status || row.status;
          return (
            <button
              key={id}
              type="button"
              disabled={busy === id}
              onClick={() => toggleStatus(id, row)}
              className="flex items-center justify-between gap-2 rounded-xl border border-border bg-foreground/[0.03] px-3 py-2.5 text-left transition hover:bg-foreground/[0.06]"
            >
              <div>
                <div className="text-sm font-medium text-foreground">{row.label || id}</div>
                <div className="text-[11px] opacity-50">
                  {status === "cooldown" && row.eta ? `until ~${row.cooldown_label || row.eta}` : status}
                </div>
              </div>
              <Badge text={status === "cooldown" ? "COOLDOWN" : status === "active" ? "ACTIVE" : status.toUpperCase()} tone={statusTone(status)} />
            </button>
          );
        })}
      </div>
      {registry?.current_session_provider && (
        <div className="mt-3 text-xs opacity-55">Session provider: {registry.current_session_provider}</div>
      )}
    </Panel>
  );
}