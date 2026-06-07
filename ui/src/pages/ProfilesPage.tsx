import { useEffect, useState, useMemo } from "react";
import { api } from "@/lib/api";
import {
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Play,
  Eye,
  Ban,
  Search,
  Filter,
  Layers,
  Cloud,
  Monitor,
  Cpu,
  Zap,
  Shield,
  Bug,
  BookOpen,
  Code2,
  Wrench,
} from "lucide-react";

const statusConfig: Record<string, { color: string; bg: string; icon: typeof CheckCircle2; label: string }> = {
  READY: { color: "#4ade80", bg: "rgba(74, 222, 128, 0.08)", icon: CheckCircle2, label: "Ready" },
  DEGRADED: { color: "#f59e0b", bg: "rgba(245, 158, 11, 0.08)", icon: AlertTriangle, label: "Fixable" },
  BLOCKED: { color: "#ef4444", bg: "rgba(239, 68, 68, 0.08)", icon: AlertTriangle, label: "Blocked" },
  UNKNOWN: { color: "#6b7280", bg: "rgba(107, 114, 128, 0.08)", icon: HelpCircle, label: "Unknown" },
};

const modeIcons: Record<string, typeof Cloud> = {
  "full-local": Monitor,
  hybrid: Zap,
  "hybrid-cloud": Zap,
  "cloud-only": Cloud,
};

const taskModeIcons: Record<string, typeof Shield> = {
  "read-only": Shield,
  "patch-test": Wrench,
  refactor: Code2,
  "bug-hunt": Bug,
  audit: BookOpen,
  architecture: Cpu,
  "code-review": BookOpen,
  documentation: BookOpen,
  performance: Zap,
  security: Shield,
};

export default function ProfilesPage() {
  const [profiles, setProfiles] = useState<Array<any>>([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<{ id: string; script: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [modeFilter, setModeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [plan, setPlan] = useState<any>(null);
  const [planLoading, setPlanLoading] = useState(false);

  useEffect(() => {
    api.getProfiles()
      .then((p) => { setProfiles(p); setLoading(false); })
      .catch((e) => { setError(String(e)); setLoading(false); });
  }, []);

  const runPlan = async () => {
    setPlanLoading(true);
    try {
      const p = await api.makePlan("privacy");
      setPlan(p);
    } catch (e) {
      setError(String(e));
    } finally {
      setPlanLoading(false);
    }
  };

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

  const filtered = useMemo(() => {
    let list = profiles;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p: any) =>
        p.name.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        (p.meta?.model || "").toLowerCase().includes(q) ||
        (p.meta?.frontend || "").toLowerCase().includes(q)
      );
    }
    if (modeFilter !== "all") {
      list = list.filter((p: any) => (p.meta?.mode || "").toLowerCase().includes(modeFilter));
    }
    if (statusFilter !== "all") {
      list = list.filter((p: any) => {
        const state = p.state || p.meta?.status || "UNKNOWN";
        return state === statusFilter;
      });
    }
    return list;
  }, [profiles, search, modeFilter, statusFilter]);

  const byMode = useMemo(() => {
    const groups: Record<string, any[]> = {};
    for (const p of filtered) {
      const mode = p.meta?.mode || "unknown";
      if (!groups[mode]) groups[mode] = [];
      groups[mode].push(p);
    }
    return groups;
  }, [filtered]);

  if (loading) return <div style={{ padding: 40, textAlign: "center", opacity: 0.5 }}>Loading profiles...</div>;
  if (error) return <div style={{ padding: 40, textAlign: "center", color: "#ef4444" }}>{error}</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 20, margin: 0 }}>Agent Profiles</h2>
          <p style={{ fontSize: 12, opacity: 0.5, margin: "4px 0 0" }}>{filtered.length} of {profiles.length} profiles</p>
        </div>
        <button
          onClick={runPlan}
          disabled={planLoading}
          style={{
            padding: "10px 18px",
            borderRadius: 8,
            border: "1px solid rgba(255,176,66,0.3)",
            background: "rgba(255,176,66,0.1)",
            color: "#ffb042",
            cursor: planLoading ? "not-allowed" : "pointer",
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            gap: 8,
            opacity: planLoading ? 0.6 : 1,
          }}
        >
          <Layers size={14} />
          {planLoading ? "Planning..." : "Smart Recommend"}
        </button>
      </div>

      {/* Plan results */}
      {plan && (
        <div style={{ padding: 16, borderRadius: 12, background: "rgba(255,176,66,0.04)", border: "1px solid rgba(255,176,66,0.15)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 12, color: "#ffb042", fontWeight: 500 }}>Recommended for {plan.goal}</span>
            <button onClick={() => setPlan(null)} style={{ background: "none", border: "none", color: "#dadada", cursor: "pointer", fontSize: 12 }}>Dismiss</button>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {plan.recommended.slice(0, 5).map((p: any) => (
              <button
                key={p.id}
                onClick={() => handleLaunch(p.id)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 6,
                  border: "1px solid rgba(74,222,128,0.3)",
                  background: "rgba(74,222,128,0.1)",
                  color: "#4ade80",
                  cursor: "pointer",
                  fontSize: 12,
                }}
              >
                {p.name} ({p.score}%)
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 200 }}>
          <Search size={14} opacity={0.5} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search profiles, models, frontends..."
            style={{
              flex: 1,
              padding: "10px 14px",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.03)",
              color: "#f5f5f5",
              fontSize: 13,
              outline: "none",
            }}
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Filter size={14} opacity={0.5} />
          <select
            value={modeFilter}
            onChange={(e) => setModeFilter(e.target.value)}
            style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", color: "#f5f5f5", fontSize: 13 }}
          >
            <option value="all">All Modes</option>
            <option value="local">Local</option>
            <option value="hybrid">Hybrid</option>
            <option value="cloud">Cloud</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", color: "#f5f5f5", fontSize: 13 }}
          >
            <option value="all">All Status</option>
            <option value="READY">Ready</option>
            <option value="DEGRADED">Fixable</option>
            <option value="BLOCKED">Blocked</option>
            <option value="UNKNOWN">Unknown</option>
          </select>
        </div>
      </div>

      {/* Profiles Grid */}
      {Object.entries(byMode).length === 0 ? (
        <div style={{ padding: 60, textAlign: "center", opacity: 0.5 }}>
          <Layers size={32} style={{ marginBottom: 12 }} />
          <p>No profiles match your filters.</p>
        </div>
      ) : (
        Object.entries(byMode).map(([mode, list]) => (
          <div key={mode}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 11, letterSpacing: "3px", textTransform: "uppercase", opacity: 0.5 }}>
                {mode.replace(/-/g, " ")}
              </span>
              <span style={{ fontSize: 11, opacity: 0.3 }}>({list.length})</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 14 }}>
              {list.map((p) => {
                const state = p.state || p.meta?.status || "UNKNOWN";
                const cfg = statusConfig[state] || statusConfig.UNKNOWN;
                const StatusIcon = cfg.icon;
                const ModeIcon = modeIcons[p.meta?.mode] || Layers;
                const TaskIcon = taskModeIcons[p.meta?.task_mode] || Wrench;

                return (
                  <div
                    key={p.id}
                    style={{
                      padding: 18,
                      borderRadius: 12,
                      background: "rgba(255,255,255,0.02)",
                      border: `1px solid ${state === "BLOCKED" ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.04)"}`,
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: cfg.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <StatusIcon size={16} color={cfg.color} />
                        </div>
                        <div>
                          <h3 style={{ fontSize: 14, margin: 0, color: "#f5f5f5", fontWeight: 500 }}>{p.name}</h3>
                          <div style={{ fontSize: 11, opacity: 0.4, marginTop: 2, fontFamily: "'GeistMono', monospace" }}>{p.id}</div>
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: 10,
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                          fontWeight: 500,
                          color: cfg.color,
                          padding: "3px 8px",
                          borderRadius: 4,
                          background: cfg.bg,
                        }}
                      >
                        {cfg.label}
                      </span>
                    </div>

                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <Tag icon={ModeIcon} text={p.meta?.mode} color="#60a5fa" />
                      <Tag icon={TaskIcon} text={p.meta?.task_mode} color="#a78bfa" />
                      {p.meta?.model && <Tag text={p.meta.model} color="#f59e0b" />}
                      {p.meta?.frontend && <Tag text={p.meta.frontend} color="#4ade80" />}
                      {p.meta?.backend && <Tag text={p.meta.backend} color="#f472b6" />}
                      {p.score !== undefined && <Tag text={`${p.score}% match`} color={p.score >= 80 ? "#4ade80" : "#f59e0b"} />}
                    </div>

                    <p style={{ fontSize: 12, opacity: 0.6, margin: 0, lineHeight: 1.5, flex: 1 }}>
                      {p.meta?.description || ""}
                    </p>

                    {p.reasons && p.reasons.length > 0 && (
                      <div style={{ padding: 8, borderRadius: 6, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.03)" }}>
                        {p.reasons.slice(0, 2).map((r: string, i: number) => (
                          <div key={i} style={{ fontSize: 11, opacity: 0.5, lineHeight: 1.4 }}>• {r}</div>
                        ))}
                      </div>
                    )}

                    <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
                      <button
                        onClick={() => handlePreview(p.id)}
                        style={{
                          flex: 1,
                          padding: "8px 12px",
                          borderRadius: 8,
                          border: "1px solid rgba(255,255,255,0.1)",
                          background: "rgba(255,255,255,0.05)",
                          color: "#dadada",
                          cursor: "pointer",
                          fontSize: 12,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                        }}
                      >
                        <Eye size={14} /> Preview
                      </button>
                      <button
                        onClick={() => handleLaunch(p.id)}
                        disabled={state === "BLOCKED"}
                        style={{
                          flex: 1,
                          padding: "8px 12px",
                          borderRadius: 8,
                          border: "1px solid rgba(74,222,128,0.3)",
                          background: state === "BLOCKED" ? "rgba(255,255,255,0.03)" : "rgba(74,222,128,0.1)",
                          color: state === "BLOCKED" ? "#6b7280" : "#4ade80",
                          cursor: state === "BLOCKED" ? "not-allowed" : "pointer",
                          fontSize: 12,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                        }}
                      >
                        <Play size={14} /> Launch
                      </button>
                      <button
                        onClick={async () => {
                          const r = prompt("Reason for blocking?");
                          if (r) {
                            await fetch(`/api/block/${encodeURIComponent(p.id)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason: r }) });
                            alert("Blocked.");
                          }
                        }}
                        style={{
                          padding: "8px 12px",
                          borderRadius: 8,
                          border: "1px solid rgba(239,68,68,0.3)",
                          background: "rgba(239,68,68,0.1)",
                          color: "#ef4444",
                          cursor: "pointer",
                          fontSize: 12,
                        }}
                      >
                        <Ban size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}

      {/* Preview Modal */}
      {preview && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 40,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 800,
              maxHeight: "80vh",
              background: "#0d0d0d",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 12,
              padding: 24,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0 }}>Preview: {preview.id}</h3>
              <button onClick={() => setPreview(null)} style={{ background: "none", border: "none", color: "#dadada", cursor: "pointer" }}>
                Close
              </button>
            </div>
            <pre
              style={{
                flex: 1,
                overflow: "auto",
                background: "rgba(0,0,0,0.3)",
                padding: 16,
                borderRadius: 8,
                fontSize: 12,
                fontFamily: "'GeistMono', monospace",
                color: "#f5f5f5",
              }}
            >
              {preview.script}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

function Tag({ icon: Icon, text, color }: { icon?: any; text: string; color: string }) {
  if (!text) return null;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "3px 8px",
        borderRadius: 4,
        background: `${color}10`,
        border: `1px solid ${color}25`,
        color,
        fontSize: 10,
        letterSpacing: "0.03em",
        textTransform: "uppercase",
      }}
    >
      {Icon && <Icon size={10} />}
      {text}
    </span>
  );
}
