import { useCallback, useEffect, useState } from "react";
import { Activity, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { api } from "@/lib/api";
import { Panel } from "@/components/dashboard/primitives";

/** ai_status.json health — where the kernel exports telemetry, and manual sync. */
export default function TelemetryHealth() {
  const [info, setInfo] = useState<{ kernel?: string; mirror?: string | null; file?: string | null } | null>(null);
  const [busy, setBusy] = useState<"export" | "import" | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(() => {
    api.getTelemetry()
      .then((r) => setInfo({ kernel: r.kernel, mirror: r.mirror, file: r.file }))
      .catch(() => setInfo(null));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const sync = async (importFromDisk: boolean) => {
    setBusy(importFromDisk ? "import" : "export");
    setNote(null);
    try {
      const r = await api.syncTelemetry(importFromDisk);
      setNote(`${r.direction} ok · ${new Date().toLocaleTimeString()}`);
      load();
    } catch (e) {
      setNote(e instanceof Error ? e.message : "sync failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Panel title="Telemetry" subtitle="ai_status.json · cross-tool provider state" icon={Activity}>
      <div className="grid gap-2 font-mono text-[11px]">
        <Row label="kernel" value={info?.kernel || "—"} ok={Boolean(info?.kernel)} />
        <Row label="mirror" value={info?.mirror || "not configured"} ok={Boolean(info?.mirror)} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => sync(false)}
          className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-[11px] opacity-70 transition hover:opacity-100 disabled:opacity-40"
        >
          <ArrowUpFromLine size={12} /> {busy === "export" ? "Exporting…" : "Export now"}
        </button>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => sync(true)}
          className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-[11px] opacity-70 transition hover:opacity-100 disabled:opacity-40"
        >
          <ArrowDownToLine size={12} /> {busy === "import" ? "Importing…" : "Import from disk"}
        </button>
        {note && <span className="text-[10px] opacity-50">{note}</span>}
      </div>
    </Panel>
  );
}

function Row({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="flex items-center gap-2 overflow-hidden rounded-lg border border-border bg-foreground/[0.02] px-2.5 py-1.5">
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${ok ? "bg-emerald-400" : "bg-foreground/25"}`} />
      <span className="shrink-0 uppercase tracking-[0.1em] opacity-45">{label}</span>
      <span className="truncate opacity-75" title={value}>{value}</span>
    </div>
  );
}
