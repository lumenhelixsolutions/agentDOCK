import { useEffect, useState } from "react";
import { Sparkles, X } from "lucide-react";
import { api } from "@/lib/api";

const PROVIDERS = ["claude", "chatgpt", "gemini", "kimi", "ollama", "llamacpp"];

export default function SessionBootstrapWizard({
  open,
  onClose,
  onComplete,
}: {
  open: boolean;
  onClose: () => void;
  onComplete?: () => void;
}) {
  const [sessionProvider, setSessionProvider] = useState("gemini");
  const [activeRootId, setActiveRootId] = useState("core");
  const [inboundHandoff, setInboundHandoff] = useState("");
  const [roots, setRoots] = useState<any[]>([]);
  const [cooldownDraft, setCooldownDraft] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    api.getWorkspaceRoots().then((r) => {
      setRoots(r.roots || []);
      setActiveRootId(r.active_root_id || "core");
    }).catch(() => {});
    api.getProviderCooldown().then((r) => {
      const draft: Record<string, boolean> = {};
      for (const id of PROVIDERS) {
        draft[id] = r.providers?.[id]?.effective_status === "cooldown";
      }
      setCooldownDraft(draft);
      if (r.current_session_provider) setSessionProvider(r.current_session_provider);
    }).catch(() => {});
  }, [open]);

  if (!open) return null;

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const cooldowns = PROVIDERS.filter((id) => cooldownDraft[id]).map((provider) => ({
        provider,
        preset: "3hr" as const,
      }));
      await api.sessionBootstrap({
        cooldowns,
        current_session_provider: sessionProvider,
        active_root_id: activeRootId,
        inbound_handoff: inboundHandoff.trim() || undefined,
      });
      onComplete?.();
      onClose();
    } catch (e: any) {
      setError(e.message || "Bootstrap failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/55 p-4 backdrop-blur-sm">
      <div className="hoot-card-soft max-h-[90vh] w-full max-w-2xl overflow-auto rounded-3xl p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <div className="mb-1 flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] opacity-45">
              <Sparkles size={14} /> Session bootstrap
            </div>
            <h2 className="m-0 font-serif text-2xl font-semibold tracking-[-0.04em]">Inject session state</h2>
            <p className="mb-0 mt-2 text-sm opacity-65">Set cooldowns, active root, and paste a prior handoff — HOOT stores structured state, not a system prompt dump.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg border border-border p-2 opacity-60 hover:opacity-100">
            <X size={16} />
          </button>
        </div>

        <div className="grid gap-4">
          <label className="grid gap-2 text-sm">
            <span className="opacity-60">Session provider</span>
            <select value={sessionProvider} onChange={(e) => setSessionProvider(e.target.value)} className="rounded-xl border border-border bg-background px-3 py-2">
              {PROVIDERS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm">
            <span className="opacity-60">Active workspace root</span>
            <select value={activeRootId} onChange={(e) => setActiveRootId(e.target.value)} className="rounded-xl border border-border bg-background px-3 py-2">
              {(roots.length ? roots : [{ id: "core", label: "Core logic" }]).map((r: any) => (
                <option key={r.id} value={r.id}>{r.label} {r.path ? `· ${r.path}` : ""}</option>
              ))}
            </select>
          </label>

          <div>
            <div className="mb-2 text-sm opacity-60">Mark providers on cooldown</div>
            <div className="flex flex-wrap gap-2">
              {PROVIDERS.map((id) => (
                <label key={id} className="flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs">
                  <input
                    type="checkbox"
                    checked={Boolean(cooldownDraft[id])}
                    onChange={(e) => setCooldownDraft((prev) => ({ ...prev, [id]: e.target.checked }))}
                  />
                  {id}
                </label>
              ))}
            </div>
          </div>

          <label className="grid gap-2 text-sm">
            <span className="opacity-60">Paste prior handoff (optional)</span>
            <textarea
              value={inboundHandoff}
              onChange={(e) => setInboundHandoff(e.target.value)}
              rows={8}
              placeholder="### [PROJECT STATE DUMP - DO NOT TRANSLATE]…"
              className="rounded-xl border border-border bg-background px-3 py-2 font-mono text-xs"
            />
          </label>

          {error && <div className="text-sm text-red-400">{error}</div>}

          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-xl border border-border px-4 py-2 text-sm opacity-70">Cancel</button>
            <button type="button" disabled={busy} onClick={submit} className="hoot-gold-chip rounded-xl px-4 py-2 text-sm font-semibold">
              {busy ? "Applying…" : "Apply bootstrap"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}