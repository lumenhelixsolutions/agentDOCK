import { useEffect, useState } from "react";
import { FolderTree, Save, Timer } from "lucide-react";
import { api } from "@/lib/api";

const PROVIDERS = ["claude", "chatgpt", "gemini", "kimi", "ollama", "llamacpp"];

export default function HybridWorkspaceSettings() {
  const [registry, setRegistry] = useState<any>(null);
  const [roots, setRoots] = useState<any>(null);
  const [telemetry, setTelemetry] = useState<{ kernel?: string; mirror?: string | null; file?: string | null } | null>(null);
  const [sessionProvider, setSessionProvider] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = () => {
    api.getProviderCooldown().then(setRegistry).catch(() => setRegistry(null));
    api.getWorkspaceRoots().then(setRoots).catch(() => setRoots(null));
    api.getTelemetry().then((r) => setTelemetry({ kernel: r.kernel, mirror: r.mirror, file: r.file })).catch(() => setTelemetry(null));
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (registry?.current_session_provider) setSessionProvider(registry.current_session_provider);
  }, [registry?.current_session_provider]);

  const saveRoots = async () => {
    if (!roots) return;
    setBusy(true);
    try {
      const data = await api.putWorkspaceRoots({
        roots: roots.roots,
        active_root_id: roots.active_root_id,
        enforce_boundaries: roots.enforce_boundaries,
      });
      setRoots(data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setBusy(false);
    }
  };

  const patchProvider = async (provider: string, preset?: string) => {
    const data = await api.patchProviderCooldown(preset ? { provider, preset } : { provider, status: "active", cooldown_until: null });
    setRegistry(data);
  };

  const saveSessionProvider = async () => {
    const data = await api.patchProviderCooldown({ current_session_provider: sessionProvider || null });
    setRegistry(data);
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ padding: 20, borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <Timer size={16} color="#fbbf24" />
          <h3 style={{ fontSize: 14, margin: 0, color: "#f5f5f5" }}>Provider cooldowns</h3>
        </div>
        <p style={{ fontSize: 12, opacity: 0.55, margin: "0 0 12px", lineHeight: 1.5 }}>
          HOOT kernel tracks cooldowns in <code>state/provider-cooldown.json</code> and exports <code>state/ai_status.json</code>
          {telemetry?.mirror ? ` (mirror: ${telemetry.mirror})` : ""}. Auto-handoff writes <code>auto_handoff.md</code> on cooldown.
        </p>
        <div style={{ display: "grid", gap: 8 }}>
          {PROVIDERS.map((id) => {
            const row = registry?.providers?.[id];
            const status = row?.effective_status || row?.status || "unknown";
            return (
              <div key={id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "8px 10px", borderRadius: 8, background: "rgba(255,255,255,0.03)" }}>
                <div>
                  <div style={{ fontSize: 13, color: "#f5f5f5" }}>{row?.label || id}</div>
                  <div style={{ fontSize: 11, opacity: 0.5 }}>{status}{row?.eta ? ` · ${row.eta}` : ""}</div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button type="button" onClick={() => patchProvider(id, "3hr")} style={{ fontSize: 11, padding: "4px 8px", borderRadius: 6, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.08)", color: "#fca5a5", cursor: "pointer" }}>3hr CD</button>
                  <button type="button" onClick={() => patchProvider(id)} style={{ fontSize: 11, padding: "4px 8px", borderRadius: 6, border: "1px solid rgba(74,222,128,0.3)", background: "rgba(74,222,128,0.08)", color: "#86efac", cursor: "pointer" }}>Active</button>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center" }}>
          <label style={{ fontSize: 12, opacity: 0.6 }}>Session provider</label>
          <select value={sessionProvider} onChange={(e) => setSessionProvider(e.target.value)} style={{ flex: 1, padding: "6px 8px", borderRadius: 8, background: "#111", color: "#eee", border: "1px solid rgba(255,255,255,0.1)" }}>
            <option value="">—</option>
            {PROVIDERS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <button type="button" onClick={saveSessionProvider} style={{ fontSize: 12, padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(255,176,66,0.3)", background: "rgba(255,176,66,0.1)", color: "#ffb042", cursor: "pointer" }}>Save</button>
        </div>
      </div>

      <div style={{ padding: 20, borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <FolderTree size={16} color="#93c5fd" />
          <h3 style={{ fontSize: 14, margin: 0, color: "#f5f5f5" }}>Workspace roots</h3>
        </div>
        {roots?.roots?.map((root: any, idx: number) => (
          <div key={root.id} style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 4 }}>{root.label} ({root.id})</div>
            <input
              value={root.path || ""}
              onChange={(e) => {
                const next = [...roots.roots];
                next[idx] = { ...root, path: e.target.value };
                setRoots({ ...roots, roots: next });
              }}
              style={{ width: "100%", padding: "8px 10px", borderRadius: 8, background: "#111", color: "#eee", border: "1px solid rgba(255,255,255,0.1)", fontFamily: "monospace", fontSize: 12 }}
            />
            {!root.exists && root.path && <div style={{ fontSize: 10, color: "#fbbf24", marginTop: 4 }}>Path not found on disk</div>}
          </div>
        ))}
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, margin: "12px 0" }}>
          <input
            type="checkbox"
            checked={Boolean(roots?.enforce_boundaries)}
            onChange={(e) => setRoots((prev: any) => ({ ...prev, enforce_boundaries: e.target.checked }))}
          />
          Terse handoff mode (minimal diffs; no filler prose in exports)
        </label>
        <label style={{ display: "grid", gap: 6, fontSize: 12, marginBottom: 12 }}>
          Active root
          <select
            value={roots?.active_root_id || "core"}
            onChange={(e) => setRoots((prev: any) => ({ ...prev, active_root_id: e.target.value }))}
            style={{ padding: "8px 10px", borderRadius: 8, background: "#111", color: "#eee", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            {(roots?.roots || []).map((r: any) => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
        </label>
        <button
          type="button"
          disabled={busy}
          onClick={saveRoots}
          style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 8, border: "1px solid rgba(255,176,66,0.3)", background: "rgba(255,176,66,0.1)", color: "#ffb042", cursor: "pointer", fontSize: 12 }}
        >
          <Save size={14} /> {busy ? "Saving…" : saved ? "Saved" : "Save roots"}
        </button>
      </div>
    </div>
  );
}