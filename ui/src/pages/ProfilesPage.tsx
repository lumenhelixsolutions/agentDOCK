import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { CheckCircle2, AlertTriangle, HelpCircle, Play, Eye, Ban, ChevronRight } from "lucide-react";

const statusConfig: Record<string, { color: string; bg: string; icon: typeof CheckCircle2 }> = {
  READY: { color: "#4ade80", bg: "rgba(74, 222, 128, 0.08)", icon: CheckCircle2 },
  DEGRADED: { color: "#f59e0b", bg: "rgba(245, 158, 11, 0.08)", icon: AlertTriangle },
  BLOCKED: { color: "#ef4444", bg: "rgba(239, 68, 68, 0.08)", icon: AlertTriangle },
  UNKNOWN: { color: "#6b7280", bg: "rgba(107, 114, 128, 0.08)", icon: HelpCircle },
};

export default function ProfilesPage() {
  const [profiles, setProfiles] = useState<Array<any>>([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<{ id: string; script: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getProfiles()
      .then((p) => { setProfiles(p); setLoading(false); })
      .catch((e) => { setError(String(e)); setLoading(false); });
  }, []);

  const handleLaunch = async (id: string) => {
    try {
      const res = await api.launch(id);
      if (res.blocked) {
        const reason = prompt(res.message + "\n\nOverride reason:");
        if (!reason) return;
        await api.launch(id, reason);
        alert("Launched with override.");
      } else if (res.session) {
        alert(`Launched: ${res.session.profileName}\nSession: ${res.session.id}`);
      }
    } catch (e) {
      alert("Launch failed: " + e);
    }
  };

  const handlePreview = async (id: string) => {
    try {
      const res = await api.dryRun(id);
      setPreview({ id, script: res.script });
    } catch (e) {
      alert("Preview failed: " + e);
    }
  };

  if (loading) return <div style={{ padding: 40, textAlign: "center", opacity: 0.5 }}>Loading profiles...</div>;
  if (error) return <div style={{ padding: 40, textAlign: "center", color: "#ef4444" }}>{error}</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ fontSize: 20, margin: 0 }}>Agent Profiles</h2>
        <span style={{ fontSize: 12, opacity: 0.5 }}>{profiles.length} profiles</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
        {profiles.map((p) => {
          const state = p.state || p.meta?.status || "UNKNOWN";
          const cfg = statusConfig[state] || statusConfig.UNKNOWN;
          const Icon = cfg.icon;
          return (
            <div key={p.id} style={{ padding: 20, borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ fontSize: 14, margin: 0, color: "#f5f5f5" }}>{p.name}</h3>
                <span style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 500, color: cfg.color, padding: "2px 8px", borderRadius: 4, background: cfg.bg }}>
                  {state}
                </span>
              </div>
              <div style={{ fontSize: 11, opacity: 0.5, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span>{p.meta?.frontend}</span>
                <span>/</span>
                <span>{p.meta?.backend}</span>
                <span>/</span>
                <span>{p.meta?.mode}</span>
              </div>
              <p style={{ fontSize: 12, opacity: 0.7, margin: 0, lineHeight: 1.5 }}>{p.meta?.description || p.meta?.model || ""}</p>
              <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
                <button onClick={() => handlePreview(p.id)} style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#dadada", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  <Eye size={14} /> Preview
                </button>
                <button onClick={() => handleLaunch(p.id)} style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(74,222,128,0.3)", background: "rgba(74,222,128,0.1)", color: "#4ade80", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  <Play size={14} /> Launch
                </button>
                <button onClick={async () => { const r = prompt("Reason for blocking?"); if (r) { await fetch(`/api/block/${encodeURIComponent(p.id)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason: r }) }); alert("Blocked."); } }} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.1)", color: "#ef4444", cursor: "pointer", fontSize: 12 }}>
                  <Ban size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {preview && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
          <div style={{ width: "100%", maxWidth: 800, maxHeight: "80vh", background: "#0d0d0d", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: 24, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0 }}>Preview: {preview.id}</h3>
              <button onClick={() => setPreview(null)} style={{ background: "none", border: "none", color: "#dadada", cursor: "pointer" }}>Close</button>
            </div>
            <pre style={{ flex: 1, overflow: "auto", background: "rgba(0,0,0,0.3)", padding: 16, borderRadius: 8, fontSize: 12, fontFamily: "'GeistMono', monospace", color: "#f5f5f5" }}>{preview.script}</pre>
          </div>
        </div>
      )}
    </div>
  );
}
